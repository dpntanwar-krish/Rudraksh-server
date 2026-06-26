const Video = require("../Modal/VideoModal");
const { cloudinary } = require("../config/cloudinary");
const { validateYoutubeUrl, extractVideoId, generateThumbnailUrl } = require("../utils/youtubeUtils");

// Upload videos
const uploadVideo = async (req, res) => {
  try {
    const { title, folder } = req.body;
    const files = req.files;
    const targetFolder = folder;

    if (!files || files.length === 0) {
      return res.status(400).json({ msg: "No video files uploaded." });
    }
    if (!targetFolder) {
      return res.status(400).json({ msg: "A destination folder is required for video uploads." });
    }

    const lastVideo = await Video.findOne({ folder: targetFolder, videoUrl: { $ne: "null" } }).sort({ sequence: -1 });
    let nextSeq = lastVideo ? (lastVideo.sequence || 0) + 1 : 0;

    const uploadPromises = files.map((file) =>
      cloudinary.uploader.upload(file.path, {
        resource_type: "video",
        chunk_size: 8000000, // 8MB
        eager_async: true,
      })
    );

    const results = await Promise.all(uploadPromises);

    const newVideos = results.map((result, index) => ({
      title: title || files[index].originalname,
      folder: targetFolder,
      videoUrl: result.secure_url,
      public_id: result.public_id,
      sequence: nextSeq++,
    }));

    await Video.insertMany(newVideos);

    res.status(201).json({ status: true, msg: "Videos uploaded successfully", data: newVideos });
  } catch (error) {
    console.error("Video upload error:", error);
    if (error.code === "LIMIT_FILE_SIZE" || (error.message && error.message.includes("File size too large"))) {
        return res.status(400).json({ msg: "One or more videos are larger than 8MB." });
    }
    res.status(500).json({ msg: "Server error during video upload." });
  }
};

const addYoutubeVideo = async (req, res) => {
  try {
    const title = String(req.body?.title || "").trim();
    const folder = String(req.body?.folder || "").trim();
    const youtubeUrl = String(req.body?.youtubeUrl || "").trim();

    if (!folder) {
      return res.status(400).json({ status: false, msg: "Folder is required." });
    }
    if (!title) {
      return res.status(400).json({ status: false, msg: "Title is required." });
    }
    if (!validateYoutubeUrl(youtubeUrl)) {
      return res.status(400).json({ status: false, msg: "Valid YouTube URL is required." });
    }
    const videoId = extractVideoId(youtubeUrl);
    if (!videoId) {
      return res.status(400).json({ status: false, msg: "Could not extract YouTube video ID." });
    }

    const existsInFolder = await Video.exists({ folder, videoUrl: youtubeUrl, title: { $ne: "__folder__" } });
    if (existsInFolder) {
      return res.status(409).json({ status: false, msg: "This YouTube video already exists in this folder." });
    }

    const lastVideo = await Video.findOne({ folder, videoUrl: { $ne: "null" } }).sort({ sequence: -1 });
    const nextSeq = lastVideo ? (lastVideo.sequence || 0) + 1 : 0;
    const fallbackThumb = generateThumbnailUrl(videoId);

    const created = await Video.create({
      title,
      folder,
      videoUrl: youtubeUrl,
      public_id: `youtube:${videoId}`,
      sequence: nextSeq,
    });

    return res.status(201).json({
      status: true,
      msg: "YouTube video added successfully.",
      data: {
        ...created.toObject(),
        thumbnail: fallbackThumb,
      },
    });
  } catch (error) {
    console.error("Add YouTube video error:", error);
    return res.status(500).json({ status: false, msg: error.message });
  }
};

const updateYoutubeVideo = async (req, res) => {
  try {
    const { id } = req.params;
    const title = String(req.body?.title || "").trim();
    const youtubeUrl = String(req.body?.youtubeUrl || "").trim();

    if (!id) {
      return res.status(400).json({ status: false, msg: "Video id is required." });
    }

    const video = await Video.findById(id);
    if (!video) {
      return res.status(404).json({ status: false, msg: "Video not found." });
    }
    if (video.title === "__folder__") {
      return res.status(400).json({ status: false, msg: "Cannot edit folder placeholder as video item." });
    }

    if (!title) {
      return res.status(400).json({ status: false, msg: "Title is required." });
    }
    if (!validateYoutubeUrl(youtubeUrl)) {
      return res.status(400).json({ status: false, msg: "Valid YouTube URL is required." });
    }
    const videoId = extractVideoId(youtubeUrl);
    if (!videoId) {
      return res.status(400).json({ status: false, msg: "Could not extract YouTube video ID." });
    }

    video.title = title;
    video.videoUrl = youtubeUrl;
    video.public_id = `youtube:${videoId}`;
    await video.save();

    return res.status(200).json({
      status: true,
      msg: "YouTube video updated successfully.",
      data: {
        ...video.toObject(),
        thumbnail: generateThumbnailUrl(videoId),
      },
    });
  } catch (error) {
    console.error("Update YouTube video error:", error);
    return res.status(500).json({ status: false, msg: error.message });
  }
};

// Get all videos
const getAllVideos = async (req, res) => {
  try {
    const { folder, parentId } = req.query;
    const query = { videoUrl: { $ne: "" } };
    if (folder) query.folder = folder;

    const videos = await Video.find(query).sort({ sequence: 1, createdAt: -1 });
    res.status(200).json(videos);
  } catch (error) {
    console.error("Get all videos error:", error);
    res.status(500).json({ msg: "Server error while fetching videos." });
  }
};

// Delete a video
const deleteVideo = async (req, res) => {
  try {
    const { id } = req.params;
    const video = await Video.findById(id);

    if (!video) {
      return res.status(404).json({ status: false, msg: "Video not found." });
    }

    // Delete from Cloudinary
    await cloudinary.uploader.destroy(video.public_id, { resource_type: "video" });

    // Delete from MongoDB
    await Video.findByIdAndDelete(id);

    res.status(200).json({ status: true, msg: "Video deleted successfully." });
  } catch (error) {
    console.error("Delete video error:", error);
    res.status(500).json({ msg: "Server error while deleting video." });
  }
};

// Folder management
const getFolders = async (req, res) => {
  try {
    const { parentId } = req.query;
    
    // Filter out invalid or reserved names
    const invalidNames = ["", "null", "undefined", "general"];
    const query = { title: "__folder__", parentId: parentId || null, folder: { $nin: invalidNames, $ne: null } };
    const placeholders = await Video.find(query).sort({ sequence: 1 });

    const grouped = await Video.aggregate([
      { $group: { _id: "$folder", count: { $sum: { $cond: [{ $eq: ["$videoUrl", "null"] }, 0, 1] } } } },
    ]);

    const countMap = grouped.reduce((acc, curr) => {
      acc[curr._id] = curr.count;
      return acc;
    }, {});

    const folders = placeholders.map(p => ({
      name: p.folder,
      count: countMap[p.folder] || 0
    }));

    res.status(200).json({ status: true, data: folders });
  } catch (error) {
    res.status(500).json({ status: false, msg: error.message });
  }
};

const createFolder = async (req, res) => {
  try {
    const folder = (req.body?.folder || "").trim();
    const parentId = req.body?.parentId || null;

    // Validation: Reject null, undefined, empty, and "general"
    const invalidNames = ["", "null", "undefined", "general"];
    if (!folder || invalidNames.includes(folder.toLowerCase())) {
      console.warn(`[VideoController] Blocked invalid folder creation attempt: "${folder}"`);
      return res.status(400).json({ 
        status: false, 
        msg: "Invalid folder name. Names like 'general', 'null', or empty are not allowed." 
      });
    }

    const exists = await Video.exists({ folder, parentId });
    if (exists) return res.status(200).json({ status: true, msg: "Exists", folder });

    const lastFolder = await Video.findOne({ title: "__folder__", parentId }).sort({ sequence: -1 });
    const nextSeq = lastFolder ? (lastFolder.sequence || 0) + 1 : 0;

    await Video.create({ title: "__folder__", folder, videoUrl: "null", public_id: "null", parentId, sequence: nextSeq });
    console.log(`[VideoController] Folder created: "${folder}" (Parent: ${parentId})`);

    res.status(201).json({ status: true, msg: "Folder created", folder });
  } catch (error) {
    res.status(500).json({ status: false, msg: error.message });
  }
};

const updateVideoSequence = async (req, res) => {
  try {
    const { orderedIds } = req.body;
    if (!Array.isArray(orderedIds)) {
      return res.status(400).json({ status: false, msg: "orderedIds is required" });
    }

    const bulkOps = orderedIds.map((id, index) => ({
      updateOne: {
        filter: { _id: id },
        update: { $set: { sequence: index } },
      },
    }));

    await Video.bulkWrite(bulkOps);
    return res.status(200).json({ status: true, msg: "Video sequence updated" });
  } catch (error) {
    return res.status(500).json({ status: false, msg: error.message });
  }
};

const updateVideoFolderSequence = async (req, res) => {
  try {
    const { folderNames, parentId } = req.body;
    if (!Array.isArray(folderNames)) {
      return res.status(400).json({ status: false, msg: "folderNames is required" });
    }

    const bulkOps = folderNames.map((name, index) => ({
      updateOne: {
        filter: { title: "__folder__", folder: name, parentId: parentId || null },
        update: { $set: { sequence: index } },
      },
    }));

    await Video.bulkWrite(bulkOps);
    return res.status(200).json({ status: true, msg: "Folder sequence updated" });
  } catch (error) {
    return res.status(500).json({ status: false, msg: error.message });
  }
};

const deleteFolder = async (req, res) => {
  try {
    const folder = (req.params?.folder || "").trim();
    console.log(`[VideoController] Deleting folder: "${folder}"`);

    const rows = await Video.find({ folder });
    
    for (const row of rows) {
      if (row.public_id && row.public_id !== "null" && !String(row.public_id).startsWith("youtube:")) {
        try {
          await cloudinary.uploader.destroy(row.public_id, { resource_type: "video" });
        } catch (e) {
          console.log("Cloudinary cleanup error:", e.message);
        }
      }
    }

    await Video.deleteMany({ folder });
    res.status(200).json({ status: true, msg: "Folder deleted" });
  } catch (error) {
    res.status(500).json({ status: false, msg: error.message });
  }
};

const renameFolder = async (req, res) => {
  try {
    const oldName = (req.params?.folder || "").trim();
    const newName = (req.body?.newName || "").trim();
    if (!oldName || !newName) {
      return res.status(400).json({ status: false, msg: "Old and new folder names are required." });
    }
    if (oldName === newName) {
      return res.status(200).json({ status: true, msg: "No change needed." });
    }

    const exists = await Video.exists({ title: "__folder__", folder: newName });
    if (exists) {
      return res.status(409).json({ status: false, msg: "Folder name already exists." });
    }

    await Video.updateMany({ folder: oldName }, { $set: { folder: newName } });
    return res.status(200).json({ status: true, msg: "Folder renamed successfully." });
  } catch (error) {
    return res.status(500).json({ status: false, msg: error.message });
  }
};

const cleanupInvalidFolders = async (req, res) => {
  try {
    const invalidNames = [null, "", "general", "undefined", "null"];
    const result = await Video.deleteMany({
      title: "__folder__",
      $or: [
        { folder: { $in: invalidNames } },
        { folder: { $exists: false } }
      ]
    });
    console.log(`[VideoController] Migration: Cleaned up ${result.deletedCount} invalid folder records.`);
    return res.status(200).json({ 
      status: true, 
      msg: `Cleanup successful. Removed ${result.deletedCount} records.` 
    });
  } catch (error) {
    return res.status(500).json({ status: false, msg: error.message });
  }
};

module.exports = {
  uploadVideo,
  addYoutubeVideo,
  updateYoutubeVideo,
  getAllVideos,
  deleteVideo,
  getFolders,
  createFolder,
  deleteFolder,
  renameFolder,
  updateVideoSequence,
  updateVideoFolderSequence,
  cleanupInvalidFolders,
};

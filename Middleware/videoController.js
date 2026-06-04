const Video = require("../Modal/VideoModal");
const { cloudinary } = require("../config/cloudinary");

// Upload videos
const uploadVideo = async (req, res) => {
  try {
    const { title, folder } = req.body;
    const files = req.files;
    const targetFolder = folder || "General";

    if (!files || files.length === 0) {
      return res.status(400).json({ msg: "No video files uploaded." });
    }

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

// Get all videos
const getAllVideos = async (req, res) => {
  try {
    const { folder } = req.query;
    const query = { videoUrl: { $ne: "" } };
    if (folder) query.folder = folder;

    const videos = await Video.find(query).sort({ createdAt: -1 });
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
    const grouped = await Video.aggregate([
      { $group: { _id: "$folder", count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);
    const folders = grouped
      .filter((row) => row._id)
      .map((row) => ({ name: row._id, count: row.count }));
    res.status(200).json({ status: true, data: folders });
  } catch (error) {
    res.status(500).json({ status: false, msg: error.message });
  }
};

const createFolder = async (req, res) => {
  try {
    const folder = (req.body?.folder || "").trim();
    if (!folder) return res.status(400).json({ status: false, msg: "Folder name required" });

    const exists = await Video.exists({ folder });
    if (exists) return res.status(200).json({ status: true, msg: "Exists", folder });

    await Video.create({ title: "__folder__", folder, videoUrl: "null", public_id: "null" });
    res.status(201).json({ status: true, msg: "Folder created", folder });
  } catch (error) {
    res.status(500).json({ status: false, msg: error.message });
  }
};

const deleteFolder = async (req, res) => {
  try {
    const folder = (req.params?.folder || "").trim();
    const rows = await Video.find({ folder });
    
    for (const row of rows) {
      if (row.public_id && row.public_id !== "null") {
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

module.exports = {
  uploadVideo,
  getAllVideos,
  deleteVideo,
  getFolders,
  createFolder,
  deleteFolder,
};

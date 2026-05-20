const Video = require("../Modal/VideoModal");
const { cloudinary } = require("../config/cloudinary");

// Upload videos
const uploadVideo = async (req, res) => {
  try {
    console.log("Received files:", req.files);
    const { title } = req.body;
    const files = req.files;

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
    const videos = await Video.find().sort({ createdAt: -1 });
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

module.exports = {
  uploadVideo,
  getAllVideos,
  deleteVideo,
};

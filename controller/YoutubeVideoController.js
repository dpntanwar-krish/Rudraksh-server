const YoutubeVideo = require("../Modal/YoutubeVideoModal");
const {
  extractVideoId,
  validateYoutubeUrl,
  generateThumbnailUrl,
} = require("../utils/youtubeUtils");

const sendValidationError = (res, error) => {
  if (error?.name === "ValidationError") {
    const message = Object.values(error.errors || {})
      .map((e) => e.message)
      .join(", ");
    return res.status(400).json({ success: false, message: message || "Validation failed" });
  }
  if (error?.code === 11000) {
    return res.status(409).json({ success: false, message: "This video has already been added" });
  }
  return null;
};

// POST - Add new YouTube video
const addVideo = async (req, res) => {
  try {
    const { title, youtubeUrl, category, description } = req.body;
    const trimmedTitle = typeof title === "string" ? title.trim() : "";

    // Validate required fields
    if (!trimmedTitle || !youtubeUrl || !category) {
      return res.status(400).json({
        success: false,
        message: "Title, YouTube URL, and category are required",
      });
    }

    if (trimmedTitle.length < 3) {
      return res.status(400).json({
        success: false,
        message: "Title must be at least 3 characters",
      });
    }

    if (trimmedTitle.length > 100) {
      return res.status(400).json({
        success: false,
        message: "Title cannot exceed 100 characters",
      });
    }

    // Validate YouTube URL
    if (!validateYoutubeUrl(youtubeUrl)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid YouTube URL format. Supported: youtube.com/watch?v=, youtu.be/, youtube.com/embed/",
      });
    }

    // Extract video ID
    const videoId = extractVideoId(youtubeUrl);
    if (!videoId) {
      return res.status(400).json({
        success: false,
        message: "Could not extract video ID from URL",
      });
    }

    // Check if video already exists
    const existingVideo = await YoutubeVideo.findOne({ videoId });
    if (existingVideo) {
      return res.status(409).json({
        success: false,
        message: "This video has already been added",
      });
    }

    // Generate thumbnail URL
    const thumbnail = generateThumbnailUrl(videoId);

    const lastVideo = await YoutubeVideo.findOne().sort({ sequence: -1 });
    const sequence = (lastVideo?.sequence || 0) + 1;

    // Create new video
    const newVideo = new YoutubeVideo({
      title: trimmedTitle,
      youtubeUrl,
      videoId,
      thumbnail,
      category,
      description: description || "",
      sequence,
    });

    await newVideo.save();

    res.status(201).json({
      success: true,
      message: "Video added successfully",
      data: newVideo,
    });
  } catch (error) {
    const validationResponse = sendValidationError(res, error);
    if (validationResponse) return validationResponse;
    console.error("Error adding video:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Server error while adding video",
    });
  }
};

// GET - Fetch all videos (with filters)
const getAllVideos = async (req, res) => {
  try {
    const { category, search, page = 1, limit = 12, sortBy = "createdAt", includeInactive } = req.query;

    const query = {};
    if (includeInactive !== "true") {
      query.isActive = true;
    }

    // Category filter
    if (category && category !== "All") {
      query.category = category;
    } else {
      query.category = { $ne: "Promotional" };
    }

    // Search filter
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Determine sort order
    let sortObject = {};
    if (sortBy === "newest") {
      sortObject = { createdAt: -1 };
    } else if (sortBy === "oldest") {
      sortObject = { createdAt: 1 };
    } else if (sortBy === "popular") {
      sortObject = { views: -1 };
    } else {
      sortObject = { sequence: 1, createdAt: -1 };
    }

    // Fetch videos
    const videos = await YoutubeVideo.find(query)
      .sort(sortObject)
      .skip(skip)
      .limit(parseInt(limit));

    // Total count for pagination
    const totalVideos = await YoutubeVideo.countDocuments(query);

    res.status(200).json({
      success: true,
      data: videos,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalVideos / limit),
        totalVideos,
        videosPerPage: parseInt(limit),
      },
    });
  } catch (error) {
    console.error("Error fetching videos:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching videos",
      error: error.message,
    });
  }
};

// GET - Fetch videos by category
const getVideosByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const decodedCategory = decodeURIComponent(category);
    const { page = 1, limit = 12 } = req.query;

    const validCategories = [
      "Photoshoot & Video",
      "Events",
      "Video Gallery",
    ];

    if (!validCategories.includes(decodedCategory)) {
      return res.status(400).json({
        success: false,
        message: "Invalid category",
      });
    }

    const skip = (page - 1) * limit;

    const videos = await YoutubeVideo.find({
      category: decodedCategory,
      isActive: true,
    })
      .sort({ sequence: 1, createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const totalVideos = await YoutubeVideo.countDocuments({
      category: decodedCategory,
      isActive: true,
    });

    res.status(200).json({
      success: true,
      data: videos,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalVideos / limit),
        totalVideos,
      },
    });
  } catch (error) {
    console.error("Error fetching videos by category:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching videos",
      error: error.message,
    });
  }
};

// GET - Fetch single video by ID
const getVideoById = async (req, res) => {
  try {
    const { id } = req.params;

    const video = await YoutubeVideo.findById(id);

    if (!video) {
      return res.status(404).json({
        success: false,
        message: "Video not found",
      });
    }

    // Increment views
    video.views = (video.views || 0) + 1;
    await video.save();

    res.status(200).json({
      success: true,
      data: video,
    });
  } catch (error) {
    console.error("Error fetching video:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching video",
      error: error.message,
    });
  }
};

// PUT - Update video
const updateVideo = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, youtubeUrl, category, description, isActive } = req.body;

    const video = await YoutubeVideo.findById(id);

    if (!video) {
      return res.status(404).json({
        success: false,
        message: "Video not found",
      });
    }

    // Update fields
    if (title !== undefined) {
      const trimmedTitle = String(title).trim();
      if (trimmedTitle.length < 3) {
        return res.status(400).json({ success: false, message: "Title must be at least 3 characters" });
      }
      if (trimmedTitle.length > 100) {
        return res.status(400).json({ success: false, message: "Title cannot exceed 100 characters" });
      }
      video.title = trimmedTitle;
    }
    if (description !== undefined) video.description = description;
    if (category) video.category = category;
    if (isActive !== undefined) video.isActive = isActive;

    // If YouTube URL is updated, re-validate and extract video ID
    if (youtubeUrl && youtubeUrl !== video.youtubeUrl) {
      if (!validateYoutubeUrl(youtubeUrl)) {
        return res.status(400).json({
          success: false,
          message: "Invalid YouTube URL format",
        });
      }

      const videoId = extractVideoId(youtubeUrl);
      if (!videoId) {
        return res.status(400).json({
          success: false,
          message: "Could not extract video ID from URL",
        });
      }

      // Check if new video ID already exists
      const existingVideo = await YoutubeVideo.findOne({
        videoId,
        _id: { $ne: id },
      });
      if (existingVideo) {
        return res.status(409).json({
          success: false,
          message: "This video has already been added",
        });
      }

      video.youtubeUrl = youtubeUrl;
      video.videoId = videoId;
      video.thumbnail = generateThumbnailUrl(videoId);
    }

    await video.save();

    res.status(200).json({
      success: true,
      message: "Video updated successfully",
      data: video,
    });
  } catch (error) {
    const validationResponse = sendValidationError(res, error);
    if (validationResponse) return validationResponse;
    console.error("Error updating video:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Server error while updating video",
    });
  }
};

// DELETE - Delete video
const deleteVideo = async (req, res) => {
  try {
    const { id } = req.params;

    const video = await YoutubeVideo.findByIdAndDelete(id);

    if (!video) {
      return res.status(404).json({
        success: false,
        message: "Video not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Video deleted successfully",
      data: video,
    });
  } catch (error) {
    console.error("Error deleting video:", error);
    res.status(500).json({
      success: false,
      message: "Server error while deleting video",
      error: error.message,
    });
  }
};

// PUT - Reorder videos
const reorderVideos = async (req, res) => {
  try {
    const { orderedIds } = req.body;
    if (!orderedIds || !Array.isArray(orderedIds) || orderedIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "orderedIds array is required",
      });
    }

    const bulkOps = orderedIds.map((id, index) => ({
      updateOne: {
        filter: { _id: id },
        update: { $set: { sequence: index + 1 } },
      },
    }));

    await YoutubeVideo.bulkWrite(bulkOps);

    res.status(200).json({
      success: true,
      message: "Video sequence updated",
    });
  } catch (error) {
    console.error("Error reordering videos:", error);
    res.status(500).json({
      success: false,
      message: "Server error while updating video sequence",
      error: error.message,
    });
  }
};

// GET - Get all available categories
const getCategories = async (req, res) => {
  try {
    const categories = [
      "Photoshoot & Video",
      "Events",
      "Video Gallery",
    ];

    const categoryCounts = await Promise.all(
      categories.map(async (cat) => ({
        name: cat,
        count: await YoutubeVideo.countDocuments({
          category: cat,
          isActive: true,
        }),
      }))
    );

    res.status(200).json({
      success: true,
      data: categoryCounts,
    });
  } catch (error) {
    console.error("Error fetching categories:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching categories",
      error: error.message,
    });
  }
};

module.exports = {
  addVideo,
  getAllVideos,
  getVideosByCategory,
  getVideoById,
  updateVideo,
  deleteVideo,
  reorderVideos,
  getCategories,
};

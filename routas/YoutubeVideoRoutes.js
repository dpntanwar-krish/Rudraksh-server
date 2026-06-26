const express = require("express");
const router = express.Router();
const { requireAdminAuth } = require("../Middleware/adminAuthMiddleware");
const {
  addVideo,
  getAllVideos,
  getVideosByCategory,
  getVideoById,
  updateVideo,
  deleteVideo,
  reorderVideos,
  getCategories,
} = require("../controller/YoutubeVideoController");

// POST - Add new video
router.post("/", requireAdminAuth, addVideo);

// GET - Fetch all videos with filters
router.get("/", getAllVideos);

// GET - Get all categories
router.get("/categories/list", getCategories);

// PUT - Reorder videos
router.put("/sequence", requireAdminAuth, reorderVideos);

// GET - Fetch videos by category
router.get("/category/:category", getVideosByCategory);

// GET - Fetch single video by ID
router.get("/:id", getVideoById);

// PUT - Update video
router.put("/:id", requireAdminAuth, updateVideo);

// DELETE - Delete video
router.delete("/:id", requireAdminAuth, deleteVideo);

module.exports = router;

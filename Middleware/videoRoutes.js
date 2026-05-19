const express = require("express");
const router = express.Router();
const {
  uploadVideo,
  getAllVideos,
  deleteVideo,
} = require("./videoController");
const upload = require("./multer");

// POST /api/Video/upload
router.post("/upload", upload.array("videos"), uploadVideo);

// GET /api/Video/videos
router.get("/videos", getAllVideos);

// DELETE /api/Video/delete/:id
router.delete("/delete/:id", deleteVideo);

module.exports = router;

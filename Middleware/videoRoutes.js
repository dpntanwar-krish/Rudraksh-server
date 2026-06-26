const express = require("express");
const router = express.Router();
const { requireAdminAuth } = require("./adminAuthMiddleware");
const {
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
} = require("./videoController");
const upload = require("./multer");

// POST /api/Video/upload
router.post("/upload", requireAdminAuth, upload.array("videos"), uploadVideo);
router.post("/youtube", requireAdminAuth, addYoutubeVideo);
router.put("/youtube/:id", requireAdminAuth, updateYoutubeVideo);

// GET /api/Video/videos
router.get("/videos", getAllVideos);

// Folders
router.get("/folders", getFolders);
router.post("/create-folder", requireAdminAuth, createFolder);
router.delete("/delete-folder/:folder", requireAdminAuth, deleteFolder);
router.put("/rename-folder/:folder", requireAdminAuth, renameFolder);
router.put("/folders/sequence", requireAdminAuth, updateVideoFolderSequence);
router.delete("/cleanup-folders", requireAdminAuth, cleanupInvalidFolders);
router.put("/videos/sequence", requireAdminAuth, updateVideoSequence);

// DELETE /api/Video/delete/:id
router.delete("/delete/:id", requireAdminAuth, deleteVideo);

module.exports = router;

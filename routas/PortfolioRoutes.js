const express = require("express");
const portfolioUpload = require("../Middleware/portfolioUpload");
const { requireAdminAuth } = require("../Middleware/adminAuthMiddleware");
const {
  getFolders,
  createFolder,
  updateFolder,
  deleteFolder,
  reorderFolders,
  uploadItem,
  getItems,
  updateItem,
  deleteItem,
  reorderItems,
  getPortfolioCounts,
} = require("../controller/PortfolioController");

const router = express.Router();

// ==========================================
// Folder Management Routes
// ==========================================
router.get("/folders", getFolders);
router.post("/create-folder", requireAdminAuth, portfolioUpload.single("file"), createFolder);
router.put("/update-folder/:id", requireAdminAuth, portfolioUpload.single("file"), updateFolder);
router.delete("/delete-folder/:id", requireAdminAuth, deleteFolder);
router.put("/folders/sequence", requireAdminAuth, reorderFolders);

// ==========================================
// Portfolio Item Management Routes
// ==========================================
router.get("/items", getItems);
router.post(
  "/upload-item",
  requireAdminAuth,
  (req, res, next) => {
    portfolioUpload.fields([
      { name: "files", maxCount: 12 },
      { name: "thumbnail", maxCount: 1 },
    ])(req, res, (err) => {
      if (err) {
        return res.status(400).json({ status: false, msg: err.message || "Upload failed." });
      }
      next();
    });
  },
  uploadItem
);
router.delete("/delete-item/:id", requireAdminAuth, deleteItem);
router.put(
  "/update-item/:id",
  requireAdminAuth,
  (req, res, next) => {
    portfolioUpload.fields([{ name: "files", maxCount: 1 }])(req, res, (err) => {
      if (err) {
        return res.status(400).json({ status: false, msg: err.message || "Upload failed." });
      }
      next();
    });
  },
  updateItem
);
router.put("/items/sequence", requireAdminAuth, reorderItems);

// Dashboard Stats
router.get("/count", getPortfolioCounts);

module.exports = router;

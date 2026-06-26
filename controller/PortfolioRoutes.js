const express = require("express");
const router = express.Router();
const portfolioController = require("../controller/PortfolioController");
const upload = require("../Middleware/upload"); // Assuming you have a multer middleware for file uploads

// POST /api/Portfolio/upload - Upload new portfolio items
router.post("/upload", upload.array("files"), portfolioController.Upload);

// GET /api/Portfolio/files - Get portfolio items (optionally by folder)
router.get("/files", portfolioController.getFiles);

// DELETE /api/Portfolio/deleteImage/:id - Delete a specific portfolio item
router.delete("/deleteImage/:id", portfolioController.DelImg);

// GET /api/Portfolio/folders - Get portfolio folders
router.get("/folders", portfolioController.getFolders);

// POST /api/Portfolio/create-folder - Create a new portfolio folder
router.post("/create-folder", portfolioController.createFolder);

// DELETE /api/Portfolio/delete-folder/:folder - Delete a portfolio folder and its contents
router.delete("/delete-folder/:folder", portfolioController.deleteFolder);

// PUT /api/Portfolio/files/sequence - Update sequence of portfolio items
router.put("/files/sequence", portfolioController.updateFileSequence);

// PUT /api/Portfolio/folders/sequence - Update sequence of portfolio folders
router.put("/folders/sequence", portfolioController.updateFolderSequence);

module.exports = router;
const express = require("express");

const router = express.Router();

const upload = require("../Middleware/upload");
const { requireAdminAuth } = require("../Middleware/adminAuthMiddleware");

const {
    Upload,
    getFiles,
    DelImg,
    getFolders,
    createFolder,
    deleteFolder,
    updateFolderSequence,
    updateFileSequence,
    renameFolder,
    updateFileItem,
} = require("../controller/Filecontroller");

/* Upload */

// frontend sends multiple files under field name "files"
router.post("/upload", requireAdminAuth, (req, res, next) => {
    upload.array("files")(req, res, (err) => {
        if (err) {
            console.error("[Multer] Upload middleware error:", err.message);
            return res.status(400).json({
                status: false,
                msg: err.message,
            });
        }
        next();
    });
}, Upload);

/* Get */

router.get("/files",getFiles );
router.get("/folders", getFolders);
router.post("/create-folder", requireAdminAuth, createFolder);
router.delete("/delete-folder/:folder", requireAdminAuth, deleteFolder);
router.put("/rename-folder/:folder", requireAdminAuth, renameFolder);
router.put("/folders/sequence", requireAdminAuth, updateFolderSequence);
router.put("/files/sequence", requireAdminAuth, updateFileSequence);
router.put("/files/:id", requireAdminAuth, updateFileItem);

/* Delete */

router.get("/deleteImage/:id", requireAdminAuth, DelImg);
                                                            
module.exports = router;

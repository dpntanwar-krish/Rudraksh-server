const express = require("express");

const router = express.Router();

const upload = require("../Middleware/upload");

const { Upload, getFiles, DelImg, getFolders, createFolder, deleteFolder } = require("../controller/Filecontroller");

/* Upload */

// frontend sends multiple files under field name "files"
router.post("/upload", (req, res, next) => {
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
router.post("/create-folder", createFolder);
router.delete("/delete-folder/:folder", deleteFolder);

/* Delete */

router.get("/deleteImage/:id", DelImg);
                                                            
module.exports = router;

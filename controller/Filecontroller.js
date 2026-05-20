const FileRef = require("../Modal/FileModal");
const { cloudinary, isCloudinaryConfigured } = require("../config/cloudinary");
const fs = require("fs");

/* Upload File(s) */
const Upload = async (req, res) => {
    try {
        console.log("[Upload] Request received", {
            contentType: req.headers["content-type"],
            body: req.body,
            hasReqFiles: Boolean(req.files),
            fileCount: Array.isArray(req.files) ? req.files.length : 0,
        });

        if (!isCloudinaryConfigured) {
            console.error("[Upload] Cloudinary env is missing. Check CLOUD_NAME/API_KEY/API_SECRET.");
            return res.status(500).json({
                status: false,
                msg: "Cloudinary configuration is missing on server.",
            });
        }

        const title = req.body.title || "";
        const folder = (req.body.folder || "gallery").trim() || "gallery";
        const files = Array.isArray(req.files)
            ? req.files
            : req.file
                ? [req.file]
                : [];

        if (!files.length) {
            return res.status(400).json({
                status: false,
                msg: "No files uploaded. Use field name 'files' in multipart/form-data.",
            });
        }

        const docs = [];

        for (const file of files) {
            if (!file.path) {
                throw new Error(`Multer file.path is missing for ${file.originalname || "unknown file"}`);
            }

            console.log("[Upload] Uploading to Cloudinary", {
                originalname: file.originalname,
                mimetype: file.mimetype,
                size: file.size,
                tempPath: file.path,
            });

            const uploadResult = await cloudinary.uploader.upload(file.path, {
                folder: "rudraksh_uploads",
            });

            docs.push({
                title,
                folder,
                imageUrl: uploadResult.secure_url,
                public_id: uploadResult.public_id,
            });

            if (file.path) {
                try {
                    await fs.promises.unlink(file.path);
                } catch (unlinkErr) {
                    console.log("Could not delete local file:", unlinkErr.message);
                }
            }
        }

        const savedDocs = await FileRef.insertMany(docs);
        console.log("[Upload] Saved docs in MongoDB", { count: savedDocs.length });

        return res.status(201).json({ status: true, msg: savedDocs });
    } catch (err) {
        console.error("[Upload] Failed", {
            message: err.message,
            stack: err.stack,
        });
        return res.status(500).json({ status: false, msg: err.message });
    }
};

/* Get Files */
const getFiles = async (req, res) => {
    try {
        const files = await FileRef.find({ imageUrl: { $ne: "" } }).sort({ createdAt: -1 });
        return res.status(200).json(files);
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

/* Delete File */
const DelImg = async (req, res) => {
    try {
        const id = req.params.id;
        const now = new Date().toISOString();
        const result = await FileRef.findByIdAndDelete(id);

        if (result) {
            return res.json({ status: true, msg: "Deleted successfully.", deletedAt: now });
        }

        return res.json({ status: false, msg: "Image not found.", checkedAt: now });
    } catch (err) {
        return res.json({ status: false, msg: err.message, checkedAt: new Date().toISOString() });
    }
};

const getFolders = async (req, res) => {
    try {
        const grouped = await FileRef.aggregate([
            {
                $group: {
                    _id: "$folder",
                    count: { $sum: 1 },
                },
            },
            { $sort: { _id: 1 } },
        ]);

        const folders = grouped
            .filter((row) => row._id)
            .map((row) => ({ name: row._id, count: row.count }));

        return res.status(200).json({ status: true, data: folders });
    } catch (error) {
        return res.status(500).json({ status: false, msg: error.message });
    }
};

const createFolder = async (req, res) => {
    try {
        const folder = (req.body?.folder || "").trim();
        if (!folder) {
            return res.status(400).json({ status: false, msg: "Folder name is required." });
        }

        const exists = await FileRef.exists({ folder });
        if (exists) {
            return res.status(200).json({ status: true, msg: "Folder already exists.", folder });
        }

        await FileRef.create({
            title: "__folder__",
            folder,
            imageUrl: "",
            public_id: "",
        });

        return res.status(201).json({ status: true, msg: "Folder created.", folder });
    } catch (error) {
        return res.status(500).json({ status: false, msg: error.message });
    }
};

const deleteFolder = async (req, res) => {
    try {
        const folder = (req.params?.folder || "").trim();
        if (!folder) {
            return res.status(400).json({ status: false, msg: "Folder is required." });
        }

        const rows = await FileRef.find({ folder });
        if (!rows.length) {
            return res.status(404).json({ status: false, msg: "Folder not found." });
        }

        for (const row of rows) {
            if (row.public_id) {
                try {
                    await cloudinary.uploader.destroy(row.public_id);
                } catch (cloudErr) {
                    console.log("Cloudinary delete failed:", cloudErr.message);
                }
            }
        }

        await FileRef.deleteMany({ folder });
        return res.status(200).json({ status: true, msg: "Folder deleted successfully." });
    } catch (error) {
        return res.status(500).json({ status: false, msg: error.message });
    }
};

module.exports = { Upload, getFiles, DelImg, getFolders, createFolder, deleteFolder };

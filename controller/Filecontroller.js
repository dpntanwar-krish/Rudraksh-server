const FileRef = require("../Modal/FileModal");
const { cloudinary, isCloudinaryConfigured } = require("../config/cloudinary");
const fs = require("fs");
const mongoose = require("mongoose");

const getCloudinaryResourceType = (mimetype = "") => {
    if (mimetype === "application/pdf") return "raw";
    return "image";
};

const uploadToCloudinary = async (file) => {
    const resourceType = getCloudinaryResourceType(file.mimetype);
    const uploadResult = await cloudinary.uploader.upload(file.path, {
        folder: "rudraksh_uploads",
        resource_type: resourceType,
        use_filename: true,
        unique_filename: true,
    });

    return { uploadResult, resourceType };
};

const imageFileQuery = (folder) => {
    const query = {
        imageUrl: { $exists: true, $type: "string", $regex: /\S/ },
    };
    if (folder) {
        query.folder = folder;
    }
    return query;
};

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

            const lastFile = await FileRef.findOne(imageFileQuery(folder)).sort({ sequence: -1 });
            let nextSeq = lastFile ? (lastFile.sequence || 0) + 1 : 0;

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

                const { uploadResult, resourceType } = await uploadToCloudinary(file);

                docs.push({
                    title,
                    folder,
                    imageUrl: uploadResult.secure_url,
                    public_id: uploadResult.public_id,
                    resourceType,
                    mimeType: file.mimetype || "",
                    originalName: file.originalname || "",
                    sequence: nextSeq++,
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
            const { folder } = req.query;
            const files = await FileRef.find(imageFileQuery(folder)).sort({ sequence: 1, createdAt: -1 });
            console.log("[Filecontroller] getFiles", {
                folder: folder || "(all)",
                count: files.length,
                sequences: files.map((f) => ({ id: f._id, folder: f.folder, sequence: f.sequence })),
            });
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
                if (result.public_id) {
                    try {
                        await cloudinary.uploader.destroy(result.public_id, {
                            resource_type: result.resourceType || (result.mimeType === "application/pdf" ? "raw" : "image"),
                        });
                    } catch (cloudErr) {
                        console.log("Cloudinary delete failed:", cloudErr.message);
                    }
                }
                return res.json({ status: true, msg: "Deleted successfully.", deletedAt: now });
            }

            return res.json({ status: false, msg: "Image not found.", checkedAt: now });
        } catch (err) {
            return res.json({ status: false, msg: err.message, checkedAt: new Date().toISOString() });
        }
    };

    const getFolders = async (req, res) => {
        try {
            const { parentId } = req.query;
            // Fetch folder placeholders for specific level sorted by sequence
            const query = { title: "__folder__", parentId: parentId || null };
            const placeholders = await FileRef.find(query).sort({ sequence: 1 });
        
            // Aggregate counts for all files in folders
            const targetParentId = parentId || null;
            const grouped = await FileRef.aggregate([
                {
                    $match: { parentId: targetParentId, title: { $ne: "__folder__" } } // Match files within the current parentId
                },
                {
                    $group: {
                        _id: "$folder",
                        count: { $sum: 1 }, // Count actual files
                    },
                },
            ]);

            const countMap = grouped.reduce((acc, curr) => {
                acc[curr._id] = curr.count;
                return acc;
            }, {});

            const folders = placeholders.map(p => ({
                name: p.folder,
                count: countMap[p.folder] || 0,
                sequence: p.sequence ?? 0
            }));

            return res.status(200).json({ status: true, data: folders });
        } catch (error) {
            return res.status(500).json({ status: false, msg: error.message });
        }
    };

    const updateFileSequence = async (req, res) => {
        try {
            const { orderedIds, folder } = req.body;
            if (!Array.isArray(orderedIds)) {
                return res.status(400).json({ status: false, msg: "orderedIds is required" });
            }
            if (!folder || typeof folder !== "string") {
                return res.status(400).json({ status: false, msg: "folder is required" });
            }
            if (!orderedIds.length) {
                return res.status(400).json({ status: false, msg: "orderedIds cannot be empty" });
            }

            const normalizedFolder = folder.trim();
            const uniqueIds = [...new Set(orderedIds.map(String))];

            console.log("[Filecontroller] updateFileSequence request", {
                folder: normalizedFolder,
                orderedIds: uniqueIds,
            });

            const folderFiles = await FileRef.find(imageFileQuery(normalizedFolder)).select("_id");
            const folderIdSet = new Set(folderFiles.map((f) => String(f._id)));
            const missingIds = uniqueIds.filter((id) => !folderIdSet.has(id));

            if (missingIds.length) {
                console.warn("[Filecontroller] updateFileSequence invalid ids for folder", {
                    folder: normalizedFolder,
                    missingIds,
                });
                return res.status(400).json({
                    status: false,
                    msg: "orderedIds must only contain image ids from the specified folder",
                });
            }

            const bulkOps = uniqueIds
                .filter(id => mongoose.isValidObjectId(id))
                .map((id, index) => ({
                    updateOne: {
                        filter: { 
                            _id: new mongoose.Types.ObjectId(id), 
                            folder: normalizedFolder 
                        },
                        update: { $set: { sequence: index } },
                    },
                }));

            const result = await FileRef.bulkWrite(bulkOps);
            console.log("[Filecontroller] updateFileSequence bulkWrite", {
                folder: normalizedFolder,
                matchedCount: result.matchedCount,
                modifiedCount: result.modifiedCount,
                sequences: uniqueIds.map((id, index) => ({ id, sequence: index })),
            });

            return res.status(200).json({ status: true, msg: "File sequence updated" });
        } catch (error) {
            console.error("[Filecontroller] updateFileSequence error", error);
            return res.status(500).json({ status: false, msg: error.message });
        }
    };

    const updateFolderSequence = async (req, res) => {
        try {
            const { folderIds, folderNames, parentId = null } = req.body;
            const bulkOps = [];

            if (folderIds && Array.isArray(folderIds)) {
                folderIds.forEach((id, index) => {
                    if (!mongoose.isValidObjectId(id)) return;
                    bulkOps.push({
                        updateOne: {
                            filter: { _id: new mongoose.Types.ObjectId(id) },
                            update: { $set: { sequence: index } },
                        },
                    });
                });
            } else if (folderNames && Array.isArray(folderNames)) {
                const targetParentId = parentId || null;
                const existingFolders = await FileRef.find({ 
                    title: "__folder__", 
                    parentId: targetParentId 
                });

                const folderLookup = existingFolders.reduce((acc, doc) => {
                    acc[doc.folder.trim()] = doc._id;
                    return acc;
                }, {});

                folderNames.forEach((name, index) => {
                    const id = folderLookup[String(name).trim()];
                    if (!id) return;
                    bulkOps.push({
                        updateOne: {
                            filter: { _id: id },
                            update: { $set: { sequence: index } },
                        },
                    });
                });
            } else {
                return res.status(400).json({ status: false, msg: "folderIds or folderNames is required" });
            }

            if (!bulkOps.length) {
                return res.status(400).json({ status: false, msg: 'No matching folders found' });
            }

            const result = await FileRef.bulkWrite(bulkOps);
            console.log('[Filecontroller] updateFolderSequence result', { matchedCount: result.matchedCount, modifiedCount: result.modifiedCount });

            return res.status(200).json({ status: true, msg: "Sequence updated", matchedCount: result.matchedCount, modifiedCount: result.modifiedCount });
        } catch (error) {
            return res.status(500).json({ status: false, msg: error.message });
        }
    };

    const createFolder = async (req, res) => {
        try {
            const folder = (req.body?.folder || "").trim();
            const parentId = req.body?.parentId || null;
            if (!folder) {
                return res.status(400).json({ status: false, msg: "Folder name is required." });
            }
        
            const exists = await FileRef.exists({ folder, parentId });
            if (exists) {
                return res.status(200).json({ status: true, msg: "Folder already exists.", folder });
            }

            const lastFolder = await FileRef.findOne({ title: "__folder__", parentId }).sort({ sequence: -1 });
            const nextSeq = lastFolder ? (lastFolder.sequence || 0) + 1 : 0;

            await FileRef.create({
                title: "__folder__",
                folder,
                imageUrl: "",
                public_id: "",
                parentId,
                sequence: nextSeq,
            });

            return res.status(201).json({ status: true, msg: "Folder created.", folder });
        } catch (error) {
            return res.status(500).json({ status: false, msg: error.message });
        }
    };

    const deleteFolder = async (req, res) => { // Marked as async
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
                        await cloudinary.uploader.destroy(row.public_id, {
                            resource_type: row.resourceType || (row.mimeType === "application/pdf" ? "raw" : "image"),
                        });
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

    const renameFolder = async (req, res) => {
        try {
            const oldName = (req.params?.folder || "").trim();
            const newName = (req.body?.newName || "").trim();
            if (!oldName || !newName) {
                return res.status(400).json({ status: false, msg: "Old and new folder names are required." });
            }
            if (oldName === newName) {
                return res.status(200).json({ status: true, msg: "No change needed." });
            }

            const exists = await FileRef.exists({ title: "__folder__", folder: newName });
            if (exists) {
                return res.status(409).json({ status: false, msg: "Folder name already exists." });
            }

            await FileRef.updateMany({ folder: oldName }, { $set: { folder: newName } });
            return res.status(200).json({ status: true, msg: "Folder renamed successfully." });
        } catch (error) {
            return res.status(500).json({ status: false, msg: error.message });
        }
    };

    const updateFileItem = async (req, res) => {
        try {
            const id = req.params?.id;
            const title = String(req.body?.title || "").trim();
            if (!id || !mongoose.isValidObjectId(id)) {
                return res.status(400).json({ status: false, msg: "Valid file id is required." });
            }

            const doc = await FileRef.findById(id);
            if (!doc) {
                return res.status(404).json({ status: false, msg: "File not found." });
            }
            if (doc.title === "__folder__") {
                return res.status(400).json({ status: false, msg: "Cannot update folder placeholder title." });
            }

            doc.title = title;
            await doc.save();
            return res.status(200).json({ status: true, msg: "File updated successfully.", data: doc });
        } catch (error) {
            return res.status(500).json({ status: false, msg: error.message });
        }
    };

module.exports = {
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
};

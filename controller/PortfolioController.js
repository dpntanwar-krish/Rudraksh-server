const fs = require("fs");
const mongoose = require("mongoose");
const { PortfolioFolder, PortfolioItem } = require("../Modal/PortfolioModal");
const { cloudinary, isCloudinaryConfigured } = require("../config/cloudinary");

const cleanupLocalFile = async (filePath) => {
  if (!filePath) return;
  try {
    await fs.promises.unlink(filePath);
  } catch (error) {
    console.log("Portfolio temp cleanup skipped:", error.message);
  }
};

const getPortfolioResourceType = (type, mimetype = "") => {
  if (type === "video" || mimetype.startsWith("video/")) return "video";
  if (type === "pdf" || mimetype === "application/pdf") return "raw";
  return "image";
};

const uploadFile = async (file, resourceType = "auto") => {
  if (!isCloudinaryConfigured) {
    throw new Error("Cloudinary is not configured. Set CLOUD_NAME, API_KEY, API_SECRET in server .env");
  }
  const uploaded = await cloudinary.uploader.upload(file.path, {
    folder: "rudraksh_portfolio",
    resource_type: resourceType,
    use_filename: true,
    unique_filename: true,
  });
  await cleanupLocalFile(file.path);
  return uploaded;
};

const isValidHttpUrl = (value = "") => {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch (error) {
    return false;
  }
};

const getFolders = async (req, res) => {
  try {
    const parentId = req.query.parentId || null;
    
    const category = req.query.category;
    const filters = { parentId, category };

    const folders = await PortfolioFolder.find(filters).sort({ sequence: 1, createdAt: -1 }).lean();
    
    const foldersWithCounts = await Promise.all(
      folders.map(async (folder) => {
        const count = await PortfolioItem.countDocuments({ folderId: String(folder._id), category });
        return { ...folder, count };
      })
    );
    
    res.json({ status: true, data: foldersWithCounts });
  } catch (err) {
    res.status(500).json({ status: false, msg: err.message });
  }
};

const createFolder = async (req, res) => {
  try {
    const { title, parentId, category } = req.body;
    if (!title || !category) return res.status(400).json({ status: false, msg: "Folder title and category required" });
    
    const lastFolder = await PortfolioFolder.findOne({ parentId: parentId || null, category }).sort({ sequence: -1 });
    const sequence = (lastFolder?.sequence || 0) + 1;
    
    let thumbnail = "";
    if (req.file) {
      const uploaded = await uploadFile(req.file, 'image');
      thumbnail = uploaded.secure_url;
    }

    const newFolder = await PortfolioFolder.create({
      title,
      parentId: parentId || null,
      sequence,
      category,
      thumbnail
    });
    res.json({ status: true, msg: "Folder created", data: newFolder });
  } catch (err) {
    res.status(500).json({ status: false, msg: err.message });
  }
};

const updateFolder = async (req, res) => {
  try {
    const { id } = req.params;
    const { title } = req.body;

    const folder = await PortfolioFolder.findById(id);
    if (!folder) return res.status(404).json({ status: false, msg: "Folder not found" });

    if (title && String(title).trim()) {
      folder.title = String(title).trim();
    }

    if (req.file) {
      const uploaded = await uploadFile(req.file, "image");
      folder.thumbnail = uploaded.secure_url;
    }

    await folder.save();
    res.json({ status: true, msg: "Folder updated", data: folder });
  } catch (err) {
    res.status(500).json({ status: false, msg: err.message });
  }
};

const deleteFolder = async (req, res) => {
  try {
    const { id } = req.params; // Expecting folder _id
    const folder = await PortfolioFolder.findById(id);
    if (!folder) return res.status(404).json({ status: false, msg: "Folder not found" });

    const items = await PortfolioItem.find({ folderId: id });
    for (const item of items) {
      if (item.public_id) {
        const resourceType = item.resourceType || getPortfolioResourceType(item.type);
        await cloudinary.uploader.destroy(item.public_id, { resource_type: resourceType });
      }
      await PortfolioItem.findByIdAndDelete(item._id);
    }

    await PortfolioFolder.findByIdAndDelete(folder._id);
    res.json({ status: true, msg: "Folder and its contents deleted" });
  } catch (err) {
    res.status(500).json({ status: false, msg: err.message });
  }
};

const reorderFolders = async (req, res) => {
  try {
    const { orderedIds, category } = req.body;
    if (!orderedIds || !Array.isArray(orderedIds)) return res.status(400).json({ status: false, msg: "orderedIds required" });

    const bulkOps = orderedIds.map((id, index) => ({
      updateOne: {
        filter: { _id: id, category },
        update: { $set: { sequence: index + 1 } }
      }
    }));
    await PortfolioFolder.bulkWrite(bulkOps);
    res.json({ status: true, msg: "Folder sequence updated" });
  } catch (err) {
    res.status(500).json({ status: false, msg: err.message });
  }
};

const uploadItem = async (req, res) => {
  try {
    const { title, type, folderId, linkUrl, description, category } = req.body;
    const clickUrl = typeof linkUrl === "string" ? linkUrl.trim() : "";
    if (clickUrl && !isValidHttpUrl(clickUrl)) {
      return res.status(400).json({ status: false, msg: "Please enter a valid click URL." });
    }
    if (!type || !['image', 'video', 'pdf', 'link'].includes(type) || !category) {
       return res.status(400).json({ status: false, msg: "Valid type and category required" });
    }

    const lastItem = await PortfolioItem.findOne({ folderId: folderId || null, category }).sort({ sequence: -1 });
    let sequence = (lastItem?.sequence || 0) + 1;

    // Handle link creation (single item)
    if (type === 'link') {
      if (!clickUrl) return res.status(400).json({ status: false, msg: "URL is required for link type." });
      const newItem = await PortfolioItem.create({
        title: title || clickUrl,
        type,
        folderId: folderId || null,
        category,
        fileUrl: clickUrl,
        linkUrl: clickUrl,
        sequence,
        description: description || ""
      });
      return res.json({ status: true, msg: "Link added", data: newItem });
    }

    // Handle file uploads (can be multiple)
    const filesToUpload = req.files?.files || [];
    if (!filesToUpload.length) {
      return res.status(400).json({
        status: false,
        msg: "Image, video or PDF file is required. URL alone cannot be uploaded.",
      });
    }

    const createdItems = [];
    for (const file of filesToUpload) {
      const resourceType = getPortfolioResourceType(type, file.mimetype || "");
      const uploaded = await uploadFile(file, resourceType);

      let itemThumbnail = "";
      if (req.files?.thumbnail && req.files.thumbnail[0]) {
         const thumbUpload = await uploadFile(req.files.thumbnail[0], 'image');
         itemThumbnail = thumbUpload.secure_url;
      }

      const newItem = await PortfolioItem.create({
        title: title || file.originalname || "Untitled",
        type,
        folderId: folderId || null,
        category,
        fileUrl: uploaded.secure_url,
        linkUrl: clickUrl,
        public_id: uploaded.public_id,
        resourceType,
        mimeType: file.mimetype || "",
        originalName: file.originalname || "",
        thumbnail: itemThumbnail,
        sequence: sequence++,
        description: description || ""
      });
      createdItems.push(newItem);
    }

    res.json({ status: true, msg: "Items uploaded", data: createdItems });
  } catch (err) {
    res.status(500).json({ status: false, msg: err.message });
  }
};

const getItems = async (req, res) => {
  try {
    const folderId = req.query.folderId || null;
    const category = req.query.category;
    const items = await PortfolioItem.find({ folderId, category }).sort({ sequence: 1, createdAt: -1 });
    res.json({ status: true, data: items });
  } catch (err) {
    res.status(500).json({ status: false, msg: err.message });
  }
};

const updateItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, linkUrl, description } = req.body;

    const item = await PortfolioItem.findById(id);
    if (!item) return res.status(404).json({ status: false, msg: "Item not found" });

    if (title !== undefined) {
      item.title = String(title).trim();
    }
    if (description !== undefined) {
      item.description = String(description).trim();
    }

    if (linkUrl !== undefined) {
      const clickUrl = typeof linkUrl === "string" ? linkUrl.trim() : "";
      if (clickUrl && !isValidHttpUrl(clickUrl)) {
        return res.status(400).json({ status: false, msg: "Please enter a valid click URL." });
      }
      item.linkUrl = clickUrl;
      if (item.type === "link") {
        item.fileUrl = clickUrl || item.fileUrl;
        if (!clickUrl) {
          return res.status(400).json({ status: false, msg: "URL is required for link type." });
        }
      }
    }

    const replacementFile = req.files?.files?.[0] || req.file;
    if (replacementFile && item.type !== "link") {
      if (item.public_id) {
        const oldResourceType = item.resourceType || getPortfolioResourceType(item.type);
        try {
          await cloudinary.uploader.destroy(item.public_id, { resource_type: oldResourceType });
        } catch (error) {
          console.log("Cloudinary replace cleanup skipped:", error.message);
        }
      }

      const resourceType = getPortfolioResourceType(item.type, replacementFile.mimetype || "");
      const uploaded = await uploadFile(replacementFile, resourceType);
      item.fileUrl = uploaded.secure_url;
      item.public_id = uploaded.public_id;
      item.resourceType = resourceType;
      item.mimeType = replacementFile.mimetype || "";
      item.originalName = replacementFile.originalname || "";
    }

    await item.save();
    res.json({ status: true, msg: "Item updated", data: item });
  } catch (err) {
    res.status(500).json({ status: false, msg: err.message });
  }
};

const deleteItem = async (req, res) => {
  try {
    const item = await PortfolioItem.findById(req.params.id);
    if (!item) return res.status(404).json({ status: false, msg: "Item not found" });

    if (item.public_id) {
       let resourceType = item.resourceType || getPortfolioResourceType(item.type);
       await cloudinary.uploader.destroy(item.public_id, { resource_type: resourceType });
    }
    
    await PortfolioItem.findByIdAndDelete(req.params.id);
    res.json({ status: true, msg: "Item deleted" });
  } catch (err) {
    res.status(500).json({ status: false, msg: err.message });
  }
};

const reorderItems = async (req, res) => {
  try {
    const { orderedIds, category } = req.body;
    if (!orderedIds || !Array.isArray(orderedIds)) return res.status(400).json({ status: false, msg: "orderedIds required" });

    const bulkOps = orderedIds.map((id, index) => ({
      updateOne: { filter: { _id: id, category }, update: { $set: { sequence: index + 1 } } }
    }));
    await PortfolioItem.bulkWrite(bulkOps);
    res.json({ status: true, msg: "Item sequence updated" });
  } catch (err) {
    res.status(500).json({ status: false, msg: err.message });
  }
};

const getPortfolioCounts = async (req, res) => {
  try {
    const count = await PortfolioItem.countDocuments();
    return res.json({ status: true, count });
  } catch(err) {
    return res.status(500).json({ status: false, msg: err.message });
  }
};

module.exports = {
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
  getPortfolioCounts
};

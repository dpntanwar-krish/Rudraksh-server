const fs = require("fs");
const NewsRef = require("../Modal/NewsModal");
const { cloudinary, isCloudinaryConfigured } = require("../config/cloudinary");

const saveNews = async (req, res) => {
  try {
    if (!isCloudinaryConfigured) {
      return res.status(500).json({ status: false, msg: "Cloudinary configuration missing" });
    }

    const title = (req.body.title || "").trim();
    const description = (req.body.description || "").trim();
    const file = req.file;

    if (!title) {
      return res.status(400).json({ status: false, msg: "News title is required" });
    }

    if (!file?.path) {
      return res.status(400).json({ status: false, msg: "News image is required" });
    }

    const uploaded = await cloudinary.uploader.upload(file.path, {
      folder: "rudraksh_news",
    });

    try {
      await fs.promises.unlink(file.path);
    } catch (err) {
      console.log("Local news file cleanup skipped:", err.message);
    }

    const doc = await NewsRef.create({
      title,
      description,
      imageUrl: uploaded.secure_url,
      public_id: uploaded.public_id,
    });

    return res.status(201).json({ status: true, msg: doc });
  } catch (err) {
    return res.status(500).json({ status: false, msg: err.message });
  }
};

const fetchAllNews = async (req, res) => {
  try {
    const rows = await NewsRef.find({}).sort({ createdAt: -1 });
    return res.status(200).json({ status: true, data: rows });
  } catch (err) {
    return res.status(500).json({ status: false, msg: err.message });
  }
};

const deleteNews = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await NewsRef.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({ status: false, msg: "News not found" });
    }

    if (deleted.public_id) {
      try {
        await cloudinary.uploader.destroy(deleted.public_id);
      } catch (err) {
        console.log("Cloudinary news delete failed:", err.message);
      }
    }

    return res.status(200).json({ status: true, msg: "News deleted" });
  } catch (err) {
    return res.status(500).json({ status: false, msg: err.message });
  }
};

module.exports = { saveNews, fetchAllNews, deleteNews };

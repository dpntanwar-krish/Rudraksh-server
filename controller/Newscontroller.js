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
      return res.status(400).json({ status: false, msg: "News file (image or PDF) is required" });
    }

    const uploaded = await cloudinary.uploader.upload(file.path, {
      folder: "rudraksh_news",
      resource_type: "auto",
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

    return res.status(201).json({ status: true, msg: "News saved successfully", data: doc });
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

const updateNews = async (req, res) => {
  try {
    if (!isCloudinaryConfigured) {
      return res.status(500).json({ status: false, msg: "Cloudinary configuration missing" });
    }

    const { id } = req.params;
    const title = (req.body.title || "").trim();
    const description = (req.body.description || "").trim();
    const file = req.file;

    if (!title) {
      return res.status(400).json({ status: false, msg: "News title is required" });
    }

    const existingNews = await NewsRef.findById(id);
    if (!existingNews) {
      return res.status(404).json({ status: false, msg: "News item not found" });
    }

    let updateData = {
      title,
      description,
    };

    if (file?.path) {
      // Upload new image
      const uploaded = await cloudinary.uploader.upload(file.path, {
        folder: "rudraksh_news",
        resource_type: "auto",
      });

      // Delete old image from Cloudinary if it exists
      if (existingNews.public_id) {
        try {
          await cloudinary.uploader.destroy(existingNews.public_id);
        } catch (cloudErr) {
          console.log("Cloudinary old news image delete failed:", cloudErr.message);
        }
      }

      updateData.imageUrl = uploaded.secure_url;
      updateData.public_id = uploaded.public_id;

      // Clean up local file
      try {
        await fs.promises.unlink(file.path);
      } catch (err) {
        console.log("Local news file cleanup skipped:", err.message);
      }
    }

    const updatedDoc = await NewsRef.findByIdAndUpdate(id, { $set: updateData }, { new: true });

    return res.status(200).json({ status: true, msg: "News item updated successfully", data: updatedDoc });
  } catch (err) {
    console.error("[updateNews] Failed:", err);
    return res.status(500).json({ status: false, msg: err.message });
  }
};

const updateNewsSequence = async (req, res) => {
  try {
    const { orderedIds } = req.body;
    if (!Array.isArray(orderedIds)) {
      return res.status(400).json({ status: false, msg: "orderedIds is required" });
    }

    const bulkOps = orderedIds.map((id, index) => ({
      updateOne: {
        filter: { _id: id },
        update: { $set: { sequence: index } },
      },
    }));

    await NewsRef.bulkWrite(bulkOps);
    return res.status(200).json({ status: true, msg: "News sequence updated" });
  } catch (error) {
    return res.status(500).json({ status: false, msg: error.message });
  }
};

module.exports = { saveNews, fetchAllNews, deleteNews, updateNews, updateNewsSequence };

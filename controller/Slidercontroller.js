const SliderRef = require("../Modal/SliderModal");
const { cloudinary, isCloudinaryConfigured } = require("../config/cloudinary");
const fs = require("fs");

const uploadSlider = async (req, res) => {
  try {
    if (!isCloudinaryConfigured) {
      return res.status(500).json({ status: false, msg: "Cloudinary configuration missing" });
    }

    const title = req.body.title || "";
    const files = Array.isArray(req.files) ? req.files : req.file ? [req.file] : [];

    if (!files.length) {
      return res.status(400).json({ status: false, msg: "No slider image selected" });
    }

    const docs = [];
    const lastSlider = await SliderRef.findOne({}).sort({ sequence: -1, createdAt: -1 });
    let nextSequence = lastSlider?.sequence >= 0 ? lastSlider.sequence + 1 : 0;

    for (const file of files) {
      const uploaded = await cloudinary.uploader.upload(file.path, {
        folder: "rudraksh_sliders",
      });

      docs.push({
        title,
        image: uploaded.secure_url,
        imageUrl: uploaded.secure_url,
        public_id: uploaded.public_id,
        sequence: nextSequence++,
        isActive: true,
      });

      try {
        await fs.promises.unlink(file.path);
      } catch (e) {
        console.log("Local slider file cleanup skipped:", e.message);
      }
    }

    const saved = await SliderRef.insertMany(docs);
    return res.status(201).json({ status: true, msg: saved });
  } catch (err) {
    return res.status(500).json({ status: false, msg: err.message });
  }
};

const getSliders = async (req, res) => {
  try {
    const rows = await SliderRef.find({}).sort({ sequence: 1, createdAt: -1 });
    return res.status(200).json({ status: true, data: rows });
  } catch (err) {
    return res.status(500).json({ status: false, msg: err.message });
  }
};

const deleteSlider = async (req, res) => {
  try {
    const id = req.params.id;
    const deleted = await SliderRef.findByIdAndDelete(id);

    if (!deleted) {
      return res.json({ status: false, msg: "Slider not found" });
    }

    if (deleted.public_id) {
      try {
        await cloudinary.uploader.destroy(deleted.public_id);
      } catch (cloudErr) {
        console.log("Cloudinary delete failed:", cloudErr.message);
      }
    }

    return res.json({ status: true, msg: "Slider deleted" });
  } catch (err) {
    return res.json({ status: false, msg: err.message });
  }
};

const updateSliderSequence = async (req, res) => {
  try {
    const orderedIds = Array.isArray(req.body?.orderedIds) ? req.body.orderedIds : [];
    if (!orderedIds.length) {
      return res.status(400).json({ status: false, msg: "orderedIds is required" });
    }

    const uniqueIds = [...new Set(orderedIds.map(String))];
    const totalRows = await SliderRef.countDocuments({});
    if (uniqueIds.length !== totalRows) {
      return res.status(400).json({ status: false, msg: "orderedIds must include every slider exactly once" });
    }

    const bulkOps = uniqueIds.map((id, index) => ({
      updateOne: {
        filter: { _id: id },
        update: { $set: { sequence: index } },
      },
    }));

    await SliderRef.bulkWrite(bulkOps);
    return res.status(200).json({ status: true, msg: "Slider sequence updated" });
  } catch (err) {
    return res.status(500).json({ status: false, msg: err.message });
  }
};

const toggleSliderStatus = async (req, res) => {
  try {
    const id = req.params.id;
    const slider = await SliderRef.findById(id);
    if (!slider) {
      return res.status(404).json({ status: false, msg: "Slider not found" });
    }

    slider.isActive = !slider.isActive;
    await slider.save();
    return res.status(200).json({
      status: true,
      msg: slider.isActive ? "Slider activated" : "Slider deactivated",
      data: slider,
    });
  } catch (err) {
    return res.status(500).json({ status: false, msg: err.message });
  }
};

module.exports = { uploadSlider, getSliders, deleteSlider, updateSliderSequence, toggleSliderStatus };

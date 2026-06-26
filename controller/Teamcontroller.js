const fs = require("fs");
const TeamRef = require("../Modal/TeamModal");
const { cloudinary, isCloudinaryConfigured } = require("../config/cloudinary");

const parseSocial = (body) => ({
  facebook: (body.facebook || "").trim(),
  twitter: (body.twitter || "").trim(),
  behance: (body.behance || "").trim(),
  linkedin: (body.linkedin || "").trim(),
});

const saveTeamMember = async (req, res) => {
  try {
    if (!isCloudinaryConfigured) {
      return res.status(500).json({ status: false, msg: "Cloudinary configuration missing" });
    }

    const name = (req.body.name || "").trim();
    const role = (req.body.role || "").trim();
    const file = req.file;
    const isActive = req.body.isActive !== "false" && req.body.isActive !== false;

    if (!name) {
      return res.status(400).json({ status: false, msg: "Team member name is required" });
    }
    if (!role) {
      return res.status(400).json({ status: false, msg: "Team member role is required" });
    }
    if (!file?.path) {
      return res.status(400).json({ status: false, msg: "Team member photo is required" });
    }

    const uploaded = await cloudinary.uploader.upload(file.path, {
      folder: "rudraksh_team",
      resource_type: "image",
    });

    try {
      await fs.promises.unlink(file.path);
    } catch (err) {
      console.log("Local team file cleanup skipped:", err.message);
    }

    const count = await TeamRef.countDocuments();
    const doc = await TeamRef.create({
      name,
      role,
      imageUrl: uploaded.secure_url,
      public_id: uploaded.public_id,
      sequence: count,
      isActive,
      ...parseSocial(req.body),
    });

    return res.status(201).json({ status: true, msg: "Team member saved successfully", data: doc });
  } catch (err) {
    return res.status(500).json({ status: false, msg: err.message });
  }
};

const fetchAllTeamMembers = async (req, res) => {
  try {
    const rows = await TeamRef.find({}).sort({ sequence: 1, createdAt: -1 });
    return res.status(200).json({ status: true, data: rows });
  } catch (err) {
    return res.status(500).json({ status: false, msg: err.message });
  }
};

const fetchActiveTeamMembers = async (req, res) => {
  try {
    const rows = await TeamRef.find({ isActive: { $ne: false } }).sort({ sequence: 1, createdAt: -1 });
    return res.status(200).json({ status: true, data: rows });
  } catch (err) {
    return res.status(500).json({ status: false, msg: err.message });
  }
};

const deleteTeamMember = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await TeamRef.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({ status: false, msg: "Team member not found" });
    }

    if (deleted.public_id) {
      try {
        await cloudinary.uploader.destroy(deleted.public_id);
      } catch (err) {
        console.log("Cloudinary team delete failed:", err.message);
      }
    }

    return res.status(200).json({ status: true, msg: "Team member deleted" });
  } catch (err) {
    return res.status(500).json({ status: false, msg: err.message });
  }
};

const updateTeamMember = async (req, res) => {
  try {
    if (!isCloudinaryConfigured) {
      return res.status(500).json({ status: false, msg: "Cloudinary configuration missing" });
    }

    const { id } = req.params;
    const name = (req.body.name || "").trim();
    const role = (req.body.role || "").trim();
    const file = req.file;
    const isActive = req.body.isActive !== "false" && req.body.isActive !== false;

    if (!name) {
      return res.status(400).json({ status: false, msg: "Team member name is required" });
    }
    if (!role) {
      return res.status(400).json({ status: false, msg: "Team member role is required" });
    }

    const existing = await TeamRef.findById(id);
    if (!existing) {
      return res.status(404).json({ status: false, msg: "Team member not found" });
    }

    const updateData = {
      name,
      role,
      isActive,
      ...parseSocial(req.body),
    };

    if (file?.path) {
      const uploaded = await cloudinary.uploader.upload(file.path, {
        folder: "rudraksh_team",
        resource_type: "image",
      });

      if (existing.public_id) {
        try {
          await cloudinary.uploader.destroy(existing.public_id);
        } catch (cloudErr) {
          console.log("Cloudinary old team image delete failed:", cloudErr.message);
        }
      }

      updateData.imageUrl = uploaded.secure_url;
      updateData.public_id = uploaded.public_id;

      try {
        await fs.promises.unlink(file.path);
      } catch (err) {
        console.log("Local team file cleanup skipped:", err.message);
      }
    }

    const updatedDoc = await TeamRef.findByIdAndUpdate(id, { $set: updateData }, { new: true });
    return res.status(200).json({ status: true, msg: "Team member updated successfully", data: updatedDoc });
  } catch (err) {
    return res.status(500).json({ status: false, msg: err.message });
  }
};

const updateTeamSequence = async (req, res) => {
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

    await TeamRef.bulkWrite(bulkOps);
    return res.status(200).json({ status: true, msg: "Team sequence updated" });
  } catch (error) {
    return res.status(500).json({ status: false, msg: error.message });
  }
};

module.exports = {
  saveTeamMember,
  fetchAllTeamMembers,
  fetchActiveTeamMembers,
  deleteTeamMember,
  updateTeamMember,
  updateTeamSequence,
};

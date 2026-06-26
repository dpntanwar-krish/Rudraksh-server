const mongoose = require("mongoose");

const teamSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    role: { type: String, required: true, trim: true },
    imageUrl: { type: String, required: true },
    public_id: { type: String, required: true },
    sequence: { type: Number, default: 0 },
    facebook: { type: String, default: "", trim: true },
    twitter: { type: String, default: "", trim: true },
    behance: { type: String, default: "", trim: true },
    linkedin: { type: String, default: "", trim: true },
    isActive: { type: Boolean, default: true },
  },
  {
    versionKey: false,
    timestamps: true,
  },
);

const TeamRef = mongoose.model("TeamCollection", teamSchema);

module.exports = TeamRef;

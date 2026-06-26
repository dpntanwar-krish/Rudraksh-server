const mongoose = require("mongoose");

const videoSchema = new mongoose.Schema(
  {
    title: { type: String, trim: true, default: "" },
    folder: { type: String, default: "General" },
    parentId: { type: String, default: null },
    sequence: { type: Number, default: 0 },
    videoUrl: { type: String, required: true, trim: true },
    public_id: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("VideoCollection", videoSchema);

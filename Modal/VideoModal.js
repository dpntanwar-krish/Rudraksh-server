const mongoose = require("mongoose");

const videoSchema = new mongoose.Schema(
  {
    title: { type: String, trim: true, default: "" },
    videoUrl: { type: String, required: true, trim: true },
    public_id: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("VideoCollection", videoSchema);

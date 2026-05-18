const mongoose = require("mongoose");

const newsSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "", trim: true },
    imageUrl: { type: String, required: true },
    public_id: { type: String, required: true },
  },
  {
    versionKey: false,
    timestamps: true,
  }
);

const NewsRef = mongoose.model("NewsCollection", newsSchema);

module.exports = NewsRef;

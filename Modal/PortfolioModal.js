const mongoose = require("mongoose");

const portfolioFolderSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    parentId: { type: String, default: null }, // Support for nested folders
    sequence: { type: Number, default: 0 },
    category: { type: String, required: true, index: true },
    thumbnail: { type: String, default: "" },
  },
  { timestamps: true, versionKey: false }
);

const portfolioItemSchema = new mongoose.Schema(
  {
    title: { type: String, default: "", trim: true },
    type: { type: String, enum: ['image', 'video', 'pdf', 'link'], required: true },
    folderId: { type: String, default: null, index: true },
    category: { type: String, required: true, index: true },
    
    fileUrl: { type: String, required: true },
    linkUrl: { type: String, default: "" },
    public_id: { type: String, default: "" },
    resourceType: { type: String, default: "" },
    mimeType: { type: String, default: "" },
    originalName: { type: String, default: "" },
    thumbnail: { type: String, default: "" },
    
    sequence: { type: Number, default: 0, index: true },
    description: { type: String, default: "", trim: true },
  },
  { timestamps: true, versionKey: false }
);

module.exports = {
  PortfolioFolder: mongoose.model("PortfolioFolder", portfolioFolderSchema),
  PortfolioItem: mongoose.model("PortfolioItem", portfolioItemSchema)
};

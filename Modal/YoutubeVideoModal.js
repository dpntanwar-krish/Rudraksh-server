const mongoose = require("mongoose");

const youtubeVideoSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Video title is required"],
      trim: true,
      minlength: [3, "Title must be at least 3 characters"],
      maxlength: [100, "Title cannot exceed 100 characters"],
    },
    youtubeUrl: {
      type: String,
      required: [true, "YouTube URL is required"],
      validate: {
        validator: function (url) {
          const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/;
          return youtubeRegex.test(url);
        },
        message: "Invalid YouTube URL format",
      },
    },
    videoId: {
      type: String,
      required: true,
      index: true,
    },
    thumbnail: {
      type: String,
      default: null,
    },
    category: {
      type: String,
      enum: ["Photoshoot & Video", "Events", "Video Gallery"],
      required: [true, "Category is required"],
      index: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"],
      default: "",
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    views: {
      type: Number,
      default: 0,
    },
    sequence: {
      type: Number,
      default: 0,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient querying
youtubeVideoSchema.index({ category: 1, isActive: 1 });
youtubeVideoSchema.index({ createdAt: -1 });

module.exports = mongoose.model("YoutubeVideo", youtubeVideoSchema);

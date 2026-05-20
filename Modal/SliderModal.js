const mongoose = require("mongoose");

const sliderSchema = new mongoose.Schema(
  {
    title: { type: String, default: "" },
    image: { type: String, required: true },
    imageUrl: { type: String, required: true },
    public_id: { type: String, required: true },
    sequence: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  {
    versionKey: false,
    timestamps: true,
  }
);

const SliderRef = mongoose.model("SliderCollection", sliderSchema);

module.exports = SliderRef;

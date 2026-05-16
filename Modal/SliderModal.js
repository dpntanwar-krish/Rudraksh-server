const mongoose = require("mongoose");

const sliderSchema = new mongoose.Schema(
  {
    title: { type: String, default: "" },
    imageUrl: { type: String, required: true },
    public_id: { type: String, required: true },
  },
  {
    versionKey: false,
    timestamps: true,
  }
);

const SliderRef = mongoose.model("SliderCollection", sliderSchema);

module.exports = SliderRef;

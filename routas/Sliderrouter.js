const express = require("express");
const upload = require("../Middleware/upload");
const { uploadSlider, getSliders, deleteSlider, updateSliderSequence, toggleSliderStatus } = require("../controller/Slidercontroller");

const router = express.Router();

router.post("/upload", (req, res, next) => {
  upload.array("files")(req, res, (err) => {
    if (err) {
      return res.status(400).json({ status: false, msg: err.message });
    }
    next();
  });
}, uploadSlider);

router.get("/all", getSliders);
router.put("/sequence", updateSliderSequence);
router.patch("/toggle/:id", toggleSliderStatus);
router.delete("/delete/:id", deleteSlider);

module.exports = router;

const express = require("express");
const upload = require("../Middleware/upload");
const { uploadSlider, getSliders, deleteSlider, updateSliderSequence, toggleSliderStatus } = require("../controller/Slidercontroller");
const { requireAdminAuth } = require("../Middleware/adminAuthMiddleware");

const router = express.Router();

router.post("/upload", requireAdminAuth, (req, res, next) => {
  upload.array("files")(req, res, (err) => {
    if (err) {
      return res.status(400).json({ status: false, msg: err.message });
    }
    next();
  });
}, uploadSlider);

router.get("/all", getSliders);
router.put("/sequence", requireAdminAuth, updateSliderSequence);
router.patch("/toggle/:id", requireAdminAuth, toggleSliderStatus);
router.delete("/delete/:id", requireAdminAuth, deleteSlider);

module.exports = router;

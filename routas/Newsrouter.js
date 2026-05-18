const express = require("express");
const upload = require("../Middleware/upload");
const { saveNews, fetchAllNews, deleteNews } = require("../controller/Newscontroller");

const router = express.Router();

router.post("/save", (req, res, next) => {
  upload.single("image")(req, res, (err) => {
    if (err) {
      return res.status(400).json({ status: false, msg: err.message });
    }
    next();
  });
}, saveNews);

router.get("/all", fetchAllNews);
router.delete("/delete/:id", deleteNews);

module.exports = router;

const multer = require("multer");

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("video") || file.mimetype.startsWith("image")) {
    cb(null, true);
  } else {
    cb(new Error("Unsupported file type! Please upload only videos or images."), false);
  }
};

const upload = multer({
  dest: "uploads/",
  fileFilter,
  limits: { fileSize: 8 * 1024 * 1024 }, // 8MB limit
});

module.exports = upload;

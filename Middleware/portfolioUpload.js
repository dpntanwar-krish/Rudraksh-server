const multer = require("multer");
const path = require("path");
const fs = require("fs");

const uploadDir = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination(_req, _file, cb) {
    cb(null, uploadDir);
  },
  filename(_req, file, cb) {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname) || "";
    cb(null, unique + ext);
  },
});

const isAllowedPortfolioFile = (mimetype = "") => {
  if (!mimetype) return false;
  return (
    mimetype.startsWith("image/") ||
    mimetype.startsWith("video/") ||
    mimetype === "application/pdf"
  );
};

const portfolioUpload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024,
    files: 12,
  },
  fileFilter(_req, file, cb) {
    if (!isAllowedPortfolioFile(file.mimetype)) {
      return cb(new Error("Only image, video and PDF files are allowed."));
    }
    cb(null, true);
  },
});

module.exports = portfolioUpload;

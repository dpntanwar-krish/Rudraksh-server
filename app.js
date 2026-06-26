const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const path = require("path");
const dotenv = require("dotenv");
const EnquiryRouter = require("./routas/Enquiryrouter");
const fileRouter = require("./routas/Filerouter");
const sliderRouter = require("./routas/Sliderrouter");
const adminAuthRouter = require("./routas/AdminAuthrouter");
const newsRouter = require("./routas/Newsrouter");
const teamRouter = require("./routas/Teamrouter");
const portfolioRouter = require("./routas/PortfolioRoutes");
const youtubeVideoRouter = require("./routas/YoutubeVideoRoutes");
const videoRouter = require("./Middleware/videoRoutes");
const { isCloudinaryConfigured } = require("./config/cloudinary");

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 2004;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);
app.use(cookieParser());

app.get("/", (req, res) => {
  res.send("Welcome to Rudraksh Server");
});

// Keep both cases to avoid client breakage if route case differs.
app.use("/Enquiry", EnquiryRouter);
app.use("/enquiry", EnquiryRouter);
app.use("/File", fileRouter);
app.use("/file", fileRouter);
app.use("/Slider", sliderRouter);
app.use("/slider", sliderRouter);
app.use("/News", newsRouter);
app.use("/news", newsRouter);
app.use("/Team", teamRouter);
app.use("/team", teamRouter);
app.use("/api/portfolio", portfolioRouter);
app.use("/Portfolio", portfolioRouter);
app.use("/portfolio", portfolioRouter);
app.use("/api/videos", youtubeVideoRouter);
app.use("/Video", videoRouter);
app.use("/video", videoRouter);
app.use("/api/Video", videoRouter);
app.use("/admin", adminAuthRouter);

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

if (!isCloudinaryConfigured) {
  console.log("Cloudinary env missing: set CLOUD_NAME, API_KEY, API_SECRET in server .env");
}

// Error logging middleware (must be before listen)
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err && err.stack ? err.stack : err);
  if (res.headersSent) return next(err);
  const status = err && err.status ? err.status : 500;
  const payload = { status: false, msg: err && err.message ? err.message : "Internal Server Error" };
  if (process.env.NODE_ENV !== "production") payload.stack = err && err.stack ? err.stack : undefined;
  res.status(status).json(payload);
});

const mongoUrl = process.env.AtlasUrl || process.env.ATLAS_URL;
if (!mongoUrl) {
  console.log("MongoDB env missing: set AtlasUrl or ATLAS_URL in server .env");
} else {
  mongoose
    .connect(mongoUrl)
    .then(() => {
      console.log("Connected DB");
    })
    .catch((err) => {
      console.log("MongoDB connection failed:", err.message);
    });
}

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server started on port ${PORT}`);
});

var express = require('express');
var app = express();
var mongoose = require('mongoose');
var cors = require('cors');
var EnquiryRouter = require('./routas/Enquiryrouter');
var fileRouter = require('./routas/Filerouter');
var path = require("path");
var dotenv = require("dotenv");
const { isCloudinaryConfigured } = require("./config/cloudinary");
dotenv.config();
app.use(express.json());
app.use(cors());

// Mount enquiry router
app.use('/Enquiry', EnquiryRouter);
app.use('/File', fileRouter);

// serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.listen(2004, function () {
  console.log("Server Started...2004")
})

if (!isCloudinaryConfigured) {
  console.log("Cloudinary env missing: set CLOUD_NAME, API_KEY, API_SECRET in server .env");
}

const mongoUrl = process.env.AtlasUrl || process.env.ATLAS_URL;
if (!mongoUrl) {
  console.log("MongoDB env missing: set AtlasUrl or ATLAS_URL in server .env");
} else {
  mongoose.connect(mongoUrl)
    .then(() => {
      console.log("Connected DB");
    })
    .catch((err) => {
      console.log(err.message);
    });
}

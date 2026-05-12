const cloudinary = require("cloudinary").v2;
const dotenv = require("dotenv");

dotenv.config();

const cloudName = process.env.CLOUD_NAME;
const apiKey = process.env.API_KEY;
const apiSecret = process.env.API_SECRET;

cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
});

const isCloudinaryConfigured = Boolean(cloudName && apiKey && apiSecret);

module.exports = { cloudinary, isCloudinaryConfigured };

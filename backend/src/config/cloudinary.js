// backend/src/config/cloudinary.js
const cloudinary = require("cloudinary").v2;

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET,
});

/**
 * Upload a raw .obj file to Cloudinary.
 * @param {string} filePath  Absolute path to the .obj file
 * @returns {string}         Secure HTTPS URL
 */
const uploadSmplObj = async (filePath) => {
  const result = await cloudinary.uploader.upload(filePath, {
    resource_type: "raw",
    folder: "smpl_models",
    use_filename: true,
    unique_filename: true,
  });
  return result.secure_url;
};

module.exports = { uploadSmplObj };

const cloudinary = require("cloudinary").v2;

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET,
});

const uploadObj = async (filePath) => {
  const result = await cloudinary.uploader.upload(filePath, {
    resource_type: "raw",      // IMPORTANT for .obj files
    folder: "pifuhd_models",
  });

  return result.secure_url;
};

module.exports = { uploadObj };

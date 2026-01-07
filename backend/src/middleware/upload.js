// middleware/upload.js
const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({
  destination: "temp/inputs",
  filename: (req, file, cb) => {
    cb(null, `input_${Date.now()}.png`);
  }
});

module.exports = multer({ storage });

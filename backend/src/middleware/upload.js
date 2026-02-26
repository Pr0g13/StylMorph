// backend/src/middleware/upload.js
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Create temp directories
const tempDir = path.join(__dirname, "../../temp/inputs");
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
  console.log(`✅ Created upload directory: ${tempDir}`);
}

const storage = multer.diskStorage({
  destination: tempDir,
  filename: (req, file, cb) => {
    // Always save as test.png for PiFuHD compatibility
    cb(null, "test.png");
  }
});

module.exports = multer({
  storage,
  fileFilter: (req, file, cb) => {
    // Accept only images
    console.log("📂 Received file upload:", file.originalname, "MIME:", file.mimetype);
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed!"), false);
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  }
});

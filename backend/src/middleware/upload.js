// backend/src/middleware/upload.js
//[file name]: upload.js
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Get absolute path to PiFuHD sample_images directory
const projectRoot = path.resolve(__dirname, "../../.."); // Go from backend/src/middleware to project root
const pifuDir = path.join(projectRoot, "ml", "pifuhd");
const sampleImagesDir = path.join(pifuDir, "sample_images");

console.log(`📁 Project root: ${projectRoot}`);
console.log(`📁 PiFuHD directory: ${pifuDir}`);
console.log(`📁 Sample images target: ${sampleImagesDir}`);

// Ensure sample_images directory exists
if (!fs.existsSync(sampleImagesDir)) {
  fs.mkdirSync(sampleImagesDir, { recursive: true });
  console.log(`✅ Created sample_images directory`);
}

// Clean the directory before saving new file
if (fs.existsSync(sampleImagesDir)) {
  const files = fs.readdirSync(sampleImagesDir);
  files.forEach(file => {
    try {
      fs.unlinkSync(path.join(sampleImagesDir, file));
      console.log(`🧹 Cleared old file: ${file}`);
    } catch (err) {
      console.warn(`⚠️ Could not delete ${file}:`, err.message);
    }
  });
}

// Configure storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, sampleImagesDir);
  },
  filename: function (req, file, cb) {
    // PiFuHD expects test.png in sample_images folder
    cb(null, "test.png");
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  console.log(`[DEBUG] fileFilter: fieldname=${file.fieldname}, mimetype=${file.mimetype}, originalname=${file.originalname}`);
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  }
});

module.exports = upload;

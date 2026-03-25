// src/routes/avatar.js
const express = require("express");
const auth = require("../middleware/auth");
const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, "../../temp/"));
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname) || ".jpg";
    cb(null, file.fieldname + "-" + Date.now() + ext);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
});

const {
  getAvatar,
  saveAvatar,
  addWearable,
  deleteWearable,
  saveSet,
  deleteSet,
  generateModels,
  viewWearable
} = require("../controllers/avatar");
const { getRecommendation } = require("../controllers/aiController");

const router = express.Router();

// All routes are protected with auth middleware
router.get("/", auth, getAvatar);
router.post("/", auth, saveAvatar);
router.post("/wearables", auth, upload.single("image"), addWearable);
router.post("/wearables/:wearableId/view", auth, viewWearable);
router.delete("/wearables/:wearableId", auth, deleteWearable);
router.post("/sets", auth, saveSet);
router.delete("/sets/:setId", auth, deleteSet);
router.post("/generate", auth, upload.single("image"), generateModels);
router.post("/ai-recommendation", auth, getRecommendation);

module.exports = router;
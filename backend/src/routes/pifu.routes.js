// backend/src/routes/pifu.routes.js
const express = require("express");
const upload = require("../middleware/upload");
const auth = require("../middleware/auth");
const { runPifuHD } = require("../controllers/pifu.controller");

const router = express.Router();

// Test endpoint
router.get("/", (req, res) => {
  res.json({
    success: true,
    message: "PiFu API is working",
    availableRoutes: ["POST /generate"]
  });
});

// Generate 3D model - IMPORTANT: field name must match frontend
router.post("/generate", auth, upload.single("photo"), runPifuHD);

module.exports = router;
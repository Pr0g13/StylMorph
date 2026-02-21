// backend/src/app.js
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const connectDB = require("./config/db");
const path = require("path");
const fs = require("fs");

// Routes
const authRoutes = require("./routes/auth");
const avatarRoutes = require("./routes/avatar");
const measurementRoutes = require("./routes/measurement.routes");

const app = express();

// Database
try {
  connectDB();
  console.log("✅ Connected to MongoDB");
} catch (err) {
  console.warn("⚠️  Database connection failed:", err.message);
}

// Ensure temp directories exist
["temp/inputs", "temp/outputs"].forEach((rel) => {
  const dir = path.join(__dirname, rel);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Static – serve generated OBJ files as fallback when Cloudinary is unavailable
app.use("/temp", express.static(path.join(__dirname, "temp")));

// API Routes
app.use("/auth", authRoutes);
app.use("/avatar", avatarRoutes);
app.use("/api/measurements", measurementRoutes);

// Health check
app.get("/", (_req, res) => {
  res.json({
    ok: true,
    service: "StylMorph API",
    version: "2.0.0",
    pipeline: "4-image → MediaPipe → SMPL → Cloudinary → Three.js",
    endpoints: [
      "POST /auth/login",
      "POST /auth/signup",
      "GET  /avatar",
      "POST /avatar",
      "POST /api/measurements/calculate",
    ],
  });
});

// 404
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Route ${req.originalUrl} not found`,
  });
});

// Global error handler
app.use((err, _req, res, _next) => {
  console.error("❌ Server error:", err);
  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === "development" ? err.message : "Internal server error",
  });
});

module.exports = app;
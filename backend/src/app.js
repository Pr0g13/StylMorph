//[file name]: app.js
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const connectDB = require("./config/db");
const path = require("path");
const fs = require("fs");

// Import routes
const authRoutes = require("./routes/auth");
const avatarRoutes = require("./routes/avatar");
const pifuRoutes = require("./routes/pifu.routes");

const app = express();

// Connect to database (if you have one)
try {
  connectDB();
  console.log("✅ Connected to database");
} catch (err) {
  console.log("⚠️ Database connection failed:", err.message);
}

// Create temp directories
const tempDirs = [
  path.join(__dirname, "../temp/inputs"),
  path.join(__dirname, "../temp/outputs")
];

tempDirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`✅ Created directory: ${dir}`);
  }
});

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use((req, res, next) => {
  if (req.originalUrl.includes('/api/pifu')) {
    const logData = `[${new Date().toISOString()}] ${req.method} ${req.originalUrl}\nHeaders: ${JSON.stringify(req.headers)}\n\n`;
    fs.appendFileSync(path.join(__dirname, "../request.log"), logData);
  }
  next();
});

// Routes
app.use("/auth", authRoutes);
app.use("/avatar", avatarRoutes);
app.use("/api/pifu", pifuRoutes);

// Serve static files from temp directory
app.use("/temp", express.static(path.join(__dirname, "../temp")));

// Health check
app.get("/", (req, res) => {
  res.json({
    ok: true,
    message: "StylMorph API",
    timestamp: new Date().toISOString(),
    endpoints: [
      "/auth/login",
      "/auth/signup",
      "/avatar",
      "/api/pifu",
      "/api/pifu/generate"
    ]
  });
});

// Health check for PiFu
app.get("/api/pifu/health", (req, res) => {
  res.json({
    status: "healthy",
    service: "PiFuHD 3D Generator",
    timestamp: new Date().toISOString()
  });
});

// 404 handler - FIXED: Use proper wildcard syntax
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    error: `Route ${req.originalUrl} not found`,
    availableRoutes: [
      "GET /",
      "GET /api/pifu/health",
      "POST /auth/login",
      "POST /auth/signup",
      "GET /avatar",
      "POST /avatar",
      "POST /api/pifu/generate"
    ]
  });
});

// Error handler
// Error handler
app.use((err, req, res, next) => {
  const errorLog = `Timestamp: ${new Date().toISOString()}\nGlobal Error: ${err.message}\nStack: ${err.stack}\n\n`;
  try {
    fs.appendFileSync(path.join(__dirname, "../server_error.log"), errorLog);
  } catch (e) {
    console.error("Could not write server error log:", e);
  }

  console.error("❌ Server error:", err);
  res.status(500).json({
    success: false,
    error: err.message, // Send actual error message
    stack: err.stack,   // Send stack trace
    env: process.env.NODE_ENV // Debug env
  });
});

module.exports = app;
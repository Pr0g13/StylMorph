// models/Model3D.js
const mongoose = require("mongoose");

const model3DSchema = new mongoose.Schema({
  userId: String,
  modelUrl: String,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Model3D", model3DSchema);

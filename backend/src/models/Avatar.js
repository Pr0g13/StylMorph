// src/models/Avatar.js
const mongoose = require("mongoose");

const AvatarSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    required: true,
    unique: true // Each user can have only one active avatar
  },
  measurements: {
    height: { type: Number, required: true },
    chest: { type: Number, required: true },
    waist: { type: Number, required: true },
    hips: { type: Number, required: true },
    shoulder: { type: Number, required: true },
    inseam: { type: Number, required: true },
    armLength: { type: Number, required: true },
    neckSize: { type: Number, required: true }
  },
  readyPlayerMeUrl: { type: String, default: null }, // Store RPM avatar URL
  parametricData: {
    bodyType: { type: String, default: "average" }, // ectomorph, mesomorph, endomorph
    muscleDefinition: { type: Number, default: 0.5, min: 0, max: 1 },
    bodyFat: { type: Number, default: 0.5, min: 0, max: 1 }
  },
  wearables: [{
    url: String,
    name: String,
    thumbnail: String,
    addedAt: { type: Date, default: Date.now }
  }],
  savedSets: [{
    name: String,
    wearables: [{
      url: String,
      name: String,
      thumbnail: String
    }],
    savedAt: { type: Date, default: Date.now }
  }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Index for fast user lookup
AvatarSchema.index({ userId: 1 });

// Update the updatedAt timestamp on save
AvatarSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model("Avatar", AvatarSchema);
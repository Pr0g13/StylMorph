// backend/src/models/Avatar.js
const mongoose = require("mongoose");

const AvatarSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true,
  },
  measurements: {
    height: { type: Number, default: null },
    chest: { type: Number, default: null },
    waist: { type: Number, default: null },
    hips: { type: Number, default: null },
    shoulder: { type: Number, default: null },
    inseam: { type: Number, default: null },
    armLength: { type: Number, default: null },
    neckSize: { type: Number, default: null },
  },
  // URL of the SMPL-generated .obj stored in Cloudinary
  smplModelUrl: { type: String, default: null },
  // Optional: Ready Player Me avatar URL (kept for compatibility)
  readyPlayerMeUrl: { type: String, default: null },
  // Wearables added by the user
  wearables: [{
    url: String,
    name: String,
    thumbnail: String,
    addedAt: { type: Date, default: Date.now },
  }],
  savedSets: [{
    name: String,
    wearables: [{ url: String, name: String, thumbnail: String }],
    savedAt: { type: Date, default: Date.now },
  }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

AvatarSchema.index({ userId: 1 });

AvatarSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model("Avatar", AvatarSchema);
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
    height:    { type: Number, default: null },
    chest:     { type: Number, default: null },
    waist:     { type: Number, default: null },
    hips:      { type: Number, default: null },
    shoulder:  { type: Number, default: null },
    inseam:    { type: Number, default: null },
    armLength: { type: Number, default: null },
    neckSize:  { type: Number, default: null },
    // 'auto' = extracted from 3D model, 'manual' = user-entered
    source:    { type: String, enum: ['auto', 'manual', null], default: null },
  },
  // URL of the generated PIFuHD .obj from Cloudinary
  pifuhdUrl: { type: String, default: null },
  // URL of the uploaded image used for generation
  imageUrl: { type: String, default: null },
  // Wearables added by the user
  wearables: [{
    url: String,
    name: String,
    thumbnail: String,
    addedAt: { type: Date, default: Date.now },
  }],
  savedSets: [{
    name: String,
    wearables: [{ 
      url: String, 
      name: String, 
      thumbnail: String,
      tryonUrl: { type: String, default: null },
      model3dUrl: { type: String, default: null }
    }],
    savedAt: { type: Date, default: Date.now },
  }],
  viewResults: [{ type: String }],
  tryonResults: [{
    url: String,
    wearableId: { type: mongoose.Schema.Types.ObjectId, default: null },
    wearableUrl: { type: String, default: null },
    wearableName: { type: String, default: null },
    model3dUrl: { type: String, default: null },
    processingTime: Number,
    message: String,
    category: String,
    createdAt: { type: Date, default: Date.now }
  }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});



AvatarSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model("Avatar", AvatarSchema);
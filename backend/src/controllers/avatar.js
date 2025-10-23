// src/controllers/avatar.js
const Avatar = require("../models/Avatar");

// Get user's avatar
exports.getAvatar = async (req, res) => {
  try {
    const avatar = await Avatar.findOne({ userId: req.user.id });
    
    if (!avatar) {
      return res.status(404).json({ msg: "Avatar not found" });
    }

    res.json(avatar);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
};

// Create or update avatar
exports.saveAvatar = async (req, res) => {
  try {
    const { measurements, readyPlayerMeUrl, parametricData } = req.body;

    // Validate measurements
    if (!measurements || !measurements.height || !measurements.chest || 
        !measurements.waist || !measurements.hips || !measurements.shoulder || 
        !measurements.inseam || !measurements.armLength || !measurements.neckSize) {
      return res.status(400).json({ msg: "Please provide all body measurements" });
    }

    // Check if avatar exists
    let avatar = await Avatar.findOne({ userId: req.user.id });

    if (avatar) {
      // Update existing avatar
      avatar.measurements = measurements;
      if (readyPlayerMeUrl) avatar.readyPlayerMeUrl = readyPlayerMeUrl;
      if (parametricData) avatar.parametricData = { ...avatar.parametricData, ...parametricData };
      await avatar.save();
      
      res.json({ msg: "✅ Avatar updated successfully", avatar });
    } else {
      // Create new avatar
      avatar = new Avatar({
        userId: req.user.id,
        measurements,
        readyPlayerMeUrl: readyPlayerMeUrl || null,
        parametricData: parametricData || {}
      });
      await avatar.save();
      
      res.status(201).json({ msg: "✅ Avatar created successfully", avatar });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
};

// Add wearable to avatar
exports.addWearable = async (req, res) => {
  try {
    const { url, name, thumbnail } = req.body;

    if (!url || !name) {
      return res.status(400).json({ msg: "URL and name are required" });
    }

      const avatar = await Avatar.findOne({ userId: req.user.id });
    
    if (!avatar) {
      return res.status(404).json({ msg: "Avatar not found. Create an avatar first." });
    }

    avatar.wearables.push({ url, name, thumbnail: thumbnail || "👕" });
    await avatar.save();

    res.json({ msg: "✅ Wearable added", avatar });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
};

// Delete wearable
exports.deleteWearable = async (req, res) => {
  try {
    const { wearableId } = req.params;

    const avatar = await Avatar.findOne({ userId: req.user.id });
    
    if (!avatar) {
      return res.status(404).json({ msg: "Avatar not found" });
    }

    avatar.wearables = avatar.wearables.filter(w => w._id.toString() !== wearableId);
    await avatar.save();

    res.json({ msg: "✅ Wearable deleted", avatar });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
};

// Save a set (outfit)
exports.saveSet = async (req, res) => {
  try {
    const { name, wearables } = req.body;

    if (!name || !wearables || wearables.length === 0) {
      return res.status(400).json({ msg: "Name and wearables are required" });
    }

    const avatar = await Avatar.findOne({ userId: req.user.id });
    
    if (!avatar) {
      return res.status(404).json({ msg: "Avatar not found" });
    }

    avatar.savedSets.push({ name, wearables });
    await avatar.save();

    res.json({ msg: "✅ Look saved successfully", avatar });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
};

// Delete saved set
exports.deleteSet = async (req, res) => {
  try {
    const { setId } = req.params;

    const avatar = await Avatar.findOne({ userId: req.user.id });
    
    if (!avatar) {
      return res.status(404).json({ msg: "Avatar not found" });
    }

    avatar.savedSets = avatar.savedSets.filter(s => s._id.toString() !== setId);
    await avatar.save();

    res.json({ msg: "✅ Saved look deleted", avatar });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
};
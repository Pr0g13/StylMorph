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
    const { measurements, readyPlayerMeUrl } = req.body;

    if (!measurements || !measurements.height) {
      return res.status(400).json({ msg: "At least height is required" });
    }

    // Convert string values to numbers
    const m = {};
    const fields = ["height", "chest", "waist", "hips", "shoulder", "inseam", "armLength", "neckSize"];
    for (const f of fields) {
      if (measurements[f] !== undefined && measurements[f] !== "") {
        m[f] = parseFloat(measurements[f]) || null;
      }
    }

    let avatar = await Avatar.findOne({ userId: req.user.id });

    if (avatar) {
      avatar.measurements = { ...avatar.measurements, ...m };
      if (readyPlayerMeUrl) avatar.readyPlayerMeUrl = readyPlayerMeUrl;
      await avatar.save();
      res.json({ msg: "✅ Avatar updated successfully", avatar });
    } else {
      avatar = new Avatar({
        userId: req.user.id,
        measurements: m,
        readyPlayerMeUrl: readyPlayerMeUrl || null,
      });
      await avatar.save();
      res.status(201).json({ msg: "✅ Avatar created successfully", avatar });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error", error: err.message });
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
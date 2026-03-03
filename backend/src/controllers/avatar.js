const Avatar = require("../models/Avatar");
const { uploadImage, uploadSmplObj } = require("../config/cloudinary");
const { exec } = require("child_process");
const path = require("path");
const fs = require("fs");

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

// Generate Both SAM 3D & PIFuHD Models
exports.generateModels = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ msg: "No image provided" });
    }

    const imagePath = req.file.path;
    console.log(`[Model Generation] Uploaded image size: ${req.file.size} bytes`);

    // 1. Upload image to Cloudinary
    console.log("[Model Generation] Uploading image to Cloudinary...");
    let imageUrl;
    try {
      imageUrl = await uploadImage(imagePath);
      console.log(`[Model Generation] Image uploaded: ${imageUrl}`);
    } catch (uploadErr) {
      console.warn(`[Model Generation] Cloudinary image upload failed. Error: ${uploadErr.message}`);
    }

    // Prepare paths
    const pifuOutputPath = path.resolve(__dirname, "../../temp", `pifuhd_${Date.now()}.obj`);
    const pifuScriptPath = path.resolve(__dirname, "../../../ml/Pifu/run_pifuhd.py");

    const tempDir = path.join(__dirname, "../../temp");
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // 2. Run PIFuHD
    let pifuhdUrl = null;
    console.log(`[Model Generation] Executing PIFuHD script...`);
    try {
      await new Promise((resolve, reject) => {
        const pythonCmd = `python "${pifuScriptPath}" "${imagePath}" "${pifuOutputPath}"`;
        exec(pythonCmd, { maxBuffer: 1024 * 1024 * 50 }, (error, stdout, stderr) => {
          if (error) {
            console.error(`[PIFuHD Error] ${error.message}`);
            return reject(error);
          }
          resolve();
        });
      });
      // Upload PIFuHD
      console.log("[Model Generation] Uploading PIFuHD model to Cloudinary...");
      try {
        pifuhdUrl = await uploadSmplObj(pifuOutputPath);
      } catch (err) {
        console.warn(`[PIFuHD Upload] Failed. Error: ${err.message}`);
      }
    } catch (err) {
      console.error("[Model Generation] PIFuHD execution failed:", err.message);
    }

    // 3. Update the Avatar document
    let avatar = await Avatar.findOne({ userId: req.user.id });
    if (!avatar) {
      avatar = new Avatar({
        userId: req.user.id,
      });
    }

    // Set URLs only if successfully generated/uploaded
    if (pifuhdUrl) avatar.pifuhdUrl = pifuhdUrl;
    if (imageUrl) avatar.imageUrl = imageUrl;

    await avatar.save();

    // 4. Cleanup temporary files
    try {
      if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
      if (fs.existsSync(pifuOutputPath)) fs.unlinkSync(pifuOutputPath);
    } catch (cleanupErr) {
      console.warn(`[Model Generation] Cleanup warning: ${cleanupErr.message}`);
    }

    res.json({
      msg: "✅ Model generated successfully",
      pifuhdUrl,
      imageUrl,
      avatar,
      pifuhdSuccess: !!pifuhdUrl
    });
  } catch (err) {
    console.error("[Model Generation] Server error:", err);
    res.status(500).json({ msg: "Server error during 3D generation", error: err.message });
  }
};
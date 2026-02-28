const User = require("../models/User");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

exports.signup = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    let existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ msg: "User already exists" });

    const hashed = await bcrypt.hash(password, 10);

    const user = new User({ username, email, password: hashed });
    await user.save();

    res.status(201).json({ msg: "✅ User registered successfully" });
  } catch (err) {
    res.status(500).json({ msg: "Server error" });
  }
};

exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    let user = await User.findOne({ username });
    if (!user) return res.status(400).json({ msg: "Invalid credentials" });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ msg: "Invalid credentials" });

    // --- Assign Default 3D Avatar if missing ---
    const Avatar = require("../models/Avatar");
    let userAvatar = await Avatar.findOne({ userId: user._id });

    // The URLs must match how static files are served by the backend
    const defaultModelUrl = "/temp/outputs/pifuhd_final/recon/default/default.obj";
    const defaultTextureUrl = "/temp/outputs/pifuhd_final/recon/default/default.png";

    if (!userAvatar) {
      await Avatar.create({
        userId: user._id,
        modelUrl: defaultModelUrl,
        textureUrl: defaultTextureUrl,
        measurements: {
          height: 170, chest: 100, waist: 80, hips: 90, shoulder: 45, inseam: 80, armLength: 60, neckSize: 35
        },
        parametricData: {
          bodyType: "average", muscleDefinition: 0.5, bodyFat: 0.5
        }
      });
      console.log(`👤 Created default Avatar for user: ${user.username}`);
    } else if (!userAvatar.modelUrl) {
      // If an avatar exists but doesn't have a model yet, assign the default one
      await Avatar.updateOne(
        { userId: user._id },
        { $set: { modelUrl: defaultModelUrl, textureUrl: defaultTextureUrl } }
      );
      console.log(`👤 Updated existing Avatar with default 3D model for user: ${user.username}`);
    }
    // -------------------------------------------

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "1h" });

    res.json({
      token,
      user: { id: user._id, username: user.username, email: user.email }
    });

  } catch (err) {
    console.error("Login Error:", err);
    res.status(500).json({ msg: "Server error" });
  }
};

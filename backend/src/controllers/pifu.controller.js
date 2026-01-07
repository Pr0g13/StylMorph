const path = require("path");
const { exec } = require("child_process");
const Model3D = require("../models/Model3D");
const { uploadObj } = require("../config/cloudinary");

exports.runPifuHD = async (req, res) => {
  try {
    // 1️⃣ Image from frontend
    const inputImage = req.file.path;

    // 2️⃣ Run PIFuHD
    const cmd = `
      cd pifuhd &&
      python -m apps.simple_test \
      -i ${path.resolve(inputImage)} \
      -o ${path.resolve("temp/outputs")}
    `;

    exec(cmd, async (error) => {
      if (error) {
        console.error("PIFuHD Error:", error);
        return res.status(500).json({ error: "PIFuHD failed" });
      }

      // 3️⃣ PIFuHD output
      const objPath = path.resolve("temp/outputs/result.obj");

      // 4️⃣ Upload .obj to Cloudinary
      const url = await uploadObj(objPath);

      // 5️⃣ Save Cloudinary URL in MongoDB
      await Model3D.create({
        userId: req.user?.id,   // optional chaining safety
        modelUrl: url,
      });

      // 6️⃣ Send response to frontend
      res.json({
        success: true,
        modelUrl: url,
      });
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

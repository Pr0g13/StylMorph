//backend/src/controllers/pifu.controller.js
//[file name]: pifu.controller.js
const path = require("path");
const { exec } = require("child_process");
const Model3D = require("../models/Model3D");
const { uploadObj } = require("../config/cloudinary");
const fs = require("fs");

exports.runPifuHD = async (req, res) => {
  try {
    console.log("📸 Received file:", req.file);
    
    if (!req.file) {
      return res.status(400).json({ error: "Image file not received" });
    }

    // 1️⃣ Image from frontend - already saved as test.png by upload middleware
    const inputImage = path.resolve(req.file.path);
    console.log(`📁 Input image path: ${inputImage}`);

    // 2️⃣ Run PIFuHD - make sure ml/pifuhd is accessible
    // Adjust the path based on your directory structure
    const pifuDir = path.resolve(__dirname, "../../../ml/pifuhd");
    const outputDir = path.resolve(__dirname, "../temp/outputs");
    
    // Create output directory if it doesn't exist
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    console.log(`📁 PiFu Directory: ${pifuDir}`);
    console.log(`📁 Output Directory: ${outputDir}`);

    // 3️⃣ Run PiFuHD
    const cmd = `cd "${pifuDir}" && python -m apps.simple_test -i "${path.dirname(inputImage)}" -o "${outputDir}" -r 256`;
    
    console.log(`🚀 Running command: ${cmd}`);
    
    exec(cmd, async (error, stdout, stderr) => {
      if (error) {
        console.error("❌ PIFuHD Error:", error);
        console.error("🔴 STDERR:", stderr);
        console.error("🟢 STDOUT:", stdout);
        return res.status(500).json({ 
          error: "PIFuHD failed", 
          details: stderr || error.message 
        });
      }

      console.log("✅ PIFuHD stdout:", stdout);
      console.log("⚠️ PIFuHD stderr:", stderr);

      // 4️⃣ Find generated OBJ file
      const files = fs.readdirSync(outputDir);
      console.log(`📄 Files in output directory:`, files);
      
      const objFile = files.find(f => f.endsWith(".obj"));
      
      if (!objFile) {
        console.error("❌ No OBJ file found");
        return res.status(500).json({ error: "OBJ file not generated", files });
      }

      const objPath = path.join(outputDir, objFile);
      console.log(`✅ OBJ file found: ${objPath}`);

      // 5️⃣ Upload to Cloudinary
      let url;
      try {
        url = await uploadObj(objPath);
        console.log(`☁️ Uploaded to Cloudinary: ${url}`);
      } catch (uploadError) {
        console.error("❌ Cloudinary upload failed:", uploadError);
        // Return local path if Cloudinary fails
        url = `/temp/outputs/${objFile}`;
      }

      // 6️⃣ Save to MongoDB (optional)
      let modelDoc;
      try {
        if (req.user?.id) {
          modelDoc = await Model3D.create({
            userId: req.user.id,
            modelUrl: url,
            inputImage: req.file.originalname,
            createdAt: new Date()
          });
          console.log(`💾 Saved to MongoDB: ${modelDoc._id}`);
        }
      } catch (dbError) {
        console.warn("⚠️ Could not save to MongoDB:", dbError);
      }

      // 7️⃣ Send response
      res.json({
        success: true,
        modelUrl: url,
        message: "3D model generated successfully",
        modelId: modelDoc?._id
      });
    });

  } catch (err) {
    console.error("❌ Controller error:", err);
    res.status(500).json({ 
      error: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
};
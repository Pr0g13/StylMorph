//backend/src/controllers/pifu.controller.js
//[file name]: pifu.controller.js
const path = require("path");
const { exec } = require("child_process");
const Model3D = require("../models/Model3D");
const { uploadObj, uploadImage } = require("../config/cloudinary");
const fs = require("fs");
const Jimp = require("jimp");

exports.runPifuHD = async (req, res) => {
  try {
    console.log("📸 Received file:", req.file);

    if (!req.file) {
      return res.status(400).json({ error: "Image file not received" });
    }

    // Unique job ID to prevent concurrent users from wiping each other's files
    const jobId = Date.now().toString() + Math.floor(Math.random() * 1000).toString();
    const inputDir = path.resolve(__dirname, "../../temp/inputs", jobId);

    // Create new input dir and move the file there
    fs.mkdirSync(inputDir, { recursive: true });
    const originalInputImage = path.resolve(req.file.path);
    const inputImage = path.join(inputDir, req.file.filename);

    // Copy file to unique directory
    fs.copyFileSync(originalInputImage, inputImage);
    console.log(`📁 Input image path: ${inputImage}`);

    try {
      // Clean up the original file left in the common folder
      fs.unlinkSync(originalInputImage);
    } catch (cleanErr) {
      console.error("Failed to clean original file:", cleanErr);
    }

    // ----- Perfect Image Framing for PiFuHD using Python (rembg + opencv) -----
    console.log("📐 Preprocessing image: Removing background and finding perfect square bounding box...");
    try {
      const { execSync } = require("child_process");
      const pythonScript = path.resolve(__dirname, "../prepare_pifu_image.py");

      // We run it synchronously so we can wait before PiFuHD starts
      const preprocOutput = execSync(`python "${pythonScript}" "${inputImage}"`);
      console.log(`✅ Preprocessing output:\n${preprocOutput.toString()}`);
    } catch (padErr) {
      console.error("⚠️ Failed to perfectly frame image, continuing with original:", padErr);
      if (padErr.stdout) console.log("STDOUT:", padErr.stdout.toString());
      if (padErr.stderr) console.error("STDERR:", padErr.stderr.toString());
    }
    // --------------------------------------------------------------------------------

    // 2️⃣ Run PIFuHD - make sure ml/pifuhd is accessible
    const pifuDir = path.resolve(__dirname, "../../../ml/pifuhd");
    const outputDir = path.resolve(__dirname, "../../temp/outputs", jobId);

    // Create unique output directory
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    console.log(`📁 PiFu Directory: ${pifuDir}`);
    console.log(`📁 Output Directory: ${outputDir}`);

    // 3️⃣ Run PiFuHD using spawn for better stream handling
    // Use the same arguments as the manual successful test
    const scriptPath = "apps.simple_test";
    const args = [
      "-m", scriptPath,
      "-i", path.dirname(inputImage),
      "-o", outputDir,
      "-r", "128", // Resolution lowered to 128 for significantly faster generation speed
      "--use_rect" // Restored --use_rect, pointing to our exact 100% image bounds
    ];

    console.log(`🚀 Running command: python ${args.join(" ")}`);
    console.log(`📂 CWD: ${pifuDir}`);

    // Set environment variables to prevent PyTorch / OpenMP deadlocks on Windows
    const env = {
      ...process.env,
      OMP_NUM_THREADS: "1",
      MKL_NUM_THREADS: "1",
      OMP_MAX_ACTIVE_LEVELS: "1"
    };

    const { spawn } = require("child_process");
    // shell: false automatically handles spaces in arguments correctly
    const child = spawn("python", args, {
      cwd: pifuDir,
      shell: false,
      env: env
    });

    let stdoutData = "";
    let stderrData = "";

    child.stdout.on("data", (data) => {
      const output = data.toString();
      stdoutData += output;
      console.log(`[PiFuHD]: ${output.trim()}`);
    });

    child.stderr.on("data", (data) => {
      const output = data.toString();
      stderrData += output;
      console.error(`[PiFuHD Err]: ${output.trim()}`);
    });

    child.on("close", async (code) => {
      console.log(`✅ PIFuHD process exited with code ${code}`);

      // Log full output to file for debugging
      const logData = `Timestamp: ${new Date().toISOString()}\nCommand: python ${args.join(" ")}\nExit Code: ${code}\nSTDOUT:\n${stdoutData}\nSTDERR:\n${stderrData}\n\n`;
      try {
        fs.appendFileSync(path.join(__dirname, "../../pifu_error.log"), logData);
      } catch (e) {
        console.error("Could not write pifu_error.log:", e);
      }

      if (code !== 0) {
        console.error("❌ PIFuHD Failed with code", code);
        return res.status(500).json({
          error: "PIFuHD process failed",
          details: stderrData || "Unknown error",
          code: code
        });
      }

      // 4️⃣ Find generated OBJ file
      const resultDir = path.join(outputDir, "pifuhd_final", "recon");

      if (!fs.existsSync(resultDir)) {
        console.error(`❌ Result directory not found: ${resultDir}`);
        return res.status(500).json({ error: "Output directory structure incorrect" });
      }

      const files = fs.readdirSync(resultDir);
      console.log(`📄 Files in output directory:`, files);

      const objFile = files.find(f => f.endsWith(".obj"));

      if (!objFile) {
        console.error("❌ No OBJ file found");
        return res.status(500).json({ error: "OBJ file not generated", files });
      }

      const objPath = path.join(resultDir, objFile);
      console.log(`✅ OBJ file found: ${objPath}`);

      // 5️⃣ Upload to Cloudinary
      let url;
      try {
        url = await uploadObj(objPath);
        console.log(`☁️ Uploaded to Cloudinary: ${url}`);
      } catch (uploadError) {
        console.error("❌ Cloudinary upload failed:", uploadError);
        // Return local path (accessible via static route) if Cloudinary fails
        // Use relative path for frontend
        url = `/temp/outputs/${jobId}/pifuhd_final/recon/${objFile}`;
      }

      // 5.5️⃣ Upload Texture Image to Cloudinary
      let textureUrl;
      try {
        textureUrl = await uploadImage(inputImage);
        console.log(`☁️ Uploaded Texture to Cloudinary: ${textureUrl}`);
      } catch (uploadError) {
        console.error("❌ Cloudinary texture upload failed:", uploadError);
        textureUrl = null;
      }

      // 6️⃣ Save to MongoDB and update User's Avatar
      let modelDoc;
      try {
        if (req.user?.id) {
          modelDoc = await Model3D.create({
            userId: req.user.id,
            modelUrl: url,
            textureUrl: textureUrl,
            inputImage: req.file.originalname,
            createdAt: new Date()
          });
          console.log(`💾 Saved to MongoDB Model3D: ${modelDoc._id}`);

          // Critical fix: Also update the user's main Avatar document so the dashboard actually sees it
          const Avatar = require("../models/Avatar");
          let userAvatar = await Avatar.findOne({ userId: req.user.id });
          if (userAvatar) {
            await Avatar.updateOne({ userId: req.user.id }, { $set: { modelUrl: url, textureUrl: textureUrl } });
            console.log(`👤 Updated user Avatar with new PiFuHD model URL via updateOne`);
          } else {
            userAvatar = await Avatar.create({
              userId: req.user.id,
              modelUrl: url,
              textureUrl: textureUrl,
              measurements: {
                height: 170, chest: 100, waist: 80, hips: 90, shoulder: 45, inseam: 80, armLength: 60, neckSize: 35
              },
              parametricData: {
                bodyType: "average", muscleDefinition: 0.5, bodyFat: 0.5
              }
            });
            console.log(`👤 Created user Avatar with PiFuHD model URL`);
          }
        }
      } catch (dbError) {
        console.warn("⚠️ Could not save to MongoDB:", dbError);
      }

      // 7️⃣ Send response
      res.json({
        success: true,
        modelUrl: url,
        textureUrl: textureUrl,
        message: "3D model generated successfully",
        modelId: modelDoc?._id
      });
    });

    child.on("error", (err) => {
      console.error("❌ Failed to start PIFuHD process:", err);
      res.status(500).json({ error: "Failed to start 3D generation process", details: err.message });
    });

  } catch (err) {
    console.error("❌ Controller error:", err);
    res.status(500).json({
      error: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
};
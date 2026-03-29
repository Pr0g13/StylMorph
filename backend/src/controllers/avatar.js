const Avatar = require("../models/Avatar");
const { uploadImage, uploadSmplObj, deleteImage, deleteSmplObj } = require("../config/cloudinary");
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
    m.source = "manual"; // manually entered by the user

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
    const { name, thumbnail } = req.body;
    let url = req.body.url;

    if (!name) {
      return res.status(400).json({ msg: "Name is required" });
    }

    if (req.file) {
      const imagePath = req.file.path;
      try {
        url = await uploadImage(imagePath);
      } catch (uploadErr) {
        console.warn(`[Wearable] Cloudinary upload failed: ${uploadErr.message}`);
        return res.status(500).json({ msg: "Failed to upload image" });
      } finally {
        if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
      }
    } else if (!url) {
      return res.status(400).json({ msg: "Image file or URL is required" });
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

    // ── Read user-supplied height (multer puts non-file fields in req.body) ──
    const userHeight = req.body.height ? parseFloat(req.body.height) : null;
    if (userHeight) {
      console.log(`[Model Generation] User-provided height: ${userHeight} cm`);
    }

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
    const measureScriptPath = path.resolve(__dirname, "../../../ml/Pifu/extract_measurements.py");

    const tempDir = path.join(__dirname, "../../temp");
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // 2. Run PIFuHD
    let pifuhdUrl = null;
    let pifuhdObjGenerated = false;
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

      pifuhdObjGenerated = fs.existsSync(pifuOutputPath);

      // Upload PIFuHD OBJ to Cloudinary
      console.log("[Model Generation] Uploading PIFuHD model to Cloudinary...");
      try {
        pifuhdUrl = await uploadSmplObj(pifuOutputPath);
      } catch (err) {
        console.warn(`[PIFuHD Upload] Failed. Error: ${err.message}`);
      }
    } catch (err) {
      console.error("[Model Generation] PIFuHD execution failed:", err.message);
    }

    // 3. Extract measurements from the 3D OBJ (if we have the file + a real height)
    let extractedMeasurements = null;
    if (pifuhdObjGenerated && userHeight && userHeight > 50 && userHeight < 280) {
      console.log("[Measurements] Running extract_measurements.py ...");
      try {
        extractedMeasurements = await new Promise((resolve, reject) => {
          const cmd = `python "${measureScriptPath}" "${pifuOutputPath}" "${userHeight}"`;
          exec(cmd, { maxBuffer: 1024 * 1024 * 5 }, (error, stdout, stderr) => {
            if (error) {
              console.warn(`[Measurements] Extraction failed: ${error.message}`);
              return reject(error);
            }
            try {
              resolve(JSON.parse(stdout.trim()));
            } catch (parseErr) {
              console.warn(`[Measurements] JSON parse failed: ${parseErr.message}`);
              reject(parseErr);
            }
          });
        });
        console.log("[Measurements] Extracted:", extractedMeasurements);
      } catch (measErr) {
        console.warn("[Measurements] Falling back to height-only measurements:", measErr.message);
      }
    }

    // 4. Update the Avatar document
    let avatar = await Avatar.findOne({ userId: req.user.id });
    if (!avatar) {
      avatar = new Avatar({ userId: req.user.id });
    }

    // Set URLs only if successfully generated/uploaded
    if (pifuhdUrl) avatar.pifuhdUrl = pifuhdUrl;
    if (imageUrl)  avatar.imageUrl  = imageUrl;

    // ── Apply measurements ──
    if (extractedMeasurements && !extractedMeasurements.error) {
      // Full auto-extraction succeeded
      avatar.measurements = {
        height:    extractedMeasurements.height    ?? userHeight,
        chest:     extractedMeasurements.chest     ?? null,
        waist:     extractedMeasurements.waist     ?? null,
        hips:      extractedMeasurements.hips      ?? null,
        shoulder:  extractedMeasurements.shoulder  ?? null,
        inseam:    extractedMeasurements.inseam    ?? null,
        armLength: extractedMeasurements.armLength ?? null,
        neckSize:  extractedMeasurements.neckSize  ?? null,
        source:    "auto",
      };
    } else if (userHeight) {
      // Only height was provided — store it without overwriting other manual values
      if (!avatar.measurements) avatar.measurements = {};
      avatar.measurements.height = userHeight;
      // Keep source as-is if already set, otherwise mark as manual
      if (!avatar.measurements.source) {
        avatar.measurements.source = "manual";
      }
    }

    await avatar.save();

    // 5. Cleanup temporary files
    try {
      if (fs.existsSync(imagePath))     fs.unlinkSync(imagePath);
      if (fs.existsSync(pifuOutputPath)) fs.unlinkSync(pifuOutputPath);
    } catch (cleanupErr) {
      console.warn(`[Model Generation] Cleanup warning: ${cleanupErr.message}`);
    }

    res.json({
      msg: "✅ Model generated successfully",
      pifuhdUrl,
      imageUrl,
      avatar,
      measurements: avatar.measurements,
      pifuhdSuccess:       !!pifuhdUrl,
      measurementsExtracted: !!extractedMeasurements && !extractedMeasurements.error,
    });
  } catch (err) {
    console.error("[Model Generation] Server error:", err);
    res.status(500).json({ msg: "Server error during 3D generation", error: err.message });
  }
};

// Execute Try-on View
exports.viewWearable = async (req, res) => {
  try {
    const { wearableId } = req.params;
    const avatar = await Avatar.findOne({ userId: req.user.id });

    if (!avatar || !avatar.imageUrl) {
      return res.status(404).json({ msg: "Avatar or user image not found." });
    }

    const wearable = avatar.wearables.find(w => w._id.toString() === wearableId);
    if (!wearable) {
      return res.status(404).json({ msg: "Wearable not found." });
    }

    const downloadAsBase64 = async (url) => {
      const response = await fetch(url);
      const buffer = await response.arrayBuffer();
      return Buffer.from(buffer).toString('base64');
    };

    console.log("[View Wearable] Fetching images for API...");
    const personBase64 = await downloadAsBase64(avatar.imageUrl);
    const garmentBase64 = await downloadAsBase64(wearable.url);

    console.log("[View Wearable] Calling try-on API to queue job...");
    const tryonResponse = await fetch("https://unleisurely-ona-subimbricately.ngrok-free.dev/tryon", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "ngrok-skip-browser-warning": "true"
      },
      body: JSON.stringify({
        person_image: personBase64,
        garment_image: garmentBase64,
        category: "tops"
      }),
      signal: AbortSignal.timeout(600000) // 10-min timeout for generation
    });

    if (!tryonResponse.ok) {
      const errText = await tryonResponse.text();
      throw new Error(`Try-on API returned ${tryonResponse.status}: ${errText.slice(0, 500)}`);
    }

    let tryonData;
    try {
      tryonData = await tryonResponse.json();
    } catch (parseErr) {
      throw new Error("Failed to parse API response. The server might have returned an invalid format or HTML error page.");
    }

    if (!tryonData.success || !tryonData.job_id) {
      throw new Error(`Try-on API failed to queue job: ${tryonData.error || tryonData.message}`);
    }

    const jobId = tryonData.job_id;
    console.log(`[View Wearable] Job queued successfully with ID: ${jobId}`);

    // Return immediately to the frontend
    res.json({ msg: "✅ Try-on job started. The result will appear in ~8 minutes.", tryonData, avatar });

    // Start background task
    setTimeout(async () => {
      console.log(`[Background Task] 8 minutes passed. Retransmitting job ID ${jobId} to fetch result...`);
      try {
        const statusResponse = await fetch("https://unleisurely-ona-subimbricately.ngrok-free.dev/tryon", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "ngrok-skip-browser-warning": "true"
          },
          body: JSON.stringify({ job_id: jobId }),
          signal: AbortSignal.timeout(60000)
        });

        if (!statusResponse.ok) {
          throw new Error(`Try-on status API returned ${statusResponse.status}`);
        }

        const statusData = await statusResponse.json();
        
        if (!statusData.success || statusData.status !== 'completed' || !statusData.result_image) {
          console.warn(`[Background Task] Try-on job ${jobId} incomplete or failed:`, statusData);
          return;
        }
        
        console.log(`[Background Task] Job ${jobId} try-on succeeded, saving to Cloudinary...`);
        const tempDir = path.join(__dirname, "../../temp");
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

        const base64Data = statusData.result_image.replace(/^data:image\/\w+;base64,/, "");
        const tempFilePath = path.join(tempDir, `tryon_${Date.now()}.png`);
        fs.writeFileSync(tempFilePath, base64Data, 'base64');

        const resultUrl = await uploadImage(tempFilePath);
        if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);

        // Fetch latest avatar document in case it was modified
        const freshAvatar = await Avatar.findOne({ userId: req.user.id });
        if (freshAvatar) {
          if (!freshAvatar.tryonResults) freshAvatar.tryonResults = [];
          freshAvatar.tryonResults.push({
            url: resultUrl,
            wearableId: wearable._id,
            wearableUrl: wearable.url,
            wearableName: wearable.name,
            processingTime: statusData.processing_time || null,
            message: statusData.message || "Processed",
            category: statusData.category || "tops"
          });
          // Also push to viewResults for backward compatibility just in case
          if (!freshAvatar.viewResults) freshAvatar.viewResults = [];
          freshAvatar.viewResults.push(resultUrl);

          await freshAvatar.save();
          console.log(`[Background Task] Successfully saved try-on result ${resultUrl} to Avatar.`);
        }
      } catch (e) {
        console.error(`[Background Task] Error fetching or saving job ${jobId}:`, e.message);
      }
    }, 480 * 1000); // 8 minutes

  } catch (err) {
    console.error("[View Wearable] Error:", err.message);
    // Ensure we only reply if headers aren't sent
    if (!res.headersSent) {
      res.status(500).json({ msg: "Server error during try-on", error: err.message });
    }
  }
};

// Delete Try-on Result
exports.deleteTryonResult = async (req, res) => {
  try {
    const { resultId } = req.params;
    const avatar = await Avatar.findOne({ userId: req.user.id });
    if (!avatar) return res.status(404).json({ msg: "Avatar not found" });

    const result = avatar.tryonResults.id(resultId);
    if (!result) return res.status(404).json({ msg: "Try-on result not found" });

    // Delete from Cloudinary
    if (result.url) await deleteImage(result.url);
    if (result.model3dUrl) await deleteSmplObj(result.model3dUrl);

    avatar.tryonResults.pull(resultId);
    await avatar.save();
    
    res.json({ msg: "✅ Try-on result deleted", avatar });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error deleting try-on" });
  }
};

// Generate 3D Model from a specific try-on URL
exports.generate3dFromUrl = async (req, res) => {
  try {
    const { tryonUrl } = req.body;
    if (!tryonUrl) return res.status(400).json({ msg: "tryonUrl is required" });

    const avatar = await Avatar.findOne({ userId: req.user.id });
    if (!avatar) return res.status(404).json({ msg: "Avatar not found" });

    // Download the try-on image
    const downloadResponse = await fetch(tryonUrl);
    const buffer = await downloadResponse.arrayBuffer();
    const tempDir = path.join(__dirname, "../../temp");
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
    
    const imagePath = path.join(tempDir, `tryon_dl_${Date.now()}.png`);
    fs.writeFileSync(imagePath, Buffer.from(buffer));

    const pifuOutputPath = path.resolve(__dirname, "../../temp", `pifuhd_${Date.now()}.obj`);
    const pifuScriptPath = path.resolve(__dirname, "../../../ml/Pifu/run_pifuhd.py");

    console.log(`[Model Generation] Executing PIFuHD on specific URL...`);
    await new Promise((resolve, reject) => {
        const pythonCmd = `python "${pifuScriptPath}" "${imagePath}" "${pifuOutputPath}"`;
        exec(pythonCmd, { maxBuffer: 1024 * 1024 * 50 }, (error, stdout, stderr) => {
          if (error) {
            return reject(error);
          }
          resolve();
        });
    });

    if (!fs.existsSync(pifuOutputPath)) {
       throw new Error("PIFuHD failed to generate OBJ");
    }

    const pifuhdUrl = await uploadSmplObj(pifuOutputPath);
    
    if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
    if (fs.existsSync(pifuOutputPath)) fs.unlinkSync(pifuOutputPath);

    // Sync across the avatar document anywhere this url exists
    if (avatar.tryonResults) {
        avatar.tryonResults.forEach(r => {
           if (r.url === tryonUrl) r.model3dUrl = pifuhdUrl;
        });
    }
    if (avatar.savedSets) {
        avatar.savedSets.forEach(set => {
           set.wearables.forEach(w => {
               if (w.tryonUrl === tryonUrl) w.model3dUrl = pifuhdUrl;
           });
        });
    }

    await avatar.save();

    res.json({
      msg: "✅ 3D Model generated",
      model3dUrl: pifuhdUrl,
      avatar
    });
  } catch (err) {
    console.error("[Model Generation] Server error:", err);
    res.status(500).json({ msg: "Server error during 3D generation", error: err.message });
  }
};
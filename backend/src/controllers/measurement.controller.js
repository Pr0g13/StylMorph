// backend/src/controllers/measurement.controller.js
const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");
const Avatar = require("../models/Avatar");
const { uploadSmplObj } = require("../config/cloudinary");

/**
 * POST /api/measurements/calculate
 *
 * Multipart fields:
 *   - height  (string/number) – real height in cm
 *   - front   (image file)
 *   - back    (image file)
 *   - left    (image file)
 *   - right   (image file)
 *
 * Pipeline:
 *   1. Validate inputs
 *   2. Run generate_smpl.py (measurement extraction + OBJ generation)
 *   3. Parse JSON result from stdout
 *   4. Save measurements to MongoDB (Avatar document)
 *   5. Upload .obj to Cloudinary
 *   6. Save model URL to Avatar
 *   7. Cleanup temp files
 *   8. Return measurements + modelUrl to frontend
 */
exports.calculateMeasurements = async (req, res) => {
    const uploadedFiles = [];

    try {
        // ── 1. Validate ──────────────────────────────────────────────────────────
        const { height } = req.body;
        const files = req.files;

        if (!height || isNaN(parseFloat(height))) {
            return res.status(400).json({
                success: false,
                error: "Height (cm) is required and must be a number",
            });
        }

        if (!files || !files.front || !files.back || !files.left || !files.right) {
            return res.status(400).json({
                success: false,
                error: "All 4 images are required: front, back, left, right",
            });
        }

        const frontPath = path.resolve(files.front[0].path);
        const backPath = path.resolve(files.back[0].path);
        const leftPath = path.resolve(files.left[0].path);
        const rightPath = path.resolve(files.right[0].path);

        uploadedFiles.push(frontPath, backPath, leftPath, rightPath);

        console.log(`📸 Received 4 images – height: ${height} cm`);
        console.log(`  front: ${frontPath}`);
        console.log(`  back:  ${backPath}`);
        console.log(`  left:  ${leftPath}`);
        console.log(`  right: ${rightPath}`);

        // ── 2. Run Python SMPL pipeline ──────────────────────────────────────────
        const scriptPath = path.resolve(
            __dirname,
            "../../../ml/smpl_pipeline/generate_smpl.py"
        );

        if (!fs.existsSync(scriptPath)) {
            return res.status(500).json({
                success: false,
                error: "SMPL pipeline script not found",
                scriptPath,
            });
        }

        const pythonResult = await new Promise((resolve, reject) => {
            const args = [
                scriptPath,
                String(parseFloat(height)),
                frontPath,
                backPath,
                leftPath,
                rightPath,
            ];

            console.log(`🐍 Running: python ${args.join(" ")}`);

            const proc = spawn("python", args);
            let stdout = "";
            let stderr = "";

            proc.stdout.on("data", (d) => { stdout += d.toString(); });
            proc.stderr.on("data", (d) => { stderr += d.toString(); });

            proc.on("close", (code) => {
                if (code !== 0) {
                    console.error("❌ Python stderr:\n", stderr);
                    return reject(new Error(`SMPL script exited with code ${code}: ${stderr.slice(0, 500)}`));
                }
                try {
                    const json = JSON.parse(stdout.trim());
                    resolve(json);
                } catch (e) {
                    reject(new Error(`Failed to parse Python output: ${stdout.slice(0, 200)}`));
                }
            });

            proc.on("error", (err) => {
                reject(new Error(`Failed to spawn Python process: ${err.message}`));
            });
        });

        const { measurements, obj_path } = pythonResult;
        console.log("✅ Measurements extracted:", measurements);
        console.log("✅ OBJ file:", obj_path);

        // ── 3. Save measurements to MongoDB ──────────────────────────────────────
        let avatarDoc = null;
        const userId = req.user?.id || req.user?._id;

        if (userId) {
            try {
                avatarDoc = await Avatar.findOneAndUpdate(
                    { userId },
                    {
                        $set: {
                            measurements,
                            updatedAt: new Date(),
                        },
                    },
                    { new: true, upsert: true, runValidators: false }
                );
                console.log(`💾 Measurements saved to MongoDB (avatar: ${avatarDoc._id})`);
            } catch (dbErr) {
                console.warn("⚠️ MongoDB save failed (measurements):", dbErr.message);
            }
        } else {
            console.warn("⚠️ No userId in request – skipping MongoDB save");
        }

        // ── 4. Upload .obj to Cloudinary ─────────────────────────────────────────
        let modelUrl = null;
        if (obj_path && fs.existsSync(obj_path)) {
            try {
                console.log("☁️  Uploading .obj to Cloudinary…");
                modelUrl = await uploadSmplObj(obj_path);
                console.log("☁️  Uploaded:", modelUrl);
            } catch (uploadErr) {
                console.error("❌ Cloudinary upload failed:", uploadErr.message);
                // Fallback – serve locally (backend must have /temp route serving smpl outputs)
                const rel = path.relative(
                    path.resolve(__dirname, "../"),
                    obj_path
                ).replace(/\\/g, "/");
                modelUrl = `/temp/${rel}`;
                console.warn("⚠️  Using local fallback URL:", modelUrl);
            }

            // ── 5. Persist model URL in MongoDB ────────────────────────────────────
            if (userId && modelUrl) {
                try {
                    await Avatar.findOneAndUpdate(
                        { userId },
                        { $set: { smplModelUrl: modelUrl, updatedAt: new Date() } },
                        { new: true, runValidators: false }
                    );
                    console.log("💾 smplModelUrl saved to MongoDB");
                } catch (dbErr) {
                    console.warn("⚠️ MongoDB smplModelUrl save failed:", dbErr.message);
                }
            }
        } else {
            console.error("❌ OBJ file not found at:", obj_path);
        }

        // ── 6. Cleanup uploaded images ────────────────────────────────────────────
        uploadedFiles.forEach((fp) => {
            try { fs.unlinkSync(fp); } catch (_) { }
        });

        // ── 7. Return ─────────────────────────────────────────────────────────────
        return res.json({
            success: true,
            measurements,
            modelUrl,
            message: "3D body model generated successfully",
        });

    } catch (err) {
        console.error("❌ calculateMeasurements error:", err);

        // Cleanup on error
        uploadedFiles.forEach((fp) => {
            try { fs.unlinkSync(fp); } catch (_) { }
        });

        return res.status(500).json({
            success: false,
            error: err.message || "Internal server error",
        });
    }
};

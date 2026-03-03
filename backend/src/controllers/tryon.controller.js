const path = require("path");
const { exec } = require("child_process");
const fs = require("fs");
const { uploadImage } = require("../config/cloudinary");

exports.runTryOn = async (req, res) => {
    try {
        const { personImage, garmentImage } = req.files;

        if (!personImage || !garmentImage) {
            return res.status(400).json({ msg: "Both personImage and garmentImage are required." });
        }

        const personImagePath = personImage[0].path;
        const garmentImagePath = garmentImage[0].path;

        // Output path for the python script
        const outputFileName = `tryon_${Date.now()}.png`;
        const uploadsDir = path.join(__dirname, "../../uploads");
        const outputFilePath = path.join(uploadsDir, outputFileName);

        // Ensure uploads directory exists
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
        }

        console.log("Running IDM-VTON python script...");

        // Path to the python script
        const scriptPath = path.join(__dirname, "../../../ml/idmvton/run_tryon.py");

        // Ensure you use the correct python path depending on environment (e.g., venv python)
        // Using default `python` here, assuming gradio_client is installed globally or in current env.
        const command = `python "${scriptPath}" --person "${personImagePath}" --garment "${garmentImagePath}" --output "${outputFilePath}"`;

        exec(command, async (error, stdout, stderr) => {
            // Clean up uploaded files after processing to save space
            if (fs.existsSync(personImagePath)) fs.unlinkSync(personImagePath);
            if (fs.existsSync(garmentImagePath)) fs.unlinkSync(garmentImagePath);

            if (error) {
                console.error(`TryOn exec error: ${error}`);
                console.error(`stderr: ${stderr}`);
                return res.status(500).json({ msg: "Error running TryOn", error: stderr });
            }

            console.log(`TryOn stdout: ${stdout}`);

            if (!fs.existsSync(outputFilePath)) {
                return res.status(500).json({ msg: "TryOn script failed to generate output." });
            }

            try {
                console.log("Uploading TryOn result to Cloudinary...");
                const cloudinaryResult = await uploadImage(outputFilePath);

                // Clean up output file
                if (fs.existsSync(outputFilePath)) fs.unlinkSync(outputFilePath);

                res.json({ success: true, url: cloudinaryResult.secure_url });
            } catch (uploadError) {
                console.error("Cloudinary upload failed", uploadError);
                res.status(500).json({ msg: "Failed to upload generated tryon image." });
            }
        });

    } catch (err) {
        console.error("TryOn controller error:", err);
        res.status(500).send("Server Error");
    }
};

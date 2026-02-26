const path = require("path");
const fs = require("fs");
const { spawn } = require("child_process");
const axios = require("axios");
const cheerio = require("cheerio");
const { v4: uuidv4 } = require("uuid");
const obj2gltf = require("obj2gltf");
const cloudinary = require("../config/cloudinary");
const Avatar = require("../models/Avatar");

const TEMP_IN_DIR = path.join(__dirname, "../../temp/inputs");
const TEMP_OUT_DIR = path.join(__dirname, "../../temp/outputs");

// Helper: Download image from URL
async function downloadImage(url, destPath) {
    const response = await axios({
        url,
        method: 'GET',
        responseType: 'stream',
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
    });

    return new Promise((resolve, reject) => {
        const writer = fs.createWriteStream(destPath);
        response.data.pipe(writer);
        writer.on('finish', resolve);
        writer.on('error', reject);
    });
}

// Scrape product URL to get the main image (og:image)
async function scrapeProductImage(url) {
    try {
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5'
            }
        });

        const $ = cheerio.load(response.data);

        // Attempt to get og:image metadata
        let imageUrl = $('meta[property="og:image"]').attr('content');

        if (!imageUrl) {
            // Fallback strategies for Amazon/Flipkart
            imageUrl = $('#landingImage').attr('src'); // Amazon main image
            if (!imageUrl) imageUrl = $('.a-dynamic-image').attr('data-old-hires');
            if (!imageUrl) imageUrl = $('img[data-a-dynamic-image]').first().attr('src'); // alternate Amazon
        }

        if (imageUrl) {
            // sometimes URLs are protocol relative
            if (imageUrl.startsWith('//')) {
                imageUrl = 'https:' + imageUrl;
            }
        }

        return imageUrl;
    } catch (error) {
        console.error("Scraping failed:", error.message);
        return null;
    }
}

exports.addWearableFromUrl = async (req, res) => {
    req.setTimeout(600000); // 10 minutes timeout
    res.setTimeout(600000);

    try {
        const { url, name, type = "shirt" } = req.body;

        if (!url) {
            return res.status(400).json({ msg: "Product URL is required" });
        }

        console.log(`[WearablePipeline] Starting pipeline for ${url}`);

        // 1. Scrape image URL
        const imageUrl = await scrapeProductImage(url);
        if (!imageUrl) {
            return res.status(400).json({ msg: "Failed to extract product image from the provided URL. Please manually save the image and upload it." });
        }

        console.log(`[WearablePipeline] Found image: ${imageUrl}`);

        // 2. Download Image
        const imageId = uuidv4();
        const originalImagePath = path.join(TEMP_IN_DIR, `${imageId}.png`);
        await downloadImage(imageUrl, originalImagePath);
        console.log(`[WearablePipeline] Downloaded image locally`);

        // 3. Preprocess Image (Python rembg)
        console.log(`[WearablePipeline] Running python pre-processor...`);
        const pythonScript = path.join(__dirname, "../prepare_garment_image.py");
        await new Promise((resolve, reject) => {
            const pythonProcess = spawn('python', [pythonScript, originalImagePath]);
            pythonProcess.stdout.on('data', (data) => console.log(`[Py.Preprocess] ${data.toString()}`));
            pythonProcess.stderr.on('data', (data) => console.error(`[Py.Preprocess ERR] ${data.toString()}`));
            pythonProcess.on('close', (code) => code === 0 ? resolve() : reject(new Error(`Preprocess failed with code ${code}`)));
        });

        // 4. Generate 3D Mesh (PIFuHD)
        console.log(`[WearablePipeline] Running PIFuHD generation...`);
        // NOTE: This runs from the root of StylMorph so our directories match PIFuHD's expectations.
        const projectRoot = path.join(__dirname, "../../../../pifuhd");
        const pifuhdScript = path.join(projectRoot, "apps/simple_test.py");

        if (!fs.existsSync(pifuhdScript)) {
            throw new Error(`PIFuHD script not found at ${pifuhdScript}`);
        }

        // Since we pre-processed it as a square padded image, we can just run PIFu directly
        const args = [
            "-m", pifuhdScript,
            "-i", TEMP_IN_DIR,
            "-o", TEMP_OUT_DIR,
            "-r", "128", // Using 128 for speed (MVP)
            "--use_rect" // Use the 512x512 bounding box we generated
        ];

        await new Promise((resolve, reject) => {
            // Activating conda environment based on existing knowledge pattern
            const cmdStr = `conda activate pifuhd && ObjectName python ${args.join(' ')}`;
            const process = spawn('cmd.exe', ['/c', cmdStr]);

            process.stdout.on('data', (data) => console.log(`[PIFuHD] ${data.toString().trim()}`));
            process.stderr.on('data', (data) => console.error(`[PIFuHD ERR] ${data.toString().trim()}`));
            process.on('close', (code) => code === 0 ? resolve() : reject(new Error(`PIFuHD failed with code ${code}`)));
        });

        // 5. Convert OBJ to GLB
        const expectedObjName = `result_${imageId}.obj`;
        const generatedObjPath = path.join(TEMP_OUT_DIR, 'pifuhd_final', 'recon', expectedObjName);
        const glbFilename = expectedObjName.replace('.obj', '.glb');
        const generatedGlbPath = path.join(TEMP_OUT_DIR, glbFilename);

        if (!fs.existsSync(generatedObjPath)) {
            throw new Error(`Generated OBJ file not found at ${generatedObjPath}`);
        }

        console.log(`[WearablePipeline] Converting OBJ to GLB...`);
        // Convert objective mesh to glb binary (smaller file, faster load over network)
        const glbData = await obj2gltf(generatedObjPath, { binary: true });
        fs.writeFileSync(generatedGlbPath, glbData);

        // 6. Upload GLB and Texture to Cloudinary
        console.log(`[WearablePipeline] Uploading assets to Cloudinary...`);
        const glbUrl = await cloudinary.uploadObj(generatedGlbPath);
        let textureUrl = null;
        try {
            textureUrl = await cloudinary.uploadImage(originalImagePath);
        } catch (e) {
            console.log("Failed to upload texture, continuing...", e.message);
        }

        console.log(`[WearablePipeline] Upload complete! Mesh: ${glbUrl}, Texture: ${textureUrl}`);

        // 7. Save to Avatar MongoDB
        const updatedAvatar = await Avatar.findOneAndUpdate(
            { userId: req.user.id },
            {
                $push: {
                    wearables: {
                        url: glbUrl,
                        textureUrl: textureUrl,
                        name: name || "Garment URL Generated",
                        thumbnail: "👕",
                        type: type // 'shirt' etc
                    }
                }
            },
            { new: true }
        );

        if (!updatedAvatar) {
            return res.status(404).json({ msg: "Avatar not found. Create an avatar first." });
        }

        // Cleanup local files
        try {
            fs.unlinkSync(originalImagePath);
            fs.unlinkSync(originalImagePath.replace('.png', '_rect.txt'));
            fs.unlinkSync(generatedObjPath);
            fs.unlinkSync(generatedGlbPath);
        } catch (e) { console.log('Cleanup error (ignored)', e.message); }

        res.json({
            msg: "✅ 3D Wearable generated successfully",
            avatar: updatedAvatar,
            wearable: {
                url: glbUrl,
                textureUrl: textureUrl
            }
        });

    } catch (err) {
        console.error("[Wearables Controller Error]", err);
        res.status(500).json({ msg: "Pipeline error", error: err.message, stack: err.stack });
    }
};

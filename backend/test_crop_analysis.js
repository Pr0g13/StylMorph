const Jimp = require("jimp");
const path = require("path");

async function run() {
    const imgPath = path.resolve(__dirname, "./src/temp/inputs/test.png");
    console.log("Reading:", imgPath);
    try {
        const img = await Jimp.read(imgPath);
        console.log("Original Size:", img.bitmap.width, "x", img.bitmap.height);

        img.autocrop({ tolerance: 0.05, cropOnlyFrames: false });
        console.log("After Autocrop:", img.bitmap.width, "x", img.bitmap.height);
    } catch (e) { console.error(e) }
}
run();

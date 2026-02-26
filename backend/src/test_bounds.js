const fs = require('fs');
const readline = require('readline');

async function processLineByLine() {
    const fileStream = fs.createReadStream('c:/Users/neera/OneDrive/Documents/Major Project/StylMorph/StylMorph/backend/src/temp/outputs/pifuhd_final/recon/result_test_512.obj');

    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

    for await (const line of rl) {
        if (line.startsWith('v ')) {
            const parts = line.split(' ');
            const x = parseFloat(parts[1]);
            const y = parseFloat(parts[2]);
            const z = parseFloat(parts[3]);

            if (x < minX) minX = x;
            if (y < minY) minY = y;
            if (z < minZ) minZ = z;
            if (x > maxX) maxX = x;
            if (y > maxY) maxY = y;
            if (z > maxZ) maxZ = z;
        }
    }

    const sizeX = maxX - minX;
    const sizeY = maxY - minY;
    const sizeZ = maxZ - minZ;

    const lengthSq = sizeX * sizeX + sizeY * sizeY + sizeZ * sizeZ;

    console.log(`Bounds: X:[${minX}, ${maxX}] Y:[${minY}, ${maxY}] Z:[${minZ}, ${maxZ}]`);
    console.log(`Size: X:${sizeX} Y:${sizeY} Z:${sizeZ}`);
    console.log(`LengthSq: ${lengthSq}`);
}

processLineByLine();

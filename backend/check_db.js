const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const connectDB = require("./src/config/db");
const Avatar = require("./src/models/Avatar");
const Model3D = require("./src/models/Model3D");

async function checkDb() {
    await connectDB();
    console.log("Connected to DB");
    const latestAvatar = await Avatar.findOne().sort({ createdAt: -1 });
    console.log("Latest Avatar:");
    console.log(latestAvatar);

    const latestModel = await Model3D.findOne().sort({ createdAt: -1 });
    console.log("\nLatest Model3D:");
    console.log(latestModel);
    process.exit(0);
}

checkDb();

// routes/pifu.routes.js
const express = require("express");
const upload = require("../middleware/upload");
const { runPifuHD } = require("../controllers/pifu.controller");

const router = express.Router();

router.post("/generate", upload.single("image"), runPifuHD);

module.exports = router;

// src/routes/avatar.js
const express = require("express");
const auth = require("../middleware/auth");
const upload = require("../middleware/upload");
const {
  getAvatar,
  saveAvatar,
  addWearable,
  deleteWearable,
  saveSet,
  deleteSet,
  generateAvatarMeasurements
} = require("../controllers/avatar");

const router = express.Router();

// All routes are protected with auth middleware
router.get("/", auth, getAvatar);
router.post("/", auth, saveAvatar);
router.post("/wearables", auth, addWearable);
router.delete("/wearables/:wearableId", auth, deleteWearable);
router.post("/sets", auth, saveSet);
router.delete("/sets/:setId", auth, deleteSet);
router.post(
  "/measure",
  upload.fields([
    { name: "front", maxCount: 1 },
    { name: "back", maxCount: 1},
    { name: "left", maxCount: 1 },
    { name: "right", maxCount: 1 }

  ]),
  generateAvatarMeasurements
);

module.exports = router;
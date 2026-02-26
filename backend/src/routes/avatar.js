// src/routes/avatar.js
const express = require("express");
const auth = require("../middleware/auth");
const {
  getAvatar,
  saveAvatar,
  addWearable,
  deleteWearable,
  saveSet,
  deleteSet
} = require("../controllers/avatar");
const { addWearableFromUrl } = require("../controllers/wearables.controller");

const router = express.Router();

// All routes are protected with auth middleware
router.get("/", auth, getAvatar);
router.post("/", auth, saveAvatar);
router.post("/wearables", auth, addWearable);
router.post("/wearables/url", auth, addWearableFromUrl);
router.delete("/wearables/:wearableId", auth, deleteWearable);
router.post("/sets", auth, saveSet);
router.delete("/sets/:setId", auth, deleteSet);

module.exports = router;
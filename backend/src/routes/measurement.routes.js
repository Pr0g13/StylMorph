// backend/src/routes/measurement.routes.js
const express = require("express");
const upload = require("../middleware/uploadMeasurement");
const { calculateMeasurements } = require("../controllers/measurement.controller");
const auth = require("../middleware/auth");

const router = express.Router();

// Optional auth: try to decode token but don't block if absent
const optionalAuth = (req, res, next) => {
    const token = req.header("Authorization")?.replace("Bearer ", "");
    if (!token) return next();
    try {
        const jwt = require("jsonwebtoken");
        req.user = jwt.verify(token, process.env.JWT_SECRET);
    } catch (_) { }
    next();
};

/**
 * POST /api/measurements/calculate
 * Multipart: height (text), front/back/left/right (images)
 */
router.post("/calculate", optionalAuth, upload, calculateMeasurements);

module.exports = router;

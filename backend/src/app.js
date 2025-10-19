// src/app.js
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const connectDB = require("./config/db");

const authRoutes = require("./routes/auth");
const avatarRoutes = require("./routes/avatar");

const app = express();
connectDB();

app.use(cors());
app.use(bodyParser.json());

app.use("/auth", authRoutes);
app.use("/avatar", avatarRoutes);

// optional health check
app.get("/", (req, res) => res.send({ ok: true, message: "StylMorph API" }));

module.exports = app;
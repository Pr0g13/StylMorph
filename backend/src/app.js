const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const connectDB = require("./config/db");

const authRoutes = require("./routes/auth");

const app = express();
connectDB();

app.use(cors());
app.use(bodyParser.json());

app.use("/auth", authRoutes);

module.exports = app;

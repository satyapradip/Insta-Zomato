const mongoose = require("mongoose");
const config = require("../config/index");

function connectDB() {
  mongoose
    // config.db.uri comes from the validated .env — guaranteed to exist
    .connect(config.db.uri)
    .then(() => console.log("✅  MongoDB connected"))
    .catch((err) => console.error("❌  MongoDB connection error:", err));
}

module.exports = connectDB;

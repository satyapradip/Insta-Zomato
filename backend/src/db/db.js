const mongoose = require("mongoose");
const config = require("../config/index");
const logger = require("../config/logger");

function connectDB() {
  mongoose
    // config.db.uri comes from the validated .env — guaranteed to exist
    .connect(config.db.uri)
    .then(() => logger.info("MongoDB connected successfully"))
    .catch((err) =>
      logger.error("MongoDB connection failed", { error: err.message }),
    );
}

module.exports = connectDB;

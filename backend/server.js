// Must be first — loads .env into process.env before anything else runs
require("dotenv").config();

// config/index.js runs Zod validation immediately on require.
// If any required env var is missing, it prints a clear error and exits.
const config = require("./src/config/index");
const app = require("./src/app");
const connectDB = require("./src/db/db");

// Connect to MongoDB
connectDB();

// Start the HTTP server on the port defined in .env (defaults to 3000)
app.listen(config.port, () => {
  console.log(
    `✅  Server running in ${config.env} mode on port ${config.port}`,
  );
});

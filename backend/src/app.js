const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const morgan = require("morgan");
const compression = require("compression");
const cookieParser = require("cookie-parser");

const authRoutes = require("./routes/auth.routes");
const foodRoutes = require("./routes/food.routes");
const errorMiddleware = require("./middlewares/error.middleware");
const {
  globalLimiter,
  authLimiter,
  uploadLimiter,
  orderLimiter,
} = require("./config/rateLimiters");

const app = express();

// ── Global rate limiter (100 req / 15 min per IP) ────────────────────────
app.use(globalLimiter);

// ── Security headers (XSS, CSP, HSTS, etc.) ───────────────────────────────
app.use(helmet());

// ── CORS — allow only origins listed in ALLOWED_ORIGINS env var ───────────
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim())
  : ["http://localhost:5173", "http://localhost:3000"];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow server-to-server / Postman requests (no origin header)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: origin "${origin}" not allowed`));
      }
    },
    credentials: true, // allow cookies to be sent cross-origin
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

// ── HTTP request logging ───────────────────────────────────────────────────
// "dev" in development (colorised), "combined" (Apache format) in production
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

// ── Gzip compression ──────────────────────────────────────────────────────
app.use(compression());

// ── Body parsers ──────────────────────────────────────────────────────────
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

// ── Health check ──────────────────────────────────────────────────────────
app.get("/", (req, res) => {
  res.json({ success: true, message: "Insta-Zomato API is running 🚀" });
});

// ── API routes ────────────────────────────────────────────────────────────
// Auth routes: tighter limit (10 req / 15 min) for login, register, etc.
app.use("/api/auth", authLimiter, authRoutes);
// Food routes: upload limiter on POST (video/image), global covers reads
app.use("/api/food", uploadLimiter, foodRoutes);
// Orders route (to be created): 20 req / min limiter
app.use("/api/orders", orderLimiter);

// ── 404 handler (must come after all routes) ──────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    statusCode: 404,
    message: `Route ${req.method} ${req.originalUrl} not found`,
  });
});

// ── Global error handler (must be last) ──────────────────────────────────
app.use(errorMiddleware);

module.exports = app;

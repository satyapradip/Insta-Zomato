const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const morgan = require("morgan");
const compression = require("compression");
const cookieParser = require("cookie-parser");
const mongoSanitize = require("express-mongo-sanitize");

const authRoutes = require("./routes/auth.routes");
const foodRoutes = require("./routes/food.routes");
const feedRoutes = require("./routes/feed.routes");
const userRoutes = require("./routes/user.routes");
const cartRoutes = require("./routes/cart.routes");
const orderRoutes = require("./routes/order.routes");
const paymentRoutes = require("./routes/payment.routes");
const walletRoutes = require("./routes/wallet.routes");
const deliveryRoutes = require("./routes/delivery.routes");
const locationRoutes = require("./routes/location.routes");
const errorMiddleware = require("./middlewares/error.middleware");
const config = require("./config/index");
const logger = require("./config/logger");
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
// config.cors.allowedOrigins is pre-parsed from the validated .env
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow server-to-server / Postman requests (no origin header)
      if (!origin || config.cors.allowedOrigins.includes(origin)) {
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
// Morgan formats the request line; we pipe it through Winston so it gets
// a timestamp and lands in the combined log file as well as the console.
// logger.stream.write() is defined at the bottom of logger.js.
app.use(morgan(config.isProd ? "combined" : "dev", { stream: logger.stream }));

// ── Gzip compression ──────────────────────────────────────────────────────
app.use(compression());

// ── Body parsers ──────────────────────────────────────────────────────────
// Capture rawBody buffer for authentic Razorpay webhook HMAC signature verification
app.use(
  express.json({
    limit: "10mb",
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
  }),
);
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

// ── NoSQL injection prevention — strips `$` and `.` from req.body / params ─
app.use((req, res, next) => {
  if (req.body) mongoSanitize.sanitize(req.body);
  if (req.params) mongoSanitize.sanitize(req.params);
  next();
});

// ── XSS sanitization — strip HTML tags from req.body / req.params ──────────
const { clean: xssCleanUtil } = require("xss-clean/lib/xss");
app.use((req, res, next) => {
  if (req.body) req.body = xssCleanUtil(req.body);
  if (req.params) req.params = xssCleanUtil(req.params);
  if (req.query && typeof req.query === "object") {
    try {
      for (const key of Object.keys(req.query)) {
        req.query[key] = xssCleanUtil(req.query[key]);
      }
    } catch (_) {}
  }
  next();
});

// ── Health check ──────────────────────────────────────────────────────────
app.get("/", (req, res) => {
  res.json({ success: true, message: "Insta-Zomato API is running 🚀" });
});

// ── API routes ────────────────────────────────────────────────────────────
// Auth routes: tighter limit (10 req / 15 min) for login, register, etc.
app.use("/api/auth", authLimiter, authRoutes);
// Food routes: upload limiter on POST (video/image), global covers reads
app.use("/api/food", uploadLimiter, foodRoutes);
// Discovery Feed: Cursor-based video stream
app.use("/api/feed", feedRoutes);
// User Social & Profile routes
app.use("/api/users", userRoutes);
// Cart & Checkout routes
app.use("/api/cart", cartRoutes);
// Orders route: 20 req / min limiter
app.use("/api/orders", orderLimiter, orderRoutes);
// Razorpay Payment & Webhook routes
app.use("/api/payment", paymentRoutes);
// In-App Digital Wallet routes
app.use("/api/wallet", walletRoutes);
// Delivery Rider & Live GPS routes
app.use("/api/delivery", deliveryRoutes);
// Geospatial, Maps & Location routes
app.use("/api/location", locationRoutes);

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

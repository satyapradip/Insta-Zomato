// src/config/index.js
//
// ─── WHY THIS FILE EXISTS ─────────────────────────────────────────────────────
// Without this file, `process.env.SOMETHING` is scattered across 10+ files.
// If you rename a variable or forget to add it to .env, the app silently breaks
// at runtime — sometimes hours after deployment.
//
// This file does two things:
//   1. VALIDATES  — uses Zod to check all required env vars exist and have the
//                   right shape. If anything is missing the server crashes
//                   immediately on startup with a clear error message.
//   2. CENTRALISES — exports a single `config` object so the rest of the app
//                   never touches `process.env` directly.
// ─────────────────────────────────────────────────────────────────────────────

const { z } = require("zod");

// ── Step 1:  Define the schema ────────────────────────────────────────────────
// Think of this as a "contract" for what your .env must contain.
// z.string()              → must be a non-empty string
// z.coerce.number()       → converts "3000" (string) → 3000 (number) automatically
// .default("development") → use this value if the variable is not set
// .optional()             → variable is not required right now (used in later phases)

const envSchema = z.object({
  // ── App ────────────────────────────────────────────────────────────────────
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.coerce.number().default(3000),

  // ── Database ───────────────────────────────────────────────────────────────
  MONGO_URI: z.string().min(1, "MONGO_URI is required — add it to your .env"),

  // ── JWT ────────────────────────────────────────────────────────────────────
  // min(32) enforces that the secret is long enough to be secure
  JWT_SECRET: z
    .string()
    .min(32, "JWT_SECRET must be at least 32 characters long"),

  // ── CORS ───────────────────────────────────────────────────────────────────
  // Optional — falls back to localhost defaults if not set
  ALLOWED_ORIGINS: z.string().optional(),

  // ── Cloudinary (video/image uploads) ──────────────────────────────────────
  CLOUDINARY_CLOUD_NAME: z.string().min(1, "CLOUDINARY_CLOUD_NAME is required"),
  CLOUDINARY_API_KEY: z.string().min(1, "CLOUDINARY_API_KEY is required"),
  CLOUDINARY_API_SECRET: z.string().min(1, "CLOUDINARY_API_SECRET is required"),

  // ── Razorpay (Phase 8 — Payments) — optional until Phase 8 ───────────────
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),

  // ── SMTP / Email (Phase 12 — Notifications) — optional until Phase 12 ────
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().optional(),

  // ── Redis (Phase 15 — Caching) — optional until Phase 15 ─────────────────
  REDIS_URL: z.string().optional(),

  // ── Google Maps (Phase 9 — Location) — optional until Phase 9 ───────────
  GOOGLE_MAPS_API_KEY: z.string().optional(),
});

// ── Step 2:  Parse and validate ───────────────────────────────────────────────
// safeParse() does NOT throw — it returns { success: true/false, data/error }
// This lets us print ALL the missing variables at once instead of one-at-a-time.
const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // Print every missing/invalid variable clearly so you know exactly what to fix
  console.error("\n❌  Invalid / missing environment variables:\n");
  parsed.error.issues.forEach((issue) => {
    console.error(`   • ${issue.path.join(".")}: ${issue.message}`);
  });
  console.error("\n   → Fix your .env file and restart the server.\n");
  // Crash immediately — better to fail loudly at startup than silently at runtime
  process.exit(1);
}

// Shorthand so our config object stays readable
const env = parsed.data;

// ── Step 3:  Export a clean, organised config object ─────────────────────────
// Every other file in the project imports from here.
// No more `process.env.SOMETHING` scattered everywhere.
const config = {
  // Which environment are we in?
  env: env.NODE_ENV,
  isDev: env.NODE_ENV === "development",
  isProd: env.NODE_ENV === "production",

  // What port should the HTTP server listen on?
  port: env.PORT,

  // MongoDB connection string
  db: {
    uri: env.MONGO_URI,
  },

  // JSON Web Token secrets
  jwt: {
    secret: env.JWT_SECRET,
  },

  // CORS — which frontend origins are allowed to call this API?
  cors: {
    allowedOrigins: env.ALLOWED_ORIGINS
      ? env.ALLOWED_ORIGINS.split(",").map((o) => o.trim())
      : ["http://localhost:5173", "http://localhost:3000"],
  },

  // Cloudinary — video/image hosting
  cloudinary: {
    cloudName: env.CLOUDINARY_CLOUD_NAME,
    apiKey: env.CLOUDINARY_API_KEY,
    apiSecret: env.CLOUDINARY_API_SECRET,
  },

  // Razorpay — payment gateway (Phase 8)
  razorpay: {
    keyId: env.RAZORPAY_KEY_ID,
    keySecret: env.RAZORPAY_KEY_SECRET,
  },

  // SMTP — outgoing email (Phase 12)
  smtp: {
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
    from: env.SMTP_FROM,
  },

  // Redis — caching layer (Phase 15)
  redis: {
    url: env.REDIS_URL,
  },

  // Google Maps — geocoding and distance (Phase 9)
  googleMaps: {
    apiKey: env.GOOGLE_MAPS_API_KEY,
  },
};

module.exports = config;

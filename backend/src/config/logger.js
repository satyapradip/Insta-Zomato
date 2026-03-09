// src/config/logger.js
//
// ─── WHY THIS FILE EXISTS ─────────────────────────────────────────────────────
// console.log() is fine for quick experiments, but it has problems in production:
//   • No timestamps — you don't know WHEN something happened
//   • No log levels — you can't filter "only show errors"
//   • No files — if the server crashes, the logs vanish
//   • No rotation — if you did write to a file, it would grow forever
//
// Winston solves all of this:
//   • Adds timestamps to every message automatically
//   • Supports levels: error > warn > info > http > debug
//   • Writes to the console AND to rotating log files simultaneously
//   • Auto-deletes old log files (keeps 14 days)
// ─────────────────────────────────────────────────────────────────────────────

const { createLogger, format, transports } = require("winston");

// winston-daily-rotate-file is a Winston "transport" (a destination for logs).
// Importing it registers it — no named export needed.
const DailyRotateFile = require("winston-daily-rotate-file");

const path = require("path");
const config = require("./index");

// ── Where to store log files ───────────────────────────────────────────────────
// path.join(__dirname, "../../logs") resolves to:  backend/logs/
// __dirname is the folder this file lives in: backend/src/config/
const LOG_DIR = path.join(__dirname, "../../logs");

// ─────────────────────────────────────────────────────────────────────────────
// ── FORMAT DEFINITIONS ────────────────────────────────────────────────────────
// "format" controls HOW a log message looks.
// format.combine() lets you chain multiple formatters together.
// ─────────────────────────────────────────────────────────────────────────────

// ── Development format: colourised + human-readable ───────────────────────────
// Example output:
//   [14:32:05] info: Server started on port 3000
//   [14:32:06] error: MongoDB connection failed { "code": "ECONNREFUSED" }
const devFormat = format.combine(
  // colorize() wraps the level label in terminal colour codes (e.g. error = red)
  format.colorize({ all: true }),

  // timestamp() injects { timestamp: "HH:mm:ss" } into every log entry
  format.timestamp({ format: "HH:mm:ss" }),

  // errors({ stack: true }) ensures error.stack is attached to the log entry
  format.errors({ stack: true }),

  // printf() is a custom template — you decide the final string
  // message = the text you passed to logger.info("...")
  // meta = any extra object you passed as a second argument
  format.printf(({ timestamp, level, message, stack, ...meta }) => {
    // If there's extra data, pretty-print it as indented JSON
    const extra = Object.keys(meta).length
      ? "\n" + JSON.stringify(meta, null, 2)
      : "";
    // If this was an Error object, show the stack trace underneath
    const trace = stack ? "\n" + stack : "";
    return `[${timestamp}] ${level}: ${message}${extra}${trace}`;
  }),
);

// ── Production format: JSON (structured, machine-readable) ──────────────────
// Tools like Datadog, Papertrail, and AWS CloudWatch can parse JSON logs
// automatically and let you filter/search by any field.
// Example output (one line per log):
//   {"level":"error","message":"DB connection failed","timestamp":"2026-03-10T14:32:06.123Z","stack":"..."}
const prodFormat = format.combine(
  format.timestamp(),           // ISO 8601 timestamp
  format.errors({ stack: true }), // include stack on Error objects
  format.json(),                // output as a single JSON object per line
);

// ─────────────────────────────────────────────────────────────────────────────
// ── DAILY ROTATE FILE TRANSPORT ───────────────────────────────────────────────
// A "transport" = a place logs get sent to.
// Built-in transports: Console, File.  Third-party: DailyRotateFile.
//
// DailyRotateFile creates a new file every day:
//   backend/logs/combined-2026-03-10.log
//   backend/logs/combined-2026-03-11.log
//   backend/logs/error-2026-03-10.log   ← only error-level messages
//
// After 14 days the old files are automatically deleted.
// ─────────────────────────────────────────────────────────────────────────────
const makeRotatingFile = (level, filenamePrefix) =>
  new DailyRotateFile({
    level,                        // minimum level to write (e.g. "info" or "error")
    dirname: LOG_DIR,             // which folder to write logs in
    filename: `${filenamePrefix}-%DATE%.log`, // %DATE% gets replaced with e.g. 2026-03-10
    datePattern: "YYYY-MM-DD",    // one new file per day
    zippedArchive: true,          // compress files older than today (.gz)
    maxSize: "20m",               // also rotate if a single file hits 20 MB
    maxFiles: "14d",              // auto-delete files older than 14 days
    format: prodFormat,           // always use JSON in files (even in dev)
  });

// ─────────────────────────────────────────────────────────────────────────────
// ── CREATE THE LOGGER ────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
const logger = createLogger({
  // The MINIMUM level to process.
  // Levels from least to most severe: silly < verbose < debug < http < info < warn < error
  // In dev we log everything (debug and above).
  // In prod we skip noisy debug/verbose and start at info.
  level: config.isDev ? "debug" : "info",

  transports: [
    // ── 1. Console transport (always on) ────────────────────────────────────
    // In dev: colourised, human-readable.  In prod: JSON.
    new transports.Console({
      format: config.isDev ? devFormat : prodFormat,
    }),

    // ── 2. combined-YYYY-MM-DD.log (all info+ messages) ─────────────────────
    // Great for replaying what happened over the course of a day.
    makeRotatingFile("info", "combined"),

    // ── 3. error-YYYY-MM-DD.log (only error-level messages) ─────────────────
    // A dedicated error log so you can grep just failures without noise.
    makeRotatingFile("error", "error"),
  ],
});

// ── Morgan stream ──────────────────────────────────────────────────────────────
// Morgan (HTTP request logger in app.js) needs an object with a write() method.
// We attach a stream to our logger so Morgan feeds its output through Winston
// instead of directly to stdout.  This gives HTTP requests timestamps + file output.
//
// We use logger.http() so these messages sit BELOW info:
//   In dev they appear (level = debug, which includes http).
//   In prod you can filter them out easily by setting level = "info".
logger.stream = {
  write: (message) => logger.http(message.trim()),
};

module.exports = logger;

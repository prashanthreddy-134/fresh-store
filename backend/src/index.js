import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import * as Sentry from "@sentry/node";

// Error monitoring is optional — set SENTRY_DSN to enable.
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || "development",
  });

  console.log("Sentry error monitoring enabled.");
}

// Fail fast on missing/placeholder secrets.
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 16) {
  console.error(
    "FATAL: JWT_SECRET is missing or too short. Set a long random value in .env before starting the server."
  );
  process.exit(1);
}

if (
  process.env.NODE_ENV === "production" &&
  (!process.env.RAZORPAY_KEY_SECRET ||
    process.env.RAZORPAY_KEY_SECRET.includes("placeholder"))
) {
  console.error(
    "FATAL: RAZORPAY_KEY_SECRET looks like a placeholder. Set real Razorpay keys before running in production."
  );
  process.exit(1);
}

if (
  process.env.NODE_ENV === "production" &&
  process.env.OTP_PROVIDER === "console"
) {
  console.error(
    "FATAL: OTP_PROVIDER is set to 'console' (dev-only, prints OTPs to logs). Set msg91 or twilio before running in production."
  );
  process.exit(1);
}

import authRoutes from "./routes/auth.js";
import catalogRoutes from "./routes/catalog.js";
import cartRoutes from "./routes/cart.js";
import accountRoutes from "./routes/account.js";
import orderRoutes from "./routes/orders.js";
import paymentRoutes, { webhookRouter } from "./routes/payments.js";
import adminRoutes from "./routes/admin.js";
import uploadRoutes from "./routes/upload.js";
import devicesRoutes from "./routes/devices.js";
import { startStaleReservationSweep } from "./jobs/staleReservationSweep.js";

const app = express();
console.log("🔥 FRESH STORE BACKEND VERSION: 2026-08-25-ROOT-TEST");
// Security headers
app.use(
  helmet({
    crossOriginResourcePolicy: {
      policy: "cross-origin",
    },
  })
);

// Logging
app.use(
  morgan(process.env.NODE_ENV === "production" ? "combined" : "dev")
);

// CORS
const allowedOrigins = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: allowedOrigins.length ? allowedOrigins : true,
    credentials: true,
  })
);

// General API rate limit
app.use(
  "/api",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

// Razorpay webhook needs raw body before JSON parser.
app.use(
  "/api/payments/webhook",
  express.raw({ type: "application/json" }),
  webhookRouter
);

// JSON body parser
app.use(express.json({ limit: "2mb" }));

// ============================================================
// BASIC SERVICE ROUTES
// ============================================================

// Root route — useful for Render/service deployment testing.
app.get("/", (req, res) => {
  res.json({
    message: "Fresh Store API is running",
    status: "ok",
  });
});

// Health check — useful for Render health checks and monitoring.
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    time: new Date().toISOString(),
  });
});

// ============================================================
// API ROUTES
// ============================================================

app.use("/api/auth", authRoutes);

app.use("/api", catalogRoutes);
app.use("/api", cartRoutes);
app.use("/api", accountRoutes);
app.use("/api", orderRoutes);

app.use("/api", paymentRoutes);

app.use("/api/admin", adminRoutes);

app.use("/api", uploadRoutes);
app.use("/api", devicesRoutes);

// ============================================================
// UPLOADED FILES
// ============================================================

// Serve uploaded product/category images.
app.use("/uploads", express.static("uploads"));

// ============================================================
// CENTRAL ERROR HANDLER
// ============================================================

app.use((err, req, res, next) => {
  console.error(err);

  if (process.env.SENTRY_DSN) {
    Sentry.captureException(err);
  }

  res.status(err.status || 500).json({
    error:
      process.env.NODE_ENV === "production"
        ? "Internal server error"
        : err.message,
  });
});

// ============================================================
// SERVER
// ============================================================

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`Fresh Store API running on port ${PORT}`);

  startStaleReservationSweep();
});

// ============================================================
// PROCESS ERROR HANDLERS
// ============================================================

process.on("unhandledRejection", (err) => {
  console.error("Unhandled promise rejection:", err);

  if (process.env.SENTRY_DSN) {
    Sentry.captureException(err);
  }
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught exception:", err);

  if (process.env.SENTRY_DSN) {
    Sentry.captureException(err);
  }
});
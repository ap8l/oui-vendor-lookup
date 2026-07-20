"use strict";

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { rateLimit } = require("express-rate-limit");
const registerDatabaseRoutes = require("./database");

const app = express();
const port = Number.parseInt(process.env.PORT, 10) || 3000;

app.set("trust proxy", 1);
app.disable("x-powered-by");

const allowedOrigins = [
  "http://localhost:5173",
  "https://oui-vendor-lookup.vercel.app",
  "https://ouivendorlookup.website",
];

app.use(
  cors({
    origin(origin, callback) {
      // Requests made directly in a browser or by API tools may have no Origin.
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Origin not allowed by CORS."));
    },
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Accept"],
  })
);

app.use(express.json({ limit: "10kb" }));

const lookupLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Too many lookups. Please wait one minute and try again.",
  },
});

app.get("/api/health", (req, res) => {
  return res.status(200).json({
    status: "ok",
  });
});

app.get("/api/mac/:address", lookupLimiter, async (req, res) => {
  const mac = String(req.params.address || "")
    .trim()
    .toUpperCase();

  if (!/^[0-9A-F]{2}:[0-9A-F]{2}:[0-9A-F]{2}$/.test(mac)) {
    return res.status(400).json({
      error: "Invalid OUI format.",
    });
  }

  try {
    const response = await fetch(
      `https://api.maclookup.app/v2/macs/${encodeURIComponent(mac)}`,
      {
        headers: {
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(5000),
      }
    );

    const responseText = await response.text();

    let data;

    try {
      data = JSON.parse(responseText);
    } catch {
      return res.status(502).json({
        error: "The lookup service returned an invalid response.",
      });
    }

    if (!response.ok) {
      return res.status(502).json({
        error:
          typeof data?.error === "string"
            ? data.error
            : "Lookup failed.",
      });
    }

    return res.status(200).json(data);
  } catch (error) {
    const timedOut =
      error?.name === "TimeoutError" ||
      error?.name === "AbortError";

    console.error("MAC lookup error:", {
      name: error?.name,
      message: error?.message,
    });

    return res.status(502).json({
      error: timedOut
        ? "Lookup timed out."
        : "Unable to complete lookup.",
    });
  }
});

registerDatabaseRoutes(app);

app.get("/", (req, res) => {
  return res.status(200).json({
    name: "OUI Vendor Lookup API",
    status: "running",
  });
});

app.use((req, res) => {
  return res.status(404).json({
    error: "Not found.",
  });
});

app.use((error, req, res, next) => {
  console.error("Unhandled server error:", error);

  if (res.headersSent) {
    return next(error);
  }

  return res.status(500).json({
    error: "Internal server error.",
  });
});

if (require.main === module) {
  app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
  });
}

module.exports = app;
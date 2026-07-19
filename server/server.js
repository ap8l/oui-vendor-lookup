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

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://oui-vendor-lookup.vercel.app",
      "https://ouivendorlookup.website",
    ],
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

    if (!response.ok) {
      return res.status(502).json({
        error: "Lookup failed.",
      });
    }

    const data = await response.json();

    return res.json(data);
  } catch (error) {
    const timedOut =
      error?.name === "TimeoutError" ||
      error?.name === "AbortError";

    return res.status(502).json({
      error: timedOut
        ? "Lookup timed out."
        : "Unable to complete lookup.",
    });
  }
});

registerDatabaseRoutes(app);

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
  });
});

app.get("/", (req, res) => {
  res.send("Backend running");
});

app.use((req, res) => {
  res.status(404).json({
    error: "Not found.",
  });
});

app.use((err, req, res, next) => {
  console.error(err);

  if (res.headersSent) {
    return next(err);
  }

  res.status(500).json({
    error: "Internal server error.",
  });
});

// Local development
if (require.main === module) {
  app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
  });
}

// Vercel
module.exports = app;
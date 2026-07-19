"use strict";

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { rateLimit } = require("express-rate-limit");
const registerDatabaseRoutes = require("./database");

const app = express();
const port = process.env.PORT || 3000;

if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

app.use(
  cors({
    origin:
      process.env.NODE_ENV === "production"
        ? "https://ouivendorlookup.website"
        : "http://localhost:5173",
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
  const mac = req.params.address.toUpperCase();

  if (!/^[0-9A-F]{2}:[0-9A-F]{2}:[0-9A-F]{2}$/.test(mac)) {
    return res.status(400).json({ error: "Invalid OUI format." });
  }

  try {
    const response = await fetch(
      `https://api.maclookup.app/v2/macs/${encodeURIComponent(mac)}`,
      { signal: AbortSignal.timeout(5000) }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(502).json({ error: "Lookup failed." });
    }

    return res.json(data);
  } catch (error) {
    const message =
      error.name === "TimeoutError"
        ? "Lookup timed out."
        : "Unable to complete lookup.";

    return res.status(502).json({ error: message });
  }
});

registerDatabaseRoutes(app);

app.get("/", (req, res) => {
  res.send("Backend running");
});

app.use((req, res) => {
  res.status(404).json({ error: "Not found." });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

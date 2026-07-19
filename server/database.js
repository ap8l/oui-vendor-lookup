"use strict";

require("dotenv").config();

const { createClient } = require("@supabase/supabase-js");
const { rateLimit } = require("express-rate-limit");

const { SUPABASE_URL, SUPABASE_SECRET_KEY } = process.env;

if (!SUPABASE_URL) throw new Error("SUPABASE_URL is missing.");
if (!SUPABASE_SECRET_KEY) throw new Error("SUPABASE_SECRET_KEY is missing.");
if (!SUPABASE_URL.startsWith("https://")) {
  throw new Error("SUPABASE_URL must use HTTPS.");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});

const subscribeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many subscription attempts. Please try again later." },
});

function normalizeEmail(value) {
  if (typeof value !== "string") return null;

  const email = value.trim().toLowerCase();

  return email.length >= 3 &&
    email.length <= 254 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ? email
    : null;
}

async function saveSubscriber(email) {
  const { error } = await supabase.from("email_subscribers").insert({
    email,
    status: "pending",
    consented_at: new Date().toISOString(),
  });

  if (!error) {
    return { success: true };
  }

  if (error.code === "23505") {
    return { success: true };
  }

  console.error("Database error:", error.code);

  return { success: false };
}

function registerDatabaseRoutes(app) {
  if (!app?.post) {
    throw new TypeError("A valid Express app is required.");
  }

  app.post("/api/subscribe", subscribeLimiter, async (req, res) => {
    const email = normalizeEmail(req.body?.email);

    if (!email) {
      return res.status(400).json({ error: "Enter a valid email." });
    }

    try {
      const result = await saveSubscriber(email);

      if (!result.success) {
        return res
          .status(500)
          .json({ error: "Unable to subscribe right now." });
      }

      res.json({ message: "Thanks for subscribing." });
    } catch (error) {
      console.error("Unexpected error:", error.name);

      res.status(500).json({
        error: "Unable to subscribe right now.",
      });
    }
  });
}

module.exports = registerDatabaseRoutes;
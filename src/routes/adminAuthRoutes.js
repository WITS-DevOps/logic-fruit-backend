import crypto from "crypto";
import express from "express";

const router = express.Router();

// Simple in-memory rate limiter: max 10 failed attempts per IP per 15 minutes.
// Prevents brute-forcing the admin passcode.
const attemptsByIp = new Map();
const MAX_ATTEMPTS = 10;
const WINDOW_MS = 15 * 60 * 1000;

function getClientIp(req) {
  return (
    req.headers["x-forwarded-for"]?.toString().split(",")[0]?.trim() ||
    req.socket?.remoteAddress ||
    "unknown"
  );
}

function isRateLimited(ip) {
  const now = Date.now();
  const entry = attemptsByIp.get(ip);
  if (!entry) return false;
  // Reset window if expired
  if (now - entry.firstAttempt > WINDOW_MS) {
    attemptsByIp.delete(ip);
    return false;
  }
  return entry.count >= MAX_ATTEMPTS;
}

function recordFailedAttempt(ip) {
  const now = Date.now();
  const entry = attemptsByIp.get(ip);
  if (!entry || now - entry.firstAttempt > WINDOW_MS) {
    attemptsByIp.set(ip, { count: 1, firstAttempt: now });
  } else {
    entry.count += 1;
  }
}

function clearAttempts(ip) {
  attemptsByIp.delete(ip);
}

function getConfiguredPasscode() {
  return (
    process.env.ADMIN_PASSCODE ||
    process.env.ADMIN_PORTAL_PASSCODE ||
    process.env.CMS_PASSCODE ||
    ""
  );
}

// Timing-safe comparison so passcode length / content can't be probed via timing.
function passcodesMatch(provided, expected) {
  if (!provided || !expected) return false;
  const a = Buffer.from(String(provided));
  const b = Buffer.from(String(expected));
  if (a.length !== b.length) return false;
  try {
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/**
 * @route   POST /api/admin/verify
 * @desc    Verify the LFT admin portal passcode. Comparison happens ONLY on the backend.
 * @body    { passcode: string }
 */
router.post("/verify", (req, res) => {
  const ip = getClientIp(req);

  if (isRateLimited(ip)) {
    return res.status(429).json({
      success: false,
      message: "Too many attempts. Please try again later.",
    });
  }

  const { passcode } = req.body || {};

  if (typeof passcode !== "string" || passcode.length === 0) {
    return res.status(400).json({
      success: false,
      message: "Please provide the access code.",
    });
  }

  const expected = getConfiguredPasscode();

  if (!expected) {
    console.error(
      "ADMIN_PASSCODE is not configured. Set ADMIN_PASSCODE in backend .env"
    );
    return res.status(500).json({
      success: false,
      message: "Admin access is not configured. Please contact support.",
    });
  }

  if (passcodesMatch(passcode, expected)) {
    clearAttempts(ip);
    return res.json({
      success: true,
      message: "Access granted.",
    });
  }

  recordFailedAttempt(ip);
  return res.status(401).json({
    success: false,
    message: "Incorrect access code. Please try again.",
  });
});

export default router;

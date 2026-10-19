const express = require("express");
const { admin, adminDb } = require("../firebaseAdmin");
const { verifyToken } = require("../middleware/authMiddleware");

const router = express.Router();

const MAX_ATTEMPTS = 3;
const LOCK_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours
const COLLECTION = "loginLockouts";

// ---------------------------------------------------------------------------
// Basic per-IP rate limiting (in-memory) to reduce abuse of unauthenticated routes
// ---------------------------------------------------------------------------
const RATE_WINDOW_MS = 60 * 1000;
const RATE_MAX_REQUESTS = 30;
const ipHits = new Map();

function rateLimit(req, res, next) {
  const now = Date.now();
  const ip = req.ip || "unknown";
  const entry = ipHits.get(ip);
  if (!entry || now - entry.start > RATE_WINDOW_MS) {
    ipHits.set(ip, { start: now, count: 1 });
    return next();
  }
  entry.count += 1;
  if (entry.count > RATE_MAX_REQUESTS) {
    return res.status(429).json({ error: "Too many requests. Please slow down." });
  }
  next();
}

setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of ipHits) {
    if (now - entry.start > RATE_WINDOW_MS) ipHits.delete(ip);
  }
}, RATE_WINDOW_MS).unref();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function normalizeEmail(raw) {
  if (typeof raw !== "string") return null;
  const email = raw.trim().toLowerCase();
  if (!/^[^\s@/]+@[^\s@/]+\.[^\s@/]+$/.test(email) || email.length > 254) return null;
  return email;
}

function toMillis(value) {
  if (!value) return null;
  if (typeof value.toMillis === "function") return value.toMillis();
  return Number(value) || null;
}

function summarize(data) {
  const lockedUntilMs = toMillis(data && data.lockedUntil);
  const locked = !!lockedUntilMs && lockedUntilMs > Date.now();
  const attempts = locked ? MAX_ATTEMPTS : Math.min((data && data.failedAttempts) || 0, MAX_ATTEMPTS);
  return {
    locked,
    lockedUntil: locked ? lockedUntilMs : null,
    failedAttempts: attempts,
    remainingAttempts: locked ? 0 : Math.max(0, MAX_ATTEMPTS - attempts),
  };
}

/**
 * POST /api/auth/lockout-status  { email }
 * Reports whether an email is currently locked and how many attempts remain.
 */
router.post("/lockout-status", rateLimit, async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    if (!email) return res.status(400).json({ error: "A valid email is required." });

    const snap = await adminDb.collection(COLLECTION).doc(email).get();
    return res.json(summarize(snap.exists ? snap.data() : null));
  } catch (err) {
    console.error("[auth] lockout-status error:", err.message);
    return res.status(500).json({ error: "Could not check lockout status." });
  }
});

/**
 * POST /api/auth/record-failure  { email }
 * Records a failed sign-in. The 3rd failure locks the email for 24 hours.
 */
router.post("/record-failure", rateLimit, async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    if (!email) return res.status(400).json({ error: "A valid email is required." });

    const ref = adminDb.collection(COLLECTION).doc(email);
    const result = await adminDb.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const current = snap.exists ? snap.data() : {};
      const state = summarize(current);

      // Already locked: do not extend or increment.
      if (state.locked) return state;

      // A previous lock that has expired starts a fresh count.
      const expired = toMillis(current.lockedUntil) && toMillis(current.lockedUntil) <= Date.now();
      const previous = expired ? 0 : current.failedAttempts || 0;
      const failedAttempts = previous + 1;

      const update = {
        email,
        failedAttempts,
        lockedUntil: null,
        lastFailedAt: admin.firestore.Timestamp.now(),
      };
      if (failedAttempts >= MAX_ATTEMPTS) {
        update.lockedUntil = admin.firestore.Timestamp.fromMillis(Date.now() + LOCK_DURATION_MS);
      }
      tx.set(ref, update, { merge: true });
      return summarize(update);
    });

    return res.json(result);
  } catch (err) {
    console.error("[auth] record-failure error:", err.message);
    return res.status(500).json({ error: "Could not record failed attempt." });
  }
});

/**
 * POST /api/auth/clear-failures
 * Authenticated: resets the failure counter for the signed-in user's email.
 */
router.post("/clear-failures", rateLimit, verifyToken, async (req, res) => {
  try {
    const email = normalizeEmail(req.user.email);
    if (!email) return res.status(400).json({ error: "Token has no valid email." });
    await adminDb.collection(COLLECTION).doc(email).delete();
    return res.json({ cleared: true });
  } catch (err) {
    console.error("[auth] clear-failures error:", err.message);
    return res.status(500).json({ error: "Could not clear failed attempts." });
  }
});

/**
 * GET /api/auth/system-status
 * Returns current municipal system status (systemActive / maintenanceMode).
 */
router.get("/system-status", async (req, res) => {
  try {
    res.set({
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    });
    const snap = await adminDb.collection("systemSettings").doc("maintenance").get();
    if (!snap.exists) {
      return res.json({ systemActive: true, maintenanceMode: false });
    }
    const data = snap.data();
    const isActive = data.systemActive !== undefined ? Boolean(data.systemActive) : !data.maintenanceMode;
    return res.json({ systemActive: isActive, maintenanceMode: !isActive });
  } catch (err) {
    console.warn("[auth] system-status check fallback:", err.message);
    return res.json({ systemActive: true, maintenanceMode: false });
  }
});

module.exports = router;

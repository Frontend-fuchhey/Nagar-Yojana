const express = require("express");
const crypto = require("crypto");
const { admin, adminAuth, adminDb } = require("../firebaseAdmin");
const { verifyToken, requireSuperAdmin, requireWardExec } = require("../middleware/authMiddleware");
const { sendWardExecCredentials } = require("../services/emailService");

const router = express.Router();

/**
 * POST /api/admin/provision-ward-exec
 *
 * Provisions a new Ward Executive for a designated ward (1 - 19):
 * 1. Validates payload (fullName/name, phone/number, email/gmail, wardNumber, servicePeriod/timePeriod)
 * 2. Calculates sequential executive ID for the ward (e.g. WE-4-1, WE-4-2, WE-12-1)
 * 3. Generates secure random 8-character temporary password
 * 4. Creates user in Firebase Auth
 * 5. Sets custom user claims: { role: 'WARD_EXEC', wardNumber, executiveId }
 * 6. Stores user document in Firestore `users/{uid}`
 * 7. Dispatches onboarding email with login credentials and sequential ID
 */
router.post("/provision-ward-exec", verifyToken, requireSuperAdmin, async (req, res) => {
  try {
    const rawEmail = req.body.email || req.body.gmail;
    const rawFullName = req.body.fullName || req.body.name;
    const rawPhone = req.body.phone || req.body.number;
    const rawWardNumber = req.body.wardNumber;
    const rawServicePeriod = req.body.servicePeriod || req.body.timePeriod;

    // 1. Validate required fields
    if (!rawEmail || typeof rawEmail !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail.trim())) {
      return res.status(400).json({
        error: "A valid email address is required."
      });
    }

    const ward = Number(rawWardNumber);
    if (!Number.isInteger(ward) || ward < 1 || ward > 19) {
      return res.status(400).json({
        error: "Invalid wardNumber. Biratnagar Metropolitan City comprises wards 1 through 19 (must be an integer from 1 to 19)."
      });
    }

    if (!rawFullName || typeof rawFullName !== "string" || !rawFullName.trim()) {
      return res.status(400).json({
        error: "Full name is required."
      });
    }

    const cleanEmail = rawEmail.trim().toLowerCase();
    const cleanFullName = rawFullName.trim();
    const cleanPhone = rawPhone ? String(rawPhone).trim() : null;
    const cleanServicePeriod = (rawServicePeriod && typeof rawServicePeriod === "string" && rawServicePeriod.trim())
      ? rawServicePeriod.trim()
      : "2081 - 2086 B.S.";

    // 2. Calculate sequential executive ID for the ward
    const existingExecsSnap = await adminDb
      .collection("users")
      .where("role", "==", "WARD_EXEC")
      .where("wardNumber", "==", ward)
      .get();

    const seqNumber = existingExecsSnap.size + 1;
    const executiveId = `WE-${ward}-${seqNumber}`;

    // 3. Generate secure random 12-character temporary password (mixed uppercase, lowercase, numbers, symbols)
    const upperChars = "ABCDEFGHJKLMNPQRSTUVWXYZ";
    const lowerChars = "abcdefghijkmnopqrstuvwxyz";
    const digitChars = "23456789";
    const symbolChars = "!@#$%&*";
    const allChars = upperChars + lowerChars + digitChars + symbolChars;

    const pwdChars = [
      upperChars[crypto.randomInt(0, upperChars.length)],
      lowerChars[crypto.randomInt(0, lowerChars.length)],
      digitChars[crypto.randomInt(0, digitChars.length)],
      symbolChars[crypto.randomInt(0, symbolChars.length)],
    ];
    for (let i = 4; i < 12; i++) {
      pwdChars.push(allChars[crypto.randomInt(0, allChars.length)]);
    }
    // Fisher-Yates shuffle
    for (let i = pwdChars.length - 1; i > 0; i--) {
      const j = crypto.randomInt(0, i + 1);
      [pwdChars[i], pwdChars[j]] = [pwdChars[j], pwdChars[i]];
    }
    const tempPassword = pwdChars.join("");

    // 4. Create user in Firebase Auth
    let userRecord;
    try {
      userRecord = await adminAuth.createUser({
        email: cleanEmail,
        password: tempPassword,
        displayName: cleanFullName
      });
    } catch (authError) {
      if (authError.code === "auth/email-already-exists") {
        return res.status(409).json({
          error: `A user account with email '${cleanEmail}' already exists in the system.`
        });
      }
      if (authError.code === "auth/invalid-password") {
        return res.status(400).json({
          error: "Generated temporary password does not meet Firebase Auth criteria."
        });
      }
      throw authError;
    }

    // 5. Assign Custom User Claims in Firebase Auth & 6. Save Firestore doc
    try {
      await adminAuth.setCustomUserClaims(userRecord.uid, {
        role: "WARD_EXEC",
        wardNumber: ward,
        executiveId
      });

      const userDocData = {
        uid: userRecord.uid,
        executiveId,
        email: cleanEmail,
        fullName: cleanFullName,
        phone: cleanPhone,
        role: "WARD_EXEC",
        wardNumber: ward,
        servicePeriod: cleanServicePeriod,
        isActive: true,
        mustChangePassword: true,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      };

      await adminDb.collection("users").doc(userRecord.uid).set(userDocData);
    } catch (saveError) {
      console.error("[AdminRoutes] Rollback: Deleting orphan auth user due to error:", saveError.message);
      try {
        await adminAuth.deleteUser(userRecord.uid);
      } catch (delErr) {
        console.error("[AdminRoutes] Failed to clean up user during rollback:", delErr.message);
      }
      throw saveError;
    }

    // 7. Dispatch onboarding credentials email
    let emailDispatched = true;
    try {
      await sendWardExecCredentials({
        email: cleanEmail,
        fullName: cleanFullName,
        wardNumber: ward,
        servicePeriod: cleanServicePeriod,
        executiveId,
        tempPassword
      });
    } catch (emailErr) {
      console.error("[AdminRoutes] Warning: Email dispatch encountered an issue:", emailErr.message);
      emailDispatched = false;
    }

    // 8. Return HTTP 201 Created
    return res.status(201).json({
      message: "Ward Executive successfully provisioned",
      uid: userRecord.uid,
      executiveId,
      wardNumber: ward,
      emailSent: emailDispatched
    });
  } catch (error) {
    console.error("[AdminRoutes] Error provisioning Ward Executive:", error);
    return res.status(500).json({
      error: "An unexpected error occurred while provisioning the Ward Executive.",
      details: error.message
    });
  }
});

/**
 * GET /api/admin/ward-execs
 * Lists all registered Ward Executives.
 * Accessible to Super Admin and authenticated staff.
 * Returns array sorted by wardNumber, then executiveId.
 */
router.get("/ward-execs", verifyToken, requireWardExec, async (req, res) => {
  try {
    const snapshot = await adminDb
      .collection("users")
      .where("role", "==", "WARD_EXEC")
      .get();

    const executives = [];
    snapshot.forEach((doc) => {
      executives.push(doc.data());
    });

    // Sort by wardNumber ascending, then executiveId ascending
    executives.sort((a, b) => {
      const wardA = Number(a.wardNumber) || 0;
      const wardB = Number(b.wardNumber) || 0;
      if (wardA !== wardB) {
        return wardA - wardB;
      }
      return String(a.executiveId || "").localeCompare(String(b.executiveId || ""), undefined, { numeric: true });
    });

    return res.json({ executives });
  } catch (error) {
    console.error("[AdminRoutes] Error listing Ward Executives:", error);
    return res.status(500).json({
      error: "Failed to retrieve Ward Executives list.",
      details: error.message
    });
  }
});

/**
 * GET /api/admin/next-id/:wardNumber
 * Returns the next anticipated sequential ID for a given ward (e.g. { nextExecutiveId: 'WE-4-1' }).
 * Allows the admin UI to display a live preview before provisioning.
 * Accessible to Super Admin and authenticated staff.
 */
router.get("/next-id/:wardNumber", verifyToken, requireWardExec, async (req, res) => {
  try {
    const ward = Number(req.params.wardNumber);
    if (!Number.isInteger(ward) || ward < 1 || ward > 19) {
      return res.status(400).json({
        error: "Invalid wardNumber. Biratnagar Metropolitan City comprises wards 1 through 19 (must be an integer from 1 to 19)."
      });
    }

    const existingExecsSnap = await adminDb
      .collection("users")
      .where("role", "==", "WARD_EXEC")
      .where("wardNumber", "==", ward)
      .get();

    const seqNumber = existingExecsSnap.size + 1;
    const nextExecutiveId = `WE-${ward}-${seqNumber}`;

    return res.json({
      nextExecutiveId,
      wardNumber: ward,
      currentCount: existingExecsSnap.size
    });
  } catch (error) {
    console.error("[AdminRoutes] Error calculating next executive ID:", error);
    return res.status(500).json({
      error: "Failed to calculate next executive ID.",
      details: error.message
    });
  }
});

/**
 * GET /api/admin/lockouts
 * Super Admin only: lists accounts that are currently locked out (24h lockout).
 */
router.get("/lockouts", verifyToken, requireSuperAdmin, async (req, res) => {
  try {
    const now = Date.now();
    const snap = await adminDb.collection("loginLockouts").where("lockedUntil", ">", admin.firestore.Timestamp.fromMillis(now)).get();
    const lockouts = snap.docs.map((d) => {
      const data = d.data();
      return {
        email: data.email || d.id,
        failedAttempts: data.failedAttempts || 0,
        lockedUntil: data.lockedUntil ? data.lockedUntil.toMillis() : null,
        lastFailedAt: data.lastFailedAt ? data.lastFailedAt.toMillis() : null,
      };
    });
    lockouts.sort((a, b) => (b.lastFailedAt || 0) - (a.lastFailedAt || 0));
    return res.json({ lockouts });
  } catch (error) {
    console.error("[AdminRoutes] Error listing lockouts:", error);
    return res.status(500).json({ error: "Failed to list locked accounts." });
  }
});

/**
 * POST /api/admin/lockouts/unlock  { email }
 * Super Admin only: removes the lockout record so the account can sign in again.
 */
router.post("/lockouts/unlock", verifyToken, requireSuperAdmin, async (req, res) => {
  try {
    const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
    if (!email || email.includes("/")) {
      return res.status(400).json({ error: "A valid email is required." });
    }
    await adminDb.collection("loginLockouts").doc(email).delete();
    return res.json({ unlocked: true, email });
  } catch (error) {
    console.error("[AdminRoutes] Error unlocking account:", error);
    return res.status(500).json({ error: "Failed to unlock account." });
  }
});

/**
 * DELETE /api/admin/ward-exec/:uid
 * Super Admin only: deletes a Ward Executive from Firebase Auth and Firestore.
 */
router.delete("/ward-exec/:uid", verifyToken, requireSuperAdmin, async (req, res) => {
  try {
    const { uid } = req.params;
    if (!uid) {
      return res.status(400).json({ error: "Executive UID is required." });
    }

    const userDocRef = adminDb.collection("users").doc(uid);
    const userSnap = await userDocRef.get();
    const userData = userSnap.exists ? userSnap.data() : null;

    // 1. Delete from Firebase Auth
    try {
      await adminAuth.deleteUser(uid);
    } catch (authErr) {
      if (authErr.code !== "auth/user-not-found") {
        console.warn("[AdminRoutes] Warning deleting user from Auth:", authErr.message);
      }
    }

    // 2. Delete from Firestore
    await userDocRef.delete();

    // 3. Clean up any lockout document for this email
    if (userData?.email) {
      try {
        await adminDb.collection("loginLockouts").doc(userData.email.toLowerCase()).delete();
      } catch (e) {
        // ignore
      }
    }

    return res.json({
      message: "Ward Executive successfully removed and access revoked.",
      uid,
      wardNumber: userData?.wardNumber || null,
      email: userData?.email || null,
    });
  } catch (error) {
    console.error("[AdminRoutes] Error deleting Ward Executive:", error);
    return res.status(500).json({
      error: "Failed to revoke access and delete Ward Executive.",
      details: error.message,
    });
  }
});

/**
 * POST /api/admin/ward-exec/:uid/resend
 * Super Admin only: refreshes temporary password and dispatches onboarding credentials email.
 */
router.post("/ward-exec/:uid/resend", verifyToken, requireSuperAdmin, async (req, res) => {
  try {
    const { uid } = req.params;
    if (!uid) {
      return res.status(400).json({ error: "Executive UID is required." });
    }

    const userDocRef = adminDb.collection("users").doc(uid);
    const userSnap = await userDocRef.get();
    if (!userSnap.exists) {
      return res.status(404).json({ error: "Executive profile not found." });
    }

    const data = userSnap.data();

    // Generate new 12-char secure temporary password
    const upperChars = "ABCDEFGHJKLMNPQRSTUVWXYZ";
    const lowerChars = "abcdefghijkmnopqrstuvwxyz";
    const digitChars = "23456789";
    const symbolChars = "!@#$%&*";
    const allChars = upperChars + lowerChars + digitChars + symbolChars;

    const pwdChars = [
      upperChars[crypto.randomInt(0, upperChars.length)],
      lowerChars[crypto.randomInt(0, lowerChars.length)],
      digitChars[crypto.randomInt(0, digitChars.length)],
      symbolChars[crypto.randomInt(0, symbolChars.length)],
    ];
    for (let i = 4; i < 12; i++) {
      pwdChars.push(allChars[crypto.randomInt(0, allChars.length)]);
    }
    for (let i = pwdChars.length - 1; i > 0; i--) {
      const j = crypto.randomInt(0, i + 1);
      [pwdChars[i], pwdChars[j]] = [pwdChars[j], pwdChars[i]];
    }
    const tempPassword = pwdChars.join("");

    // Update password in Firebase Auth
    await adminAuth.updateUser(uid, { password: tempPassword });

    // Update mustChangePassword in Firestore
    await userDocRef.update({
      mustChangePassword: true,
      lastPasswordResetAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Send email
    let emailSent = true;
    try {
      await sendWardExecCredentials({
        email: data.email,
        fullName: data.fullName,
        wardNumber: data.wardNumber,
        servicePeriod: data.servicePeriod,
        executiveId: data.executiveId,
        tempPassword,
      });
    } catch (e) {
      console.warn("Failed sending email:", e.message);
      emailSent = false;
    }

    return res.json({
      message: "Credentials refreshed and dispatched.",
      email: data.email,
      emailSent,
    });
  } catch (error) {
    console.error("[AdminRoutes] Error resending credentials:", error);
    return res.status(500).json({
      error: "Failed to resend credentials.",
      details: error.message,
    });
  }
});

module.exports = router;

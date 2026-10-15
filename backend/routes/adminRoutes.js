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

    // 3. Generate secure random 8-character temporary password (4 bytes = 8 hex chars)
    const tempPassword = crypto.randomBytes(4).toString("hex");

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

    // 5. Assign Custom User Claims in Firebase Auth
    await adminAuth.setCustomUserClaims(userRecord.uid, {
      role: "WARD_EXEC",
      wardNumber: ward,
      executiveId
    });

    // 6. Save user profile document in Firestore: users/{uid}
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

module.exports = router;

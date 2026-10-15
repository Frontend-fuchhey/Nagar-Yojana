const express = require("express");
const crypto = require("crypto");
const { admin, adminAuth, adminDb } = require("../firebaseAdmin");
const { verifyToken, requireSuperAdmin } = require("../middleware/authMiddleware");
const { sendWardExecCredentials } = require("../services/emailService");

const router = express.Router();

/**
 * POST /api/admin/provision-ward-exec
 *
 * Provisions a new Ward Executive for a designated ward (1 - 19):
 * 1. Validates payload (email, wardNumber, fullName, phone)
 * 2. Ensures no active Ward Executive already exists for that ward
 * 3. Generates secure random 8-character temporary password
 * 4. Creates Firebase Auth user
 * 5. Sets custom user claims: { role: 'WARD_EXEC', wardNumber }
 * 6. Stores user document in Firestore `users/{uid}`
 * 7. Dispatches onboarding email with login credentials
 */
router.post("/provision-ward-exec", verifyToken, requireSuperAdmin, async (req, res) => {
  try {
    const { email, wardNumber, fullName, phone } = req.body;

    // 1. Validate required fields
    if (!email || typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return res.status(400).json({
        error: "A valid email address is required."
      });
    }

    const ward = Number(wardNumber);
    if (!Number.isInteger(ward) || ward < 1 || ward > 19) {
      return res.status(400).json({
        error: "Invalid wardNumber. Biratnagar Metropolitan City comprises wards 1 through 19 (must be an integer from 1 to 19)."
      });
    }

    if (!fullName || typeof fullName !== "string" || !fullName.trim()) {
      return res.status(400).json({
        error: "Full name is required."
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanFullName = fullName.trim();
    const cleanPhone = phone ? String(phone).trim() : null;

    // 2. Check if an active Ward Executive already exists for this ward
    const existingSnap = await adminDb
      .collection("users")
      .where("wardNumber", "==", ward)
      .where("role", "==", "WARD_EXEC")
      .where("isActive", "==", true)
      .get();

    if (!existingSnap.empty) {
      return res.status(409).json({
        error: `An active Ward Executive is already assigned to Ward ${ward}. Deactivate or reassign the existing executive before provisioning a new one.`
      });
    }

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
      wardNumber: ward
    });

    // 6. Save user profile document in Firestore: users/{uid}
    const userDocData = {
      uid: userRecord.uid,
      email: cleanEmail,
      fullName: cleanFullName,
      phone: cleanPhone,
      role: "WARD_EXEC",
      wardNumber: ward,
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
 * Lists all registered Ward Executives (protected by verifyToken & requireSuperAdmin)
 */
router.get("/ward-execs", verifyToken, requireSuperAdmin, async (req, res) => {
  try {
    const snapshot = await adminDb
      .collection("users")
      .where("role", "==", "WARD_EXEC")
      .get();

    const executives = [];
    snapshot.forEach((doc) => {
      executives.push(doc.data());
    });

    // Sort by wardNumber ascending
    executives.sort((a, b) => (a.wardNumber || 0) - (b.wardNumber || 0));

    return res.json({ executives });
  } catch (error) {
    console.error("[AdminRoutes] Error listing Ward Executives:", error);
    return res.status(500).json({
      error: "Failed to retrieve Ward Executives list.",
      details: error.message
    });
  }
});

module.exports = router;

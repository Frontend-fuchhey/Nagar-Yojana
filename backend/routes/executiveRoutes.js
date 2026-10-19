const express = require("express");
const crypto = require("crypto");
const { admin, adminAuth, adminDb } = require("../firebaseAdmin");
const {
  verifyToken,
  requireWardExec,
  requireContractor,
  requireWardExecOrContractor,
} = require("../middleware/authMiddleware");
const { sendContractorCredentials } = require("../services/emailService");
const { generateTemporaryPassword } = require("../utils/passwordHelper");

const router = express.Router();

/**
 * POST /api/executive/create-project
 * Allows Ward Executive (or Super Admin) to create a civic project for their ward.
 */
router.post("/create-project", verifyToken, requireWardExec, async (req, res) => {
  try {
    const { title, sector, location, budget, targetDate, date, description } = req.body;

    if (!title || typeof title !== "string" || !title.trim()) {
      return res.status(400).json({ error: "Project title is required." });
    }

    if (!budget || (typeof budget !== "string" && typeof budget !== "number")) {
      return res.status(400).json({ error: "Budget allocation is required." });
    }

    // Ward is strictly tied to logged-in Ward Executive unless Super Admin
    let wardNumber = req.user.wardNumber;
    if (req.user.role === "SUPER_ADMIN" && req.body.wardNumber) {
      wardNumber = Number(req.body.wardNumber);
    }
    wardNumber = Number(wardNumber) || 4;

    const wardFormatted = `Ward ${wardNumber < 10 ? "0" + wardNumber : wardNumber}`;
    const cleanTitle = title.trim();
    const cleanSector = sector ? sector.trim() : "Roads & Drainage";
    const cleanLocation = location ? location.trim() : `Ward ${wardNumber}, Biratnagar`;
    const cleanBudget = String(budget).trim();
    const cleanTargetDate = (targetDate || date || "2082-01-01 (B.S.)").trim();
    const cleanDescription = (description || `Infrastructure development project in ${wardFormatted}`).trim();

    const newId = Date.now();
    const projectData = {
      id: newId,
      title: cleanTitle,
      status: "ACTIVE",
      location: cleanLocation,
      contractor: "Pending Appointment",
      contractorId: null,
      contractorEmail: null,
      description: cleanDescription,
      budget: cleanBudget,
      progress: 0,
      sector: cleanSector,
      ward: wardFormatted,
      wardNumber: wardNumber,
      featured: false,
      date: cleanTargetDate,
      dateLabel: "Target Completion",
      createdAt: new Date().toISOString(),
      createdBy: req.user.email || req.user.uid,
    };

    // Save to Firestore projects collection
    await adminDb.collection("projects").doc(String(newId)).set(projectData);

    return res.status(201).json({
      message: "Project successfully created.",
      project: projectData,
    });
  } catch (error) {
    console.error("[ExecutiveRoutes] Error creating project:", error);
    return res.status(500).json({
      error: "Failed to create project.",
      details: error.message,
    });
  }
});

/**
 * POST /api/executive/provision-contractor
 * Appoints and provisions a civic contractor for a project within the executive's ward.
 * Dispatches onboarding email via Resend with exact specifications:
 * - Sender strictly: "Nagar Yojana <admin@shrawankarki.com.np>"
 * - Subject: "Ward {Ward Number} | {Project Title} - Contractor Assignment"
 */
router.post("/provision-contractor", verifyToken, requireWardExec, async (req, res) => {
  try {
    const rawEmail = req.body.email || req.body.gmail;
    const rawName = req.body.companyName || req.body.fullName || req.body.name;
    const rawPhone = req.body.phone || req.body.number;
    const rawProjectId = req.body.projectId;

    // 1. Validation
    if (!rawEmail || typeof rawEmail !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail.trim())) {
      return res.status(400).json({ error: "A valid contractor email address is required." });
    }
    if (!rawName || typeof rawName !== "string" || !rawName.trim()) {
      return res.status(400).json({ error: "Contractor or Company name is required." });
    }
    if (!rawProjectId) {
      return res.status(400).json({ error: "Assigned Project ID is required." });
    }

    const cleanEmail = rawEmail.trim().toLowerCase();
    const cleanName = rawName.trim();
    const cleanPhone = rawPhone ? String(rawPhone).trim() : null;
    const projectIdStr = String(rawProjectId);

    // 2. Fetch Project details from Firestore
    let projectDocRef = adminDb.collection("projects").doc(projectIdStr);
    let projectSnap = await projectDocRef.get();
    let projectData = projectSnap.exists ? projectSnap.data() : null;

    // Ward number determination
    let wardNumber = req.user.wardNumber;
    if (projectData && projectData.wardNumber) {
      wardNumber = Number(projectData.wardNumber);
    } else if (req.user.role === "SUPER_ADMIN" && req.body.wardNumber) {
      wardNumber = Number(req.body.wardNumber);
    }
    wardNumber = Number(wardNumber) || 4;

    const projectTitle = projectData?.title || req.body.projectTitle || "Civic Infrastructure Project";

    // 3. Calculate sequential Contractor ID for this ward: CON-{wardNumber}-{seq}
    const existingContractorsSnap = await adminDb
      .collection("users")
      .where("role", "==", "CONTRACTOR")
      .where("wardNumber", "==", wardNumber)
      .get();

    const seqNumber = existingContractorsSnap.size + 1;
    const contractorId = `CON-${wardNumber}-${seqNumber}`;

    // 4. Generate secure, copy-friendly temporary password
    const tempPassword = generateTemporaryPassword(10);

    // 5. Create user in Firebase Auth
    let userRecord;
    try {
      userRecord = await adminAuth.createUser({
        email: cleanEmail,
        password: tempPassword,
        displayName: cleanName,
      });
    } catch (authError) {
      if (authError.code === "auth/email-already-exists") {
        return res.status(409).json({
          error: `A user account with email '${cleanEmail}' already exists.`,
        });
      }
      throw authError;
    }

    // 6. Set custom claims & write Firestore user profile
    try {
      await adminAuth.setCustomUserClaims(userRecord.uid, {
        role: "CONTRACTOR",
        wardNumber,
        contractorId,
        projectId: projectIdStr,
      });

      const userDocData = {
        uid: userRecord.uid,
        contractorId,
        email: cleanEmail,
        companyName: cleanName,
        fullName: cleanName,
        phone: cleanPhone,
        role: "CONTRACTOR",
        wardNumber,
        projectId: projectIdStr,
        projectTitle,
        isActive: true,
        mustChangePassword: true,
        appointedBy: req.user.uid || req.user.email || "Ward Executive",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      await adminDb.collection("users").doc(userRecord.uid).set(userDocData);

      // 7. Update Project document with contractor assignment
      await projectDocRef.set(
        {
          contractorId: userRecord.uid,
          contractor: cleanName,
          contractorEmail: cleanEmail,
          contractorPhone: cleanPhone,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );

      // Clear any prior lockout record for this email
      try {
        await adminDb.collection("loginLockouts").doc(cleanEmail).delete();
      } catch (lErr) {}
    } catch (err) {
      // Rollback auth user if database writes fail
      try {
        await adminAuth.deleteUser(userRecord.uid);
      } catch (delErr) {}
      throw err;
    }

    // 8. Dispatch official onboarding email via Resend
    let emailDispatched = true;
    try {
      await sendContractorCredentials({
        name: cleanName,
        companyName: cleanName,
        email: cleanEmail,
        wardNumber,
        tempPassword,
        contractorId,
        projectTitle,
        projectId: projectIdStr,
      });
    } catch (emailErr) {
      console.warn("[ExecutiveRoutes] Contractor email sending warning:", emailErr.message);
      emailDispatched = false;
    }

    return res.status(201).json({
      message: "Contractor successfully appointed and provisioned.",
      uid: userRecord.uid,
      contractorId,
      wardNumber,
      projectId: projectIdStr,
      emailSent: emailDispatched,
    });
  } catch (error) {
    console.error("[ExecutiveRoutes] Error provisioning contractor:", error);
    return res.status(500).json({
      error: "Failed to provision contractor.",
      details: error.message,
    });
  }
});

/**
 * GET /api/executive/contractors
 * Returns all contractors appointed for the Ward Executive's ward (or all for Super Admin).
 */
router.get("/contractors", verifyToken, requireWardExec, async (req, res) => {
  try {
    let q = adminDb.collection("users").where("role", "==", "CONTRACTOR");
    if (req.user.role !== "SUPER_ADMIN" && req.user.wardNumber) {
      q = q.where("wardNumber", "==", Number(req.user.wardNumber));
    }

    const snap = await q.get();
    const contractors = [];
    snap.forEach((doc) => contractors.push(doc.data()));

    return res.json({ contractors });
  } catch (error) {
    console.error("[ExecutiveRoutes] Error listing contractors:", error);
    return res.status(500).json({ error: "Failed to list contractors.", details: error.message });
  }
});

/**
 * POST /api/executive/contractor/:uid/resend
 * Refreshes contractor password and resends assignment email.
 */
router.post("/contractor/:uid/resend", verifyToken, requireWardExec, async (req, res) => {
  try {
    const { uid } = req.params;
    const userDocRef = adminDb.collection("users").doc(uid);
    const snap = await userDocRef.get();
    if (!snap.exists) {
      return res.status(404).json({ error: "Contractor profile not found." });
    }

    const data = snap.data();
    // Security check: must belong to caller's ward
    if (req.user.role !== "SUPER_ADMIN" && Number(data.wardNumber) !== Number(req.user.wardNumber)) {
      return res.status(403).json({ error: "Cannot manage contractors outside your ward." });
    }

    // Generate new secure, copy-friendly temporary password
    const tempPassword = generateTemporaryPassword(10);

    await adminAuth.updateUser(uid, { password: tempPassword });
    await userDocRef.update({
      mustChangePassword: true,
      lastPasswordResetAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Clear any lockout record for this email so login succeeds immediately
    if (data.email) {
      try {
        await adminDb.collection("loginLockouts").doc(data.email.toLowerCase().trim()).delete();
      } catch (lErr) {}
    }

    let emailSent = true;
    try {
      await sendContractorCredentials({
        name: data.companyName || data.fullName,
        companyName: data.companyName,
        email: data.email,
        wardNumber: data.wardNumber,
        tempPassword,
        contractorId: data.contractorId,
        projectTitle: data.projectTitle,
        projectId: data.projectId,
      });
    } catch (e) {
      emailSent = false;
    }

    return res.json({ message: "Credentials resent successfully.", emailSent });
  } catch (error) {
    console.error("[ExecutiveRoutes] Error resending contractor credentials:", error);
    return res.status(500).json({ error: "Failed to resend credentials.", details: error.message });
  }
});

/**
 * DELETE /api/executive/contractor/:uid
 * Revokes contractor access and deletes profile.
 */
router.delete("/contractor/:uid", verifyToken, requireWardExec, async (req, res) => {
  try {
    const { uid } = req.params;
    const userDocRef = adminDb.collection("users").doc(uid);
    const snap = await userDocRef.get();
    if (!snap.exists) {
      return res.status(404).json({ error: "Contractor profile not found." });
    }

    const data = snap.data();
    if (req.user.role !== "SUPER_ADMIN" && Number(data.wardNumber) !== Number(req.user.wardNumber)) {
      return res.status(403).json({ error: "Cannot delete contractor from another ward." });
    }

    // If contractor is linked to a project, clear the contractor fields
    if (data.projectId) {
      try {
        await adminDb.collection("projects").doc(String(data.projectId)).update({
          contractorId: null,
          contractor: "Pending Appointment",
          contractorEmail: null,
          updatedAt: new Date().toISOString(),
        });
      } catch (pErr) {}
    }

    // Delete Firestore user document
    await userDocRef.delete();

    // Delete Firebase Auth user
    try {
      await adminAuth.deleteUser(uid);
    } catch (aErr) {}

    return res.json({ message: "Contractor appointment revoked successfully." });
  } catch (error) {
    console.error("[ExecutiveRoutes] Error deleting contractor:", error);
    return res.status(500).json({ error: "Failed to revoke contractor.", details: error.message });
  }
});

/**
 * PUT /api/executive/projects/:id/progress
 * Allows Contractor or Ward Executive to report physical completion milestones.
 */
router.put("/projects/:id/progress", verifyToken, requireWardExecOrContractor, async (req, res) => {
  try {
    const { id } = req.params;
    const { progress, status, remarks } = req.body;

    const projectDocRef = adminDb.collection("projects").doc(String(id));
    const snap = await projectDocRef.get();

    if (!snap.exists) {
      return res.status(404).json({ error: "Project not found." });
    }

    const project = snap.data();

    // If caller is CONTRACTOR, ensure they are assigned to this project
    if (req.user.role === "CONTRACTOR") {
      if (project.contractorId && project.contractorId !== req.user.uid) {
        return res.status(403).json({ error: "Forbidden: You are not assigned to this project." });
      }
    }

    const updates = {
      updatedAt: new Date().toISOString(),
      lastReportedBy: req.user.displayName || req.user.email || req.user.role,
    };

    if (progress !== undefined) {
      updates.progress = Math.min(100, Math.max(0, Number(progress)));
    }
    if (status) {
      updates.status = String(status).toUpperCase();
    }
    if (remarks !== undefined) {
      updates.contractorRemarks = String(remarks);
    }

    await projectDocRef.update(updates);

    return res.json({
      message: "Project progress updated successfully.",
      updatedFields: updates,
    });
  } catch (error) {
    console.error("[ExecutiveRoutes] Error updating progress:", error);
    return res.status(500).json({ error: "Failed to update progress.", details: error.message });
  }
});

module.exports = router;

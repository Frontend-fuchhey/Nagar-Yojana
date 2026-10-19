const { adminAuth } = require("../firebaseAdmin");

/**
 * Middleware to verify Firebase ID Token from Authorization header.
 * Attaches decoded token to req.user.
 */
async function verifyToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        error: "Unauthorized: Missing or malformed Authorization header. Expected format: 'Bearer <token>'."
      });
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
      return res.status(401).json({
        error: "Unauthorized: Token missing from Authorization header."
      });
    }

    const decodedToken = await adminAuth.verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error("[AuthMiddleware] verifyToken error:", error.message);
    return res.status(401).json({
      error: "Unauthorized: Invalid or expired token.",
      details: error.code || error.message
    });
  }
}

/**
 * Middleware to restrict route access strictly to SUPER_ADMIN users.
 * Checks token custom claims, with automatic fallback and self-healing to Firestore user profile.
 */
async function requireSuperAdmin(req, res, next) {
  if (req.user && req.user.role === "SUPER_ADMIN") {
    return next();
  }

  // Fallback: check Firestore users collection if token claims have not propagated yet
  try {
    const { adminDb, adminAuth } = require("../firebaseAdmin");
    if (req.user && req.user.uid) {
      const userDoc = await adminDb.collection("users").doc(req.user.uid).get();
      if (userDoc.exists && userDoc.data().role === "SUPER_ADMIN") {
        req.user.role = "SUPER_ADMIN";
        // Self-heal: set custom user claims on Firebase Auth
        adminAuth.setCustomUserClaims(req.user.uid, { role: "SUPER_ADMIN" }).catch(() => {});
        return next();
      }
    }
  } catch (err) {
    console.warn("[AuthMiddleware] requireSuperAdmin fallback check error:", err.message);
  }

  return res.status(403).json({
    error: "Forbidden: Super Admin privileges required to access this resource."
  });
}

/**
 * Middleware to restrict route access to WARD_EXEC, STAFF, or SUPER_ADMIN users.
 */
function requireWardExec(req, res, next) {
  const allowedRoles = ["SUPER_ADMIN", "ADMIN", "WARD_EXEC", "STAFF"];
  if (!req.user || !allowedRoles.includes(req.user.role)) {
    return res.status(403).json({
      error: "Forbidden: Ward Executive, Staff, or Super Admin access required."
    });
  }
  next();
}

module.exports = {
  verifyToken,
  requireSuperAdmin,
  requireWardExec,
  requireStaffOrAdmin: requireWardExec
};

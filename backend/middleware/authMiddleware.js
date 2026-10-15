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
 */
function requireSuperAdmin(req, res, next) {
  if (!req.user || req.user.role !== "SUPER_ADMIN") {
    return res.status(403).json({
      error: "Forbidden: Super Admin privileges required to access this resource."
    });
  }
  next();
}

/**
 * Middleware to restrict route access to WARD_EXEC or SUPER_ADMIN users.
 */
function requireWardExec(req, res, next) {
  if (!req.user || (req.user.role !== "WARD_EXEC" && req.user.role !== "SUPER_ADMIN")) {
    return res.status(403).json({
      error: "Forbidden: Ward Executive or Super Admin access required."
    });
  }
  next();
}

module.exports = {
  verifyToken,
  requireSuperAdmin,
  requireWardExec
};

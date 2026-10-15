const fs = require("fs");
const path = require("path");
const admin = require("firebase-admin");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

require("dotenv").config({ path: path.join(__dirname, ".env") });
require("dotenv").config();

let isFirebaseInitialized = false;
let serviceAccount = null;

// 1. Try loading from process.env.FIREBASE_SERVICE_ACCOUNT_KEY (JSON string or Base64)
if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
  const rawKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY.trim();
  try {
    if (rawKey.startsWith("{")) {
      serviceAccount = JSON.parse(rawKey);
    } else {
      const decoded = Buffer.from(rawKey, "base64").toString("utf8");
      serviceAccount = JSON.parse(decoded);
    }
  } catch (err) {
    console.error("[FirebaseAdmin] Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY environment variable:", err.message);
  }
}

// 2. Check candidate paths for serviceAccountKey.json (or custom path in process.env.FIREBASE_SERVICE_ACCOUNT_PATH)
if (!serviceAccount) {
  const candidatePaths = [
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH,
    path.join(__dirname, "serviceAccountKey.json"),
    path.join(process.cwd(), "serviceAccountKey.json"),
    path.join(process.cwd(), "backend", "serviceAccountKey.json"),
  ].filter(Boolean);

  for (const candidatePath of candidatePaths) {
    if (fs.existsSync(candidatePath)) {
      try {
        const fileData = fs.readFileSync(candidatePath, "utf8");
        serviceAccount = JSON.parse(fileData);
        if (serviceAccount.project_id) {
          console.log(`[FirebaseAdmin] Located service account key file at: ${candidatePath}`);
          break;
        }
      } catch (err) {
        console.error(`[FirebaseAdmin] Failed to read or parse service account file at ${candidatePath}:`, err.message);
      }
    }
  }
}

let adminAuth;
let adminDb;

// 3. Initialize Firebase Admin SDK if credentials found
if (serviceAccount) {
  try {
    admin.initializeApp({
      credential: admin.cert(serviceAccount)
    });
    isFirebaseInitialized = true;
    admin.auth = (app) => (app ? getAuth(app) : getAuth());
    admin.firestore = Object.assign((app) => (app ? getFirestore(app) : getFirestore()), { FieldValue });
    adminAuth = admin.auth();
    adminDb = admin.firestore();
    console.log(`[FirebaseAdmin] Successfully initialized Firebase Admin for project: ${serviceAccount.project_id || "unknown"}`);
  } catch (initErr) {
    console.error("[FirebaseAdmin] Error initializing Firebase Admin with credentials:", initErr.message);
  }
}

// 4. Safe mock fallback if no credentials found or initialization failed
if (!isFirebaseInitialized) {
  console.warn(
    "[FirebaseAdmin] ⚠️ WARNING: No valid Firebase service account found. " +
    "Checked process.env.FIREBASE_SERVICE_ACCOUNT_KEY and backend/serviceAccountKey.json. " +
    "Server is running with safe mock/placeholder fallback. " +
    "Auth verification and Firestore database operations will be simulated."
  );

  const mockAuth = {
    verifyIdToken: async (token) => {
      console.warn("[FirebaseAdmin:MockAuth] verifyIdToken called in mock mode for token:", token ? token.substring(0, 10) + "..." : "null");
      throw new Error("Firebase Admin is not configured with valid service account credentials. Cannot verify real ID tokens.");
    },
    createUser: async (userData) => {
      console.warn("[FirebaseAdmin:MockAuth] createUser called with mock fallback:", userData.email);
      return {
        uid: "mock-uid-" + Math.random().toString(36).substring(2, 10),
        email: userData.email,
        displayName: userData.displayName
      };
    },
    setCustomUserClaims: async (uid, claims) => {
      console.warn("[FirebaseAdmin:MockAuth] setCustomUserClaims called for uid:", uid, claims);
      return;
    },
    getUserByEmail: async (email) => {
      console.warn("[FirebaseAdmin:MockAuth] getUserByEmail called for:", email);
      const err = new Error("User not found (mock mode)");
      err.code = "auth/user-not-found";
      throw err;
    },
    updateUser: async (uid, userData) => {
      console.warn("[FirebaseAdmin:MockAuth] updateUser called for:", uid, userData);
      return { uid, ...userData };
    }
  };

  const createMockDocRef = (colName, docId) => ({
    get: async () => ({ exists: false, data: () => null }),
    set: async (data) => {
      console.warn(`[FirebaseAdmin:MockDb] Mock write to ${colName}/${docId}:`, data);
      return { writeTime: new Date() };
    },
    update: async (data) => {
      console.warn(`[FirebaseAdmin:MockDb] Mock update to ${colName}/${docId}:`, data);
      return { writeTime: new Date() };
    }
  });

  const createMockQuery = (colName) => ({
    where: () => createMockQuery(colName),
    get: async () => ({ empty: true, docs: [] })
  });

  const mockDb = {
    collection: (colName) => ({
      where: () => createMockQuery(colName),
      doc: (docId) => createMockDocRef(colName, docId),
      get: async () => ({ empty: true, docs: [] })
    })
  };

  admin.auth = () => mockAuth;
  admin.firestore = Object.assign(() => mockDb, {
    FieldValue: {
      serverTimestamp: () => new Date().toISOString(),
      delete: () => null
    }
  });

  adminAuth = mockAuth;
  adminDb = mockDb;
}

module.exports = {
  admin,
  adminAuth,
  adminDb,
  isFirebaseInitialized
};

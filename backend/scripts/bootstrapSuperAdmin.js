#!/usr/bin/env node

/**
 * Bootstrap Super Admin CLI Script
 *
 * Usage:
 *   node backend/scripts/bootstrapSuperAdmin.js <email> <password> [fullName]
 *
 * Example:
 *   node backend/scripts/bootstrapSuperAdmin.js superadmin@biratnagar.gov.np P@ssword123 "Biratnagar Chief Admin"
 */

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const { admin, adminAuth, adminDb, isFirebaseInitialized } = require("../firebaseAdmin");

async function bootstrap() {
  const args = process.argv.slice(2);
  const email = args[0];
  const password = args[1];
  const fullName = args[2] || "Super Administrator";

  if (!email || !password) {
    console.error("❌ Error: Missing required arguments.");
    console.log("\nUsage:");
    console.log("  node backend/scripts/bootstrapSuperAdmin.js <email> <password> [fullName]");
    console.log("\nExample:");
    console.log('  node backend/scripts/bootstrapSuperAdmin.js admin@nagaryojana.gov.np SecurePass123! "Chief Municipal Admin"\n');
    process.exit(1);
  }

  if (password.length < 6) {
    console.error("❌ Error: Password must be at least 6 characters long for Firebase Auth.");
    process.exit(1);
  }

  if (!isFirebaseInitialized) {
    console.error("❌ Error: Firebase Admin SDK is not properly initialized with valid service account credentials.");
    console.error("Please configure FIREBASE_SERVICE_ACCOUNT_KEY in backend/.env or place serviceAccountKey.json inside the backend/ folder.");
    process.exit(1);
  }

  const cleanEmail = email.trim().toLowerCase();
  const cleanFullName = fullName.trim();

  console.log(`\n🚀 Initializing Super Admin bootstrap for: ${cleanEmail}`);

  let userRecord;

  // 1. Check if user already exists in Firebase Auth
  try {
    userRecord = await adminAuth.getUserByEmail(cleanEmail);
    console.log(`ℹ️ Existing user found with UID: ${userRecord.uid}`);
    
    // Update password and display name
    await adminAuth.updateUser(userRecord.uid, {
      password: password,
      displayName: cleanFullName
    });
    console.log("✅ Updated user password and displayName in Firebase Auth.");
  } catch (error) {
    if (error.code === "auth/user-not-found") {
      // 2. Create new user in Firebase Auth
      userRecord = await adminAuth.createUser({
        email: cleanEmail,
        password: password,
        displayName: cleanFullName
      });
      console.log(`✅ Created new user in Firebase Auth with UID: ${userRecord.uid}`);
    } else {
      throw error;
    }
  }

  // 3. Set Custom User Claim for SUPER_ADMIN role
  await adminAuth.setCustomUserClaims(userRecord.uid, {
    role: "SUPER_ADMIN"
  });
  console.log("✅ Assigned Custom User Claims: { role: 'SUPER_ADMIN' }");

  // 4. Upsert document in Firestore `users/{uid}`
  await adminDb.collection("users").doc(userRecord.uid).set(
    {
      uid: userRecord.uid,
      email: cleanEmail,
      fullName: cleanFullName,
      role: "SUPER_ADMIN",
      isActive: true,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    },
    { merge: true }
  );
  console.log(`✅ Upserted Firestore profile document at users/${userRecord.uid}`);

  console.log("\n========================================================");
  console.log("🎉 Super Admin bootstrap completed successfully!");
  console.log(`   UID:      ${userRecord.uid}`);
  console.log(`   Email:    ${cleanEmail}`);
  console.log(`   Name:     ${cleanFullName}`);
  console.log("   Role:     SUPER_ADMIN");
  console.log("========================================================\n");

  process.exit(0);
}

bootstrap().catch((err) => {
  console.error("❌ Fatal bootstrap error:", err.message);
  process.exit(1);
});

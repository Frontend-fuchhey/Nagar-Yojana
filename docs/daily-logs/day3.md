# Development Log — Day 3 (2026-10-16)

## 1. Commits Recorded
- `a94d693`: `fix(auth): resolve roles strictly from database and claims, enhance error guidance for disabled login provider`

---

## 2. Work Completed & Features Added
- **Zero-Credential Code Sanitization & Hardening:** Completed an exhaustive audit across the codebase to ensure no personal email addresses, API secrets, or passwords remain in source files. All administrative access checks were decoupled from hardcoded strings and transitioned to dynamic database queries.
- **Dynamic Role Resolution via Firestore & Custom Claims:** Refactored the role detection logic in `StaffPortal.jsx` to resolve user permissions exclusively from Firebase Auth custom claims (`SUPER_ADMIN`, `WARD_EXEC`) and the Firestore `users/{uid}` profile collection.
- **Intelligent Firebase Auth Error Diagnostics:** Diagnosed client-side `PASSWORD_LOGIN_DISABLED` exceptions and added an explicit error handler for `auth/operation-not-allowed` in the sign-in workflow. Users are now clearly informed when Email/Password authentication must be enabled in the Firebase Console.
- **Private Developer Documentation Architecture:** Added `docs/` to root `.gitignore` and initiated structured daily architecture logging for private local audit trails.

---

## 3. UI/UX & Visual Design Specs
- **Layout & Structure:**
  - Maintained the high-security gateway card in `StaffPortal.jsx` with clear alert banners positioned above the login form inputs.
- **Color System:**
  - Error Alert Banner: Light crimson wash (`bg-red-50 border-red-200 text-red-800`), alert iconography with Simrik Red `#DC143C` stroke.
  - Input Fields: Neutral focus rings transitioning to Flag Blue `#003893` on active selection.
- **Typography:**
  - Alert Text: `text-xs font-medium leading-relaxed` ensuring complete readability of administrative setup instructions.
- **Interactive Behaviors:**
  - Form field placeholder sanitized to neutral municipal convention (`placeholder="e.g. executive.ward4@gmail.com"`).
  - Dynamic error clearing on new input submission attempts.
- **Responsive Adaptations:**
  - Alert container automatically scales and wraps text cleanly on both mobile viewports (`<640px`) and desktop screens.

---

## 4. Logic, Architecture & Approach
- **Component & State Architecture:**
  - Refactored `onAuthStateChanged` hook inside `StaffPortal.jsx`:
    ```javascript
    // Resolve role strictly from token claims and Firestore database profile
    if (detectedRole === 'SUPER_ADMIN' || profileData.role === 'SUPER_ADMIN') {
      detectedRole = 'SUPER_ADMIN';
    } else if (profileData.wardNumber || tokenResult.claims?.wardNumber) {
      detectedRole = 'WARD_EXEC';
    }
    ```
- **Routing & Navigation:**
  - Preserved query-driven navigation (`?portal=staff`) while ensuring unauthenticated or unauthorized sessions are redirected to the credential verification screen without data exposure.
- **Data Flow & Mock/Live API Handling:**
  - Multi-tier profile verification: Decodes user ID token → Fetches Firestore `users/{uid}` document → Assigns UI permissions.
- **Security & Validation:**
  - Passwords and user credentials remain strictly stored within Google Firebase Authentication (salted and hashed via scrypt).
  - Neither client-side bundles nor repository commits contain static privileged keys or hardcoded administrative emails.
- **Approach & Rationale:**
  - Decoupling user email matching from the client bundle ensures that any authorized administrator can be managed, updated, or decommissioned directly via the Firestore console without requiring application code changes or redeployments.

---

## 5. Files Changed & Key Code References
- `frontend/src/components/StaffPortal.jsx` — Removed hardcoded email string comparison in role detection; sanitized placeholder text; added explicit `auth/operation-not-allowed` diagnostic error messaging.
- `.gitignore` — Added `docs/` to prevent private audit logs and architecture documentation from being tracked or pushed to remote repositories.

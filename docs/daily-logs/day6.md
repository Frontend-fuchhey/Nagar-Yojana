# Development Log — Day 6 (2026-10-30)

## 1. Commits Recorded
- `8901522`: `fix(email): replace dashed box & copy text with click-to-copy icon; fix mobile responsiveness for all credential emails`
- Current: `feat: municipal users management directory, admin password reset service, and auth race hardening`

---

## 2. Work Completed & Features Added
- **Super Administrator Municipal Users Directory & Roster (`GET /api/admin/users`):**
  - Implemented a unified directory in the Super Admin workspace (`?portal=staff`) under a dedicated **Users / Staff** navigation tab.
  - Combines Firestore profile documents from the `users` collection with Firebase Authentication metadata retrieved via `adminAuth.listUsers(1000)`.
  - Captures and displays comprehensive user details: Full Name / Company Name, Email Address, Appointed Role / Civic Post (Super Administrator, Ward Executive with formatted ward number, Civic Contractor), Account Creation Date, and Last Active / Sign-in timestamp.
  - Added real-time client-side search filtering across names, emails, and ward numbers.
  - Added role category filter dropdown: `All Roles`, `Super Administrator`, `Ward Executive`, and `Civic Contractor`.
  - Sorts users by institutional role hierarchy (Super Admin $\rightarrow$ Ward Exec $\rightarrow$ Contractor) and ascending ward order.
- **Administrative Password Reset & Automated Dispatch (`POST /api/admin/users/reset-password`):**
  - Created a dedicated backend endpoint allowing Super Admins to initiate secure password resets for any municipal user.
  - Uses Firebase Admin SDK (`adminAuth.generatePasswordResetLink(email)`) to cryptographically generate action links.
  - Integrates with Resend API via `sendPasswordResetEmailService` to dispatch an official, Apple-styled branded password reset email from `Nagar Yojana <admin@shrawankarki.com.np>`.
  - Includes a resilient client-side fallback using Firebase Auth `sendPasswordResetEmail(auth, email)` in case of network timeouts.
  - Added inline action buttons on every user row:
    - **Reset Password**: Initiates the reset pipeline with live button spinners and real-time success/failure feedback alert.
    - **Email**: Pre-populates a direct `mailto:` link with recipient name and address for rapid administrative communication.
- **Authentication Race Condition & Closure Hardening:**
  - Introduced `isSigningInRef` ref guard in `StaffPortal.jsx` to prevent the asynchronous `onAuthStateChanged` observer from racing with or interrupting active user sign-in flows.
  - Implemented `systemActiveRef` to ensure the real-time Municipal Maintenance Break check during authentication always evaluates the latest system state rather than a stale closure value.
- **Credential Email Refinement & Mobile Optimization (Commit 8901522):**
  - Replaced legacy dashed copy containers with modern, Apple-inspired click-to-copy icon badges.
  - Fixed mobile responsiveness across all credential email templates (Ward Executive credentials, Contractor appointments, and Password resets) to ensure perfect rendering across smartphones, tablets, and desktop email clients.
- **Microcopy & UI Terminology Polish:**
  - Modernized form labels and status text across the portal: updated "Official Email" to "Email Address", "Official Login" to "Logged In", and "Official Assignment" to "Contractor Assignment".

---

## 3. Visual & Design Decisions (Apple HIG Alignment)
- **All Municipal Users Table:**
  - Clean container (`bg-white rounded-[18px] border border-[#e0e0e0] shadow-sm`).
  - Column headers in subdued slate ink (`text-[11px] font-semibold tracking-wider text-[#7a7a7a] bg-[#fafafc] border-b border-[#f0f0f2]`).
  - Role Badges:
    - Super Admin: Purple tint (`bg-[#f5f3ff] text-[#6d28d9] border-[#ddd6fe]`).
    - Ward Executive: Blue tint (`bg-[#eef5ff] text-[#0066cc] border-[#d6e6fb]`).
    - Contractor: Forest Emerald tint (`bg-[#eefaf3] text-[#156947] border-[#cfeedd]`).
  - Action Buttons:
    - Reset Password: Slate pill button (`bg-[#f5f5f7] hover:bg-[#e8e8ed] text-[#1d1d1f] border border-[#e0e0e0]`) with `KeyRound` icon.
    - Email: Soft Action Blue pill button (`bg-[#eef5ff] hover:bg-[#d6e6fb] text-[#0066cc] border border-[#d6e6fb]`) with `Mail` icon.
- **Interactive Reset Feedback Banner:**
  - In-row status chips displaying success confirmation (`text-[#156947]`) or error diagnostics (`text-[#c4232d]`).

---

## 4. Logic, Architecture & Approach
- **Multi-Source User Reconciliation (`adminRoutes.js`):**
  ```javascript
  const snapshot = await adminDb.collection("users").get();
  const listRes = await adminAuth.listUsers(1000);
  const authUsersList = listRes.users || [];
  ```
  - Loops over Firestore documents and pairs them with Auth metadata (`creationTime`, `lastSignInTime`).
  - Detects orphan Auth accounts lacking Firestore documents and synthesizes full user profiles with fallback custom claims.
  - Pre-sorts the aggregated directory by role precedence:
    ```javascript
    const roleWeight = { SUPER_ADMIN: 1, WARD_EXEC: 2, CONTRACTOR: 3 };
    ```
- **Dual-Path Password Reset Dispatch:**
  1. Primary: Server-side `adminAuth.generatePasswordResetLink()` + Resend API HTML dispatch.
  2. Fallback: Client-side `sendPasswordResetEmail(auth, email)` if server dispatch encounters rate-limiting or network issues.

---

## 5. Files Changed & Key Code References
- `backend/routes/adminRoutes.js`: Added `GET /api/admin/users` and `POST /api/admin/users/reset-password`.
- `backend/services/emailService.js`: Added `sendPasswordResetEmailService` with Apple-styled responsive HTML email template.
- `frontend/src/components/StaffPortal.jsx`: Added All Municipal Users roster table, search and role filtering, password reset trigger, `isSigningInRef` guard, and `systemActiveRef` synchronization.
- `frontend/src/components/StaffLoginModal.jsx`: Modernized email input label.

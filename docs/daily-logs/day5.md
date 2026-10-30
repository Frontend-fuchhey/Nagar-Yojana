# Development Log — Day 5 (2026-10-20)

## 1. Commits Recorded
- `fa101ac`: `feat: unified municipal login portal, automatic role-based workspace redirection, copy-safe password generator, and enhanced credential email delivery`
- `4202ccb`: `feat: implement route separation, contractor portal, executive project creation, and dynamic resend emails`
- `9c486bb`: `feat(maintenance): add instant cross-tab sync, 3s active polling, and view guard to instantly evict ward executives on maintenance break`
- `4cedd49`: `fix(maintenance): custom interactive confirmation modal, rename to Maintenance Break without dot, and fix toggle permission error`
- `caef0f9`: `feat(maintenance): add maintenance mode toggle to freeze executive logins`
- `175f417`: `chore(ui): remove session secured badge from headers`
- `195e102`: `feat: add root health check route for UptimeRobot`
- `d4cfdb7`: `feat(security): implement auto-logout after 15 minutes of inactivity and enforce session persistence`

---

## 2. Work Completed & Features Added
- **Unified Municipal Gateway & Portal Switcher Removal:**
  - Consolidated separate, profile-specific login variants into **ONE universal Municipal Gateway** (`Official Municipal Gateway · विराटनगर महानगरपालिका`).
  - Completely eliminated the "Switch Portal: Super Admin · Ward Executive · Contractor" navigation block on the login screen.
  - Implemented automatic post-authentication role inspection: upon entering valid credentials, the system checks custom claims and Firestore profiles to route users directly to their designated workspace (`?portal=staff` for Super Admin, `?portal=executive` for Ward Executive, and `?portal=contractor` for Civic Contractors).
  - Added an in-field password visibility toggle (`Eye` / `EyeOff`) to allow users to view pasted or typed passwords before submission.
- **Copy-Friendly Password Generation & Delimiter Safety:**
  - Resolved password mismatch and copy-paste truncation errors caused by punctuation delimiters (`!@#$%&*`).
  - Created [`passwordHelper.js`](file:///c:/Users/asus/Desktop/Nagar%20Yojana/backend/utils/passwordHelper.js) implementing `generateTemporaryPassword(10)`: generates unambiguous, 10-character alphanumeric temporary passwords strictly excluding confusing glyphs (`0`, `O`, `1`, `I`, `l`) and punctuation characters. Double-clicking in any webmail client now selects the complete string cleanly.
  - Added frontend password sanitization to strip leading/trailing whitespace and zero-width spaces (`\u200B`, `\uFEFF`, `\u00A0`).
  - Enhanced credential emails for Ward Executives and Contractors with dedicated copy containers (`user-select: all; -webkit-user-select: all;`), helper badges, and auto-prefilling direct login links.
  - Added automated lockout clearance upon provisioning or resending credentials so users are never blocked by prior failed attempts.
- **Three-Tier Role Separation & New Civic Contractor Portal (`?portal=contractor`):**
  - Expanded the authorization model to three distinct roles: `SUPER_ADMIN`, `WARD_EXEC`, and `CONTRACTOR`.
  - Built the dedicated **Civic Contractor Workspace** allowing appointed contractors to view projects assigned to their UID, adjust physical progress percentage sliders (0–100%), update status flags, and record operational remarks.
  - Refactored the **Ward Executive Workspace** (`?portal=executive`): converted progress sliders to read-only oversight displays.
  - Added the **"Create Project" Module** in the Executive workspace to allow ward executives to provision new local infrastructure initiatives directly into Firestore with auto-assigned ward numbers.
  - Added the **"Appoint Contractor" Module** in the Executive workspace with sequential Contractor ID generation (`CON-{ward}-{seq}`), automated Firebase Auth provisioning, project linking, and dynamic email dispatch via Resend.
- **Municipal Maintenance Break Mode with Instant Active Eviction:**
  - Built an administrative maintenance toggle in the Super Admin workspace header ("Maintenance Break") that flips system state in Firestore (`systemSettings/maintenance`).
  - When Maintenance Break is activated, non-Super Admin logins (Ward Executives and Contractors) are immediately frozen with an informative warning banner.
  - Implemented **Active Eviction**:
    - Real-time `onSnapshot` listener on `systemSettings/maintenance`.
    - 3-second background polling fallback to detect state transitions even if WebSockets are suspended.
    - Window focus and document visibility handlers (`visibilitychange`).
    - Immediate sign-out and session clearance (`signOut(auth)`) if an executive or contractor is currently active when maintenance is enabled.
  - Designed an interactive Apple-style confirmation modal with custom typography, status badges, and actionable confirmation before initiating maintenance.
- **Root Health Check Route for UptimeRobot:**
  - Added `GET /` to `backend/server.js` returning `200 OK` with `"NagarYojana API is awake and running!"` to provide an active health check endpoint for monitoring uptime and preventing Render sleeping without throwing 404s.
- **Inactivity Auto-Logout & Session Persistence Hardening:**
  - Enforced `browserSessionPersistence` across Firebase Auth to eliminate indefinite credential persistence across browser restarts.
  - Built a 15-minute inactivity tracker monitoring keyboard, mouse, scroll, and touch events to automatically log out idle users and notify them on the login screen.

---

## 3. UI/UX & Visual Design Specs
- **Unified Login View:**
  - Badge: `px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-[#f5f5f7] text-[#333333] border border-[#e0e0e0]` — "Official Municipal Gateway · विराटनगर महानगरपालिका".
  - Wordmark: `Nagar` in Simrik Crimson (`#DC143C`) and `योजना` in Forest Emerald (`#156947`).
  - Inputs: `#fafafc` neutral fill, `#e0e0e0` hairline border, `#0071e3` focus ring.
  - Password Input: Right-aligned eye toggle icon button for instant plaintext review.
  - Submit Button: Pill-shaped Action Blue (`#0066cc` hover `#0071e3`) with `ShieldCheck` icon.
- **Maintenance Break Status Indicator:**
  - Header Button: Interactive badge with live colored status dot (Green for active, Crimson for maintenance break).
  - Maintenance Modal: Centered Apple-styled modal dialog (`rounded-[20px]`, `max-w-md`, shadow-2xl) with detailed operational warnings and dual "Cancel" / "Confirm Break" actions.
- **Contractor Workspace:**
  - Assigned Project Card: Status chip (`ACTIVE` / `COMPLETED` / `DELAYED`), budget allocation, ward jurisdiction.
  - Interactive Progress Slider: Smooth numeric slider (0–100%) paired with quick-step buttons (`25%`, `50%`, `75%`, `100%`).
  - Physical Status Selector: Dropdown for operational milestones.
  - Save Progress Button: Emerald Action (`#15803d` hover `#16a34a`) with live update spinner.
- **Email Design System:**
  - Header: Midnight Navy (`#0f172a`) with crisp white title.
  - Copy Password Box: Dashed border container (`#2563eb` for executives, `#15803d` for contractors), large monospace font (`18px`), letter-spacing (`2px`), `user-select: all;`.
  - Direct Action Button: Primary CTA with dynamic email prefill parameter (`&email=...`).

---

## 4. Logic, Architecture & Approach
- **Unified Authentication & Automatic Role-Based Routing:**
  - User submits credentials on unified login form $\rightarrow$ `StaffPortal.jsx` calls `signInWithEmailAndPassword(auth, email, cleanPassword)`.
  - Upon token issuance, client fetches ID token claims (`tokenResult.claims`) and Firestore profile (`users/{uid}`).
  - Role resolution hierarchy:
    ```javascript
    if (detectedRole === 'SUPER_ADMIN' || profileData.role === 'SUPER_ADMIN') {
      resolvedRole = 'SUPER_ADMIN';
      onPortalChange?.('staff');
    } else if (detectedRole === 'CONTRACTOR' || profileData.role === 'CONTRACTOR' || profileData.contractorId) {
      resolvedRole = 'CONTRACTOR';
      onPortalChange?.('contractor');
    } else {
      resolvedRole = 'WARD_EXEC';
      onPortalChange?.('executive');
    }
    ```
- **Real-Time Maintenance Eviction Logic:**
  - `StaffPortal.jsx` subscribes to `systemSettings/maintenance` via Firestore `onSnapshot`.
  - Whenever `systemActive === false`:
    - If `currentUser` has `userRole !== 'SUPER_ADMIN'`, `evictNonSuperAdmin()` triggers immediately:
    - Clears `sessionStorage` and `localStorage` session keys.
    - Calls `signOut(auth)`.
    - Resets all user state variables and displays a prominent maintenance alert.
- **Sequential Contractor ID Calculation:**
  - In `backend/routes/executiveRoutes.js`, queries existing contractors in the ward:
    ```javascript
    const existingContractorsSnap = await adminDb
      .collection("users")
      .where("role", "==", "CONTRACTOR")
      .where("wardNumber", "==", wardNumber)
      .get();
    const seq = existingContractorsSnap.size + 1;
    const contractorId = `CON-${wardNumber}-${seq}`;
    ```
- **Clean Alphanumeric Password Generation:**
  - Excludes easily mistyped or delimiter-breaking characters:
    ```javascript
    const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // No I, O
    const lower = "abcdefghjkmnpqrstuvwxyz";  // No l, o
    const digits = "23456789";                // No 0, 1
    ```
  - Fisher-Yates cryptographically secure shuffle via `crypto.randomInt`.

---

## 5. Files Changed & Key Code References
- `frontend/src/components/StaffPortal.jsx` — Unified municipal login UI, password visibility toggle, automated role redirection, contractor workspace view, maintenance modal, and instant eviction listeners.
- `frontend/src/App.jsx` — Updated query parsing to accept any portal parameter and route seamlessly.
- `backend/server.js` — Added root `GET /` health check route for UptimeRobot.
- `backend/routes/adminRoutes.js` — Integrated `generateTemporaryPassword(10)`, added lockout auto-clear on provision and resend.
- `backend/routes/executiveRoutes.js` — Added contractor provisioning (`POST /provision-contractor`), contractor project creation (`POST /projects`), listing, resend, and deletion routes.
- `backend/services/emailService.js` — Styled copy-friendly password container, added helper copy notice, and prefilled login URLs.
- `backend/utils/passwordHelper.js` — New utility for clean, unambiguous 10-character temporary password generation.

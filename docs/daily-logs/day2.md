# Development Log — Day 2 (2026-10-15)

## 1. Commits Recorded
- `4b0bd16`: `feat: add Biratnagar City Gate logo, update favicon, and enhance project list skeletons`
- `17c5ebd`: `feat: integrate Firebase, Super Admin provisioning, email dispatch, and Firestore RBAC rules`
- `cf89680`: `feat: hide staff login from homepage, add dedicated real-time staff portal with sequential WE IDs and bootstrap Super Admin`

---

## 2. Work Completed & Features Added
- **Official Municipal Branding & Favicon Overhaul:** Integrated the official Biratnagar City Gate emblem (`Biratnagar City Gate Logo.png`) into the application header and browser tab configuration. Replaced inline SVG favicons with high-resolution PNG links and apple touch icons.
- **Custom Shimmer Loading Skeletons:** Upgraded infrastructure project loading states with a custom keyframe shimmer animation (`@keyframes shimmer`), multi-column skeleton card placeholders, and minimum transition timer smoothing.
- **Zero-Leak Firebase & Secret Protection Architecture:** Hardened `.gitignore` to strictly isolate environment configurations and service account credentials while deploying public `.env.example` templates.
- **Client & Admin Firebase Infrastructure:**
  - Integrated Firebase Web SDK v11 into the React frontend (`frontend/src/firebase.js`) exporting initialized `auth` and Firestore `db` instances.
  - Created `frontend/src/services/firestoreService.js` implementing real-time `onSnapshot` listeners for projects, ward filtering, and grievance subscriptions.
  - Initialized Firebase Admin SDK (`backend/firebaseAdmin.js`) with dynamic service account key loading and a non-blocking mock fallback.
- **Super Admin to Ward Executive Provisioning Engine:** Built `backend/routes/adminRoutes.js` and `backend/middleware/authMiddleware.js` implementing zero-trust role verification (`SUPER_ADMIN`, `WARD_EXEC`). Configured automated sequential Executive ID generation (`WE-<ward>-<seq>`), temporary password creation, and Firestore user profile synchronization.
- **Civic Email Delivery Service:** Developed `backend/services/emailService.js` with Nodemailer to dispatch formatted credential emails with executive onboarding packages, login URLs, and console fallback testing.
- **Production Firestore Security Rules:** Authored `firestore.rules` establishing strict Role-Based Access Control (RBAC) ensuring public read transparency while restricting mutation rights to verified Super Admins and Ward Executives.
- **Dedicated Real-Time Staff & Admin Portal:**
  - Completely decoupled staff login from the public homepage navbar to prevent public clutter.
  - Constructed `frontend/src/components/StaffPortal.jsx` accessible exclusively via `?portal=staff`.
  - Implemented Super Admin Command Dashboard with real-time directory metrics across all 19 wards, live ID generation preview, and automated provisioning.
  - Implemented Ward Executive Workspace with interactive project progress sliders (0–100%) and citizen grievance management.

---

## 3. UI/UX & Visual Design Specs
- **Layout & Structure:**
  - Staff Portal Sign-In: Centered card container (`max-w-md w-full bg-white rounded-3xl p-8 border border-slate-200/80 shadow-2xl`), top municipal tricolor bar (`h-1.5 bg-gradient-to-r from-[#003893] via-[#DC143C] to-[#156947]`), and top navigation return pill (`fixed top-6 left-6`).
  - Super Admin Dashboard: Responsive header with municipal insignia, user badge, and sign-out button; 4-card KPI summary grid (`grid grid-cols-2 lg:grid-cols-4 gap-4`); 2-column workspace dividing the Provisioning Form (`lg:w-[420px]`) and the Real-time Directory Table (`flex-1`).
  - Ward Executive Workspace: Dual-tab view (`Projects` and `Grievances`), interactive progress range slider with immediate numerical visualizer, and badge indicators.
- **Color System:**
  - Flag Blue: `#003893` (Portal buttons, primary brand badges, header accent).
  - Crimson / Simrik Red: `#DC143C` (Warning alerts, urgent statuses, Nagar logo span).
  - Forest Green: `#156947` (Completed badges, active status pills, success notices).
  - Portal Dark Backdrop: `#0F172A` / `#0B132B` (High-contrast security gateway feel).
  - Card & Surface: `#FFFFFF` with slate accents (`#F8FAFC`, `#F1F5F9`, `#E2E8F0`).
- **Typography:**
  - Inter sans-serif with refined tracking: `font-mono` applied to Executive IDs (`WE-04-1`), temporary passwords, and API tokens.
  - Metric Headers: `text-2xl sm:text-3xl font-extrabold text-slate-900`.
- **Interactive Behaviors:**
  - Shimmer Effect: `.animate-shimmer::after` translating linear gradient from `-100%` to `100%` over `1.8s infinite`.
  - Live ID Preview: Dynamic badge reacting in real time to ward selector changes.
  - Form Submit Feedback: Button transitions into loading state with SVG spinner and disabled input locks.
- **Responsive Adaptations:**
  - Breakpoints handled via Tailwind `sm:` (640px) and `lg:` (1024px).
  - Provisioning form collapses from side-by-side to stacked layout on mobile screens.
  - Table transforms into horizontally scrollable card stream on narrow viewports.

---

## 4. Logic, Architecture & Approach
- **Component & State Architecture:**
  - `StaffPortal.jsx`: Managed via state hooks for authentication session (`currentUser`, `userRole`, `userProfile`), directory cache, active tab, and form inputs.
  - `App.jsx`: State hook `isStaffView` synchronized with browser `window.location.search` (`?portal=staff`) and listening to `popstate` events for browser back/forward buttons.
- **Routing & Navigation:**
  - Query parameter-based portal routing (`?portal=staff`) chosen over complex router dependencies, enabling instant deployment without Cloudflare Pages rewrite conflicts.
  - `handleReturnToPublic` clears search params cleanly using HTML5 `window.history.pushState`.
- **Data Flow & Mock/Live API Handling:**
  - Real-time Firestore sync via `onSnapshot` with graceful fallback to Express REST APIs (`GET /api/admin/ward-execs`).
  - Sequential ID calculation: Evaluates existing executives for the target ward in Firestore (`existingExecs.length + 1`) to assign immutable sequential IDs (`WE-<ward>-<seq>`).
- **Security & Validation:**
  - Zero-Trust backend verification: `verifyToken` middleware decodes Firebase ID tokens; `requireSuperAdmin` enforces custom claims.
  - Strict input sanitization validating ward numbers (integers 1–19) and duplicate email prevention.
- **Approach & Rationale:**
  - Storing administrative roles in both Firebase Auth custom claims and Firestore profile documents guarantees millisecond-fast client-side route guarding while enabling queryable directory listing.

---

## 5. Files Changed & Key Code References
- `backend/firebaseAdmin.js` — Configured Admin SDK initialization with multi-path service account resolution and safe mock fallback.
- `backend/middleware/authMiddleware.js` — Token verification and role enforcement middleware (`verifyToken`, `requireSuperAdmin`, `requireWardExec`).
- `backend/routes/adminRoutes.js` — Ward executive provisioning endpoint with sequential ID generation and directory listing.
- `backend/services/emailService.js` — Nodemailer onboarding email dispatcher with Nepal civic template.
- `backend/scripts/bootstrapSuperAdmin.js` — Standalone CLI script to bootstrap Super Admin accounts.
- `backend/server.js` — Mounted administrative and project management routes (`/api/admin`, `/api/projects`).
- `firestore.rules` — Production-grade security rules with role-based access for projects, users, and grievances.
- `frontend/src/firebase.js` — Initialized Firebase client SDK with Vite environment variable fallbacks.
- `frontend/src/services/firestoreService.js` — Client Firestore utility for real-time `onSnapshot` data streaming.
- `frontend/src/components/Navbar.jsx` — Cleaned public header by removing the staff portal login button.
- `frontend/src/components/StaffPortal.jsx` — Comprehensive dedicated Staff & Super Admin portal with live directory, provisioning form, and ward workspace.
- `frontend/src/components/ProjectList.jsx` — Implemented advanced multi-column skeleton card shimmer.
- `frontend/src/index.css` — Defined `@keyframes shimmer` and animation utility classes.
- `.gitignore` — Hardened to protect all `.env` files and Firebase service account keys.

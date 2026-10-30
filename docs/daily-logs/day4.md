# Development Log — Day 4 (2026-10-18)

## 1. Commits Recorded
- `5e1ec69`: `feat: Apple design restyle, 3-attempt staff lockout with Super Admin unlock, and Devanagari fix`
- `f807579`: `feat: replace hardcoded translations.js with dynamic zero-storage in-browser translation`
- `9908639`: `feat: harden admin backend security and unify super admin dashboard tasks`
- `c7bda32`: `feat: enhance ward executive management, calendar tenure picker, and email provisioning resilience`
- `299a352`: `refactor(email): replace nodemailer with resend SDK and verified custom domain`
- `ad4f0d6`: `refactor(email): update template to approved UI design with personalized greeting and anti-spam subject`
- `071fe61`: `fix(portal): surface backend error details in provision executive alert`
- `4d3e57a`: `fix(admin): harden revoke executive deletion with auth, firestore batch cleanup and query email fallback`
- `697d308`: `feat(portal): configure dynamic API_BASE for production compatibility`
- `44c20d9`: `build: add Cloudflare Pages _redirects to proxy /api to Render backend`
- `80954bf`: `feat(api): target live Render backend directly in production and remove _redirects`
- `1c518af`: `docs: update production live website URL to https://nagaryojana.shrawankarki.com.np/`

---

## 2. Work Completed & Features Added
- **Apple Design Language Overhaul & Public Portal Restoration:**
  - Transitioned the municipal portal and admin workspaces from heavy dark slate/navy styling to an Apple-inspired design system: clean white (`#ffffff`) and parchment (`#f5f5f7`) canvases, ink (`#1d1d1f`) typography, hairline (`#e0e0e0`) borders, subtle shadows, rounded cards (`rounded-[18px]`), and pill-shaped Action Blue (`#0066cc`) buttons.
  - Restored the high-engagement public hero section and navigation bar while keeping the Apple refinement intact.
  - Corrected Devanagari UTF-8 string encoding across the codebase, permanently resolving mojibake in the municipal wordmark (`योजना`) and typography.
- **Zero-Storage Dynamic In-Browser Translation Engine:**
  - Replaced the static, hardcoded dictionary (`translations.js`) with an in-browser dynamic translation service (`translator.js`).
  - Decoupled application source code from stored static translation datasets; dynamically processes numbers, dates, statuses, and municipal civic content into authentic Nepali Devanagari script at runtime without reading or saving bulky dictionary files.
- **Security Lockouts & Brute-Force Defense Architecture:**
  - Implemented 3-attempt password failure tracking with automatic 24-hour lockout stored in Firestore `loginLockouts/{email}`.
  - Super Admin accounts and Ward Executives alike are protected against brute-force attacks.
  - Built an administrative **Locked Accounts** dashboard view with real-time lockout synchronization and 1-click secure unlocking (`POST /api/admin/lockouts/unlock`).
  - Added in-memory IP rate-limiting (`30 req/min`) on authentication and status validation routes.
- **Backend Security Hardening & RBAC Route Protection:**
  - Integrated `helmet` middleware into `backend/server.js` for strict HTTP security headers (cross-origin resource policy, XSS filtering, MIME-sniffing protection).
  - Protected critical administrative and staff endpoints (`PUT /api/projects/:id`, `GET /api/grievances`, `PATCH /api/grievances/:id/status`) behind `verifyToken` and `requireWardExec` middleware to prevent unauthenticated access to citizen contact details or municipal project statuses.
  - Hardened temporary password generation in `adminRoutes.js` from 8-character hex to 12-character high-entropy mixed-charset passwords (`[A-Za-z0-9!@#$%&*]`) with Fisher-Yates cryptographically secure shuffling.
  - Enforced CORS origin validation to replace unrestricted wildcard configurations.
  - Updated frontend dispatchers in `StaffPortal.jsx` to transmit Bearer ID tokens on all project and grievance mutations.
- **Super Admin Dashboard Unification & Workflow Optimization:**
  - Cleaned up top header: removed red "Super Admin" badge, removed "Return to Public Site" button, and concealed raw email address so only the administrator's name (`Pratyush Karki`) and `PK` avatar initials are rendered.
  - Consolidated redundant navigation options ("Executive Directory" and "Provision Account") into a single cohesive **Ward Executives** tab with live count badge.
  - Integrated the Provisioning Form and Executives Directory side-by-side (5/7 columns) with an instant view toggle button (`+ Provision Executive` / `Hide Form`) allowing full-width (12 columns) directory auditing when desired.
  - Completely removed the redundant `System Security Status` metric card, restructuring the overview into 3 balanced, equal-width cards.
- **Provisioning Form Polish & Interactive Apple-Style Calendar Popover:**
  - Completely sanitized the Provision Ward Executive form by eliminating all placeholder text (`placeholder="..."`) across all input fields (Full Name, Gmail, Mobile Number, Tenure).
  - Converted the static calendar icon into an interactive button that triggers an Apple-style Calendar Popover featuring month/year navigation (`<` / `>`), a clickable day grid (`YYYY-MM-DD` auto-formatting), quick 5-year municipal tenure presets (`2081–2086 B.S.`, `2082–2087 B.S.`, `5-Year A.D.`), and click-outside dismissal.
- **Executive Deletion & Full Access Revocation (`DELETE /api/admin/ward-exec/:uid`):**
  - Added dedicated administrative deletion route that permanently removes executive records from Firebase Auth and Firestore `users/{uid}`, while purging any lingering lockout documents.
  - Added `POST /api/admin/ward-exec/:uid/resend` to regenerate a fresh 12-character high-entropy temporary password and re-dispatch onboarding credentials via email.
- **Automated Email Dispatch Migration to Resend SDK:**
  - Fully replaced Nodemailer with the official `@resend/node` SDK (`re_YCdZdTwu_...`).
  - Configured verified municipal domain sender `Nagarयोजना Admin <admin@shrawankarki.com.np>`.
  - Added recipient `name` customization and anti-spam altered subject line (`Action Required: Official Credentials for Ward ${wardNumber} Executive`) to break duplicate Gmail spam content hashes.
  - Implemented automatic cleanup rollbacks if database or claims setting fails after user account creation.
- **Production Dual-Cloud Routing (Cloudflare Pages + Render):**
  - Resolved `HTTP 405 Method Not Allowed` by eliminating static Cloudflare `_redirects` proxying.
  - Built centralized `frontend/src/apiConfig.js` which automatically routes production API requests directly to `https://nagar-yojana.onrender.com` while maintaining localhost support for development.
- **Master Educational Blueprint & Architecture Runbook (`docs/overalldocx.docx`):**
  - Generated a comprehensive ~700 KB Microsoft Word document written in plain English.
  - Features end-to-end architecture diagrams, the 7-step automated email dispatch pipeline, 3-attempt brute-force defense model, Apple design specs, and an actionable 6-step replication guide for students and engineers.
- **Production URL & Attribution Updates:**
  - Updated live website link in `README.md` to `https://nagaryojana.shrawankarki.com.np/`.

---

## 3. UI/UX & Visual Design Specs
- **Layout & Structure:**
  - Sticky command header (`h-16`, `bg-white/80`, `backdrop-blur-md`, `border-b border-[#e0e0e0]`, `z-40`).
  - Sticky task navigation sub-bar (`top-16`, `bg-white/90`, `backdrop-blur-md`, `border-b border-[#e0e0e0]`, `z-30`).
  - Command dashboard container constrained to `max-w-[1440px] mx-auto px-4 sm:px-6 py-6 sm:py-8`.
  - Metrics grid: 3-column desktop layout (`grid-cols-1 sm:grid-cols-3 gap-4`).
  - Integrated Tasks Container: Dual-column grid (`lg:grid-cols-12 gap-6 items-start`) with Left Provision Form (`lg:col-span-5`) and Right Executives Directory (`lg:col-span-7`), dynamically expanding Directory to `w-full` when form is hidden.
  - Calendar Popover: `rounded-[16px] shadow-xl border border-[#e0e0e0] bg-white p-3.5 w-64 z-50` with smooth fade/zoom animations.
- **Color System:**
  - Primary Canvas: `#f5f5f7` (Apple Parchment Gray).
  - Surface Cards: `#ffffff` (Pure White) with `#e0e0e0` hairline borders.
  - Inputs: `#fafafc` neutral background, `#e0e0e0` border, active focus ring `#0071e3`.
  - Primary Action Blue: `#0066cc` (Hover `#0071e3`), text white.
  - Brand Wordmark: Crimson `#DC143C` ("Nagar") and Forest Green `#156947` ("योजना").
  - Security Alert Accents: Soft rose `#fff5f5`, crimson stroke `#c4232d`, hairline border `#ffd6d6`.
  - Success Indicators: Mint wash `#eefaf3`, emerald text `#156947`, border `#cfeedd`.
- **Typography:**
  - Headings: `font-semibold text-lg tracking-tight text-[#1d1d1f]`.
  - Body Text: `text-xs text-[#333333]` with muted labels in `text-[11px] text-[#7a7a7a]`.
  - Monospace Identifiers: `font-mono text-xs font-semibold` for emails, IDs (`WE-4-1`), and system badges.
- **Interactive Behaviors:**
  - Segmented Navigation Tabs: Active pill `bg-[#1d1d1f] text-white shadow-sm`; inactive `text-[#7a7a7a] hover:text-[#1d1d1f]`.
  - Live preview badge: Dynamically updates computed executive ID (`WE-{ward}-{seq}`) based on ward dropdown selection.
  - Calendar Day Hover: Neutral `#f5f5f7` tint on hover; active/today selected in solid Action Blue `#0066cc`.
  - Click-outside event listeners on window to automatically dismiss open calendar popovers.

---

## 4. Logic, Architecture & Approach
- **Component & State Architecture:**
  - `StaffPortal.jsx` manages `adminTaskTab` (`'all' | 'executives' | 'lockouts'`) for top-level workspace routing without URL reloads.
  - `showProvisionForm` boolean toggle enables seamless side-by-side or full-width directory viewports.
  - `calendarOpen` and `calendarMonth` state variables drive month navigation and date selection with standard JavaScript `Date` mathematics.
  - Ref-based DOM event listeners (`calendarRef`) ensure robust outside-click detection.
- **Security & Authorization Model:**
  - Decentralized verification: Firebase client SDK authenticates credentials → Firebase Admin SDK issues custom claims → Express backend verifies JWT tokens via `adminAuth.verifyIdToken(token)` → Firestore Rules validate document mutations via `request.auth.token.role == 'SUPER_ADMIN'`.
  - Rate-limited proxy routes (`/api/auth/*`) isolate brute-force login attempts from polluting user accounts.
  - Complete elimination of static secrets or credentials from source control (verified exclusion of `serviceAccountKey.json`, `.env`, and `DESIGN.md`).
- **Translation & Data Pipeline:**
  - Zero-storage translation pattern: Text is translated and transliterated purely on-the-fly, eliminating heavy static translation dictionaries and keeping client bundles lightweight (`index.html` 1.5 kB gzip).
- **Backend API Layer:**
  - Express middleware stack: `helmet` → `cors(allowedOrigins)` → `express.json()` → route handlers.
  - Sensitive operations (`PUT /api/projects/:id`, `GET /api/grievances`, `PATCH /api/grievances/:id/status`, `POST /api/admin/provision-ward-exec`, `POST /api/admin/lockouts/unlock`) enforce role-validated JWT token headers.

---

## 5. Files Changed & Key Code References
- `backend/server.js`: Mounted `helmet`, configured origin-restricted CORS, and protected project and grievance endpoints with `verifyToken` and `requireWardExec`.
- `backend/package.json` & `backend/package-lock.json`: Added `helmet` dependency.
- `backend/routes/adminRoutes.js`: Hardened `tempPassword` generator to 12-character mixed-charset cryptographic strings.
- `frontend/src/components/StaffPortal.jsx`:
  - Implemented Apple-style task navigation bar (`All Operations`, `Ward Executives`, `Locked Accounts`).
  - Removed red Super Admin pill, public site return button, and visible email address from header.
  - Removed "System Security Status" card and balanced metrics overview to 3 columns.
  - Unified Executive Directory and Provision Form into an integrated workspace with view toggling.
  - Removed all placeholders from the Provision Ward Executive form.
  - Built interactive Apple-style Calendar Popover with month navigation, day grid, and quick tenure presets.
  - Dispatched Bearer ID tokens on project and grievance mutations.
- `frontend/src/utils/translator.js`: Dynamic zero-storage client-side translation engine.
- `docs/daily-logs/day4.md`: Created Day 4 architectural and development log.

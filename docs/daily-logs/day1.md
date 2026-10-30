# Development Log — Day 1 (2026-10-11)

## 1. Commits Recorded
- `05b9711`: `build: setup initial project structure`
- `334aebb`: `docs: add live deployment url to README`
- `3c80af7`: `feat: redesign civic portal UI with Biratnagar panorama, live handwritten motto, and aligned layout`
- `3ee473f`: `build: track root dist directory and update build script for Cloudflare Pages`
- `0045bef`: `fix(footer): split copyright notice and developer attribution into two lines`
- `1308e29`: `fix(build): untrack committed node_modules and install frontend deps during Cloudflare build`
- `1ebbc60`: `build: untrack dist directories and add to .gitignore`

---

## 2. Work Completed & Features Added
- **Monorepo Architecture Foundation:** Scaffolded the initial full-stack monorepo containing a Vite + React 18 frontend and an Express.js Node backend orchestrated via `concurrently` (`npm run dev`, `npm run build`, `npm run start`).
- **Civic Portal UI Redesign:** Completely overhauled the landing experience for Biratnagar Metropolitan City (विराटनगर महानगरपालिका) by integrating an authentic panorama backdrop (`biratnagar_panorama.jpg`), handwritten civic motto typography, and structured layout alignments.
- **Dynamic Infrastructure Projects Explorer:** Implemented `ProjectList`, `ProjectCard`, and `WardFilters` allowing citizens to search and filter public infrastructure works by Ward (Wards 1–19), Status (Active, Completed, Delayed), and Sector (Roads & Drainage, Water & Sanitation, Public Facilities).
- **Citizen Grievance Redressal Modal:** Created `ReportIssueModal` enabling residents to file public works feedback, safety concerns, or construction discrepancies.
- **Bilingual Internationalization (i18n):** Implemented an in-memory dictionary-driven translation engine supporting instantaneous toggling between English (`en`) and authentic Nepali (`ne`) with Devanagari typography.
- **Cloudflare Pages Production CI/CD Pipeline:** Configured build scripts and resolved asset bundling, build path tracking, and dependency cleanup to automate zero-downtime deployment to `https://nagar-yojana.pages.dev`.

---

## 3. UI/UX & Visual Design Specs
- **Layout & Structure:**
  - Sticky top navigation bar (`h-14` / `h-16`, `bg-white/95`, `backdrop-blur-md`, `border-b border-slate-100`, `z-50`).
  - Hero container with max width `max-w-[1400px]`, multi-tier banner with full-bleed panoramic overlay (`bg-gradient-to-r from-slate-900/80 via-slate-900/60 to-transparent`).
  - Project Cards structured using a 3-column horizontal desktop flexbox (`flex flex-col lg:flex-row gap-5 lg:gap-6`): Thumbnail image on left (`w-full sm:w-64 lg:w-72 h-44`), Central metadata block (`flex-1`), and Right-hand status/action sidebar (`w-full sm:w-44 lg:w-48 sm:border-l sm:border-slate-100 sm:pl-5`).
- **Color System:**
  - Flag Blue / Royal Navy: `#003893` / `slate-900` (`#0F172A`).
  - Crimson / Simrik Red: `#DC143C` (Used in "Nagar" logo span, active indicators, urgent alerts, and decorative badges).
  - Forest Emerald: `#156947` (Used in "योजना" logo span, progress fill tracks, and completion accents).
  - Background Neutral: `#F8FAFC` (Slate-50 page background), `#FFFFFF` (Card surfaces).
  - Borders & Dividers: `#E2E8F0` (`border-slate-200`) and `#F1F5F9` (`border-slate-100`).
- **Typography:**
  - Font Families: `Inter, sans-serif` for primary UI and data tables; `Kalam, cursive` for handwritten Devanagari municipal slogans.
  - Heading Scale: Hero Title `text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight`; Card Title `text-base sm:text-lg font-bold text-slate-900`; Eyebrows `text-[11px] font-semibold uppercase tracking-wider text-slate-500`.
- **Interactive Behaviors:**
  - Card Hover: `hover:shadow-md hover:border-slate-300 transition-all duration-200`.
  - Filter Chips: Active state `bg-slate-900 text-white shadow-sm`; Inactive state `bg-white text-slate-600 border border-slate-200 hover:bg-slate-50`.
  - Focus States: Accessible keyboard rings (`focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400`).
- **Responsive Adaptations:**
  - Mobile (`<640px`): Single-column stacked cards, full-width search input, horizontal scrollable filter pill bar.
  - Tablet (`sm: 640px - 1024px`): 2-column image/content flow with stacked footer metrics.
  - Desktop (`lg: >=1024px`): 3-column project inspection layout, fixed width thumbnail container, side-by-side status rail.

---

## 4. Logic, Architecture & Approach
- **Component & State Architecture:**
  - Unidirectional state management in `App.jsx` managing `language`, `projects`, `activeWard`, `activeStatus`, `activeSector`, `searchQuery`, and modal visibility toggles.
  - LocalStorage synchronization (`nagar_lang`) persisting citizen language preferences across sessions.
- **Routing & Navigation:**
  - Single-page application (SPA) architecture with modal dialog overlays for lightweight civic inspection without breaking filter context.
- **Data Flow & Mock/Live API Handling:**
  - Dual-mode data fetching: Attempts `fetch('/api/projects?...')` to query the Express backend; falls back automatically to verified embedded default datasets (`DEFAULT_PROJECTS`) if the local backend is unreachable.
  - Search query executes multi-field case-insensitive sub-string filtering against title, contractor, location, description, ward, and sector.
- **Security & Validation:**
  - Express.js CORS origin controls restricting public endpoints.
  - Sanitization of query strings in `backend/server.js` preventing unexpected filter mutations.
- **Approach & Rationale:**
  - Monorepo with static bundling into root `dist/` was chosen to allow seamless single-command Cloudflare Pages deployment while maintaining an independent Express backend for municipal APIs.

---

## 5. Files Changed & Key Code References
- `backend/server.js` — Implemented Express application, verified civic project dataset (Ward 3, Ward 4 projects), CORS, and query-based filtering (`/api/projects`).
- `frontend/src/App.jsx` — Core container wiring navbar, hero, multi-filter criteria, project listing, and modal triggers.
- `frontend/src/components/Hero.jsx` — Banner component with municipal motto, Devanagari calligraphy, and responsive layout.
- `frontend/src/components/Navbar.jsx` — Header containing brand identity, Devanagari typography, and language switcher.
- `frontend/src/components/ProjectCard.jsx` — Granular project inspection card with budget metrics, contractor attribution, and progress bars.
- `frontend/src/components/ProjectList.jsx` — Grid list renderer with loading skeletons and empty result fallbacks.
- `frontend/src/components/WardFilters.jsx` — Multi-tier filtering bar for ward, project status, and infrastructure sector.
- `frontend/src/components/ReportIssueModal.jsx` — Citizen feedback and grievance reporting modal.
- `frontend/src/components/StaffLoginModal.jsx` — Initial dialog modal scaffold for municipal staff entry.
- `frontend/src/translations.js` — Comprehensive English and Nepali dictionary for bilingual UI strings.
- `package.json` — Root orchestration scripts (`dev`, `build`, `install:all`) for monorepo management.

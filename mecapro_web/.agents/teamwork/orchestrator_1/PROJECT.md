# Project: MecaPro Web Application Audit and Fix

## Architecture
- **Application**: MecaPro (`mecapro_web`), an automotive workshop management system created as a university course project.
- **Frontend Stack**: Vanilla HTML5, CSS3, JavaScript (ES6+), FontAwesome / SVG icons.
- **Backend / Server**: Lightweight Python HTTP server (`server.py`) serving static files and API routes, plus Firebase configuration (`firebase.json`).
- **File Structure**:
  - `public/`: Primary web root (`index.html`, `css/styles.css`, `js/app.js`, `js/data.js`, `assets/`, `favicon.ico`).
  - Root copies: `index.html`, `css/styles.css`, `js/app.js`, `js/data.js`, `favicon.ico` which MUST be maintained byte-identical to `public/`.
  - `server.py`: Local testing and hosting script.
  - `firebase.json`: Hosting configuration.

## Feature Inventory
| # | Feature | Description | Milestone | Source | Status |
|---|---------|-------------|-----------|--------|--------|
| 1 | Syntax & Compilation | 0 syntax errors in JS and Python | M1 (R1) | ORIGINAL_REQUEST §R1 | VERIFIED |
| 2 | DOM Selector Reliability | Null guards & matching DOM elements in app.js | M1 (R1) | ORIGINAL_REQUEST §R1 | VERIFIED |
| 3 | Core Business Logic & CRUD | Work orders, inventory, clients, mechanics flows | M1 (R1) | ORIGINAL_REQUEST §R1 | VERIFIED |
| 4 | SEO & Meta Tags | Valid title, meta description, viewport, lang="es" | M2 (R2) | ORIGINAL_REQUEST §R2 | VERIFIED |
| 5 | Asset & Link Integrity | Zero 404s, all href/src attributes resolve cleanly | M2 (R2) | ORIGINAL_REQUEST §R2 | VERIFIED |
| 6 | Security & Sanitization | No private keys, local paths (C:\Users), or debug leaks | M2 (R2) | ORIGINAL_REQUEST §R2 | VERIFIED |
| 7 | Anti-Vibecoding Cleanup | 0 matches for forbidden AI/vibecoding terms | M3 (R3) | ORIGINAL_REQUEST §R3 | PENDING |
| 8 | Emoji Removal | 0 emojis in code or comments | M3 (R3) | ORIGINAL_REQUEST §R3 | PENDING |
| 9 | Student Code Style | Simple natural Spanish comments, university student tone | M3 (R3) | ORIGINAL_REQUEST §R3 | PENDING |
| 10 | Byte Synchronization | public/ files byte-identical to root files | M3 (R3) | ORIGINAL_REQUEST §R1/R3 | IN_PROGRESS |
| 11 | Independent Forensic Audit | Full verification against all acceptance criteria | M4 (Audit) | ORIGINAL_REQUEST §AC | PENDING |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Syntax, Logic, and Runtime Reliability (R1) | `public/js/app.js`, `public/js/data.js`, `server.py` | None | DONE |
| M2 | Launch Readiness Audit (R2) | `public/index.html`, `public/css/styles.css`, `firebase.json`, `server.py` | M1 | DONE |
| M3 | Student Style & Anti-Vibecoding (R3) | All source files, comments, and byte-sync | M2 | IN_PROGRESS |
| M4 | Forensic Audit Verification | Acceptance criteria validation | M3 | PLANNED |

## Code Layout
- `public/js/app.js` & `js/app.js`: Application logic, UI controllers, events.
- `public/js/data.js` & `js/data.js`: Mock data, state storage, initial records.
- `public/index.html` & `index.html`: Main HTML interface, templates, modals.
- `public/css/styles.css` & `css/styles.css`: Stylesheet, responsive layout, modal CSS.
- `server.py`: Python development server.
- `firebase.json`: Hosting configuration.

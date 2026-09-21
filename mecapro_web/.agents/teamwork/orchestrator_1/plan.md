# Plan: MecaPro Web Application Audit and Fix

## Objective
Audit and fix the MecaPro web application (`mecapro_web`), an automotive workshop management university project, ensuring zero syntax/runtime errors, full launch readiness (SEO, links, assets, security), natural Spanish university-student style without AI/vibecoding traces, and 100% byte synchronization between `public/` and root copies.

## Phases

### Phase 1: Subagent 1 (Worker R1) — Syntax, Logic, and Runtime Reliability
- **Targets**: `public/js/app.js`, `public/js/data.js`, `server.py`
- **Scope**:
  1. Fix syntax errors (`node -c public/js/app.js`, `node -c public/js/data.js`, `python -m py_compile server.py`).
  2. Audit DOM selectors in `public/js/app.js` against `public/index.html`; null-guard all querySelector/getElementById calls.
  3. Ensure all CRUD flows, modal openings, filtering, sorting, and reporting operate with 0 console errors.
  4. Ensure server endpoints in `server.py` respond correctly without 500 errors.
  5. Sync updated files to root equivalents (`js/app.js`, `js/data.js`).
- **Pass Criteria**: `node -c` passes, `python -m py_compile` passes, all DOM queries resolved/guarded.

### Phase 2: Subagent 2 (Worker R2) — Launch Readiness Audit
- **Targets**: `public/index.html`, `public/css/styles.css`, `firebase.json`, `server.py`
- **Scope**:
  1. SEO & Meta: Verify `<title>`, `<meta name="description">`, `<meta name="viewport">`, `<html lang="es">`.
  2. Asset & Link Integrity: Ensure zero broken links or 404 assets (all local `href` and `src` resolve, fonts/scripts load cleanly).
  3. Accessibility: Verify form labels, button types, aria attributes where appropriate.
  4. Security & Sanitization: Ensure zero exposed private keys, local filesystem paths (`C:\Users\...`), or dangerous debug endpoints in `public/` or `server.py`.
  5. Sync updated files to root equivalents (`index.html`, `css/styles.css`).
- **Pass Criteria**: SEO elements valid, 0 404s/broken links, 0 local paths/private keys.

### Phase 3: Subagent 3 (Worker R3) — University-Student Code Style & Natural Spanish Comments
- **Targets**: `index.html`, `css/styles.css`, `js/app.js`, `js/data.js`, `server.py` (both root and `public/`)
- **Scope**:
  1. Remove all AI/vibecoding terms: `vibecoding`, `taste-skill`, `ui-ux-pro-max`, `emil-design`, `21st.dev`, `omnibox`, `haptic`, `scandinavian`, `netbeans`, `jdialog`, `jtabbedpane`, `frmprincipal`, `panelinicio`, `====`.
  2. Remove all emoji characters in comments and UI strings.
  3. Reformat comments into natural, simple Spanish written like a university computer science/systems engineering student.
  4. Ensure `public/index.html`, `public/css/styles.css`, `public/js/app.js`, `public/js/data.js` are byte-identical to `index.html`, `css/styles.css`, `js/app.js`, `js/data.js`.
- **Pass Criteria**: 0 matches for forbidden terms, 0 emojis, natural Spanish comments, 100% byte identical root/public copies.

### Phase 4: Verification Audit (Forensic Auditor)
- **Role**: `teamwork_preview_auditor`
- **Scope**: Run comprehensive verification suite across R1, R2, and R3 acceptance criteria.
- **Pass Criteria**: CLEAN audit verdict.

### Phase 5: Synthesis & Reporting
- Synthesize all findings and verified metrics.
- Report back to parent Sentinel with comprehensive completion summary.

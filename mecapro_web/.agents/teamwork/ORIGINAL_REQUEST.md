# Original User Request

## Initial Request — 2026-09-28T14:05:59Z

Divide the work across 3 subagents to audit and fix the MecaPro web application (`mecapro_web`), a university course project for automotive workshop management. Ensure zero syntax or runtime errors, full launch readiness (SEO, links, assets, security), and natural Spanish code/comments written in a clean university-student style without AI/"vibecoding" traces.

Working directory: c:\Users\Loa\Documents\Integrador\mecapro_web
Integrity mode: development

## Requirements

### R1. Syntax, Logic, and Runtime Reliability (`app.js`, `data.js`, `server.py`)
Audit and fix `public/js/app.js`, `public/js/data.js`, and `server.py` (keeping root copies in `js/app.js`, `js/data.js`, `css/styles.css`, and `index.html` synchronized with `public/`). Ensure there are zero syntax errors, zero undefined references or broken DOM selectors, and that all interactive views, filters, modals, sorting, reports, and CRUD flows execute without console errors.

### R2. Launch Readiness Audit (SEO, Links, Assets, and Security)
Audit and fix `public/index.html`, `public/css/styles.css`, and server/hosting configurations (`firebase.json`, `server.py`) for production readiness. Verify meta tags and basic SEO structure, ensure zero broken links or missing image/font/script references, check accessibility attributes on interactive elements, and verify that no sensitive private credentials or unsafe debug endpoints are exposed.

### R3. University-Student Code Style & Natural Spanish Comments
Inspect all source files (`index.html`, `css/styles.css`, `js/app.js`, `js/data.js`, `server.py`) to ensure code structure and comments read 100% like a university student's project in simple, natural Spanish. Remove any remaining traces of "vibecoding", robotic banner dividers (`====`), English jargon in comments, AI prompt/skill references, or emojis inside comments and UI strings.

## Acceptance Criteria

### R1 Verification — Syntax & Logic
- [ ] `node -c public/js/app.js` and `node -c public/js/data.js` exit with code 0.
- [ ] `python -m py_compile server.py` exits with code 0.
- [ ] Automated check confirms every `getElementById` / `querySelector` target used in `public/js/app.js` corresponds to an existing element in `public/index.html` or dynamically rendered template, or is safely guarded against `null`.
- [ ] `public/index.html`, `public/css/styles.css`, `public/js/app.js`, and `public/js/data.js` are byte-identical to their root counterparts (`index.html`, `css/styles.css`, `js/app.js`, `js/data.js`).

### R2 Verification — Launch Readiness (SEO, Assets, Links, Security)
- [ ] `public/index.html` includes valid `<title>`, `<meta name="description">`, `<meta name="viewport">`, and `<html lang="es">`.
- [ ] Every local `href` and `src` attribute in `public/index.html` resolves to an existing file in `public/` or a valid external HTTPS resource (zero 404s or broken asset references).
- [ ] Security check confirms no private server keys, local filesystem paths (`C:\Users\...`), or debug artifacts exist in `public/`.

### R3 Verification — Anti-Vibecoding & Natural Spanish Comments
- [ ] Case-insensitive regex scan across all `.html`, `.css`, `.js`, and `.py` files returns 0 matches for AI/vibecoding terms (`vibecoding`, `taste-skill`, `ui-ux-pro-max`, `emil-design`, `21st.dev`, `omnibox`, `haptic`, `scandinavian`, `netbeans`, `jdialog`, `jtabbedpane`, `frmprincipal`, `panelinicio`, `====`).
- [ ] Unicode scan across all `.html`, `.css`, `.js`, and `.py` files confirms 0 emoji characters in comments or UI code.
- [ ] All comments are concise, written in natural Spanish, and free of robotic numbering or all-caps section banners.

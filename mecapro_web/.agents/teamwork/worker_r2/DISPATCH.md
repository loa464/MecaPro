## 2026-09-28T14:33:46Z

You are Subagent 2 (Worker R2) for the MecaPro web application audit and fix project.

Your working directory is:
c:\Users\Loa\Documents\Integrador\mecapro_web\.agents\teamwork\worker_r2

Project workspace:
c:\Users\Loa\Documents\Integrador\mecapro_web

Authoritative requirements files:
- ORIGINAL_REQUEST.md: c:\Users\Loa\Documents\Integrador\mecapro_web\.agents\teamwork\ORIGINAL_REQUEST.md
- PROJECT.md: c:\Users\Loa\Documents\Integrador\mecapro_web\.agents\teamwork\orchestrator_1\PROJECT.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Your Tasks (R2: Launch Readiness Audit - SEO, Links, Assets, and Security):
1. Read ORIGINAL_REQUEST.md and PROJECT.md carefully.
2. Audit and fix `public/index.html`, `public/css/styles.css`, `firebase.json`, and verify `server.py` for launch readiness:
   - Verify `<html lang="es">`.
   - Verify `<title>` is descriptive and valid (e.g. "MecaPro - Sistema de Gestión de Taller Automotriz").
   - Verify `<meta name="description" content="...">` exists and has meaningful description.
   - Verify `<meta name="viewport" content="width=device-width, initial-scale=1.0">` is present.
3. Assets and Links Integrity:
   - Check every local `href` and `src` attribute in `public/index.html`.
   - Confirm every referenced file exists in `public/` (or relative path) or is a valid external HTTPS resource.
   - If any image, stylesheet, script, or favicon is missing or points to a non-existent file, fix the reference or provide the required asset. Ensure ZERO 404s or broken asset references.
4. Accessibility Attributes:
   - Check interactive elements (buttons, inputs, selects, modals) for proper accessibility: aria-label on icon-only buttons, labels for inputs, appropriate button types (`type="button"`).
5. Security and Sanitization:
   - Scan `public/` and `server.py` for any private server keys, secrets, local filesystem paths (`C:\Users\...`), or unsafe debug artifacts/endpoints.
   - Remove or sanitize any local paths or debug artifacts found.
   - Ensure `firebase.json` has clean, valid hosting configuration.
6. Synchronize root copies:
   - Copy `public/index.html` to `index.html`.
   - Copy `public/css/styles.css` to `css/styles.css`.
   - Verify `public/index.html` is byte-identical to `index.html`.
   - Verify `public/css/styles.css` is byte-identical to `css/styles.css`.
7. Verification:
   - Write and run verification scripts to confirm:
     a) SEO elements (title, description, viewport, lang="es") in `public/index.html`.
     b) All local href and src resolve to existing files (0 broken links / 404 assets).
     c) 0 occurrences of `C:\Users\` or local paths or private keys in `public/`.
     d) Byte-identical hashes between `public/index.html` <-> `index.html` and `public/css/styles.css` <-> `css/styles.css`.
8. Document all findings, modifications, and command outputs in your handoff report at:
   `c:\Users\Loa\Documents\Integrador\mecapro_web\.agents\teamwork\worker_r2\handoff.md`
   Maintain `progress.md` in your directory.
9. When finished, send a message to orchestrator parent with a summary of what you did and confirming your handoff report is ready.

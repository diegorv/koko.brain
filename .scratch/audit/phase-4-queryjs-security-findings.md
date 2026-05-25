# Phase 4: QueryJS Security Audit

2 real vulnerabilities, rest by-design for local desktop app.

## Real Vulnerabilities

### Finding 4.1: No execution timeout - persistent DoS via shared vault
- **File:** src/lib/core/markdown-editor/extensions/live-preview/widgets/queryjs-block-widget.ts:158-203
- **Severity:** security-medium
- **Category:** security
- **Description:** User scripts run on main thread with no timeout. `while(true){}` freezes app permanently. With 'always' or 'first-open' policy, malicious block re-executes on reopen -> persistent DoS requiring manual file edit outside app.
- **Fix:** Promise.race with configurable timeout (30s). Track timed-out scripts to prevent re-execution on reopen.

### Finding 4.2: Chart.js CDN load without SRI hash
- **File:** src/lib/plugins/queryjs/kb-ui.ts:948-974
- **Severity:** security-medium
- **Category:** security
- **Description:** `loadChartJS()` injects `<script src="https://cdn.jsdelivr.net/npm/chart.js/...">` with no integrity attribute. CDN/npm compromise -> code runs with full app privileges.
- **Fix:** Add `integrity` attribute with SRI hash, or bundle Chart.js locally.

## By-Design (needs documentation)

### Finding 4.3: Full JS context access
- User scripts via `new Function` share global scope. Access to window, document, Tauri IPC, import().
- Inherent to design (user runs own scripts in own vault).
- Risk: malicious shared vault can access $DOCUMENT scope via Tauri FS.
- Recommendation: document threat model, consider defaulting to 'manual' for new vaults.

### Finding 4.4: Cache key lacks file path - cross-file stale data
- `resultCache` keys on script content only. Two files with identical queryjs but different `kb.current()` -> cached DOM from file A shown in file B.
- Correctness issue, not security.
- Fix: include filePath in cache key.

## Acceptable Risks
- resolveScriptPath blocks `..` but not symlinks (Tauri FS scope limits blast radius)
- kb.view() recursion caught by try/catch (stack overflow -> error display, no crash)
- kb.el() attribute injection blocked by CSP (no 'unsafe-inline')

# 01: The privacy scanner stops skipping every line that contains a URL, and PRIVACY.md matches the code

**What to build:** The Privacy Check gate (`.github/workflows/privacy.yml`, logic in `.github/actions/scan-external-calls/action.yml`) skips any match that also matches a `skip` regex. The skip `:\s*//` (`privacy.yml` about line 69), meant for `// comment` lines, is matched against the whole `file:line:content` string (`action.yml` about lines 84-95), so it matches the `://` of every URL. Today `await fetch('https://evil.org/c')` passes the gate, and the `https?://` patterns are inert. `PRIVACY.md` (about line 20) claims "Any new external call that is not explicitly approved will fail the build", which is false.

1. Anchor the comment skips to the content part of a grep line, e.g. `^[^:]+:[0-9]+:\s*//`, and the same for `:\s*\*` and `:\s*/\*`.
2. Fixing the regex alone turns the gate red. Add `known` entries in the same change for the real, approved calls it then reports: at least `src/lib/core/settings/theme-catalog.service.ts` (about line 9, raw.githubusercontent.com) and `src/lib/core/settings/sections/UpdateSection.svelte` (about lines 24, 27, github.com/diegorv/koko.brain) if `.svelte` is scanned, plus anything else the fixed gate reports (canvas link builders such as `CanvasLinkInput.svelte:21`, `LinkNode.svelte:55` build user links, not app calls: skip or mark `privacy-ok` with a reason).
3. Remove the stale `cdn\.jsdelivr\.net/npm/chart\.js` known entry (Chart.js is bundled: `src/lib/plugins/queryjs/kb-ui.ts` about line 67) and fix the "from CDN" JSDoc at `kb-ui.ts` about line 558.
4. Scan the files that really control network access: add `src-tauri/tauri.conf.json` (CSP `connect-src`) and `src-tauri/capabilities/**` (`http:allow-fetch` scopes) as inputs, failing on any host not in an approved list. Add `src-tauri/capabilities/**` and `PRIVACY.md` to the path filters in `privacy.yml` (about lines 6-14) and `.github/workflows/pr.yml` (about lines 58-65).
5. Correct `PRIVACY.md`: the Chart.js row (it names a missing `dv-ui.ts`; Chart.js is bundled, no network), add Todoist (`api.todoist.com`, opt-in), the updater GET (`tauri.conf.json` about lines 54-56), remote images in notes (`img-src https:`, `widgets.ts` about lines 163-164: opening a note with a remote image contacts that host), the Rust Sentry event contents (hostname as `server_name`, OS and device context). Fix the "every push and pull request" claim to match the real triggers.

**Blocked by:** none

**Status:** ready-for-agent

**Gate:** CI config and docs. Run the scanner locally the way the action does (`bash` over the same `grep -rnE` loop, or `act` if available) and show: before the fix, a planted `fetch('https://example.invalid/x')` line in a scratch `.ts` file is skipped; after the fix it is reported as unknown; the real tree passes with the new `known` entries. Remove the planted file before committing.

- [ ] A planted URL call in `src/` is reported as unknown by the fixed gate (shown in the commit message with the command output)
- [ ] The real tree passes with the added `known` entries, each with a one-line reason comment
- [ ] A host added to CSP `connect-src` or to a capability `http:allow-fetch` scope that is not approved fails the gate
- [ ] `pr.yml` and `privacy.yml` path filters include `src-tauri/capabilities/**` and `PRIVACY.md`
- [ ] `PRIVACY.md` table matches the code (Chart.js, Todoist, updater, remote images, Rust Sentry context)

## Notes

- Source: `.scratch/usage-telemetry/findings-2026-11-05.md` section "privacy CI gate is broken"; validator reports `raw/j22.md` (s8-F1, N3, N4) and `raw/j25.md` (M2).
- Network calls made inside dependencies (the `sentry` crate, any plugin) stay invisible to a source scanner. Say so in `PRIVACY.md` instead of claiming full coverage.
- Size: M.

## Comments

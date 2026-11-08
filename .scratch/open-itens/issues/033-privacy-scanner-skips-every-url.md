# 033: The privacy scanner stops skipping every line that contains a URL, and PRIVACY.md matches the code

**Origin:** `usage-telemetry` Issue 01, moved here on 2026-11-08. Its PRD, raw evidence and closed siblings stay in `.scratch/usage-telemetry/`. Bare Issue numbers in the text below use that feature's numbering; `priority-2026-11-08.md` in this folder maps them to the numbers here.

**What to build:** The Privacy Check gate (`.github/workflows/privacy.yml`, logic in `.github/actions/scan-external-calls/action.yml`) skips any match that also matches a `skip` regex.

The bug is in the TypeScript/Svelte scan only. The Rust scan uses `:\s*///` and works; anchoring it the same way is optional.

In the TS/Svelte inputs, the skip `:\s*//` (`privacy.yml` about line 69), meant for `// comment` lines, is matched against the whole `file:line:content` string (`action.yml` about lines 84-95). It therefore matches the `://` of every URL. Today `fetch('https://evil.org/c')` passes the gate, and the `https?://` patterns are inert. `PRIVACY.md` (about line 20) claims "Any new external call that is not explicitly approved will fail the build", which is false.

Reproduced on 2026-11-06 with GNU grep 3.8 over the real tree, with two planted lines. Before the fix, both planted lines were skipped and the scan exited 0. After anchoring, it exits 1 and reports exactly the planted lines plus:
- `src/lib/core/settings/sections/UpdateSection.svelte:24`
- `src/lib/core/settings/sections/UpdateSection.svelte:27`
- `src/lib/core/settings/theme-catalog.service.ts:9`

1. Anchor the comment skips in the TS/Svelte inputs to the content part of a grep line: `^[^:]+:[0-9]+:\s*//`, and the same for `\*` and `/\*`.
2. Fix two dead patterns. GNU grep rejects them, and `2>/dev/null` hides the warning:
   - `privacy.yml` about line 43 starts a group with `(?:`, which is not ERE. Use `(GET|POST|...)`.
   - About line 53 uses `\x27` as a quote, which ERE does not support. Use `["']`.
3. In the same change, add `known` entries for the real, approved calls listed above (`.svelte` files are scanned, per `privacy.yml` about line 36). Give each entry a one-line reason. The canvas link builders already carry `// privacy-ok` and need nothing.
4. Remove the stale `cdn\.jsdelivr\.net/npm/chart\.js` known entry. Chart.js is bundled (`src/lib/plugins/queryjs/kb-ui.ts` about line 67). Fix the "from CDN" JSDoc at `kb-ui.ts` about line 558 in a separate `docs:` commit, because the `commit-msg` hook rejects a `fix:` commit that touches `src/lib` without a test.
5. **The CSP and the capabilities need their own check.** The line-based scanner cannot do it: the whole CSP is one line (`tauri.conf.json` line 29), and a line counts as known if any known regex matches anywhere in it. Add a separate step or script that:
   - extracts the `connect-src` tokens (e.g. `jq -r .app.security.csp`, split on `;` and spaces) and fails on any token not in an allowlist;
   - checks every `allow[].url` under all `http:*` permissions in `src-tauri/capabilities/*.json` (`default.json` about lines 224-263: allow-fetch, allow-send, allow-read-body, allow-cancel-body) against the same kind of allowlist.
   Add `src-tauri/capabilities/**` and the new script's path to the path filters of both `privacy.yml` (about lines 6-14) and `.github/workflows/pr.yml` (about lines 58-65). Add `PRIVACY.md` to `pr.yml` only; `privacy.yml` already has it.
6. Correct `PRIVACY.md`:
   - The Chart.js row names a missing `dv-ui.ts`. Chart.js is bundled and makes no network call.
   - Add Todoist (`api.todoist.com`, opt-in).
   - Add the updater: the stable endpoint (`tauri.conf.json` about lines 54-56), the nightly endpoint (`src-tauri/src/commands/update_channel.rs` about line 32), and the download host `objects.githubusercontent.com`.
   - Add remote images in notes. With `img-src https:` (`widgets.ts` about lines 163-164), opening a note that embeds a remote image contacts that host.
   - Add what Rust Sentry events contain: the hostname as `server_name`, plus the OS and device context.
   - Fix the "every push and pull request" claim to match the real triggers.
   - Say that calls made inside dependencies (the `sentry` crate, any plugin) are invisible to a source scanner.
   - Say that the remaining substring skips (`localhost`, `example\.com`, `privacy-ok`, `e2e/`) match anywhere in a line. This is a known gap.

**Blocked by:** none

**Status:** ready-for-agent

**Gate:** CI config and docs.
- Run the action's loop with **GNU grep from Homebrew**, not Docker (owner decision 2026-11-06). macOS `/usr/bin/grep` is BSD, and `grep` in agent shells is a ugrep wrapper function, which overrides `PATH`. Run it in a clean shell with GNU grep first on `PATH`: `env -i PATH="$(brew --prefix grep)/libexec/gnubin:/usr/bin:/bin" HOME="$HOME" bash --noprofile --norc <script>`. Confirm with `grep --version` that it reports GNU grep. If `brew --prefix grep` fails, GNU grep is not installed (`brew install grep`): stop and ask the owner. Do not install it unattended.
- Show that a planted `fetch('https://example.invalid/x')` line in a scratch `.ts` file is skipped before the fix and reported after it.
- Show that the real tree passes with the new `known` entries.
- Run the new CSP/capabilities check against the real files, and against a copy with an extra `connect-src` host.
- Remove the planted file before committing. Paste the command output into the commit message.

**Scanner**
- [ ] A planted URL call in `src/` is reported as unknown by the fixed gate (GNU grep output in the commit message).
- [ ] The two ERE patterns (about lines 43 and 53) match test lines. Show the matches.
- [ ] The real tree passes with the added `known` entries, each with a one-line reason comment.

**CSP and capabilities check**
- [ ] A host added to CSP `connect-src`, or to any `http:*` capability scope, that is not in the allowlist fails the new check.
- [ ] Both path filters include `src-tauri/capabilities/**` and the check script, and `pr.yml` includes `PRIVACY.md`.

**PRIVACY.md**
- [ ] The table matches the code: Chart.js, Todoist, updater (stable, nightly, download host), remote images, Rust Sentry context. The known gaps are stated.

## Notes

- Source: `.scratch/usage-telemetry/findings-2026-11-05.md` section "privacy CI gate is broken"; `raw/j22.md` (s8-F1, N3, N4), `raw/j25.md` (M2); review 2026-11-06 (reproduction, CSP single-line problem, dead ERE patterns).
- Size: M.

## Comments

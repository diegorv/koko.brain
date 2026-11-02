# Review of the phase-1 tickets (2026-11-02)

Two independent opus reviewers were asked to refute the first draft of the phase-1 tickets (seven Issues, before containment was split out) and the relay-lite setup on `feature/ios-poc`. Both were read-only and ran no builds or tests. Raw transcripts: `raw/ticket-review/reviewer-1-a10064256.jsonl`, `raw/ticket-review/reviewer-2-abf25cde.jsonl` (git-ignored).

Their findings overlap almost entirely; they are merged below. "R1"/"R2" marks which reviewer raised each one. Numbers in the Location column refer to the draft numbering (01-07); the Disposition column uses the final numbering (01-08), applied in commit 0ba80e6a.

## Blockers

| # | Finding | By | Evidence | Disposition |
|---|---|---|---|---|
| B1 | `**Blocked by:** None (can start immediately)` on 01 breaks the ledger for the whole feature: only the exact word `none` means no blockers, anything else is read as Issue numbers and fails the dangling check | R1, R2 | relay-lite `src/ledger.ts:172,186-187` | Accepted. 01 says `none`; relay-lite's `readIssues` parses all eight tickets with the expected blockers |
| B2 | relay-lite cannot start on `feature/ios-poc` yet: the branch is not on origin (`check run` fetches it), the worktree was dirty, there is no `ios-app` ledger, and the branch lacked the ticket commits | R1, R2 | `src/check.ts:87-89,113-114`, `build.md:2` | Accepted. Branch fast-forwarded to main, only the config change committed on it; the plan's Branch paragraph lists the first-run steps (push, clean worktree, `/relay-lite:ledger ios-app`). Push pending the owner's go |
| B3 | Safari and device checks were acceptance criteria; AFK agents cannot meet them and the reviewer role approves only when every criterion is met, so every Issue would end blocked | R1, R2 | `templates/roles/review.md:7` | Accepted. Each ticket has an "Owner check" section outside the checklist |

## Majors

| # | Finding | By | Evidence | Disposition |
|---|---|---|---|---|
| M1 | Missing blocker edges: 03 (tailnet) gates WebSocket requests and adds a WS-close banner but the WS comes from 02; 02's exact Origin check must learn the tailnet name; 05 (images) and 06 (live updates) need an open note (04); iPad checks need the tailnet ticket | R1, R2 | ticket texts | Accepted. Containment is its own ticket 03; tailnet 04 blocked by 03; images 06 by 03, 05; live updates 07 by 05; edit 08 by 03, 07. Tailnet ticket extends the Origin allowlist. iPad checks are owner checks |
| M2 | Settings and other boot code read and write `.kokobrain/*.json` through plugin-fs, not commands: 02 needs the fs read side (placed in 04), "settings writes are Virtual" needs a path rule, and a denied write makes `loadSettings` fall back to defaults or write a redacted settings file back | R1, R2 | `settings.service.ts:34,44,161-172,189-195` | Accepted. 02 forwards the fs read side, `.kokobrain/*.json` writes are acknowledged and dropped, other `.kokobrain` access denied; the command table covers `plugin:*` commands with its own parity test |
| M3 | The Virtual list missed boot calls that change desktop state: `configure_sentry`, `set_tauri_debug_mode`, `init_semantic_search`, model downloads, `check_for_update_on_channel`; and boot writers: bookmark migration removal, templates folder mkdir, daily-note auto-open (`create_folder`, `create_note`), the log session in the Mac's log folder; `teardownVault` runs at mount before the welcome | R1, R2 | `app-lifecycle.service.ts:202`, `sentry.service.ts:50`, `debug.ts:107`, `commands/semantic.rs:356-376`, `(app)/+layout.svelte` | Accepted. All listed in 02; boot writers skipped through a browser capability port and denied at the host; the cold-start test includes the mount-time teardown and checks flags and files |
| M4 | The bridge stand-in needs more than `invoke`: `metadata.currentWindow`/`currentWebview` labels read synchronously in layout effects, `transformCallback`/`unregisterCallback`, `plugins.path`, and `__TAURI_EVENT_PLUGIN_INTERNALS__.unregisterListener`; otherwise 01's "not connected" stand-in throws at mount | R1, R2 | `@tauri-apps/api/event.js:100`, `window.js:110`, `webview.js:53`, `tauri-listeners.service.ts:53,309` | Accepted in 01, with the install point (SvelteKit client hook) |
| M5 | The stale-write guard took its base from any host-side read, but the browser re-reads files outside the editor (index refresh after a forwarded `vault-files-changed`, embeds, previews), which would let a stale tab overwrite a Mac edit | R2 | `watcher-handler.service.ts:90` | Accepted. 08 takes the base from the editor tab's saved content through a `core/editor` port; host compares against the lossy-decoded disk text; a frontend test covers the 07+08 interaction |
| M6 | 07's error message and retry assumptions clash with the editor: a failed save shows a generic toast and retries every 5 s forever; a reconnect would also reset a per-connection read set; core cannot import `app/remote` | R1, R2 | `editor.service.ts:166-192`, `scripts/import-graph.mjs:160` | Accepted. Conflict is its own error type in `contracts/` or `utils/`; the editor stops retrying for that tab; the read set is gone (M5) |
| M7 | 01's CSP would block SvelteKit's inline bootstrap script (blank page), which only the owner's Safari check would catch | R1, R2 | `build/index.html`, `tauri.conf.json:29` | Accepted. 01 hashes the served inline script and tests it; 06 allows what PDF embeds need |
| M8 | The stand-in would install under Playwright E2E (Tauri modules aliased, no runtime), and E2E is not in the relay gate | R1, R2 | `vite.config.js:48-58` | Accepted. Never installed in `PLAYWRIGHT` mode; `bash scripts/e2e.sh` in the gate of 01, 02 and 08 |
| M9 | The tickets sit on main as `ready-for-agent` and main's config says `base: main`; with the auto-launch memory a session in the main checkout could deliver the proof of concept onto main | R1, R2 | commit 97a53fe7, owner memory | Accepted without changing the Status (tickets stay on main by owner decision): every ticket has a Branch line, the plan says never to run relay for ios-app from main, and a project memory overrides auto-launch for ios-app |
| M10 | 02 is too big for one fresh context | R1, R2 | ticket scope | Partly accepted. Containment split out as 03; 02 tells the build agent to split transport + table from the Virtual list + cold start if it does not fit |

## Minors

| # | Finding | By | Disposition |
|---|---|---|---|
| m1 | "The cached scan returns the existing result" is wrong: `scan_vault_v2_cached` always rebuilds and emits (`commands/vault.rs:1186-1248`) | R1, R2 | Accepted. 02's Virtual version synthesizes the result from the current index |
| m2 | No stated source for the open vault root on the Rust side; nothing says what happens when the desktop switches vaults mid-session | R2 | Accepted in 02 |
| m3 | `save_snapshot` had no class; the browser's daily-note auto-open would race the desktop's once `create_note` is Write | R2 | Accepted. 08 classifies `save_snapshot` (snapshots disk); auto-open stays off in the browser (02) |
| m4 | Possible auth bypass if Serve rewrites Host to loopback: the identity check ran only on the tailnet Host | R2 | Accepted. 04 fails closed on proxy markers, with a test for a rewritten Host; the owner check records the real headers |
| m5 | Assets had no cross-site guard, so another page open on the Mac could probe which vault files exist | R2 | Accepted. 06 refuses cross-site requests |
| m6 | `localhost` may resolve to `::1` while the server binds `127.0.0.1` | R2 | Accepted. Host allowlist is `127.0.0.1:<port>` only |
| m7 | Reconnect "reload the open notes" should be clean tabs only | R1 | Accepted in 07 |
| m8 | 03 and 05 (draft) both edit the host access check | R1 | Partly accepted. Images now follow containment; the tailnet identity (04) and assets (06) can still meet in the access code, a normal rebase |
| m9 | Pushes to the feature branch run no CI, so stale ts-rs bindings would go unnoticed | R1 | Accepted as a note in the plan: the relay gate is the only check |
| m10 | "27 call sites" are 27 files, about 140 calls | R1 | Accepted. Corrected in 01 |
| m11 | The stand-in is tied to Tauri v2 internals while an `update-tauri-to-v3` worktree exists | R1 | Accepted as a note in 01 |
| m12 | Issue worktrees under `.claude/worktrees/` share main's cargo target, so the new HTTP deps compile into it | R1, R2 | Noted, no change: sharing the target is intended (one cargo build at a time) |

## Could not refute

Both reviewers confirmed:
- Command names and event names in the tickets match `lib.rs` and `contracts/events.ts`.
- `mockIPC` drops `options`, and `writeTextFile` sends the path in `options.headers` (`plugin-fs` `index.js:782-787`).
- No IPC runs at module import time.
- `create_note` writes and indexes.
- The desktop watcher indexes browser writes; the self-save skip is per process (`editor.hooks.ts:27-48`).
- `src/lib/app/remote/` sits inside the composition root.
- relay-lite works from a linked worktree once B2 is done: root is the cwd, and deliver pushes only `base`.

## Not checked

- Tailscale Serve's Host and identity-header behaviour on a non-443 port.
- Tauri's `asset_resolver` and dev-mode internals.
- Whether the inline bootstrap script stays the same across builds.

The tickets as rewritten after this review were not reviewed again.

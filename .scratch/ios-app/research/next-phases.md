# iOS: phases after the phase-1 browser proof of concept

Reference only. These phases are NOT filed as Issues (owner decision 2026-11-02): they are picked from real use after Issue 08, and only if the browser version is not enough. Detailed designs are in [`../architecture-proposal-2026-11-02.md`](../architecture-proposal-2026-11-02.md) section 5; the evidence is in the scout, design and review files next to this one.

Phase 1 (filed, `issues/01..08`): Mac serves the app, tree, path containment, tailnet route, read, images, live updates, edit with a stale-write check. Branch `feature/ios-poc`.

## Suggested order after phase 1

Each block lists the work as the 2026-11-02 breakdown drafted it (the "30 tickets" version, before the owner cut it down to phase 1). Numbers in brackets are that draft's numbers, kept for traceability; they are not Issue numbers.

### 1. Touch UI (first, if the iPhone layout is the pain)

- [13] WebKit iPhone/iPad Playwright projects + a touch form-factor flag (prefactor; E2E in webkit, CI installs webkit).
- [14] Extract the rail shell state into a testable store (prefactor; getter tests first, desktop unchanged).
- [15] iPhone read shell: navigator -> note list -> editor with back, minimal tab bar (Today, Files), safe-area padding, no editor autofocus.
- [16] iPad touch tuning: coarse-pointer hit areas, drag regions hidden, right sidebar as a sheet below ~1100 px, read-only note info sheet.
- [24] Tap opens links on touch (today needs Cmd/Ctrl), 44 px hit areas for task checkbox / code copy / table + / callout chevron, long-press acts on the pressed row.
- [22] Keyboard formatting toolbar above the virtual keyboard (inline marks, heading cycle, line prefixes, wikilink insert); no desktop Cmd+B (it toggles the right sidebar).
- [23] Touch drag guard (arm the mouse-selecting flag on touchstart) and 16 px inputs so iOS does not zoom.
- [28] Full phone tab bar (Today, Inbox, Types, Files, More + inbox badge), navigator screens and the five neighbourhood lenses.
- [29] Command palette and quick switcher as top sheets; text search panel.
- [30] Row actions on touch: rename, favorite, "Move to..." sheet instead of drag and drop.
- [26] Editable note info sheet: properties, backlinks, outgoing, TOC, copy block link.
- Browser close-tab shortcut: Cmd+W closes the browser's tab, never the Kokobrain tab (Chrome and Safari reserve Cmd+W/T/N/Q). Give the browser a close-tab shortcut the browser does not reserve (Ctrl+W on the Mac, to verify on iPad Safari) and show it in the UI. Owner deferred it on 2026-11-03; Issue 10 adds the leave-page prompt.

### 2. Safe concurrent editing (when both devices are used on the same notes)

Owner accepted on 2026-11-02 (Q1): drop "editor always wins", fsync note writes.

- [17] Checked editor save on the desktop: revision = SHA-256 of the disk bytes computed in Rust, per-path lock, `mustExist` / `createOnly`, content idempotency for retries; a conflict pauses autosave for that tab; non-UTF-8 files open read-only.
- [18] Three-way merge (base = saved content, mine = buffer, theirs = disk) and a conflict sheet: keep mine (snapshot theirs first), keep theirs (snapshot mine first), keep both (default).
- [19] Every note writer on the checked path: frontmatter writer, link rewrite, task toggle (with the expected line text), create note, type rename; a ratchet test lists the remaining blind writers.
- [20/21] Phone save pill (saved / saving / not saved / conflict) and on-device drafts in synchronous `localStorage`, flushed on `visibilitychange: hidden` / `pagehide`, cleared only when equal to the acked content; editing only in the home-screen app (separate storage from a Safari tab).
- [25] Write class for task toggle, create, rename and type rename from the phone.

### 3. Desktop fix track (independent, any time; each is a lead to reproduce with a failing test first)

- [X1] `search_hybrid` drops the FTS hits when the embedder is absent.
- [X2-X4] Image gaps: relative `![](x.png)`, binary `![[x.pdf]]` read as text, raw `<video>` src.
- [X5] queryjs Prev/Next buttons lack the `mousedown` guard.
- [X6] Reload race: dirty check happens before the disk read, overwrite after it.
- [X7] Task toggle over a dirty tab marks it saved (same pattern in type definitions and deep links).
- [X8] `create_note` check-then-rename can replace an existing file (use an exclusive create).
- [X9] fsync the temp file before rename in `write_atomic` (owner accepted).

### 3b. Next after Issue 06 (before video embeds go through `convertFileSrc`, desktop gap X4)

- Asset Range 206/416 and ETag [27]. Safari on iOS needs byte-range answers to play video at all (Apple Safari Web Content Guide), not only to seek; without it the owner's iPad video check fails once X4 lands.

### 4. Host hardening (when access goes beyond the owner's own tailnet login)

- Pairing token flow (t3code style): hashed one-time token, 5 min TTL, single use, `__Host-` session cookie, revoke closes sockets, device list, QR later.
- Event `seq` + host instance id and a resume ring instead of full refresh on reconnect.
- Connection supervisor: jittered backoff, ping, probe on `visibilitychange` / `pageshow`.
- Web app manifest and home-screen icon; reload once on server version change.

### 5. Remaining features over the remote host (by value)

1. Safe writes to `.kokobrain/*.json` (re-read and retry) and Trash that removes only listed items; then trash, folder order, icons, auto-move config from the phone.
2. Tags, tasks view, templates, periodic notes, calendar navigator.
3. File history.
4. Settings on the phone: device-local vs shared keys; shared writes only with a host-side merge that never writes the redacted Todoist token.
5. iPad first: kanban, canvas, event calendar, graph.

### 6. Offline: native Tauri iOS app with a local replica (proposal M10)

Owner answers: vault is a local folder (no iCloud, ADR-0019 stays), paid Apple account (TestFlight). The old iOS branches were deleted; this is new work.

- 10a iOS bring-up: `semantic` and `desktop-integration` Cargo features forced off for iOS, a CI check of the mobile profile, `tauri ios init` (watch for the broken `node tauri` preBuildScript and the `ort-sys` download failure seen in June 2026), privacy manifest, foreground reconcile instead of `notify`, fixed vault in the app container, TestFlight.
- 10b Sync core, pull-only first: manifest, plan, base store, explicit local-delete journal, mass-delete breaker, case-folded NFC keys, bearer token in the Keychain kept in Rust.
- 10c Push and merge: reuse the three-way merge and conflict copies; PUT before DELETE; host executes a sync DELETE as a move to Trash.

### 7. Optional

- Headless `kokobrain serve` on an always-on machine (needs a Tauri-free command API and a crate split).
- Storage engine change (CRDT documents, a sync-oriented database, an event log): open per owner scope, not needed for a single-user two-device vault with file-level sync.

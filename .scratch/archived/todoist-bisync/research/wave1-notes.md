# Todoist bi-sync: wave 1 scout notes

Owner goal (2026-11-09): what is created in the brain shows up in Todoist and the reverse. A local SQLite for Todoist state is allowed.

## Write path into notes (scout: write path)

- Only task write: Rust `toggle_task_status` (src-tauri/src/commands/vault.rs:760-829). Flips the status char, `write_atomic`, `update_note_in_index_inner`, emits `vault-index-updated`. No stale-line guard in Rust; trusts `line_number`.
- TS `toggleTask` (tasks.service.ts:121-155): saves a dirty tab first, compares the line, then `syncExternalContentToEditor`. Does not call `markRecentSave` / `notifyAfterSave`, so the watcher re-indexes it as external.
- No whole-line rewrite command exists (`update_task_lines` was never built; it is open ticket 122).
- Append: closest is deep-link `executeNewAction` (deep-link.service.ts:270-285): save-first, read, append, `markRecentSave`, plugin-fs `writeTextFile` (not atomic), sync editor, `notifyAfterSave`. Create: `create_note` + `applyNoteChange({source:'create'})`.
- Dirty tab: editor wins on reload (editor.service.ts:416-422). Mods `vault.write` refuses on a dirty tab (mod-vault.service.ts:123-125).
- Background writer must honor indexing rules R1, R2, R4/R5 (`markRecentSave`, 15 s TTL), R6 (`applyNoteChange` sole owner), R9 (absolute paths), R12.

## Task model and identity (scout: task model)

- Parser: parsing.rs TASK_RE :1427 (`- [ ]`, ordered :1434), signifiers :1448-1485 (📅 ⏳ 🛫 ➕ ✅ ❌ priorities 🔁 🆔 ⛔ 🏁). `ID_RE` `🆔\s*(\S+)` :1551.
- `description` (:1857) strips signifiers and #tags, NOT `^blockid` nor HTML comments. A `^kb-x` suffix would leak into Todoist content unless stripped.
- Block ids: `BLOCK_ID_RE` navigation.logic.ts:14 (end-anchored), live preview hides ` ^id` off-cursor (block-reference-handler.ts), copy-block-link reuses an existing `^id`, `generateBlockId()` copy-block-link.logic.ts:59 (6 chars base36, no collision check).
- HTML comments on task lines are not hidden by live preview.
- No recurrence spawning on check; no ✅ date written. Toggle flips `[ ]` <-> `[x]` only.
- Status map `map_checkbox_char` :1589. `checked` = char != ' '. Real closed rule: done or cancelled (EventTaskChip.svelte:17-18). Cancelled has no Todoist equivalent.
- No stable task id exists today.

## Prerequisite tickets (scout: prereqs)

- Nothing the Todoist plan needs has landed on main (ba2aca0a3). Not landed: 021 (guarded toggle), 030 partial, 031, 111 TaskRow, 115, 122 update_task_lines, 074, 072, 127-130, 229.
- SDK is now `@doist/todoist-sdk` 16.0.0 (commit 2ad05327c); tickets 072/073/127 cite 15.8.0 lines.
- With an in-line marker identity: 128 rewritten, 130 mostly obsolete, 127 reshaped, 129 smaller; 072/073/229 unchanged.

## Owner additions (2026-11-09)

- Projects and tags/labels should sync too, at least in a basic form. Working proposal: labels <-> task `#tags`; Todoist project <-> one project note (frontmatter id), sections <-> `##` headings; Todoist-created tasks land in their project note (Inbox note for Inbox).

## Lifecycle and host (scout: lifecycle)

- Hook: `initializeVault` deferred step 9 (app-lifecycle.service.ts:525-538, `setTimeout(0)` + `initVersion` guard) where mods host and update check start; stop in teardown (:166, :584). Vault-lifetime consumers in the unregister list (:252-269).
- Periodic pattern: `acquireCalendarClock` (event-calendar.service.ts:299-324): interval + focus + visibilitychange. App focus: `registerFocusListener` (tauri-listeners.service.ts:327), no vault guard.
- Settings: `TodoistSettings` settings.types.ts:249 (apiToken, defaultLabel), defaults settings.store:125, persisted raw to `.kokobrain/settings.json`; after a read failure persistence still overwrites (ticket 030).
- Sidecar writes are raw `writeTextFile`; `raw-write-ratchet.test.ts` lists todoist.service.ts at :44. Atomic write exists only in Rust (`write_atomic`, utils/fs.rs:16).
- HTTP: plugin-http scope `https://api.todoist.com/**` (capabilities/default.json:240-282), CSP allows it. SDK + tauri fetch adapter has no window dependency, runs outside TasksView.
- privacy.yml: TS allowlist has todoist.com; Rust scan flags reqwest and only allows HuggingFace/GitHub, so a Rust Todoist client fails CI unless allowlisted. TS is the natural HTTP host; SQLite store can still live in Rust behind IPC.
- Mods cannot host the sync (no http, timers, task API, settings, status bar).
- Status bar children hard-coded in AppShell.svelte:301-310; persistent toast `{ duration: Infinity, closeButton: true }`.

## Docs and tests (scouts: docs, tests)

- Help 10-tasks-and-todoist.md:136-139 says sync is manual and completion does not sync either way. No ADR on Todoist; no CONTEXT.md. ADR-0035: network only through scoped plugin-http. ADR-0019: per-vault app data in `.kokobrain/`.
- No test drives the real SDK; todoist.service.test.ts mocks the client factory. Seam: plugin-http `fetch` mock (tauri-fetch-adapter.test.ts:3-11). e2e has no Todoist mocks (`e2e/mocks/tauri-http.ts` returns `{}`).

## Todoist API v1 (scout: API, docs fetched 2026-11-09)

- Use `/api/v1/sync`: `sync_token=*` full, then incremental; `resource_types` e.g. `["items","projects","sections","labels"]`. Limits per user per 15 min: 1000 partial, 100 full syncs; 100 commands per request, 1 MiB body.
- Commands: `uuid` idempotent ("will not execute a command that has same UUID"), `temp_id` + `temp_id_mapping`, per-command `sync_status` (partial success); 400 command errors terminal. `item_update` cannot move/complete; `item_move` takes one of parent/section/project. `item_complete` archives always; REST `closeTask` = recurring moves to next date. `item_uncomplete` / REST reopen.
- Task fields: id, content (500 chars), description (<=16,383, markdown), checked, is_deleted, completed_at, added_at, updated_at (second precision, not a revision), due {date,is_recurring,string,lang,timezone}, deadline, priority (4 = p1), labels (names), project_id, section_id, parent_id, child_order.
- Unverified, needs live check: what incremental sync returns for completed/uncompleted/deleted items (likely `checked:true` / `is_deleted:true`); full sync omits completed. Fallback: `GET /tasks/completed/by_completion_date` (3-month window). Delete only on `is_deleted`, never on absence.
- Recurring: closing moves `due.date`, stays unchecked.
- Webhooks: need OAuth app + public HTTPS callback; not feasible. Poll.
- Labels by name; unknown label on add probably auto-creates (unverified). Label name max 60.
- SDK: installed 16.0.0 (published 2026-11-03, inside the 2-week quarantine). 15.8.0 already has `sync()` + `createCommand()`; 15.9.0 added `TodoistSyncError`. 16 and 17 breaks are unrelated to tasks.

## Infra (own check)

- Rust already has `rusqlite` 0.41 bundled (src-tauri/Cargo.toml:54), DB at `<vault>/.kokobrain/kokobrain.db` (src-tauri/src/db/mod.rs:37), and `reqwest` 0.13 (:65), `uuid` v4 (:39), tokio.

# 06: "Todoist: Sync now" pulls every project and its open tasks into project notes

**What to build:** With sync enabled, the palette command "Todoist: Sync now" creates one note per Todoist project of the vault's tree in the sync folder (Inbox as `Inbox.md` when included) and writes each open task as an anchored line. Running it again changes nothing. Pull only: nothing goes to Todoist yet. Design: `.scratch/todoist-bisync/research/design.md` rules 1, 3, 8, 9, 10, 11, Project model, Anchor.

**Blocked by:** 04, 05

**Status:** resolved

- [x] Failing tests first with the fake `/sync` from ticket 05 and real stores.
- [x] Tree filter (design rule 8c): only the root project, its nested projects at any depth, and the Inbox when `syncIncludeInbox` is on are synced; labels play no part. Test: two vaults with different roots on the same fake account each get only their own tree's tasks and project notes; the Inbox goes only to the vault that includes it.
- [x] `syncFolder` is normalized before use (trimmed, surrounding slashes removed) and a value that is absolute or contains `..` is refused with a toast (deferred from Issue 05's review, finding 3).
- [x] The shared fake `/sync` drops checked items from full syncs, as the real API does (`research/live-check.md` 5b; deferred from Issue 05's review, finding 4).
- [x] Project note: filename = project name (illegal filename characters cleaned, collision gets a numeric suffix), frontmatter `todoist_project: <id>`; identity is the frontmatter id. The Inbox project (`inbox_project: true`) is `Inbox.md`. Nested projects are flat sibling notes; nesting is not mirrored in folders.
- [x] Pulled open task line: `- [ ] <content> <priority emoji> 📅 <date> 🔁 <due.string> #labels 🆔 td-<todoist id>`, only fields that exist. Labels per rule 8 (whole-name tag match; unmapped kept in `remote_base`). Content that fails ticket 02's round-trip check is written as-is but logged and flagged so later tickets never push it back.
- [x] Inserted at the end of the project note (sections come in ticket 12) through the writer from 04. Bases (`local_base`, `remote_base`) and the `sync_token` committed together.
- [x] Shared vault scan used by every later cycle: reads tasks with `get_all_tasks_v2` plus open-tab content (ticket 04's read helper), applies the scope exclusions from ticket 02, builds the anchor occurrence map; duplicated anchors freeze their link (logged).
- [x] Re-running inserts nothing and rewrites nothing unchanged.
- [x] Rebuild mode (rule 1): empty link table with anchored lines or remote items present -> pair by `td-<todoist id>` (and by a description `kokobrain:` line, see ticket 10), create nothing, log unmatched.
- [x] Safety (rule 9): refuses before the index is ready; captures the vault path at start and rechecks it before every write; a vault switch mid-cycle writes nothing to the new vault.
- [x] Gate: frontend, or Both if IPC changes.

## Notes

- Size: M.

## Comments

- 2026-11-09, branch issue/06-sync-now-pulls-projects-and-tasks: "Todoist: Sync now" pulls the vault's project tree into project notes with anchored task lines, idempotent, with rebuild mode and vault-switch safety. Round-1 fixes: unmatched-anchor toast, sync_token withheld when an insert went stale, vault-switch-between-writes test, syncFolder drops empty and `.` segments, outline-order writes, import path, JSDoc. Full suite at d43c54245: exit=0, 597 files, 14494 passed, 54 skipped, 1 todo. Reviews: round 1 APPROVED, round 2 APPROVED (one nit left open: trailing backslash in syncFolder is no longer stripped).

# 128: Todoist link survives edits, and reworded tasks show "possibly sent"

**Origin:** `tasks-view` Issue 22, moved here on 2026-11-08. Its PRD, raw evidence and closed siblings stay in `.scratch/archived/tasks-view/`. Bare Issue numbers in the text below use that feature's numbering; `priority-2026-11-08.md` in this folder maps them to the numbers here.

**What to build:** Sent tasks are keyed by `${filePath}:${text}` (`todoist.store.svelte.ts:24-31`), with an absolute path and the raw text including signifiers (`todoist.service.ts:215-223`). Adding a due date or changing priority makes the task look unsent, and one click sends a duplicate. PRD "Identity strategy", decision B4 default (a). Renames and the "Unlinked" list come in Issue 30.

- **Sidecar v2** in `.kokobrain/todoist-sent.json`: `{ version: 2, entries: [{ todoistTaskId, url, relPath, description, legacyText?, lineHint, sentAt, closed?, syncedAt? }] }`.
- **Matching** an entry to a task, in order: the task's `🆔` signifier (`metadata.id`) equals the stored id; else same `relPath` and same clean `metadata.description`; when two tasks tie, the one nearest `lineHint`. A pure `matchSentEntries(rows, entries)` in `todoist-link.logic.ts` takes Issue 07's `TaskRow`s and returns a state per row key and the unmatched entries.
- **Possibly sent.** A row with no match, in a note that has unmatched entries, shows "Possibly sent (reworded?)" with Relink (re-keys the nearest unmatched entry to this task) and Send anyway. Send stays hidden behind that choice.
- **Legacy file.** The old array (absolute `filePath` plus raw `text`, `todoistUrl`, optional `todoistCompleted`, `todoist.service.ts:215-221`, `:272-275`) is read and converted in memory: `relPath` from `filePath`, `url` from `todoistUrl`, and `description` from the row in that note whose raw `text` equals the legacy `text` (its `metadata.description`). TS has no task-metadata parser (it was deleted in `9f457365b`; Rust's `parse_task_metadata` is the only one), so do not add one: an entry whose `text` matches no row keeps the raw text in a `legacyText` field, and matching tries `legacyText` against each task's raw text as well as `description`, until the entry is relinked. Never derive a persisted field from rows that are not loaded: `initTodoist` runs on mount, before `buildTaskIndex` resolves. Matching and the unmatched set are computed over every task in the vault (the entries snapshot), not over the view's sourced rows. The file is written as v2 only after a load that succeeded.
- `TasksView.svelte:241-266` reads the state from the matcher instead of `isSent(filePath, text)`.

Test: converting a legacy file while `tasksStore.rows` is empty, saving, then loading the rows still shows the task as sent.

**Blocked by:** 111, 115, 127, 031

**Blocked by (origin):** added from the Issue text: audit-2026-11-05 116.

**Status:** needs-triage

**Waits on:** `audit-2026-11-05/116` (migrated from `audit-2026-11-04/14`) resolved. PRD B3 (used) and B4 (a, the sidecar keyed by Todoist id) are answered.

**Gate:** frontend only: `pnpm check` + `pnpm vitest run`.

- [ ] Failing test first, `todoist-link.logic.test.ts` with real logic: a task sent as `Call ACME` still matches after `📅 2026-11-06 ⏫` is added. Fails today with the `filePath:text` key.
- [ ] Rewording to `Call ACME Inc` gives "possibly sent", and Relink makes it "sent" again.
- [ ] Two identical lines in one note: each entry links to the nearest line.
- [ ] A legacy array file loads, converts, and is written as v2 only after the successful load; a corrupt file is never overwritten.

## Notes

- **Size:** M. The rename consumer and the "Unlinked" list were split into Issue 30.
- Todoist v1 ids are opaque strings such as `6XGgmFVcrG5RRjVr` (https://developer.todoist.com/api/v1/#tag/Migrating-from-v9, "IDs"); an entry sent before the v1 move would carry an old numeric id that v1 no longer accepts. The app's SDK has called v1 since before the old APIs shut down on February 10, 2026, so such an entry is unlikely; that the owner sent none earlier is from memory.
- If the owner picks B4 (b), this Issue is rewritten: Send writes `🆔 <id>` into the line through `update_task_lines` (Issue 09) and matching is by id only.

# 129: Todoist sync state on each row and as a quick filter

**Origin:** `tasks-view` Issue 23, moved here on 2026-11-08, then rewritten on 2026-11-10 by `todoist-bisync` Issue 15, which retired the one-way Send popover and the `todoist-sent.json` states (not sent, sent, possibly sent, closed) this ticket first showed. The two-way sync (`.scratch/todoist-bisync/`, ADR-0037) now owns every Todoist link. Bare Issue numbers in the text below use this folder's numbering.

**What to build:** A Tasks view row whose line carries a `🆔 td-…` anchor shows its sync state, and a quick filter narrows the list by it. The states, read from the sync's link table (`todoist_read_links`, `TodoistTaskLink` in `src/lib/contracts/generated/`) and its log (`todoist_read_log`), for the open vault:

- **Linked:** an attached link (`isDetached` false, `src/lib/features/todoist-sync/detach.logic.ts`) with a Todoist id; the row offers "Open in Todoist" (`https://app.todoist.com/app/task/<id>`, the format the API docs give).
- **Pending:** an attached link whose `todoist_id` is still null (a brain-born task whose `item_add` is not acknowledged).
- **Frozen:** the link's `frozen` flag (two or more lines carry the anchor); the icon's name says why ("Frozen: this anchor is on more than one line").
- **Error:** the newest sync log entry for the anchor is a terminal command error or a field that could not be pushed (`command-error`, `content-not-pushed`, `due-not-pushed`), newer than the link's last successful cycle; the icon's name is a fixed message per kind, never raw error text.
- Any other row (no anchor, a detached link, an anchor with no link) shows nothing.

Details:

- Each state is a visible icon with an accessible name, in theme tokens (see `audit-2026-11-05/84`, migrated from `ux-polish/48`). Rows only, no Send action: brain-born tasks are created by the sync.
- The state map is built once per sync cycle and per vault (refetch when `todoistSyncStore` reports a finished cycle and on vault switch), not per row, and is dropped on `teardownVault`.
- `features/tasks` may import `features/todoist-sync` (a new acyclic pair in `feature-cycle-baseline.json`); `features/todoist-sync` must not import `features/tasks` (design.md Architecture, to avoid a feature cycle).
- A "Todoist" quick filter, shown only while `settingsStore.todoist.syncEnabled`: any, linked, pending, frozen, error. `quick.todoist` in `TaskQuery`, evaluated by `applyQuickFilters` with the state map passed in, so `task-query.logic.ts` stays pure. The rule sentence names it ("synced with Todoist and frozen"). Reset and the `Filters (n)` count include it; `isQueryModified` treats an absent `quick.todoist` as `'any'`, with a test.

**Blocked by:** 111, 113

**Status:** needs-triage

**Gate:** frontend only: `pnpm check` + `pnpm vitest run`.

- [ ] Failing test first, `task-query.logic.test.ts`: the Todoist filter keeps only rows whose injected state matches.
- [ ] A pure state function (in `features/todoist-sync`, `.logic.ts`) maps links, log entries and a row's anchor to its state, with a test per state, a detached link and an anchor without a link.
- [ ] `TasksView.test.ts` with real stores (mock only `invoke`): choosing "frozen" lists only frozen rows, and each row's icon has the right accessible name.
- [ ] `help/documentation/10-tasks-and-todoist.md` lists the row states and the filter.

## Notes

- **Size:** S to M.
- Triage: the error rule (which log kinds count, and how an error clears) is a proposal; confirm it before launch.

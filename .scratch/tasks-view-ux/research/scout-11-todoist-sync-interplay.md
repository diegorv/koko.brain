# Scout 11: Todoist two-way sync and the Tasks view

Read-only research at the current `main`. Facts are verified by reading code or docs; opinions are marked as such. Paths are relative to the repo root. The id-signifier emoji (U+1F194) is written as "the id signifier" below.

## Summary

The Tasks view has no Todoist code at all today: the old one-way popover, the badges and the per-task polling were removed by ADR-0037, and `TasksView.test.ts` pins that removal. The sync still touches the view in four ways a redesign must respect: it writes the same note lines the view lists (so rows shift and the list refetches), it keys every line by a visible `td-` anchor that the view currently prints raw, it only learns about a Tasks view edit at the next cycle (a toggle is not a note save), and its per-task state (pending, frozen, detached) lives in `kokobrain.db` where the view cannot see it today. The redesign has no technical need to import anything from `todoist-sync` to be safe, but three or four cheap, optional slices (hide the anchor, a synced marker, a status chip, a "completes at next sync" state for recurring tasks) would make the Todoist-synced part of the view feel finished.

## Facts (verified in code or docs)

### What the view does with Todoist today

- `TasksView.svelte` imports nothing from `features/todoist-sync` and reads no Todoist setting or store (`src/lib/features/tasks/TasksView.svelte:1-16`).
- The only Todoist assertions are in the describe block "the two-way sync is the only Todoist path" (`src/tests/lib/features/tasks/TasksView.test.ts:191-243`):
  - no element with `title="Send to Todoist"`, none with `title="Sync task status from Todoist"`, and no `[data-task-row] a` (`:226-233`; the comment says the old badges were links to the Todoist task);
  - `todoist-sent.json` is never read via `exists` or `readTextFile` (`:235-242`).
  - It runs with `settingsStore.updateTodoist({ apiToken: 'token' })` set and a vault open (`:204`).
- The first describe block couples to row structure: the text span is `document.querySelector('[data-task-row] span')` (first span in the row, `:94-99`), the circle is the first `[data-task-row] button` (`:132-136`), toggle args are `{ path, lineNumber, expectedText: task.text, expectedStatus, target }` (`:122-128`, `:149`), and the rows are found by the `data-task-row` attribute (`:90`, `TasksView.svelte:173`).
- ADR-0037 records the removal: the one-way popover in the Tasks view, the `getTask` polling and every read and write of `todoist-sent.json` were removed; the file is left on disk, unmigrated (`docs/adr/0037-todoist-two-way-sync.md:11,32`).
- Help doc 10 describes the view with no Todoist UI and says a Tasks view checkbox "is not a note save, so it does not start the after-save sync" (`help/documentation/10-tasks-and-todoist.md`, "Interacting with Tasks"; same sentence in `help/documentation/29-todoist-sync.md`, "Completion and Statuses").

### What the view shows for a synced line

- The Rust parser stores the whole text after the checkbox as `Task.text`; signifiers, tags and the anchor stay in it (`src-tauri/src/vault/parsing.rs:1426-1427` TASK_RE capture 3, `:1647-1654`). `metadata.description` is the cleaned leftover (`:1776-1779`).
- The view renders `task.text` through `parseTaskTextSegments`, which only splits wikilinks and Markdown links (`src/lib/features/tasks/TasksView.svelte:194-212`, `src/lib/features/tasks/tasks.logic.ts:130-161`). It never uses `metadata`.
- A synced line has the shape `- [ ] Pay rent <priority> <due> <recurrence> #home <id signifier> td-6XGg...` (`help/documentation/29-todoist-sync.md`, "The Task Line"). So today a Todoist task row shows the raw emoji tokens, the raw tags and the anchor text.
- `toggle_task_status` is guarded by `expectedText` equal to the raw `task.text` and `expectedStatus` (`src-tauri/src/commands/vault.rs:770-801`, `src/lib/features/tasks/tasks.service.ts:147-153`). A display change must keep sending the raw text.
- The DTO already carries the anchor: `metadata.id` is the first id-signifier value (`tasks.service.ts:41`, `src-tauri/src/vault/parsing.rs:1553`, `src/lib/features/todoist-sync/anchor.logic.ts:17-25` `readAnchor` uses the same first match).

### How the sync reads and writes the lines the view lists

- Anchors: `td-<todoist id>` or `td-<8 base36>`. Copying a line copies its anchor and freezes that task (two lines, one anchor); editing the anchor text breaks the link and detaches it after 3 cycles (`docs/adr/0037-todoist-two-way-sync.md:27,46`, `help/documentation/29-todoist-sync.md`, "The anchor").
- A line with a user id signifier whose value does not start with `td-` stays out of the sync (`anchor.logic.ts:44-46` `hasForeignId`).
- Writes into notes are token patches (status char, due, priority, tags, description), never a whole-line rewrite; tokens are inserted before the anchor, and a trailing block id stays last (`ADR-0037:26`, `help/documentation/29-todoist-sync.md`, "The anchor" and "Tags and labels").
- The sync writes through `write_task_lines`, located by anchor plus the expected whole line, never by line number (`src-tauri/src/commands/vault.rs:893-947`, `src/lib/features/todoist-sync/task-line-edits.logic.ts:1-60`). For a closed note it goes to Rust; for an open tab it patches the live document or the tab content and lets autosave write it (`src/lib/features/todoist-sync/note-writer.service.ts:25-80`).
- Each Rust write emits `vault-index-updated` (`commands/vault.rs:970-977`) and the view refetches on every `vaultStore.vaultIndexVersion` change (`TasksView.svelte:73-78`). The refetch sets `isLoading`, which replaces the whole list with "Indexing tasks..." (`TasksView.svelte:139-140`, `tasks.service.ts:67`; scout 08 records the same flash and lost scroll).
- A new Todoist task is inserted at the note's end or under the matching `##` heading; only open tasks are inserted (`help/documentation/29-todoist-sync.md`, "The Task Line").
- Project notes are flat files in the sync folder, one per Todoist project, named after the project (renamed both ways) and identified by `todoist_project` frontmatter (`help/documentation/29-todoist-sync.md`, "How Notes Map to Todoist"). The group header the view shows (`group.fileName`, `TasksView.svelte:157`) is therefore the Todoist project name for those notes.
- Todoist sections are `##` headings in the project note (`help/documentation/29-todoist-sync.md`, "Sections").
- A `#todoist` tagged top-level open line in any other note is created in the root project (`help/documentation/29-todoist-sync.md`, "Creating Tasks from the Brain", rule 4).

### How a Tasks view edit reaches Todoist

- `toggleTask` goes `toggle_task_status` then `afterTaskWrite` then `settleTaskWrite` (`tasks.service.ts:130-179`, `src/lib/core/filesystem/task-write.service.ts:27-36`). `settleTaskWrite` calls `markRecentSave` and `applyNoteChange`, not the after-save observers.
- The scheduler's after-save trigger is an `addAfterSaveObserver` hook on the editor save path, gated by `hasAnchoredLine` (`src/lib/features/todoist-sync/sync-scheduler.service.ts:74-88`). So a view edit goes out at the next interval (default 5 minutes), window focus, or "Sync now" (`TodoistSettings.syncIntervalMinutes`, `src/lib/core/settings/settings.types.ts:259-262`; triggers table in `help/documentation/29-todoist-sync.md`, "When It Runs").
- Before the next cycle, a close stays as the user left it; Todoist confirms via `pending_cmd` (`ADR-0037:25`).
- Recurring tasks: a close from the note makes Todoist roll the date, and the line goes back to open with the new due on the next cycle; a close can be dropped if Todoist's due moved (`help/documentation/29-todoist-sync.md`, "Recurring tasks"). With the default "hide completed" on (`tasks.store.svelte.ts:12`), the row therefore disappears and later reappears with a new date.
- Line-moving or text edits by a future row menu (planned in `.scratch/open-itens/issues/122-row-menu-edits-with-undo.md`) go through `write_task_lines`. That Issue's `setDue` and `setPriority` append tokens at the end of the text and remove existing priority emoji (`122:20-21`), which would put them after the anchor and after a block id, while the sync inserts before the anchor and keeps a block id last.

### Where sync state is visible

- A status bar chip, only while `settingsStore.todoist.syncEnabled`: "Todoist syncing", "Todoist synced HH:MM", "Todoist not synced yet", "Todoist sync error" with the message as the tooltip (`src/lib/features/todoist-sync/TodoistSyncStatus.svelte:1-31`, `sync-scheduler.logic.ts:99-108`; mounted at `src/lib/app/AppShell.svelte:308`).
- `todoistSyncStore` exposes `status`, `isSyncing`, `lastSyncedAt`, `lastError`, `lastResult` (`src/lib/features/todoist-sync/todoist-sync.store.svelte.ts:44-52`). The store is reset on vault teardown (`src/lib/app/lifecycle/app-lifecycle.service.ts:172,673`).
- Persistent toasts for automatic-cycle failures and over-cap skips (`sync-scheduler.service.ts:36-39`, `sync-scheduler.logic.ts:50-81`), confirm dialogs for manual cycles over caps (`sync-now.service.ts:1169-1231`), and a log dialog from the palette command `todoist:show-sync-log` (`src/lib/app/commands.ts:260-263`).
- Palette commands: `todoist:sync-now` calls `syncNowFromUi` (`commands.ts:254-258`), which queues behind a running cycle and toasts the result (`sync-scheduler.service.ts:~127-150`).
- Per-task state exists only in the DB: `todoist_task_link` has `pendingUuid`, `pendingCmd`, `missCount`, `frozen`, `noteRelPath` (`src/lib/contracts/generated/TodoistTaskLink.ts`). TS can read all rows with `todoist_read_links` (`src/lib/contracts/commands.ts:65`). A link is detached when `missCount >= DETACH_AFTER_MISSES` (`src/lib/features/todoist-sync/detach.logic.ts:17-20`).
- A detached line has "no marker in the note or in Todoist, only the `detach` row in the sync log"; there is no way to re-attach (`help/documentation/29-todoist-sync.md`, "What a detached line is").
- The sync log rows carry an optional `anchor` (`TodoistSyncLogEntry.anchor`, `src/lib/contracts/generated/TodoistSyncLogEntry.ts`) and `todoist_read_log` takes a limit (`commands.ts:73`).

### Layering facts for any import from the Tasks view

- Feature to feature imports are allowed while acyclic (`src/tests/lib/architecture/layer-rules.test.ts:21,135-140`; cycles guarded by `feature-cycle.test.ts`).
- Nothing in `src/lib` outside `src/lib/features/tasks/` and `src/lib/app/` imports `features/tasks` (grep), and `features/todoist-sync` does not import it either. So `features/tasks` importing `features/todoist-sync` (the store, `anchor.logic.ts`) cannot form a cycle today.
- The shared write settler lives in `core/filesystem/task-write.service.ts` precisely so "the Tasks feature and the Todoist sync both call it without importing each other" (`task-write.service.ts:7-9`). That is the existing intent: keep the two features decoupled.
- `.logic.ts` files may import only other `.logic.ts` or `utils/` (project `CLAUDE.md`); `anchor.logic.ts` qualifies.

### Scope facts relevant to what the view lists

- Default section filter `#to-list` hides every task not under a heading containing it (`tasks.store.svelte.ts:8`, `src-tauri/src/vault/parsing.rs:1721-1768`). Todoist section headings are `##` names from Todoist, and Todoist tasks above the first heading are under none, so by default synced project notes are not listed unless the owner also uses that heading in them (inference from the matcher; scout 08 covers the filter itself).
- The date filter and the group order use the file's `modifiedAt` (`TasksView.svelte:46-52`, `commands/vault.rs:648-660` sorted desc). Every cycle that patches a note changes its mtime (`write_atomic` then `read_file_mtime_secs`, `commands/vault.rs:938-940`), so synced notes look recently modified whenever Todoist changed anything.
- Tasks tagged for sync keep `#tags`; the labels `todoist`, `work`, `personal` and the default label are never written as tags (`help/documentation/29-todoist-sync.md`, "Tags and labels"). So a `#todoist` tag appears on a non-project line only when the owner typed it.

## Problems and opportunities

Problems (a redesign can break or worsen these):

1. Raw anchor and signifier text in every synced row (fact above). Opinion: it is the most visible ugliness for synced tasks, and it also invites drag-copy of the anchor into another note, which freezes the task.
2. Row structure is a test contract (`[data-task-row] span`, first `button`). A new leading chip as a `span`, or a new button before the circle, breaks `textSpan()` and `circleButton()` in the existing tests; update them deliberately, do not weaken them.
3. The `[data-task-row] a` is-null assertion forbids reintroducing a link to the Todoist task inside a row. A non-link marker is compatible.
4. Refetch flash. The sync emits one index bump per written note, throttled but up to every 2 s in a burst (`tasks.service.ts` doc, toggle comment). During a sync with several writes the whole list can blank repeatedly and lose scroll. Opinion: more likely to bite a Todoist user than a plain vault user.
5. Line numbers move under the view. Todoist inserts and moves change `lineNumber`; the toggle guard makes it a "task changed on disk, click again" toast (`tasks.service.ts:154-158`). The `{#each ... (task.lineNumber)}` key (`TasksView.svelte:169`) also reuses a row element for a different task after a shift. Opinion: for anchored rows a stable key would be the anchor.
6. A row-menu edit (Issue 122) appends tokens after the anchor and any block id. Whether the sync's field diff and description patch tolerate that is not verified here; it must be checked with a synced fixture before shipping (see open questions).
7. Recurring task toggle: the row is "done" and hidden, then returns with a new date after a cycle, up to 5 minutes later. Without a hint it looks like a bug.
8. A Tasks view edit is silent about when it will reach Todoist. The help doc explains it; the UI does not.
9. A bulk row action (complete all, move many) feeds the sync caps: more than 25 close/reopen or 50 field pushes pauses a manual cycle for a confirm and makes an automatic one skip that class with a persistent toast (`ADR-0037:30`). Opinion: a "complete all visible" action would hit this on a large list.
10. The view's mtime-based date filter and mtime ordering are poor for synced notes (every Todoist change touches the file).
11. Drag between groups (a possible redesign feature) is two writes in two notes unless done as one `write_task_lines` batch per note; the window between them shows a missing line (counts a miss, needs 3) and, if the insert lands first, a duplicate anchor (frozen until one is left). Acceptable but not atomic.
12. A redesign that adds "add task" must not use the removed popover or call Todoist HTTP: Todoist HTTP is TypeScript-only, plugin-http scoped, and checked by `.github/workflows/privacy.yml` (`ADR-0037:17`, `:37`). Creating a task means writing a line the sync later creates.

Opportunities:

A. Show the cleaned `metadata.description` plus chips (due, priority, tags, recurrence) and hide the anchor in the row, while keeping `task.text` for the toggle guard. Fixes problem 1 and is the base of every design slice.
B. A small "synced" marker per anchored row (non-link, for example an icon with a tooltip), derived from `metadata.id` starting with `td-` via `readAnchor`, shown only when `syncEnabled`. Cheap, no IPC.
C. Richer per-row state from `todoist_read_links`: pending (a close or reopen the view just made, not yet confirmed), frozen (duplicate anchor), detached (3 misses). Detached and frozen are invisible everywhere today, so a marker is new information. Refresh it when a cycle ends (`todoistSyncStore.succeed`) and on index version.
D. A compact sync chip in the toolbar reading `todoistSyncStore` (same `syncStatusLabel`), optionally with a "Sync now" button wired to `syncNowFromUi`. The status bar already has the chip, so this is a convenience, not a gap; keep it hidden when `syncEnabled` is false.
E. After a view edit on an anchored line, request an automatic cycle. Nothing exports that today (`requestAutoCycle` is internal to `sync-scheduler.service.ts`), and the doc states the opposite as current behavior, so this is a behavior change to decide with the owner.
F. Group by Todoist project is free: the group header already is the project name for project notes. Group by section needs headings in the data (planned in Issue 115, not available today).
G. "Send to Todoist" replacement: a row action that adds the `#todoist` tag to a top-level open line outside project notes (the sync then creates it in the root project). Fits the ADR; changes a line in a non-project note, so owner decision.
H. Date and priority chips in the view are already the synced fields (due, priority, tags), so showing them costs nothing sync-wise.

## Recommendations for the redesign

These are opinions.

1. Treat the sync as an external writer of the same lines. Do not add any Tasks-view code that writes a task line other than through `toggle_task_status` or `write_task_lines`, and always finish with `afterTaskWrite` (`settleTaskWrite`). Never write a note with `writeTextFile` from the view.
2. Never alter or display-edit the anchor. Any slice that rewrites a line must patch tokens in place, preserve the id signifier and its `td-` value, and keep a trailing block id last. Add a test with a synced fixture line (priority, due, tags, anchor, block id) for each edit kind.
3. Keep `toggleTask` sending the raw `task.text` and `task.status`. If rows render `metadata.description`, keep raw text available on the row for the guard and for text selection copy semantics (copying should not yield the anchor).
4. Keep the existing Todoist test intent: no link element inside a row, no "Send to Todoist", no read of `todoist-sent.json`, no old toolbar sync title. Add the new Todoist surfaces (marker, chip, sync button) as new tests rather than editing the old assertions; if a toolbar "Sync now" button is added, rename the first test's wording ("no toolbar Sync button") on purpose, since it then becomes untrue.
5. Gate every Todoist element on `settingsStore.todoist.syncEnabled`, as `TodoistSyncStatus.svelte` does, so a vault without sync sees none of it. Do not gate on `apiToken` alone: the existing test sets a token without enabling sync and expects no Todoist UI.
6. Prefer a small read-only seam over deep imports: one `.logic.ts` helper in `features/tasks` that takes `metadata.id` and returns "anchored or not" (reusing `readAnchor` from `todoist-sync/anchor.logic.ts` is acceptable and acyclic), and, for slice C, one small store field in `features/tasks` fed from `todoist_read_links`. Run `feature-cycle.test.ts` and `layer-rules.test.ts` after any new import; the stated design intent is to keep Tasks and Todoist decoupled (`task-write.service.ts:7-9`).
7. Make the list refetch non-blocking: keep the old rows mounted while a refetch runs (the planned Issue 108 already says so). This matters more with the sync writing in the background.
8. Key rows by anchor when present, else by line number plus text, so a Todoist insert above a row does not reuse the wrong element.
9. Give recurring anchored tasks an explicit state after a toggle ("completes at next sync" or similar) instead of vanishing silently. Detect with `metadata.recurrence` plus an anchor.
10. Keep bulk actions below the sync caps, or show the consequence: a "complete all" with more than 25 anchored tasks would trigger a confirm in the next manual cycle and a persistent toast in an automatic one.
11. Do not add any network or Todoist SDK call to the Tasks view. All Todoist traffic stays in `features/todoist-sync` (`privacy.yml`).
12. For ordering and date filters, plan task-level due date filters rather than file mtime, since synced notes are touched by every Todoist change.
13. Update `help/documentation/10-tasks-and-todoist.md` and `help/documentation/29-todoist-sync.md` in the same slice as any behavior change they describe (the "a Tasks View click is not a note save" sentence appears in both).

## Open questions for the owner

1. Should a Tasks view edit on an anchored line trigger a Todoist cycle soon after (like an editor save does after 5 seconds)? Today it waits up to the interval; the docs say so explicitly. Cost: a new exported trigger in the scheduler and a doc change.
2. Should the view show per-task Todoist state (synced, pending, frozen, detached)? Detached and frozen have no marker anywhere today. It needs reading the link table and a small store; is that wanted, or is the log dialog enough?
3. Should the view get its own sync chip or "Sync now" button, given the status bar chip already exists? If a button, is the existing test name allowed to change?
4. Do you want a row action that sends a line to Todoist (add `#todoist` to a line outside project notes), or should that stay a manual tag edit? And a quick-add that writes a task line into a chosen project note?
5. Should rows hide the anchor and signifier text entirely (show chips) for all tasks, or only for synced ones? Opinion: all tasks, with the raw line one click away in the note.
6. Is group by Todoist section wanted? It needs headings in the index first (Issue 115). Should project notes group by project name only until then?
7. Do you use the Tasks view with the default `#to-list` filter on Todoist project notes? If your project notes have no such heading, synced tasks are hidden by default; this affects what the redesign's default view must list.
8. For the planned row menu (Issue 122): is appending the due or priority token after the anchor acceptable, or must it insert before the anchor like the sync does? This needs a check against the sync's field diff before it ships; I did not verify it.

## Not checked

I did not run any tests, the app or the sync. Whether a token appended after the anchor or a block id round-trips cleanly through the sync's field diff (`fields.logic.ts`, `task-line.logic.ts`) is unverified. The effect of sync writes on Tasks view scroll and refetch frequency is from reading the code, not from measuring.

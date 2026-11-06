# Tasks view: sourcing rules, filters, categories and Todoist

The owner's words (translated): "The Tasks view UI is very bad, too simple and not very usable, especially for creating specific rules for how tasks are picked up, how to filter, how to categorize, and the Todoist integration."

The code backs this up. `src/lib/features/tasks/TasksView.svelte` (277 lines) has one toolbar and one list grouped by file:

- **Sourcing is one hidden substring.** The store pre-fills `sectionTag = '#to-list'` in memory only (`tasks.store.svelte.ts:8`, reset at `:30`). A task is listed only when it sits in a section whose heading contains that text (`parsing.rs:1739`, `heading_text.contains(&tag)`). The match is case-sensitive and has no word boundary, so `#to-list` also matches `#to-listing`. A section ends at the next heading of equal or higher level (`parsing.rs:1736-1738`), so tasks under deeper sub-headings are kept. On a vault without that heading the view says "No tasks found", and the e2e spec clears the textbox in every test that lists tasks (`e2e/specs/tasks-view.spec.ts:17-21`, `:31-32`, `:42-43`, `:67-68`, `:97`). Nothing can be excluded: the vault scan passes an empty excluded-folder list (`commands/vault.rs:225`), so templates, the system folder, archived notes and type definitions all supply tasks.
- **"Completed" means "not todo".** `checked: check_char != ' '` (`parsing.rs:1633`). Hide-completed is on by default (`tasks.store.svelte.ts:10`) and filters on `checked` (`tasks.logic.ts:40`), so in-progress `[/]`, question `[?]`, forwarded `[>]` and important `[!]` tasks are hidden and struck through (`TasksView.svelte:218`) as if they were done. The calendar already uses another rule: done or cancelled (`EventTaskChip.svelte:18`).
- **A click can damage a task.** Clicking the task text toggles it (`TasksView.svelte:215-220`), so selecting text flips a checkbox on disk. Unticking writes a space for any status that is not a space (`parsing.rs:1895-1900`), so one click on an important `[!]` task makes it `[ ]`. `toggle_task_status` flips whatever line number it receives and does not check the text on that line (`commands/vault.rs:760-829`). The TS side has a partial guard: when the tab is dirty it saves first and refuses if the saved line moved (`tasks.service.ts:121-136`), but a clean tab or a list that is behind disk is not checked (open Issue `audit-2026-11-05/122`).
- **The date chips filter on the file's mtime**, not on any task date (`tasks.logic.ts:76-88`). Due, scheduled, start, priority, recurrence, tags and the seven statuses all come over IPC (`task.rs:42-130`) and the row ignores every one of them (`TasksView.svelte:197-269`).
- **Every refetch replaces the list** with "Indexing tasks..." (`TasksView.svelte:169-170`, `tasks.service.ts:65`), which drops keyboard focus and scroll. Because the default tag is not empty, each refetch also re-reads every task note from disk (`commands/vault.rs:736-753`). A refetch runs on every index version bump and after every toggle.
- **Todoist tracks sent tasks by `filePath:text`** (`todoist.store.svelte.ts:24-31`). The text includes the emoji signifiers, so editing a task or renaming its note makes it look unsent, and sending it again creates a duplicate. A 404 is treated as "not completed" (`todoist.service.ts:84-89`, `:270-275`). Sync failures are only logged (`todoist.service.ts:276-278`, `TasksView.svelte:85-91`).

Evidence: 30 scouts (the `research/scout-*.md` files) and 15 theme analyses. The analysis files in `research/` are short summaries (headline, candidate Issues, owner questions) recovered after their full text could not be saved, so every claim that rests on one of them alone is marked "unverified". The PRD was then checked against two adversarial critiques (feasibility, product) and revised. Nothing was run. Line numbers are from `47ecf60ef` and will drift. Any claim not checked against code says "from memory".

## Goals

1. **Visible, editable sourcing.** The owner sees in one sentence which notes supply tasks and changes it with structured clauses (folder, type, note tag, property, lifecycle, heading), with default excludes.
2. **Filtering on task data.** Quick filters on status, due date, priority and task tag.
3. **Categorizing by the owner's note model.** Group by note, folder, note type, note property, heading, due bucket, priority or status.
4. **Lists that remember.** Saved views per vault, and built-in smart lists ranked by how many of the owner's tasks carry dates.
5. **Safe in-view editing.** Tick, status, due and priority edits only write the line the user saw, and the row shows the result at once.
6. **A Todoist link that does not lie.** Sends are not lost, failures are shown, and a reworded task is never silently sent twice.

## Non-goals and later work

Out of this run, each for a stated reason:

- **Advanced `{and, or, not}` filter builder and raw expression mode.** No rule the owner has named needs it. The `.view` walker swallows errors as no-match (`collection.logic.ts:317-324`), `EvalContext` needs a full `PropertyIndexRecord` (`evaluator.ts:11-16`), and the `FilterRow` pickers list note keys, not task fields. Revisit when a real rule cannot be built from sources plus quick filters.
- **Live per-card and per-exclude counts.** The view shows the total only.
- **Group by task tag (multi-membership) and group by Todoist state.** Tag is a quick filter, Todoist state is a quick filter and a row marker.
- **Group by parent note (`_belongs_to`).** `NoteEntry.belongsTo` holds raw targets (`NoteEntry.ts:103`) that need link resolution first. Worth doing after Issue 15 if the owner groups projects that way.
- **Quick add.** Not in the complaint. When it comes, TS resolves the anchor to a concrete line from the parsed headings and passes `insertAfterLine` plus an expected-line guard to Rust, and a missing daily note is created through an app port first (ADR-0003).
- **Multi-select and bulk actions**, including Todoist bulk send.
- **Todoist "out of date", "Update in Todoist", and completion sync.** An update action needs a conflict model first: the sidecar would store `sentText`, Sync would compare the Todoist side with it, and Update would show a field diff and ask. Without an Update action nothing in Todoist is ever overwritten, so v1 needs no conflict model.
- **QueryJS `kb.tasks()` and richer `KBTaskV1` fields.** Not in the complaint. When it comes: a contract-local `KBTaskQueryV1` mapped inside `queryjs.logic.ts`, tasks mapped to `KBTaskV1` in `buildKBPage`, and the shared pure predicates run over the mapped rows, never over `NoteEntryV2` (firewall: `kbapi-firewall.test.ts:26`, `:185`; indexing rule 12). The firewall snapshot (`kbapi-firewall.test.ts:293-295`) is updated on purpose, as an additive minor change. `completed` keeps its meaning (`queryjs.logic.ts:127`).
- **Calendar excludes.** The calendar reads `get_all_tasks_v2` (`event-calendar.service.ts:119`), whose `FileTaskGroup` has only `filePath`, `fileName`, `modifiedAt` and `tasks` (`task.rs:151-166`), so it cannot evaluate type, tag or archived excludes. The calendar keeps its current sourcing in this run. Issue 06 only makes its chip use the shared open rule.
- A text-only query DSL, natural-language dates, AI filters, a ` ```tasks ` fence, tasks in `.kanban` cards, `.view` bodies (`entry.rs:241-244` returns early), callouts or Dataview fields, recurrence spawning, done-date stamping, moving tasks between notes, nested sub-grouping, virtualization, dependency UI for `id`/`dependsOn`/`onCompletion` (they stay parsed), the Todoist SDK 16/17 major bump.
- Turning Tasks into a `.view` row kind. The `.view` engine is note-keyed (`lens.logic.ts:704-721`) and `groupBy` is not implemented (`collection.types.ts:47-49`). The view-unification PRD lists the tasks surface as out of its scope (`.scratch/view-unification/PRD.md:15-21`), which means `.view` files are not shown in Tasks; it does not forbid a task row kind later.

## Users and workflows

One owner on one Mac, with one vault in heavy use. They use meta-bind, kanban, tables (`.view`), canvas and Quick Capture, and use Todoist alongside the app. The memory note "owner-feature-usage" says "no external sync", which conflicts with Todoist being named as a pain point, so decision B3 asks before any Todoist work starts.

- **Project notes.** Tasks sit under headings in project notes, and the `#to-list` heading convention marks the list the view shows today. Whether the owner relies on it is decision B1.
- **Daily notes.** Tasks are captured in the periodic daily note (a plugin, `src/lib/plugins/periodic-notes/`).
- **Typed notes.** Notes carry `_type`, tags, lifecycle flags (`_organized`, `_archived`, `_favorite`) and frontmatter edited through meta-bind and `.view` tables. These are the natural categories: a project's `area` or `status`, a note's type. The entries snapshot already carries `isA`, `tags`, `frontmatter`, `organized`, `archived`, `favorite` (`NoteEntry.ts:34-98`).
- **Kanban** cards use their own syntax and `.kanban` files are not indexed (`utils/fs.rs:140-143`). Out of scope.
- **Quick Capture** writes notes, not task lines (scout 12). A captured `- [ ]` line reaches the view through the normal index.
- **Calendar.** Shows dated tasks from every note (`event-calendar.service.ts:114-121`) and closes on done or cancelled. Unchanged in this run apart from the shared open rule.

## Decisions

### Owner answers (2026-11-06)

| Decision | Answer |
|---|---|
| B1 | (a) "All open" by default, plus a seeded "To list" saved view |
| B2 | (a) done and cancelled are closed, every other status is open |
| B3 | The owner wants to use Todoist. The live API check is the owner's, after delivery (runbook under B3) |
| B4 | (a) sidecar keyed by Todoist id |
| B5 | Few open tasks carry dates (owner's estimate, not measured): only "All open" and "No date" ship |
| B6 | (a) Rust records headings; the one-time index rebuild is accepted |
| B7 | (a) task tags follow the note tag rule; Issue 31 is wontfix |
| L1 | (a) the token stays in the vault, documented (Issue 25 rewritten) |
| L3 | (a) no automatic send |
| L4 | (a) the tasks-view Issues stay; audit 34, 35, 55 and 122 are wontfix |

No assumption (A1 to A12) was vetoed.

### Blocking decisions (answer before the Issues they gate)

- **B1. Default list and `#to-list`** (gates Issue 17).
  - (a) Open on "All open" (every note, default excludes on), plus a seeded "To list" saved view in a vault that has a `#to-list` heading.
  - (b) Keep the `#to-list` heading card as the default source, removable.
  - **Default: (a).**
  - Cost: (a) changes the first screen from a short curated list to every open task in the vault. The default excludes (assumption A4) remove template placeholders, the system folder, type definitions and archived notes, but a large vault will still show many tasks, and the owner's curated list moves one click away. (b) keeps that list first, and a vault without the heading keeps an empty first run unless the card is removed.
  - Until Issue 17, every Issue keeps `#to-list` as the default, shown in the rule sentence with a Clear action, so nothing regresses before saved views and persistence exist.
- **B2. Open vs closed** (gates Issue 06).
  - (a) Done and cancelled are closed. Todo, in progress, question, important and forwarded are open. This is the calendar's rule.
  - (b) Forwarded is closed too.
  - (c) Keep "anything but todo is closed".
  - **Default: (a).**
  - Cost: (a) and (b) change the default view, the two code paths that read `checked` (`tasks.logic.ts:22`, `:40`, `:103`) and the `filterCompletedTasks` / `filterCompleted` / `computeTaskStats` cases that pin them (`tasks.logic.test.ts:22-227`). (c) keeps in-progress work hidden. Rust `checked` and QueryJS `completed` keep their meaning in every option.
- **B3. Is Todoist in real use, and what does a 404 mean** (gates Issues 21-24 and 30; Issue 20 fixes an error-handling rule violation and ships either way).
  - Confirm real use. If it is not used, Issues 21-24 and 30 are closed as wontfix and only the error surfacing in Issue 20 is kept.
  - Run two live calls with the owner's token, one on a completed task id and one on a deleted one, to learn whether `GET /api/v1/tasks/{task_id}` returns the task, 404, or something else. Verified so far: the SDK `getTask` JSDoc says "Retrieves a single active (non-completed) task by its ID" (`node_modules/@doist/todoist-sdk/dist/types/todoist-api.d.ts:155-160`), and the v1 docs say "Returns a single active (non-completed) task by ID" and list 404 among its responses (https://developer.todoist.com/api/v1/#tag/Tasks/operation/get_task_api_v1_tasks__task_id__get, read 2026-11-06). Neither says which status a completed or a deleted id gets, so the live check stays. The v1 404 body is JSON: `{ "error": "Task not found", "error_code": 478, "error_tag": "NOT_FOUND", "http_code": 404, ... }` (https://developer.todoist.com/api/v1/#tag/Migrating-from-v9).
  - The same session confirms the recurring `dueString` form Issue 24 sends (`every week starting 2026-11-10`).
  - **Default: treated as used, and the wording is "closed in Todoist (completed or deleted)" until the live check is done.**
  - **Runbook for the owner** (endpoints checked against the v1 OpenAPI spec on 2026-11-06; it creates, closes and deletes one test task in the owner's account). With `T` set to the token from the vault's `.kokobrain/settings.json` (`todoist.apiToken`) and `A=https://api.todoist.com/api/v1`:
    ```sh
    ID=$(curl -s -X POST "$A/tasks" -H "Authorization: Bearer $T" -H 'Content-Type: application/json' -d '{"content":"kokobrain API test","due_string":"every week starting 10 Nov 2026"}' | python3 -c 'import json,sys; d=json.load(sys.stdin); print(d["id"]); print(d.get("due"), file=sys.stderr)')
    curl -s -X POST "$A/tasks/$ID/close" -H "Authorization: Bearer $T" -o /dev/null -w '%{http_code}\n'
    curl -s "$A/tasks/$ID" -H "Authorization: Bearer $T" -w '\n%{http_code}\n'   # completed id: what comes back?
    curl -s -X DELETE "$A/tasks/$ID" -H "Authorization: Bearer $T" -o /dev/null -w '%{http_code}\n'
    curl -s "$A/tasks/$ID" -H "Authorization: Bearer $T" -w '\n%{http_code}\n'   # deleted id: what comes back?
    ```
    The `due` printed by the first call shows whether Todoist read the start date (Issue 24). The task is recurring, so `close` moves it to the next date instead of completing it; if the third call shows an active task, repeat the steps without `due_string` to see a completed id. Record the results here; Issue 20's icon title and Issue 24's date format follow them.
- **B4. Todoist identity** (gates Issues 22 and 30).
  - (a) A sidecar keyed by Todoist id, matched on the task's `🆔` signifier when present, then on `relPath` plus the clean description, with a "possibly sent" row state (see Todoist below).
  - (b) Write the `🆔 <todoist id>` signifier into the task line on send. The parser already reads it (`parsing.rs:1483`, `metadata.id`). Matching is then exact and survives rewording and renames.
  - **Default: (a).**
  - Cost: (a) loses the exact link when a task is reworded, and falls back to "possibly sent" on the row. (b) changes one line in a note per sent task, through the guarded write, and shows the signifier in the editor. It also uses a field Obsidian Tasks reserves for dependencies: `🆔 abcdef` names a task that `⛔ abcdef` on another task depends on, and should be unique across the vault (https://publish.obsidian.md/tasks/Getting+Started/Task+Dependencies, read 2026-11-06). A Todoist v1 id such as `6XGgmFVcrG5RRjVr` fits the allowed characters (letters, digits, `_`, `-`), so Obsidian Tasks would read it as a dependency id. A task with its own `🆔` keeps it and stays on (a).
- **B5. How many of the owner's tasks carry dates and priorities** (gates Issue 18).
  - Count, from the owner's vault, open tasks and the share that carry `📅` (due), `⏳` (scheduled), `🛫` (start) or a priority emoji (`🔺⏫🔼🔽⏬`) (`parsing.rs:1449-1454`, `:1474-1480`). For example, with the vault path as the only path: `rg -c '^\s*([-*+]|\d+[.)]) \[[^xX-]\]' --glob '*.md' <vault>` for open tasks, and the same piped through `rg '📅|⏳|🛫|🔺|⏫|🔼|🔽|⏬'` for dated ones.
  - **Default:** if under about 20% of open tasks are dated, ship only "All open" and "No date" as built-ins and lead the empty states with how to add a date. Otherwise ship All open, Today, Overdue, Next 7 days and No date.
- **B6. Heading clause semantics and the index rebuild** (gates Issues 11, 12 and 27; Issues 13 and 15 are specified for (a) and are re-checked once it is answered).
  - (a) Rust records each note's headings and each task's nearest heading (DTO change, `INDEX_SCHEMA_VERSION` one above its value on main at `index_cache.rs:18`, one full index rebuild per vault on first launch). The heading clause matches a whole tag, case-insensitive, under any ancestor heading, with an optional substring mode. `get_tasks_in_section_v2` and its disk re-read go away (Issue 27).
  - (b) Keep the disk re-read and only add a word boundary.
  - **Default: (a).**
  - Cost of (a), stated against today's scan, which already keeps deeper sub-headings: matching becomes case-insensitive (`#To-List` now matches), it gains a word boundary (`#to-listing` stops matching), and it fixes one edge case. Today a nested heading that also carries the tag re-anchors `section_level` (`parsing.rs:1739-1742`), so under `## A #to-list` / `### B #to-list` / `### C`, the `### C` tasks are dropped though C is under A. Under (a) they are kept. The parity fixture covers exactly these three cases. (b) keeps the disk scan on every refetch and gives no heading grouping.
- **B7. Task tag rule** (gates Issues 26 and 31). Open Issue `audit-2026-11-05/142` names this an owner decision ("Owner decision first: today it is ASCII only and already accepts `#2024`") and plans its own change to the note tag rule.
  - (a) Task tags use the same scanner as inline note tags (Unicode letters, nested `/`), so they also follow `audit-2026-11-05/142` when it lands.
  - (b) Keep task tags ASCII only.
  - **Default: (a).**
  - Cost: (a) changes `metadata.tags` and `description` for non-ASCII tags, and so do the labels Todoist receives. Today's note rule also rejects a digit-first tag and needs whitespace or line start before `#` (`parsing.rs:453-470`), so `#2026` and `page#section` stop yielding task tags. A parser output change needs an `INDEX_SCHEMA_VERSION` bump (`index_cache.rs:13-17`): one more full index rebuild per vault. (b) keeps `#revisão` split into the tag `revis` plus `ão`.
  - Both options must also fix a defect that exists today: `TASK_TAG_RE` (`parsing.rs:1577-1578`) reads a `#` anywhere, so `read [[Book#Chapter 2]]` yields the tag `Chapter` and the description `read [[Book 2]]` (`parsing.rs:1845-1859`), and that description and label are what Todoist receives (`todoist-bridge.logic.ts:43`, `:58-60`). Under (a) Issue 26 fixes it, because the note scanner reads `#` only after whitespace or line start (`parsing.rs:453-462`). Under (b) Issue 31 adds only that boundary and keeps the ASCII class.

### Assumptions (stated so the owner can veto; not blocking)

- **A1. Toggle semantics.** Only the circle toggles, and clicking the text opens the note at the line. Ticking an open task writes `[x]`, unticking a closed task writes `[ ]`, and under B2 (a) a tick never turns `[/] [!] [?] [>]` into `[ ]`. Cost: the e2e spec's click on task text changes (`e2e/specs/tasks-view.spec.ts:52-54`).
- **A2. The date filter means the due date.** Overdue, today, next 7 days, no date. A task without a due date is "no date". Note mtime stays only as the "Note edited in the last N days" option.
- **A3. One grouping level.** Folder groups use the full relative path. Files sort by path, not mtime, so groups stop moving after each save. Priority "none" sorts between medium and low (`TaskPriority.ts:7` lists it in that position; the Obsidian Tasks convention, from memory).
- **A4. Default excludes.** Four toggles, all on: archived notes, type definitions (`isTypeDefinition`, `type-definitions.logic.ts:91`), the templates folder and the system folder (`settingsStore.templates.folder` and `.systemFolder`, `settings.types.ts:169-177`). Inbox notes stay included. A source card that names archived notes overrides that one exclude, as `.view` filters do (Issue view-unification/19). The toggles ship in Issue 13, the override in Issue 28.
- **A5. Tags.** The `noteTag` source clause matches note tags. Task tags are a task filter (Issue 19), which works on whatever tags Rust emits. Which characters a task tag may hold is decision B7 (Issue 26). The ASCII-only rule at `parsing.rs:1574-1578` came from mirroring the old TS `\w` parser (`git show 9f457365b`, the removed comment), not from a product need.
- **A6. Persistence.** Per-vault `.kokobrain/settings.json`, key `tasksView`, after `audit-2026-11-05/115` ships. Named saved views.
- **A7. Editing scope.** Status (todo, in progress, done, cancelled), due (today, tomorrow, next week, a picked date, clear) and priority from the row. Undo is a toast. No done-date stamp, no recurrence spawn.
- **A8. Keyboard.** Arrows, Home/End, Space and Enter, plus two palette commands. No bare-letter shortcuts in v1.
- **A9. Volume.** No virtualization. A group shows 50 rows, then "show N more".
- **A10. Tests.** jsdom component tests of `TasksView` with real stores and only `invoke` (and `plugin-fs` where needed) mocked; a few e2e happy paths; a Rust/TS parity fixture for the e2e task mock (`e2e/mocks/vault-index.ts:150-182`); Todoist tests mock only the SDK transport or `@tauri-apps/plugin-http`; a manual checklist for the live API, watcher timing, cost on a large vault and visual quality.
- **A11. "Only this" narrows.** "Only this folder/type" ANDs the clause into every source card (or adds one card when there are none), so the list never widens (Issues 14, 15). Cost: in a query with several cards, each card is narrowed to that folder or type; the owner removes the clause from a card to undo it.
- **A12. The user guide follows the view.** `help/documentation/10-tasks-and-todoist.md` describes today's toolbar (Filters table, `:93-103`), the click behavior (`:107-110`), the file grouping sorted by mtime (`:13`) and the Todoist badges (`:127-132`). Each Issue that changes one of those updates that part of the guide in the same delivery.

### Later decisions (not blocking any Issue but their own)

- **L1. Todoist token location** (Issue 25). The token is plain text in the vault's `.kokobrain/settings.json` (`settings.types.ts:243-245`), against ADR-0019 (`0019-kokobrain-in-vault-data-dir.md:61`, keys must not live in the vault). Note that the line still points at a keychain service that no longer exists.
  - (a) Keep it, and document that `.kokobrain` must be excluded from sync.
  - (b1) A new Rust command pair that reads and writes a file under the Tauri app config dir, registered in `lib.rs`'s `invoke_handler` and `contracts/commands.ts`. The app defines no app-command permissions (`src-tauri/build.rs` calls plain `tauri_build::build()`, and there is no `src-tauri/permissions/`), so no capability entry is needed (Tauri 2 behavior from memory). No such mechanism exists today (no `app_config_dir`, `app_data_dir` or `plugin-store` use in `src-tauri/src` or `src/lib`).
  - (b2) Webview `localStorage`, as recent vaults (`vault.store.svelte.ts:46`) and theme vars (`theme.service.ts:55`) use. Plain text, per origin, lost if the webview storage is cleared.
  - (c) The OS keychain. ADR-0013 adopted the macOS Keychain and was superseded when the feature was removed, to keep the codebase cross-platform (ADR-0013 front matter). Choosing (c) re-adds a native, platform-specific dependency.
  - **Default: (b1).** Cost: one new Rust command pair, a one-time move from the old key, and the token is per machine.
- **L2. Todoist SDK line.** Newest 15.x under the dependency policy. 16 and 17 are breaking (scout 21) and get their own spike later.
- **L3. Rules for which tasks go to Todoist.** The complaint's "rules for how tasks are picked up" is read here as the view's sourcing. It can also be read as rules that pick which tasks are sent to Todoist. This run keeps every send user-triggered and per row (Target design; bulk send is a non-goal), and no Issue builds send rules.
  - (a) No automatic send. Revisit after saved views ship.
  - (b) Later: a saved view (Issue 17) doubles as a send rule, with a "Send all not sent" action on that view. This needs bulk send and a confirmation step first.
  - **Default: (a).** Cost: if the owner meant (b), the Todoist part of the complaint is only half answered by this run.
- **L4. Duplicate Issues in audit 2026-11-05** (see Risks, "Duplicate Issues"). Audit 2026-11-05 Issues 34, 35, 55 and 122 each ask the owner to keep either themselves or the matching tasks-view Issue (02, 04, 06, 20).
  - (a) Keep the tasks-view Issues. The audit twins are closed as wontfix (`Status: wontfix` and the ledger row), the audit's convention for work closed without a delivery.
  - (b) Keep the audit Issues and rewrite the matching tasks-view Issues on top of them.
  - **Default: (a).** Cost: (a) keeps one spec per behavior, and the tasks-view Issues cover more (02 adds the text and status guard that 122 asks for, and the status-preserving tick that 34 asks for). Under (b), Issues 02, 04, 06 and 20 are re-specified and the chain 01-10 waits for it. Until L4 is answered no relay run picks the audit twins (they are `needs-info`), so the tasks-view Issues are not gated on it. No tasks-view Issue edits or deletes an audit file: each names its twin in the delivery comment, and the main session closes the twin only after the owner answers L4.

## Target experience

### The pane

```
+--------------------------------------------------------------------------------+
| Tasks                               [/ Search tasks      ]  [Sync] [Display v] |
+-----------------+--------------------------------------------------------------+
| LISTS           | All open tasks                        42 tasks in 11 notes   |
|  All open       | Showing open tasks from every note, except archived notes,   |
|  No date        | templates and the system folder; due this week.      [Edit]  |
|                 | [Status: open v] [Due: any v] [Priority v] [Tag v]  Reset    |
| SAVED           | Group: note   Sort: due, priority          * modified [Save] |
|  To list        +--------------------------------------------------------------+
|  Work           | v Projects/ACME (2)                       [Only this] [Hide] |
|  + Save view    |  ( ) Send invoice to ACME     high  Nov 3                  T |
|                 |  (/) Draft Q4 plan            in progress                    |
+-----------------+--------------------------------------------------------------+
```

`( )` todo, `(/)` in progress, `(x)` done, `(-)` cancelled, `(?)` question, `(!)` important, `(>)` forwarded. `T` is the Todoist state.

**Narrow pane.** The Tasks tab sits in the editor area (`EditorView.svelte:71-72`) next to the left sidebar. Below 720 px the list column becomes a dropdown above the rule sentence. Below 560 px the quick filters fold into one "Filters (n)" button, and each row puts its chips (status word, due, priority, recurrence, tags, Todoist) on one wrapped meta line under the text instead of trailing columns.

### Sourcing rules

- **One sentence for the whole query.** Above the list a single sentence describes sources, excludes and the active quick filters, like `describeViewFilters` (`lens.logic.ts:853-863`). No rule is hidden. Until Issue 13 the sentence covers the section tag only.
- **Source cards.** Cards are ORed. Each card holds clauses that are ANDed: folder (prefix, recursive), type (`_type`), note tag (exact, or nested prefix), property (`is`, `is not`, `contains`, `exists`), lifecycle (inbox, organized, favorite, archived), heading (whole tag, case-insensitive, any ancestor heading, optional substring mode). Folder, type and tag clauses can be negated. No cards means every note.
- **Excludes always win**, except the archived override in A4. The four defaults and any number of excluded folders, tags and types.
- **Contextual entry points.** A group header offers "Only this folder/type" and "Hide this note/folder/type" (adds an exclude). Rules are made from what the user sees. "Only this" narrows the list: with no cards it adds one card holding the clause, and with cards it adds the clause to every card, because an extra card would be ORed and widen the list (assumption A11). There is no "Only this note": no clause kind names a single note.
- **Value pickers** suggest folders, tags, types, property keys and headings that exist in the vault (the tag index is at `index.rs:1032`). Issue 28.
- **Empty states.** When the query matches nothing, the empty state names which part is responsible (sources, excludes or a quick filter) and offers to open Sources or reset that part. When the index is not ready, it says "Loading" instead of "0 tasks".

### Filtering

- Quick filters, task-level only:
  - status: open, closed, all, or a set of statuses;
  - due: any, overdue, today, next 7 days, no date;
  - priority: a set of levels;
  - task tag (Issue 19).
- "Note edited in the last N days" stays as one option in the Due menu (A2).
- The search box matches the task description and the note title.
- Note fields (folder, type, note tags, properties) are never quick filters. They belong to Sources, so each question has one place.
- "Reset" clears the quick filters back to the list's saved values.
- **Parents.** In note and heading grouping, a parent task that fails the filter stays visible, dimmed, while a child matches; the count includes only real matches. In every other grouping rows are flat, and a child shows its parent's description as a small breadcrumb.

### Grouping and sorting

- The Display menu has one grouping level: note (default), folder (full relative path, "Vault root" at the root), note type ("No type" bucket), note property (pick a key; scalar values group by value, list values by their joined sorted values, plus an "(empty)" bucket), heading, due bucket (Overdue, Today, Tomorrow, This week, Later, No date), priority, status.
- Note and heading groups keep document order. Other groupings sort by due date, then priority, then path and line. Groups collapse. Rows are keyed `filePath:lineNumber`, which flat groupings need (today the key is `lineNumber` inside a per-file `{#each}`, which is fine for the current layout, `TasksView.svelte:179`, `:199`).

### Lists and views

- **Ownership of rules.** Global excludes (the four defaults plus any added in Sources > Global) apply to every list and view. A view's own excludes only add to them. A view's sources, quick filters, group and sort belong to the view.
- **Built-in lists** are defined in code (which ones depends on B5). Editing anything on a built-in list makes a session override, shown as "modified", with "Save as view" and "Reset". The override is not persisted.
- **Saved views** hold a name plus a `TaskQuery` (Issue 17). Editing a saved view shows "modified" with "Save" and "Revert" (Issue 29). The marker covers sources, excludes, quick filters, group and sort. Views can be renamed, duplicated and deleted.
- **Migration** (Issue 17, B1): a vault with a `#to-list` heading gets a seeded "To list" view holding the heading card. After a restart the view reopens the last list.
- **Smart-list empty states** (Issue 18): "Today: nothing due" differs from "No task in this vault has a due date", which explains the `📅` signifier and offers the row's Set due action.

### In-view editing

- Only the circle toggles. Clicking the text opens the note at the task's line (`openNoteAt(path, { kind: 'line', line })`, `open-note-at.service.ts:35`, as `EventTaskChip.svelte:34` does). Wikilinks and URLs inside the text keep their own click.
- Ticking and unticking follow A1.
- The row menu sets status, due and priority (A7). Each edit rewrites only that line.
- **Every write is guarded.** Rust compares the line on disk with what the view showed (the task text and its status, since `Task.text` excludes the checkbox, `task.rs:23`) and writes nothing when they differ. The list refreshes and a toast explains why. That closes `audit-2026-11-05/122`.
- **The row shows the result at once** (see "Freshness after the view's own writes").
- Each menu edit shows an undo toast that restores the previous line through the same guarded command.

### Keyboard and accessibility

- The list stays mounted during a refetch, with a small spinner in the toolbar instead of the "Indexing tasks..." swap.
- Roving focus over rows, following the calendar keys pattern (`event-calendar-keys.logic.ts`): arrows and Home/End move, Space toggles, Enter opens the note at the line. `isTypingTarget` (`event-calendar-keys.logic.ts:80`) moves to `utils/` so the keys stay off inside text fields, popovers and dialogs.
- The list has `role="list"`, each checkbox is labelled with the task text, toolbar toggles carry `aria-pressed`, and the Todoist trigger is a visible row action instead of an `opacity-0` button (`TodoistPopover.svelte:113`). The tab takes focus when it opens.
- Palette commands: "Tasks: Show all statuses / Show open only" and "Tasks: Sync Todoist" (only with a token).

### Todoist in the view

- Each row shows one of: not sent, sent, possibly sent, closed in Todoist, error. The state is a quick filter (Issue 23).
- Send stays a per-row popover.

## Data model and architecture

### Task model

The Rust `Task` (`task.rs:19-35`) stays the source of truth. Issue 11 (B6) adds, instead of a heading chain copied into every task:

- `NoteEntry.taskHeadings: Vec<TaskHeading { level, text, line }>`: the headings of a note that has tasks, in order, empty for a note without tasks. The frontmatter block and code fences are skipped, so a YAML comment line such as `# note` is not a heading (`entry.rs:249` passes the full content to `extract_tasks`, and `HEADING_RE` at `parsing.rs:1440-1441` would match it).
- `Task.heading: Option<u32>`: the index of the nearest heading above the task in `taskHeadings`. Ancestors follow from the levels.

Both are `#[ts(export)]` changes (Both gate) and bump `INDEX_SCHEMA_VERSION` (one full rebuild per vault; tell the owner first). `FileTaskGroup` and the calendar are unchanged.

`checked` stays as it is. A pure `isTaskOpen(status)` in `features/tasks/task-status.logic.ts` (Issue 06) becomes the one definition of open and closed. Hide-completed, stats, strike-through, the status quick filter and the calendar chip use it.

In TS each task becomes a flat `TaskRow`, built in one pure pass in `features/tasks/task-query.logic.ts`:

```ts
interface TaskRow {
	key: string;            // `${filePath}:${lineNumber}`
	filePath: string;       // absolute (indexing rule 9)
	relPath: string; folder: string; noteTitle: string;
	noteType: string | null; noteTags: string[];
	archived: boolean; organized: boolean; favorite: boolean;
	properties: Record<string, JsonValue>;   // the note's frontmatter
	headings: string[];     // ancestor heading texts, outermost first (Issue 12)
	lineNumber: number; indent: number;
	text: string; status: TaskStatus; open: boolean;
	description: string; due?: string; scheduled?: string; start?: string;
	priority: TaskPriority; recurrence?: string; tags: string[];
}
```

Until Issue 12, `TaskRow` is built from `get_all_tasks_v2` and the note fields are empty. Issue 12 moves the build to the entries snapshot and deletes `fromV2` (`tasks.service.ts:18-46`) and the hand-written `FileTaskGroup` (`tasks.types.ts:20-29`), so a new Rust field can no longer be dropped silently.

### One query model

```ts
interface TaskQuery {
	version: 1;
	sources: TaskSource[];          // ORed; [] = every note
	exclude: TaskExcludes;          // adds to the global excludes
	quick: { show: 'open' | 'closed' | 'all'; statuses?: TaskStatus[]; due?: DueRange;
	         priorities?: TaskPriority[]; tags?: string[]; search?: string };
	group: TaskGroupKey;            // 'note' | 'folder' | 'type' | { property: string } | 'heading' | 'due' | 'priority' | 'status'
	sort: TaskSortKey[];
}
interface TaskSource { clauses: TaskSourceClause[] }   // ANDed
type TaskSourceClause =
	| { kind: 'folder'; path: string; negate?: boolean }
	| { kind: 'type'; type: string; negate?: boolean }
	| { kind: 'noteTag'; tag: string; negate?: boolean }
	| { kind: 'property'; key: string; op: 'is' | 'isNot' | 'contains' | 'exists'; value?: string }
	| { kind: 'lifecycle'; state: 'inbox' | 'organized' | 'favorite' | 'archived' }
	| { kind: 'heading'; text: string; match: 'tag' | 'substring' };
interface TaskExcludes { archived: boolean; typeDefinitions: boolean; templatesFolder: boolean; systemFolder: boolean; folders: string[]; notes: string[]; tags: string[]; types: string[] }
```

- Two levels. Note-level `sources` and `exclude` decide which notes supply tasks. Task-level `quick` decides which of their tasks pass. Sources are structured clauses, not `.view` expressions, because `.view` evaluation errors silently become "no match" (`collection.logic.ts:320-324`).
- The type is built up by Issues 07, 08, 12, 13, 14 and 15. Each Issue adds only the fields it uses.

### Where it runs

- **Fetch.** Issues 01-11 keep `get_all_tasks_v2` / `get_tasks_in_section_v2` and the direct refetch after a toggle (`tasks.service.ts:150`), which is fresh. Issue 12 moves the fetch to `getVaultEntries()` (`vault-entries.service.ts:36`, memoized per `vaultIndexVersion` and shared with QueryJS), which already carries tasks, `isA`, tags, lifecycle flags and frontmatter, and stops calling `get_tasks_in_section_v2`. Issue 27 removes that command and its disk re-read (`commands/vault.rs:736-753`).
- **Evaluate.** `task-query.logic.ts` is pure. It takes the rows, the query, `today` as `YYYY-MM-DD`, the settings folders and (Issue 23) a Todoist state map, and returns groups with counts. The store exposes the result through a getter over a module-level `$derived` (ADR-0034), and that getter has a test.
- **Why not Rust.** The snapshot already holds every input. Revisit only if a `TASK-PROFILE` debug log shows the pass stalling on the owner's vault.

### Freshness after the view's own writes

The entries memo is only as fresh as the last version bump, which is throttled to 2 s, up to 10 s in a burst (`tauri-listeners.service.ts:106`, `vault-entries.service.ts:13-17`; indexing rule 12). Today the toggle avoids this with a direct refetch (`tasks.service.ts:105-108`, `:150`). Once Issue 12 moves the fetch to the memo, a direct refetch returns the same stale snapshot, so:

1. Every task write goes through one helper, `afterTaskWrite(path, updatedContent)` in `tasks.service.ts` (Issue 03). Before Issue 12 it refetches as today.
2. Issue 12 changes the helper: `toggleTask` and `updateTask` call `vaultStore.requestPromptIndexRefresh()` right before the write command (as `lifecycle.service.ts:34` and `collection.service.ts:33` do), so the bump runs at once, and the helper applies the returned `updatedContent` to a local overlay keyed by `filePath:lineNumber` (the line's new text and status), which `buildTaskRows` applies on top of the snapshot. Each overlay entry is dropped once `vaultIndexVersion` reaches the write's `updateResult.version`.
3. The guard compares text and status, so a second click inside the window is computed from the overlay and does what the user meant. A test pins this.

### Writes reach search and the QueryJS cache

Today a toggle relies on the watcher to update FTS5, the semantic index and the TS note-change consumers. The watcher skips a batch whose paths were all saved by the editor in the last 15 s (`watcher-handler.service.ts:44`, `editor.hooks.ts:24`, `:68`), and the dirty-buffer protocol saves the tab right before the Rust write (`tasks.service.ts:126`), so that update can be lost. Issue 03 fixes it in `afterTaskWrite`: `markRecentSave(path)` and `applyNoteChange({ kind: 'upsert', source: 'task', path, content, vaultPath })`, where the new `task` row in `SOURCE_POLICY` (`note-change.service.ts:86-96`) has `rust: 'never'` (Rust already indexed the note), `consumers: 'always'`, `mark: true`, then `notifyContentInvalidated()`. `applyNoteChange` stays the one owner (indexing rule 6).

### Storage

- The active list, the saved views, the global excludes and the display state go under a `tasksView` key in per-vault `.kokobrain/settings.json` (A6), after `audit-2026-11-05/115`. Nothing is persisted today (`tasks.store.svelte.ts:4-33`).
- Schema: `{ version: 1, activeList: string, globalExcludes: TaskExcludes, savedViews: { id, name, query: TaskQuery }[] }`. Reading tolerates unknown keys and fills missing ones with defaults.
- Layers: `core/settings/settings.types.ts` must not import `TaskQuery` or `TaskExcludes` from `features/tasks` (core to features, `layer-rules.test.ts`). Core declares `tasksView` as an opaque JSON value, and `features/tasks` parses and validates it.

### IPC changes

| Change | Issue | Gate |
|---|---|---|
| `toggle_task_status` gains `expectedText`, `expectedStatus` and `target` (computed in TS by `toggleTarget`, A1), and refuses with `stale: true` in `ToggleTaskResult` when the line differs | 02 | Both |
| `update_task_lines { path, edits: [{ lineNumber, expectedText, expectedStatus, newText, newStatus }] }`: atomic, all or nothing; Rust keeps each line's indent and list marker, sets the checkbox char for `newStatus` and replaces the text after `] `, and refuses a `newText` that holds `\n` or `\r` | 09 | Both |
| `NoteEntry.taskHeadings`, `Task.heading`, schema bump | 11 | Both |
| Remove `get_tasks_in_section_v2` | 27 | Both |
| `TASK_TAG_RE` replaced by the note tag scanner (B7; parser output change: no DTO change, but an `INDEX_SCHEMA_VERSION` bump, `index_cache.rs:13-17`) | 26 | Both |
| `TASK_TAG_RE` reads `#` only after whitespace or line start (B7 (b) only; parser output change and schema bump as above) | 31 | Rust |
| Todoist token read/write commands (L1 b1 only; no Todoist API call moves to Rust, the SDK stays in TS behind `tauri-fetch-adapter.ts`) | 25 | Both |

Issues 11, 26 and 31 each bump `INDEX_SCHEMA_VERSION`, so they never run in parallel: two branches that both change 5 to 6 merge cleanly and leave one bump for two parser changes. 26 and 31 are Blocked by 11; only one of them runs (B7). If the owner wants the tag fix before headings, flip the dependency. Each bump is one above main at merge time, re-checked after any rebase.

- **Confinement.** Every task write command refuses a path outside the open vault, using the open-root accessor from `audit-2026-11-05/134`, as `audit-2026-11-05/135` requires for `toggle_task_status` (`commands/vault.rs:765`, `:779`). Issue 02 changes an existing command and adds no new write surface, so 135 confines it under its new signature. Issue 09 adds a new command, so it waits for 135 and includes its own outside-vault test.
- Every write command updates the index and emits `vault-index-updated` the way `toggle_task_status` does (`commands/vault.rs:804-829`). There is no new `writeTextFile` site in TS. The TS orchestration keeps the dirty-buffer protocol (`tasks.service.ts:121-155`): save a dirty tab, compare the line, write, then `syncExternalContentToEditor`, then `afterTaskWrite`.
- The e2e mock (`e2e/mocks/tauri-core.ts:156-160`, `e2e/mocks/vault-index.ts:150-182`, `:478-490`) changes with each command.

## Todoist

### Current defects

1. **Completion may never show.** The code turns any 404 into `todoistCompleted: false` (`todoist.service.ts:84-89`, `:270-275`), detected by message substring instead of the SDK's `httpStatusCode` (`dist/types/types/errors.d.ts:4` in the installed SDK). The substring matches only because the SDK's message is `HTTP 404: Not Found` (`dist/esm/transport/fetch-with-retry.js:143`). The endpoint is documented to return active tasks only (B3), so if the docs hold, `checked` is never true and the completed icon never shows; what a completed or deleted task returns is unverified (B3).
2. **Fragile identity.** The key is `${filePath}:${text}` (`todoist.store.svelte.ts:24-31`), with an absolute path and the raw text including signifiers (`todoist.service.ts:215-223`). Editing the task, adding a date or renaming the note makes it look unsent, and two identical lines share one key.
3. **A send can be forgotten.** The entry goes into memory, then to disk (`todoist.service.ts:213-224`). When the save fails after the POST succeeded, a restart forgets the task and a re-send duplicates it.
4. **A corrupt sent file is overwritten** with `[]` (`todoist.service.ts:103-131`). Covered by `audit-2026-11-05/116`, blocked by `/115`.
5. **Failures are silent.** Per-task sync errors go to `debug()` only (`:276-278`), and the toolbar button calls `console.error` (`TasksView.svelte:85-91`), against the repo's error-handling rule.
6. **The token is plain text inside the vault** (L1).
7. **Smaller defects.** A recurrence drops the explicit due date (`todoist-bridge.logic.ts:51-56`). The default label is added to every send without being shown (`todoist.service.ts:207-211`). Project and section pagination is ignored (`:22`, `:42`) and the project list never refreshes (`:137-144`). Once a send used a section, every later popover in the session preselects it (`TodoistPopover.svelte:61`) and the section list has no "No section" item (`:187-191`), and a send without a section never clears the remembered one (`todoist.service.ts:228`). These five are Issue 24. Sync fires every request at once with no 429 handling (`:263`), Issue 20.

**SDK and API line.** The installed SDK is `@doist/todoist-sdk` 15.8.0 (`package.json:33`), the renamed `@doist/todoist-api-typescript` (https://github.com/Doist/todoist-sdk-typescript). It calls the unified Todoist API v1 (`dist/esm/consts/endpoints.js:7-8`). REST v2 and Sync v9 were shut down on February 10, 2026 (https://groups.google.com/a/doist.com/g/todoist-api/c/brwENjfT_tk), so nothing here targets a deprecated API and no Issue needs a bump. The SDK retries only network errors (`dist/esm/transport/fetch-with-retry.js:17-24`), never a 429.

Defects 1 and 5 are Issue 20, 2 is Issues 22 and 30, 3 is Issue 21, 4 is `audit-2026-11-05/116`, 6 is Issue 25.

### Target design (v1)

One-way, note to Todoist, always user-triggered.

- **No lost send.** After a successful POST, the sidecar save is retried once. If it still fails, a persistent toast shows the Todoist URL so the task can be found, and the in-memory entry stays so the row shows "sent" for the session. There is no pending/unconfirmed state: an entry written before the POST has no Todoist id, and nothing could check it. The SDK's `addTask(args, requestId?)` (`todoist-api.d.ts:212`) might deduplicate retries through `X-Request-Id`, but the v1 docs show that header only in one `curl` example and give it no semantics (the only documented idempotency is the Sync command `uuid`, https://developer.todoist.com/api/v1/, read 2026-11-06), so it stays an unverified option until a live check. The URL in that toast is built by the SDK (`dist/esm/utils/url-helpers.js:41-43`): v1 task objects have no `url`, and the documented format is `https://app.todoist.com/app/task/<id>` (https://developer.todoist.com/api/v1/#tag/Migrating-from-v9, "Task URLs").
- **Honest sync.** Read `httpStatusCode`. Wording "closed in Todoist (completed or deleted)" until B3's live check. A summary toast for failures and a per-row error state. At most 3 requests in flight (a design choice: the v1 docs publish rate-limit numbers only for `/sync`, https://developer.todoist.com/api/v1/#tag/Request-limits), and a 429 waits once for `error_extra.retry_after` seconds, read from the snake_case `responseData` of the `TodoistRequestError` (the docs place `retry_after` there; the SDK keeps only status and body, not the `Retry-After` header, `dist/esm/transport/http-client.js:41-44`).
- **States.** Not sent, sent, possibly sent, closed in Todoist, error.

### Identity strategy (B4 default)

The link lives in the sidecar `.kokobrain/todoist-sent.json`, keyed by Todoist task id.

- Entry v2: `{ todoistTaskId, url, relPath, description, legacyText?, lineHint, sentAt, closed?, syncedAt? }`.
- Matching an entry to a task, in order: the task's `🆔` signifier when it equals the stored id; then `relPath` plus the clean `description` (signifiers ignored, so editing the date, priority or tags keeps the link); then the nearest `lineHint` when two tasks tie.
- **Possibly sent.** Before a "not sent" row offers Send, the entries with the same `relPath` that match no task are checked. If one exists, the row shows "Possibly sent (reworded?)" with Relink (re-keys that entry to this task) and Send anyway. This keeps a reworded task from being sent twice by one click.
- **Renames.** A path-change consumer (`registerPathChangeConsumer`, `path-change.service.ts:73`) re-keys `relPath` on rename or move (Issue 30).
- **Never deleted automatically.** An entry that matches nothing in any note shows in a small "Unlinked" list in the Todoist popover with Relink and Forget (Issue 30).
- **Backward compatibility.** The legacy array (absolute `filePath` plus `text`) is read and converted in memory. The file is written as v2 only after a load that succeeded (the rule from `audit-2026-11-05/116`). A legacy-file test pins this.

## Risks and must-not-regress

- **Writes.** No write without the guard and the dirty-buffer save (`tasks.service.ts:121-155`). Keep the request-sequence guard (`:53-84`) and the discard of in-flight fetches on vault reset (`:203-207`). No new `writeTextFile` site. `markRecentSave` only together with `applyNoteChange`.
- **Index invariants.** Follow `docs/agents/indexing-watcher-rules.md` rules 1, 2, 6, 9 and 12: absolute paths in IPC, re-read on `vaultIndexVersion`, no TS mirror of the task index (the overlay is per written line and dropped at the next bump), one owner for note changes.
- **Shared consumers.** The calendar (`event-calendar.service.ts:119`) and QueryJS (`queryjs.logic.ts:125-130`, firewall snapshot `kbapi-firewall.test.ts:293-295`) read the same `Task`. Rust `checked` and QueryJS `completed` keep their meaning. Issue 11's new fields reach `NoteEntryV2` but not `KBPageV1`, so the firewall test stays green with no snapshot change.
- **Todoist data.** `todoist-sent.json` stays readable in the legacy format, is never saved after a failed load, and no entry is deleted automatically.
- **The `#to-list` workflow.** Until Issue 17 the default stays `#to-list`. After it, the "To list" view reaches the same list in one click. The heading semantics change (B6) is documented in the user guide (`help/documentation/10-tasks-and-todoist.md:97-103`) and pinned by the parity fixture.
- **Silent rules.** A rule that matches nothing because notes are still loading says so instead of "0 tasks".
- **Layers.** Features do not import plugins (ADR-0003). `layer-rules.test.ts` stays green with no new baseline entry.
- **Tests that change on purpose, in the same Issue as the behavior:** `tasks.logic.test.ts` (completed semantics, mtime filter), `tasks.store.test.ts` (the `dateFilter` and `hideCompleted` cases at `:11-53`, Issue 07; the `#to-list` default, Issue 17), `tasks.service.test.ts` (the `toggleTask` cases at `:215-293`, Issue 02; the section cases at `:90`, `:183`, `:192`, Issue 12), `task-toggle-dirty-buffer.test.ts` (calls `toggleTask(path, lineNumber)`, Issue 02; `:133` names `get_tasks_in_section_v2`, Issue 12), `e2e/specs/tasks-view.spec.ts` (click on task text, the `button[title*="completed"]` selector at `:47`, section tag textbox).
- **Other open Issues on the same files.** On 2026-11-06 audit 2026-11-05 closed the cross-feature Issues this PRD was written against as wontfix and moved each into `.scratch/audit-2026-11-05/issues/`; the references here use the new numbers: `file-io-audit/24` is now 122, `audit-2026-11-04/03` is 115, `/05` is 134, `/14` is 116, `/16` is 135, `ux-polish/48` is 84, `ux-polish/59` is 145, `ux-polish/60` is 146, `tags-obsidian-parity/01` is 142. `audit-2026-11-05/84` swaps the raw palette classes in `TasksView.svelte` (`:184`, `:252`) and adds a test against new ones, so Issues 05, 20 and 23 use theme tokens. `audit-2026-11-05/145`/`146` move the tasks empty state onto an `EmptyState` primitive and ban raw `String(err)` copy in `TodoistPopover`, so Issues 04 and 20 follow both rules. `audit-2026-11-05/142` changes the note tag rule that Issue 26 makes task tags share. `audit-2026-11-05/78` corrects the current guide text about `#to-list` and the mtime date filter; Issues 07, 12 and 13 rewrite the same section (A12), so whichever lands second rewrites it against the code it ships.
- **Duplicate Issues in audit 2026-11-05** (decision L4): `audit-2026-11-05/34` (open vs closed, and the toggle of `[/]`) overlaps Issues 02 and 06, `/35` (list stays mounted) overlaps Issue 04, `/55` (Todoist sync failures) overlaps Issue 20, and `/122` (stale list toggles the wrong line) overlaps Issue 02. Each of those four is `needs-info` with "Keep this Issue or that one, and close the other".
- **Gates.** Every `#[ts(export)]` change, doc comments included, regenerates `src/lib/contracts/generated/` and runs the Both gate from the checkout or worktree root.
- **Manual only.** The live Todoist API and the http capability scope (`capabilities/default.json:227-262`), real watcher timing, the cost of the TS pass on the owner's vault (reported, not a gate), VoiceOver in the Tauri webview, visual quality.

## Issues

Issues live in `issues/`. "Requires" names a prerequisite in another feature, which relay-lite cannot express in `Blocked by`; such an Issue stays `needs-triage` until the prerequisite is resolved.

| # | Issue | Blocked by | Waits on |
|---|---|---|---|
| 01 | Clicking task text opens the note at the line | none | |
| 02 | Guarded, status-preserving toggle | 01 | |
| 03 | Task writes reach search and the QueryJS cache | 02 | |
| 04 | The list stays mounted, and the rule explains itself | 01 | |
| 05 | Rows show status, dates, priority, recurrence and tags | 02, 04 | |
| 06 | Open means not done and not cancelled | 05 |  |
| 07 | Quick filters on status, due and priority | 06 | |
| 08 | Group and sort by note, folder, due, priority or status | 07 | |
| 09 | Set status, due and priority from the row, with undo | 03, 08 | audit-2026-11-05/135 |
| 10 | Keyboard navigation and accessible rows | 08 | |
| 11 | Rust records task headings | none |  |
| 12 | Tasks come from the entries snapshot, and the heading rule runs in TS | 03, 08, 11 |  |
| 13 | Sources panel with source cards and default excludes | 12 |  |
| 14 | Property clause and "Only this / Hide this" actions | 13 |  |
| 15 | Group by note type, note property or heading | 14 |  |
| 16 | The view's rules survive a restart | 13 | audit-2026-11-05/115 |
| 17 | Saved views and the "To list" migration | 16 |  |
| 18 | Built-in smart lists and their empty states | 07, 17 |  |
| 19 | Task tag quick filter | 07 | |
| 20 | Todoist sync failures are visible and read the HTTP status | none | |
| 21 | A Todoist send is never silently forgotten | 20 | audit-2026-11-05/116 |
| 22 | Todoist link survives edits, and reworded tasks show "possibly sent" | 07, 21 | audit-2026-11-05/116 |
| 23 | Todoist state on each row and as a quick filter | 07, 10, 22 |  |
| 24 | Todoist send: full project lists, refresh, the default label and recurring due dates | 20 |  |
| 25 | Say plainly that the Todoist token lives in the vault | none |  |
| 26 | Task tags follow the note tag rule | 11 |  |
| 27 | Remove `get_tasks_in_section_v2` and its disk re-read | 12 |  |
| 28 | Lifecycle clause, the archived override and value pickers | 14 |  |
| 29 | The "modified" marker with Save, Revert and Reset | 17 | |
| 30 | Todoist links follow renames, and unmatched entries are listed | 22 |  |
| 31 | A `#` inside a link or URL is not a task tag | 11 | wontfix (B7 a) |

Issues 26 to 30 were split out of 19, 12, 13, 17 and 22 to keep each Issue to one run; they are numbered after 25 so the earlier numbers stay stable. Issue 31 was added by the completeness review: it gives the link defect under B7 an owner when B7 is answered (b).

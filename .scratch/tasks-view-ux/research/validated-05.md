# Validated 05: scouts 09 (date filter semantics) and 10 (status and checkbox consistency)

Adversarial check of `scout-09-date-filter-semantics.md` and `scout-10-status-and-checkbox-consistency.md`. Every claim below was re-read in code on main (HEAD 23f6c1f91). Nothing was run. Paths are relative to the repo root.

The biggest finding is not about either scout's code claims, which mostly hold. Both scouts missed that this exact redesign already has an owner-answered PRD (`.scratch/archived/tasks-view/PRD.md`, decisions dated 2026-11-06) and a chain of `ready-for-agent` Issues in `.scratch/open-itens/issues/` (108 to 130). Several of the scouts' "open questions for the owner" are already answered there, and two recommendations contradict those answers. See "Missed by scouts".

## Confirmed

### Scout 09

| Claim | Evidence |
|---|---|
| `filterByDate` filters whole groups by `modifiedAt >= now - days*86400000`, never reads task metadata, `now` is injectable | `src/lib/features/tasks/tasks.logic.ts:76-88` |
| `TaskDateFilter = 'all' \| 'last7days' \| 'last30days'` | `src/lib/features/tasks/tasks.types.ts:32` |
| Pills hard-coded, first toolbar item; pipeline is `filterByDate` then `filterCompleted` in a `$derived.by`, `stats` derived from it | `TasksView.svelte:25-29`, `:94-104`, `:46-54` |
| Store `dateFilter` defaults to `'all'`, reset on vault change, not persisted | `tasks.store.svelte.ts:6,22,29`; `resetTasks` called from `src/lib/app/lifecycle/app-lifecycle.service.ts:664` |
| `modifiedAt` is file mtime in seconds from Rust, multiplied by 1000 in `fromV2` | `tasks.service.ts:20-24`; `src-tauri/src/vault/index.rs:1070-1083` |
| Groups arrive sorted by mtime descending, both fetch paths | `index.rs:1082`; `src-tauri/src/commands/vault.rs:728` |
| A toggle rewrites the file and re-indexes with the fresh mtime, so the toggled note jumps to the top and into every "recent" window | `commands/vault.rs:802-804` (`write_atomic`, `read_file_mtime_secs`, `update_note_in_index_inner`) |
| Todoist sync also refreshes mtime (scout marked this inferred; it is true) | Todoist writes go through `write_task_lines` (`src/lib/features/todoist-sync/closed-note-writer.service.ts:43`), which does `write_atomic` then indexes with the fresh mtime (`commands/vault.rs:938-940`) |
| The per-file date in the header is mtime, `en-US` short format | `TasksView.svelte:80-87`, `:159-161` |
| Rust `TaskMetadata` carries due, scheduled, start, created, done, cancelled dates as optional `YYYY-MM-DD` strings, plus priority, recurrence, id, dependsOn, onCompletion, tags, description | `src-tauri/src/vault/task.rs:76-131` |
| Date extraction: emoji signifier, optional whitespace, `\d{4}-\d{2}-\d{2}`; first match per field; match stripped from description; no calendar validation | `src-tauri/src/vault/parsing.rs:1449-1456`, `:1495-1501`, `:1781-1797` |
| `fromV2` copies all metadata; nothing in the view, store or logic reads it | `tasks.service.ts:31-45`; grep of `src/lib/features/tasks` |
| The row renders raw `task.text` (signifiers included) | `TasksView.svelte:194` |
| Calendar keeps only tasks with a valid `dueDate`, uses `description \|\| text`, sorts by date, path, line | `src/lib/features/event-calendar/event-calendar-tasks.logic.ts:37-42`, `:49-66` |
| `isValidDayKey` rejects `2026-02-30` by round trip | `event-calendar-dates.logic.ts:77-79` |
| Recurrence is raw text only; toggle writes only the checkbox char; no `done_date` writer exists in Rust | `task.rs:67-74`; `parsing.rs:1888-1919`; grep of `src-tauri/src` finds `done_date` only in the parser and a test |
| `computeTaskStats` counts `completed` from `checked`; the view shows only total and file count | `tasks.logic.ts:91-113`; `TasksView.svelte:144-146` |
| `filterCompletedTasks` relies on document order and `indent` within one file | `tasks.logic.ts:17-52` |
| No test builds a task with a due date; `filterByDate` tests use mtime offsets 1, 10, 60 days | `src/tests/lib/features/tasks/tasks.logic.test.ts:168-191`; grep for `dueDate` in that folder is empty |
| Both fetch paths run the same task-line parser, so dates arrive either way | `commands/vault.rs:673-676` doc; `parsing.rs:1635-1674` |

### Scout 10

| Claim | Evidence |
|---|---|
| Seven statuses, char mapping, unknown char falls back to todo, done writes lowercase `x` | `src/lib/contracts/generated/TaskStatus.ts:7`; `task.rs:42-51`; `parsing.rs:1591-1616` |
| Task regexes accept `[xX \-/?!>]`, need whitespace after `]` and non-empty text | `parsing.rs:1426-1435`, `:1640`, `:1661` |
| `checked` is `check_char != ' '` | `parsing.rs:1649`, `:1666`; doc `task.rs:25` |
| Duplicate char maps in Todoist code | `src/lib/features/todoist-sync/vault-scan.service.ts:19-27`; `task-line.logic.ts:118-133` |
| Editor uses `markdown({ extensions: [GFM, ...] })`; Lezer GFM TaskList matches only `[ xX]` | `src/lib/core/markdown-editor/highlight-styles.ts:87`; `node_modules/@lezer/markdown/dist/index.js:2223` |
| `taskMarkerHandler` replaces the marker with `TaskCheckboxWidget` unless the line is revealed; `checked = content !== '[ ]'` | `.../live-preview/inline/handlers/simple-widget-handlers.ts:19-32` |
| Widget: `<input type=checkbox>`, `mousedown` does `preventDefault` and writes `' '` or `'x'`, no `stopPropagation`, `ignoreEvent()` false | `.../live-preview/widgets.ts:28-57` |
| Checkbox CSS: 18px square, 2px border, `--radius-xs`, checked fill and CSS checkmark | `.../live-preview/styles.ts:231-262` |
| The dash before a task is hidden with a `font-size: 0` mark only when the ListItem has a `Task` child; a `- [/] x` line gets a bullet widget and raw `[/]` | `simple-widget-handlers.ts:66-79`, `:89-96`; `styles.ts:128-131` |
| Handler tests cover only `[ ]`, `[x]` and cursor-on-line | `src/tests/lib/core/markdown-editor/extensions/live-preview/inline/handlers/simple-widget-handlers.test.ts` (as cited) |
| Tasks view glyph: `Circle` / `CircleCheckBig` 16px, chosen by `toggleTarget`; text strike uses `checked` | `TasksView.svelte:171`, `:182-186`, `:191` |
| `toggleTarget`: done and cancelled reopen, every other status completes | `task-status.logic.ts:7-9` |
| With hide-completed on (default), `[/] [!] [?] [>]` are hidden; with it off they show an open circle next to struck text | `tasks.logic.ts:22`, `:40`; `TasksView.svelte:171-191`; the test at `src/tests/lib/features/tasks/TasksView.test.ts:139` even says "Hide completed hides every checked row, `[!]` included" and turns it off to test the row |
| `EventTaskChip` closes only done and cancelled | `src/lib/features/event-calendar/EventTaskChip.svelte:16-18` |
| The `toggle_task_status` IPC accepts any `TaskStatus` as `target` | `src/lib/contracts/commands.ts:108-109` |
| Live-preview rule 1 (one-line replace, no new `font-size: 0` marks) and rule 11 (`stopPropagation` on widget `mousedown`) are stated as quoted | `docs/agents/live-preview-rules.md:5`, `:27` |
| `core/` may not import `features/` | ADR-0003 table; `src/tests/lib/architecture/layer-rules.test.ts` |

## Refuted or corrected

1. **Scout 09: "`eventCalendarViewStore.todayKey` is a reactive, clock-driven today" (`event-calendar-view.store.svelte.ts:87`).** Only partly true. `todayKey` is `toKey(new Date(nowMs))` (`:87-89`), and `nowMs` changes only through `setNow` (`:190-192`). The clock that calls it is ref-counted and runs only while a consumer holds `acquireCalendarClock()` (`src/lib/features/event-calendar/event-calendar.service.ts:298-313`). If the Tasks view read `todayKey` without acquiring the clock, it would get a value frozen at module load or at the last Calendar tick. The existing Issue 109 uses `formatNow('YYYY-MM-DD')` from `src/lib/utils/date.ts:15` instead, and Issue 111 accepts that "a pane left open past midnight updates on the next refetch".

2. **Scout 09: the feature-to-feature import has "no stated rule against it", and the helpers should maybe move to `utils/`.** Wrong on the rule. ADR-0003's 2026-11-01 amendment (`docs/adr/0003-*.md:37`, `:91`) explicitly allows feature to feature imports as long as they form no cycle, and `src/tests/lib/architecture/feature-cycle.test.ts` enforces that (`FEATURE_CYCLE_EDGES_SIZE = 0`). The real risk is a cycle. Issue 110 adds `event-calendar -> tasks` (`EventTaskChip` imports `isTaskOpen`). If the Tasks view also imported `event-calendar-dates.logic.ts` or `eventCalendarViewStore`, you would get `tasks -> event-calendar` as well. That is a cycle, and `feature-cycle.test.ts` fails on it. Scout 10's shared `TaskCheckbox` in `features/tasks` used by `EventTaskChip` creates the same edge. `today` already exists in `utils/` (`formatNow`), so the Tasks view does not need the calendar helpers. If day-key validation is needed, `parseDateKey` in `src/lib/utils/note-date.ts:31` already rejects impossible days, though it also accepts a time suffix.

3. **Scout 09: "render `metadata.description` instead of raw `text`" (recommendation 4, and problem 5 citing the Calendar).** Unsafe as stated. `TASK_TAG_RE` (`parsing.rs:1579-1580`) strips any `#word`, including inside links. The strip runs on the whole text (`parsing.rs:1871`), so `read [[Book#Chapter 2]]` becomes the description `read [[Book 2]]` and the wikilink breaks. Issue 109 handles this with a `taskDisplayText` fallback to raw text when a link holds `#`, the description is empty, or a bare URL holds `#`. The Calendar's `description || text` has the same defect today. That is out of scope here but real.

4. **Scout 09: "existing `task_lines.rs` has a due-date patch concept for Todoist, `task_lines.rs:104`".** False. `task_lines.rs` contains no due or date handling at all: grep for `due|date` matches only `UpdateResult` and `validate`. Line 104 sits inside the `TaskLinesStaleReason` enum. `write_task_lines` replaces whole lines located by anchor. The planned path for writing dates from the row is a new `update_task_lines` command (PRD line 320, Issue 122, which is `needs-triage`).

5. **Scout 09: "Next 7 days" means `[T, T+6]`.** This conflicts with the spec that already exists. Issue 111 defines next7 as "from today through today + 7 days, both ends included", and its test keeps `2026-11-12` when today is `2026-11-05`. Either definition is defensible, but tickets must follow the written one or change it on purpose.

6. **Scout 09: date buckets (Overdue / Today / Upcoming / No date) are "the largest cheap win" and should get a default-capable "Group by date" mode.** This contradicts the owner's answer B5 (PRD:62): "Few open tasks carry dates: only 'All open' and 'No date' ship". Issue 125 explicitly leaves Today, Overdue and Next 7 days lists for later. Due filtering and due grouping still exist as options (Issues 111, 112). Date-first layouts, though, are not the owner's priority.

7. **Scout 09 open questions 2, 3, 4, 7, 8 and scout 10 open question 2 are already answered** (PRD "Owner answers (2026-11-06)" and assumptions, none vetoed, PRD:56-69, :121-132):
   - Mtime filter: kept only as "Note edited in the last N days" inside the Due menu (A2; Issue 111 `edited7`/`edited30`).
   - Default list: "All open" by default plus a seeded "To list" saved view (B1; Issue 124), not the `#to-list` section default.
   - Open vs closed: done and cancelled are closed, everything else is open (B2 (a); Issue 110 records "Answered").
   - Done-date stamping and recurrence spawning: out of scope (PRD:38, A7).

8. **Scout 10 recommendation 3: adopt the editor's square checkbox in the Tasks view, and rename `--lp-task-*` to neutral `--task-*` tokens.** Both parts are wrong.
   - The shape conflicts with Issue 109's agreed `statusGlyph` table, which uses lucide circle icons per status (`circle-dot`, `circle-minus`, `circle-alert`, ...). The calendar chip also uses circles.
   - The rename breaks the theme contract. `--lp-task-*` is not a dark-only literal. It is the `preview` group of `ThemeColors`: `taskBorder`, `taskHover`, `taskChecked` and `taskCheckmark` (`src/lib/core/settings/theme.types.ts:161`), mapped to `--lp-*` by `GROUP_PREFIX.preview = 'lp-'` (`theme.logic.ts:24-30`, `:60-75`). They are set on the root element for every theme, light ones included (`theme.service.ts:16-21`), derived by the theme builder (`theme-builder.logic.ts:273`) and edited in the theme editor (`theme-editor.logic.ts:139`). Renaming them would orphan saved user themes. This also settles scout 10's open question 6: light themes do get these tokens. The `.dark` block values in `src/app.css:313-316` are only the stylesheet fallback.

9. **Scout 10 recommendation 1 proposes `isClosedStatus(status)` in `task-status.logic.ts`.** The exported name `isClosedStatus` already exists in `src/lib/features/todoist-sync/task-line.logic.ts:118-120` with a different signature (it takes the status char). Issue 110 already specifies the same fix under the name `isTaskOpen(status)`, including `toggleTarget` rebuilt on it, the help-guide update and the e2e selector change. Use Issue 110 rather than a new ticket.

10. **Scout 10 recommendation 4 (share one status model in `utils/`, used everywhere).** The direction is fine for the editor, but it must exclude QueryJS. QueryJS is a fourth task surface the scout did not list. It exposes `completed: t.checked` (`src/lib/plugins/queryjs/queryjs.logic.ts:127`) and renders read-only checkboxes (`src/lib/plugins/queryjs/kb-api.ts:348-366`). The PRD and Issue 110 pin that `completed` keeps its meaning, because of the KB API firewall (PRD:37).

11. **Minor stale or off-by-a-few line references.** None of these changes a conclusion.
    - Scout 09 cites `task.rs:76-125`, `:50-58`, `:66-69`, `:19-20`, `:21`. The actual lines are `:76-131`, `:53-65`, `:67-74`, `:23`, `:25`.
    - Scout 09 cites `commands/vault.rs:790-794` and `:810-818` for the toggle. The actual lines are `:786` and `:802-804`.
    - Scout 10 cites `tasks.store.svelte.ts:11` for `hideCompleted`; it is `:10`.
    - Scout 10 cites `src/app.css:72-73` for `--success`/`--warning`. They are at `:200-201` (light) and `:274-275` (dark).
    - Scout 10 says `listMarkHandler` "replaces `- ` with a bullet widget". Correct: `UnorderedListMarkerWidget`, even though the handler's doc comment says the dash is hidden for a `::before` bullet.

## Missed by scouts

1. **A full PRD and an Issue chain already exist for this redesign.** Both scouts missed it. The PRD is `.scratch/archived/tasks-view/PRD.md`, with research and a mockup next to it. The Issues are in `.scratch/open-itens/issues/`, mapped in `priority-2026-11-08.md:337`:
   - 108: list stays mounted, rule sentence, empty state names the cause
   - 109: row status glyphs and chips for due, scheduled, start, priority, recurrence and tags, plus `taskDisplayText`
   - 110: open means not done and not cancelled
   - 111: quick filters on status, due and priority, plus search; replaces the mtime pills and the eye toggle
   - 112: group and sort by note, folder, due, priority or status
   - 113: keyboard and a11y
   - 124, 125: saved views and smart lists
   - 122: row edits of status, due and priority with undo (`needs-triage`)

   108 to 113 are `ready-for-agent` and blocked in a chain (109 by 021 and 108, 110 by 109, 111 by 110, 112 by 111). 021 and 114 are resolved. New tickets from this research should extend or amend these, not duplicate them. Both scouts' recommendations map almost one to one:
   - scout 09 slice A is 109
   - slice B is 112
   - slice C is 111
   - slice D is 110
   - slice E is 122
   - scout 10 slice 1 is 110
   - scout 10 slice 2 is part of 109 and 113

2. **Line numbers inside those Issues are stale.** For example, Issue 108 cites `TasksView.svelte:169-176` and Issue 109 cites `:197-269`, but the file is now 223 lines and the list starts at `:137`. An agent picking them up must re-trace. The current-code facts in this file can serve as the refresh.

3. **The user guide is wrong today and has to move with every slice.** `help/documentation/10-tasks-and-todoist.md:101-103` says the Date filter "filter[s] tasks by date" (it is note mtime) and that Hide completed hides "`- [x]` done tasks" (it hides every non-todo status). PRD assumption A12 requires each Issue to update the guide in the same delivery.

4. **An e2e selector depends on the hide-completed title.** `e2e/specs/tasks-view.spec.ts:47` uses `button[title*="completed"]`. Any rename of the toggle (Issue 110 says "closed") or its replacement by a Status menu (111) breaks it, so those slices need `bash scripts/e2e.sh`.

5. **The current test pins the hiding of `[!]`.** `TasksView.test.ts:139-140` turns hide-completed off on purpose. Issue 110 notes that changing the open rule rewrites existing "anything but todo is completed" cases deliberately, and the commit must say so (CLAUDE.md never-weaken rule).

6. **Every refetch unmounts the list.** `buildTaskIndex` sets `isLoading` on each call (`tasks.service.ts:67`), the view swaps the whole list for "Indexing tasks..." (`TasksView.svelte:139-140`), and a refetch runs on every index version bump and after every toggle (`tasks.service.ts:178`). Scout 10 mentions it only through scout 01. It drives a lot of the "ugly" feel and is Issue 108.

7. **The midnight rollover policy is already chosen** (refresh on next refetch, Issue 111). A live clock would need either the calendar clock, which creates a cycle (see refuted 2), or a new tick in `utils/` or `core/`. Scout 09's "re-evaluate at midnight" is a scope increase that needs an owner decision, not a default.

8. **Hierarchy under filters is already specified.** Issue 111's `applyQuickFilters` keeps a failing parent dimmed when a later row in its subtree passes, and adds `parentLine` to rows. That answers scout 09's adjacency concern for filters. For grouping by due (Issue 112), whether a child follows its parent or its own date remains open. Scout 09 question 6 is still valid there.

9. **`settleTaskWrite` already routes task writes to FTS5, semantic and QueryJS** (`src/lib/core/filesystem/task-write.service.ts`, applyNoteChange with source `task`). Issue 114 is resolved. Any new task write path, such as a due-date write, must go through `settleTaskWrite` (indexing rule 6: `applyNoteChange` is the one owner).

## Net recommendations that survive

1. Do not open parallel tickets. Use Issues 108 to 113, refreshing their line numbers against current code. Add tickets only for gaps those Issues do not cover. Candidate gaps from these two scouts:
   - (a) editor parity for `[/] [-] [?] [!] [>]` (scout 10 recommendation 5), which no Issue covers;
   - (b) an optional live midnight refresh;
   - (c) the parent-versus-own-date rule for due grouping in Issue 112.
2. The open rule (done and cancelled closed) is decided. Implement it via Issue 110 as `isTaskOpen`, not `isClosedStatus`. Leave QueryJS `completed` and Rust `checked` unchanged.
3. Show the description with Issue 109's `taskDisplayText` fallback, never raw `metadata.description`, because of the `#` stripping inside links.
4. Get `today` from `formatNow('YYYY-MM-DD')` (`utils/date.ts`). Do not import `event-calendar` from `features/tasks`, which would form a cycle with Issue 110's `event-calendar -> tasks` edge. Compare day keys as strings. Treat an invalid due date as "no date". The validator can live in `utils/` or in `tasks` itself; do not import it from `event-calendar`.
5. Keep circle glyphs per status (Issue 109) in the Tasks view and the calendar chip, using theme tokens only (`text-success`, `text-warning`, `text-destructive`, `text-primary`, `text-muted-foreground`). Leave the theme's `--lp-task-*` token names alone.
6. If editor parity is ticketed, it needs:
   - a Lezer extension that emits `Task` / `TaskMarker` for the extra chars inside a `ListItem`;
   - the shared char/status map in `utils/` (so `core/` can import it);
   - `stopPropagation` on the widget `mousedown` (live-preview rule 11);
   - a one-line `Decoration.replace` and no new `font-size: 0` marks (rule 1);
   - handler tests per char.

   Decide its click rule against `toggleTarget`, because today the editor writes `' '` for any checked char. It is a `core/` change and an owner call, not part of the Tasks view slices.
7. Date-first layouts stay secondary per B5. Due quick filters and due grouping ship as options, and the defaults stay "All open", grouped by note.
8. Each slice updates `help/documentation/10-tasks-and-todoist.md` and runs e2e when the toolbar markup changes. Changing pinned test cases is allowed only on purpose and must be named in the commit.

## Not checked

- I did not open every Issue from 112 to 130 in full. Only 108 to 111 and the headers of 112, 113, 122 and 125 were read.
- The PRD was searched for the cited decisions, not read end to end.
- Nothing was run, so the visual claims and the exact pass and fail behavior of `feature-cycle.test.ts` for a new pair come from reading code.

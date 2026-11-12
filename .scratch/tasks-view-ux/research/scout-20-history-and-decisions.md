# Scout 20: history and decisions behind the Tasks view

Scope: git history of `src/lib/features/tasks`, `docs/adr`, `.scratch` (open, archived, open-itens), help docs. Read-only. Nothing was run. Facts carry path:line or commit; opinions are marked. Dates are from `git log` (the repo clock reads 2026-11-12 today).

## Summary

The owner already complained about this exact view on 2026-11-06 ("very bad, too simple and not very usable, especially for rules on how tasks are picked up, how to filter, how to categorize, and the Todoist integration"). A 31-Issue plan (`.scratch/archived/tasks-view/PRD.md`, 30 scouts, 15 analyses, a mockup, owner answers B1-B7 and L1-L4) was written that day and 29 of its Issues now sit, mostly `todo`, in `.scratch/open-itens` as 108-130 and 074/075/198/227. Only three behavior Issues shipped (click opens note, guarded status-preserving toggle, writes reach search), and the Todoist half of the plan was overtaken by a separate two-way sync feature (ADR-0037, 2026-11-10) that removed the Todoist popover and Sync button from the view. The new redesign tickets must be reconciled against that backlog, not written beside it, and several of those Issues quote line numbers from a TasksView that no longer exists.

## Facts

### F1. Timeline of the feature (git log, `src/lib/features/tasks`)

- 2026-03-05 `b7358e712` initial; 2026-04-28 `333148ce1` migrated tags and tasks to the Rust-only path, `9f457365b` (2026-08-19) deleted the TS task-metadata parser. Parsing is Rust-owned now (`src-tauri/src/vault/parsing.rs`, `task.rs`).
- 2026-04-28 `062303269` / `b60c96fba` ("todoist sdk change", "todoist change"): first Todoist code.
- 2026-05-11 `c28d1489d` first e2e spec `e2e/specs/tasks-view.spec.ts`; 2026-05-25 `0c586dce1` removed a flaky toggle test, `71f599701` fixed toggle tests.
- 2026-06-11 `6e8d79738`, `4ca706ad1`: default Todoist label setting.
- 2026-10-30 `1dcfae4b1` (list scrolls when taller than tab), `8a845d9c1` (wikilinks and markdown links rendered in rows), `25d91cdc3` (right sidebar hidden while the Tasks tab is active).
- 2026-11-02 `b4f126bf2` (save dirty tab before toggle), `839fc0b93` (section scan reads only notes with tasks, off main), `25c5f2b93` (no task scan on vault open).
- 2026-11-04/05 chrome passes: `de5a00085`, `48bf52fe9`, `96e7d186e` (shared `pane-toolbar` row), `1e021b796`, `22178ce9e` (hover-only controls also on focus).
- 2026-11-06 `ce1f0ac3c` Issue 01: clicking text opens the note at the line.
- 2026-11-09 `fc8741157` Issue 021 guarded status-preserving toggle; `108a60047` Issue 114 task writes reach search and QueryJS cache; `1dbeac3ca`, `e982782b8` Todoist-sync groundwork.
- 2026-11-10 `13f3f2758` (brain-written task created in Todoist), `5417b0501` (retire old Todoist send path, document two-way sync).
- Note: there is no commit that ever redesigned the layout. The toolbar (date pills, eye, section tag, file groups) is original. All history after April is safety, perf, theming and Todoist work. (Fact from `git log`; the "no redesign" reading is mine.)
- Reverted attempts: none found. `git log --all -i --grep=revert` over the feature and its e2e spec returns only `9f457365b`, which is a deletion of dead code, not a revert. The only removed UI is the Todoist popover and Sync button (see F5).

### F2. Current view as shipped (verified, `src/lib/features/tasks/TasksView.svelte`, 223 lines)

- Toolbar: three date pills `All time / Last 7 days / Last 30 days` (`:25-29`, `:94-105`), hide-completed eye (`:108-121`), `section tag` input debounced 400 ms (`:124-133`, `:37-39`). Uses the shared `pane-toolbar` utility (`:92`).
- Body: `ScrollArea` with `p-4` (`:137-138`), "Indexing tasks..." replaces the whole list while `isLoading` (`:139-140`), "No tasks found" for every empty cause (`:141-142`), one count line (`:144-146`), groups per file with `text-purple-400` file name, modified date and count (`:152-165`).
- Rows: circle toggle with `aria-label` (`:177-187`), text click opens note at the line unless a selection exists (`:64-69`, `:188-193`), wikilinks and URLs rendered (`:194-212`), strike-through on `task.checked` (`:191`).
- Todoist: no popover, no Sync button, no `todoist` import in the view any more (removed by `5417b0501`).
- Store defaults, in memory only: `sectionTag = '#to-list'`, `hideCompleted = true`, `dateFilter = 'all'` (`tasks.store.svelte.ts:4-33`). Nothing persists across restart.
- `task-status.logic.ts:7-9`: `toggleTarget(status)` = `todo` for done/cancelled, otherwise `done` (the shipped Issue 021 rule). The circle icon follows this (`TasksView.svelte:170-186`), not `task.checked`.
- Stale guard in the service: `toggleTask` sends `expectedText` and `expectedStatus` and handles `result.stale` (`tasks.service.ts:150-154`).
- Entry points: command `tasks:toggle` "Toggle Tasks View" (`src/lib/app/commands.ts:197-200`), keybinding (`src/lib/app/global-keybindings.ts:116`). Help page `help/documentation/10-tasks-and-todoist.md` still says "Tasks are grouped by their source file and sorted by file mo[dification]" and describes "every Markdown file", while the view actually lists only `#to-list` sections (open Issue 227 fixes the copy).

### F3. The prior plan: `.scratch/archived/tasks-view/` (written 2026-11-06)

- Files: `PRD.md` (421 lines), `spec.md`, `mockup.html` ("Tasks Pane Mockup", 55 KB, HTML mockup of the target pane), `research/` (30 scouts, 15 analyses), `issues/`, `ledger.md`.
- Owner's stated complaint (PRD:3): "very bad, too simple and not very usable, especially for creating specific rules for how tasks are picked up, how to filter, how to categorize, and the Todoist integration."
- Goals (PRD:25-30): visible editable sourcing, filtering on task data, categorizing by the owner's note model, saved views, safe in-view editing, honest Todoist link.
- Target layout (PRD:163-177): list column LISTS / SAVED with "+ Save view", main column with title + count, one sentence describing the rule with an Edit button, quick filter chips (Status, Due, Priority, Tag, Reset), "Group / Sort" line, a "modified" marker with Save, collapsible groups with "Only this / Hide" actions, row = status glyph, text, priority, due date, Todoist state letter. Narrow pane: list column becomes a dropdown below 720 px, quick filters fold into one "Filters (n)" button below 560 px (PRD:181).
- Owner answers (PRD:61-76), dated 2026-11-06:
  - B1: open on "All open" by default, plus a seeded "To list" saved view in vaults that have a `#to-list` heading. Until Issue 124 ships the default stays `#to-list`, visible in a rule sentence with a Clear action.
  - B2: done and cancelled are closed, every other status is open (the calendar's existing rule, `EventTaskChip.svelte:18` per PRD:15).
  - B3: owner wants Todoist (live API check is the owner's; superseded in practice by ADR-0037).
  - B5: "few open tasks carry dates (owner's estimate, not measured)": only "All open" and "No date" smart lists ship. Opinion: this is an estimate, and it weakens the case for a Today/Overdue-first redesign.
  - B6: Rust records headings, one-time index rebuild accepted. B7: task tags follow the note tag rule. L1: token stays in the vault, documented. L3: no automatic send to Todoist. L4: tasks-view Issues stay, audit twins 34/35/55/122 wontfix.
  - "No assumption (A1 to A12) was vetoed" (PRD:76). Includes: only the circle toggles (A1), date filter means due date (A2), one grouping level (A3), four default excludes (A4), per-vault persistence under `.kokobrain/settings.json` key `tasksView` (A6), edit status/due/priority from the row with an undo toast (A7), roving-focus keyboard (A8), no virtualization but "show 50 then N more" per group (A9), real stores in jsdom component tests (A10), "Only this" narrows (A11), user guide updated with each Issue (A12).
- Explicit non-goals (PRD:34-46): advanced `{and, or, not}` filter builder, live counts per card, group by task tag or Todoist state, group by parent note, quick add, multi-select and bulk actions, QueryJS `kb.tasks()`, `.view` row kind for tasks, calendar excludes, natural-language dates, virtualization, recurrence spawning, done-date stamping, kanban cards.

### F4. Where the 31 Issues ended up (`.scratch/open-itens/ledger.md`, rows cited by number)

- Done: 01 (archived ledger, `ce1f0ac3c`), 021 (`fc8741157`), 114 (`108a60047`), 229 (`8ab6672fa`, token-in-vault doc).
- wontfix since 2026-11-10 (ledger line 282, obsoleted by two-way sync): 072 (sync failures visible), 073 (send project lists), 127 (send never forgotten), 128 (link identity), 130 (renames). Their ledger rows are `wontfix` (`ledger.md:109,110,164,165,167`).
- `todo`, ready-for-agent, in dependency order: 108 list stays mounted and rule sentence (Blocked by none), 109 row chips (021, 108), 110 open means not done/cancelled (109), 111 quick filters (110), 112 group and sort (111), 113 keyboard and a11y (112), 120 task tag filter (111), 074 Rust task headings (none), 075 task tags follow note tag rule (074), 115 entries snapshot + heading rule in TS (114, 111, 074), 116 Sources panel + excludes (115), 117 property clause + Only this/Hide (112, 116), 118 group by type/property/heading (117), 119 lifecycle clause + pickers (117), 121 remove `get_tasks_in_section_v2` (115), 124 saved views + To list migration (123), 125 smart lists and empty states (111, 124), 126 modified marker (124), 129 Todoist state on rows and filter (111, 113), 198 status colors use theme tokens (151), 227 Tasks help copy.
- `needs-triage`: 122 row menu edits with undo (Blocked by 114, 112, 085; has an open "gap to settle": `write_task_lines` addresses a line by its `🆔 td-` anchor plus expected whole line, so a task with no anchor cannot be addressed, `122-row-menu-edits-with-undo.md`), 123 persist view state (112, 116, 030).
- The priority file (`.scratch/open-itens/priority-2026-11-08.md:60`) lists `TasksView.svelte` as a hot file for 108, 109, 110, 111, 113, 129, 198, 227. So the five view Issues all edit the same 223-line file and cannot run in parallel.
- `relay-lite` ignores triage labels, so `needs-triage` rows show as `todo`; launch only by explicit number, never `--all` (memory `relay-lite-ignores-triage-labels`, `priority-2026-11-08.md:Not ready to launch`).

### F5. Todoist moved out of the view (ADR-0037, 2026-11-10)

- `docs/adr/0037-todoist-two-way-sync.md`: a vault syncs one Todoist project tree through `/sync` commands, anchored by a visible `🆔 td-...` on the task line, two-base merge, Todoist wins, detach only. State lives in `<vault>/.kokobrain/kokobrain.db`. "The one-way popover, the per-task `getTask` polling and every read and write of `todoist-sent.json` were removed."
- Sync UI now lives in `src/lib/features/todoist-sync/` (`TodoistSection.svelte`, `TodoistSyncStatus.svelte`, `TodoistSyncLogDialog.svelte`), not in the Tasks view.
- Consequence for Issue 129 ("Todoist state on each row and as a quick filter", still `todo`): it was specified against the removed sidecar and per-row states (not sent / sent / possibly sent / closed / error). It needs rewriting against `todoist_task_link` and the `🆔 td-` anchor, or dropping. (Opinion: low value for a first redesign; the anchor already shows on the line.)
- ADR-0037 consequence worth noting for any row display: the `🆔 td-...` anchor is visible text in the task line. Task text rendering in rows currently shows raw text (`TasksView.svelte:194-212`), so anchors and emoji signifiers will appear in the row unless the row renders `metadata.description` (Issue 109 plans this).
- The user guide (`help/documentation/10-tasks-and-todoist.md`) was rewritten for two-way sync in `f95d2e1f9` (2026-11-10), but its Tasks View section was not touched.

### F6. Known bugs and decisions still true today (verified in code or PRD)

- The `#to-list` default hides everything on a vault without that heading ("No tasks found"); `e2e/specs/tasks-view.spec.ts` clears the textbox in every list test (PRD:14). Matching is case-sensitive substring, `#to-list` matches `#to-listing`, because `heading_text.contains(&tag)` (`parsing.rs:1739` per PRD, from `47ecf60ef`; not re-read here).
- "Completed" in the view still means `task.checked`, i.e. any status except todo (`TasksView.svelte:191`, `tasks.store.svelte.ts:10`); `[/]`, `[?]`, `[!]`, `[>]` tasks are struck through and hidden by default. Issue 110 changes this; calendar already uses done-or-cancelled.
- Date pills filter on the note file's mtime, not on a task date (`tasks.logic.ts:76-88` per PRD:17; the file still has `filterByDate`, imported at `TasksView.svelte:14`).
- Every refetch swaps the list for "Indexing tasks..." and runs on each `vaultIndexVersion` bump and after each toggle (`TasksView.svelte:73-78`, `:139-140`; `tasks.service.ts:67`, `:84`). Fixed by Issue 108 (not yet delivered).
- Empty state is one string for four different causes (ux-polish audit `work/views.md:40` called it "wrong state": "Tasks says 'No tasks found' while a #to-list section-tag filter is active"; quick fix suggested there: name the active tag, 30 minutes, `:79`).
- Colors: `text-purple-400` file header (`TasksView.svelte:154`); ux-polish Issue 48 / open-itens 198 wants theme tokens and a palette-class test. Raw `text-xs`/`text-sm` everywhere in the view while the chrome type scale tokens `text-label/meta/rail/row/title` exist (`src/app.css:76-106` per scout 01).
- No component test of `TasksView` exists (analysis-01 candidate "TasksView component test harness (none exists today)", `archived/tasks-view/research/analysis-01-ux-audit.md`); e2e only covers open, toggle, count with selectors that the redesign will break (`e2e/specs/tasks-view.spec.ts`; PRD:384 lists them: click on task text, `button[title*="completed"]`, the section tag textbox).
- Calendar reads `get_all_tasks_v2` with no section tag and its own open/closed rule, so it and the Tasks view disagree on scope (`archived/calendar-feature/work/40/discovery.md:4-6`; PRD:44 keeps the calendar unchanged).

### F7. Constraints the history imposes on UI work

- `pane-toolbar` is a shared single-row utility, `h-10`, with a test forbidding overrides (`src/tests/lib/pane-toolbar.test.ts`, cited in open-itens 108; `src/app.css:148-150` per scout 01; origin ux-polish Issue 50 `96e7d186e`). The planned multi-row layout (rule sentence, chip row, group/sort row) must sit below the toolbar in the content area, not inside it.
- Layer rules (ADR-0003): core settings cannot import `TaskQuery` from `features/tasks`; core stores the view state as opaque JSON (PRD:320). Persistence waits on audit 115 / open-itens 030 (settings load-failure guard); that is why 123 is blocked.
- The Tasks tab hides the right sidebar (`25d91cdc3`), so the pane gets the full editor width; there is no max-width today.
- Writes: never add a new `writeTextFile` site; every task write goes through the guarded Rust command plus the dirty-buffer protocol (`tasks.service.ts`, PRD:377). `write_task_lines` (todoist-bisync Issue 03) now exists and is anchor-addressed (see 122).
- Index rules for any fetch change (`docs/agents/indexing-watcher-rules.md`, repo `.claude/rules/indexing-watcher.md`): absolute paths over IPC, re-read on `vaultIndexVersion`, no TS mirror of the task index, `applyNoteChange` is the one owner of note changes.
- Tests: real stores, mock only Tauri IPC (CLAUDE.md); every computed getter tested; `fix:` commits need a test or `Test-Exempt`.
- Style rules from the repo: tabs, English UI text, no emojis or em-dashes in written output (project CLAUDE.md), JSDoc on exports, conventional commits with full detail.

### F8. Owner preferences found in memory and prior decisions (relevant, not exhaustive)

- Uses meta-bind, kanban, tables, canvas and Quick Capture; "no external sync" was the earlier note, now overtaken since Todoist two-way sync was built (`owner-feature-usage.md`, ADR-0037). Rank bugs by real likelihood.
- Gate matches what changed; small issues merge directly; serial checks only; max 3 relay workflows, 1 cargo build at a time (`gate-matches-what-changed.md`, `serial-checks-only.md`, `cargo-builds-throttled.md`).
- Do not change core write paths for rare corner cases (`no-core-changes-for-corner-cases.md`), so a redesign ticket should not add fsync or lock logic to the task writers.
- When the owner is away: mark owner-dependent Issues `needs-info` and keep going (`owner-away-mark-and-persist.md`).
- Relay launches ready-for-agent Issues without asking within limits; Issues with an "Owner decision recorded in Notes" criterion come back blocked, ask first (`relay-owner-decision-issues.md`).
- Sub-agent policy: ask for the agent count before fanning out (CLAUDE.md rule 6).

## Problems and opportunities

1. **Duplication risk.** A new ticket set for "make the view good" overlaps 108-113, 115-126, 129 almost completely. Writing fresh vertical slices without mapping to those would produce two backlogs, two sets of `TasksView.svelte` conflicts and two sets of owner decisions. (Opinion.)
2. **Stale specs.** Issues 108-113 cite `TasksView.svelte` line numbers from the 277-line version with the Todoist popover (for example 111 cites `:31-35` and `:107-117` for the date chips, 109 cites `:197-269` for the row, 113 cites `:216` for the `svelte-ignore`). The file is 223 lines now, so those citations are wrong and a relay build that trusts them will edit the wrong places. Todoist toolbar bits they mention (Sync button, popover trigger) are gone.
3. **Slow, serial plan.** The view chain 108 -> 109 -> 110 -> 111 -> 112 -> 113 is strictly serial and touches one file, so the visible result for the owner arrives only after 6 deliveries, and the Sources/Saved-views half (115-126) is another 8+ behind unmerged Rust work (074) and settings work (030). The owner's complaint is about the look and feel today; the plan front-loads plumbing. (Opinion.)
4. **Scope risk in the plan.** Source cards, property clauses, value pickers, saved views, smart lists and the modified marker are a query-builder product. PRD says the owner named "rules for how tasks are picked up". Unknown whether the owner still wants all of it after B5's "few tasks carry dates" and after seeing a cleaner single-list view. (Opinion; open question Q2.)
5. **Default-source contradiction.** B1 says the default becomes "All open" (every note, default excludes), but until Issues 115 to 124 ship the default stays `#to-list`. For a long time the first screen is still the hidden-rule view the owner called ugly. A quick, low-risk step is Issue 108's visible rule sentence with a Clear action.
6. **Row editing gap.** 122 needs an addressing decision (anchor vs line number) because `write_task_lines` is anchor-keyed. That is a Rust design question that blocks "set due/priority from the row", the feature that makes due filters useful.
7. **Todoist leftovers.** 129 is obsolete as written; Todoist rows now carry a visible `🆔 td-...` signifier that rows should hide or render as a small marker.
8. **Docs drift.** Help page section "Tasks View" is wrong about scope, grouping and statuses (open Issue 227, plus A12 says every Issue updates it). A redesign ticket that changes the toolbar must also touch `help/documentation/10-tasks-and-todoist.md`.
9. **Test debt.** No jsdom component test for TasksView; e2e selectors will break (PRD:384). Per CLAUDE.md, any UI slice needs a test, so the first slice has to create the harness.
10. **No visual reference in the repo for the target.** There is a mockup (`archived/tasks-view/mockup.html`) and an ASCII layout, but no screenshots in the current plan; the old PRD flagged "visual quality" as manual only (PRD:388).

## Recommendations for the redesign

1. **Treat 108-113 as the base of the UX tickets, and rewrite them, do not parallel them.** Re-read them against the current file, fix line numbers and drop the Todoist parts. Suggested re-slicing for fast visible results (my opinion, each slice ships on its own):
   - Slice A: list stays mounted + rule sentence + distinct empty states naming the cause (108 plus the empty-state half of 125 and the `work/views.md:79` quick fix). No data-model change.
   - Slice B: row display from existing Rust data: status glyph by status, due/priority/recurrence/tags chips, clean description, theme tokens instead of `text-purple-400` (109 plus 198 for this view only). Introduces the component test harness.
   - Slice C: open/closed rule change (110) together with quick filters on status, due, priority (111), since 110 alone only changes what the eye toggle hides. Replaces the mtime date pills.
   - Slice D: grouping and sorting (112), then keyboard/a11y (113). Keep one grouping level (A3).
   - Later, behind owner confirmation: sources/excludes (115-121), saved views and persistence (123-126), row menu edits (122), Todoist marker (129 rewritten or dropped).
2. **Keep the owner's approved decisions as constraints**: B2 (done/cancelled closed), A1 (only the circle toggles, text opens note), A2 (date filter = due date, mtime only as "note edited in N days"), A3 (one grouping level), A7/A8/A9, B5 (only All open and No date as built-in smart lists, unless measured otherwise), L3 (no auto send). They were not vetoed.
3. **Reuse shipped primitives**: `toggleTarget` (`task-status.logic.ts:7`), the `stale` guard in `toggleTask` (`tasks.service.ts:150-154`), `openNoteAt` (`TasksView.svelte:68`), `pane-toolbar`, theme tokens `--success`, `--warning` (`src/app.css:69`, `:193`, `:266` per open-itens 198), the calendar keys pattern for roving focus (`event-calendar-keys.logic.ts`, planned in 113).
4. **Respect the single-row toolbar rule**: put rule sentence, filter chips and group/sort controls in the body above the list, not in the `pane-toolbar` (`src/tests/lib/pane-toolbar.test.ts`).
5. **Fix the default before polishing**: a visible, clearable `#to-list` rule (108) is what stops the first-open "No tasks found". Do not change the default source without the Issue 124 migration (B1 says seed a "To list" view); changing it earlier would drop the owner's curated list.
6. **Do not rebuild Todoist UI in the view.** Sync lives in `features/todoist-sync/`. Row-level Todoist marker is optional and should read `todoist_task_link` through the sync store, not recreate per-row popovers.
7. **Order the work to avoid file conflicts**: all five view Issues edit `TasksView.svelte`, so run them one at a time, and give any new component (row, filter bar, empty state) its own file in `features/tasks/` early so later slices stop colliding (my suggestion; CLAUDE.md allows extracting when complexity justifies it).
8. **Docs and tests ride with each slice**: update `help/documentation/10-tasks-and-todoist.md` (and 227's copy) and `e2e/specs/tasks-view.spec.ts` in the same delivery (A12, PRD:384).
9. **Visual check is manual**: plan a screenshot checklist in each ticket (light and dark theme, narrow and wide pane), since PRD:388 states visual quality is not automatable.

## Open questions for the owner

1. Do you still want the full query model (source cards, excludes, saved views, smart lists, modified marker; Issues 115-126), or should the redesign stop at a good single list with quick filters, grouping and clearer rows first? The old PRD approved all of it on 2026-11-06, but nothing past Issue 021/114 has shipped.
2. Is `#to-list` still your daily convention? Until saved views exist the default stays `#to-list` (B1). Do you want the default flipped to "All open" earlier, accepting that the curated list moves one click away?
3. Your estimate in B5 was that few open tasks carry dates. Has that changed since the Todoist sync (which writes `📅` into lines)? If many tasks now have dates, Today/Overdue/Next 7 days smart lists become worth shipping first.
4. Should Todoist state appear on rows at all now that the anchor `🆔 td-...` is in the line text? Hide the anchor in the row, show a small marker, or neither (Issue 129 as written is obsolete)?
5. Row menu edits (122): is it acceptable for a task with no `🆔` to be addressed by line number plus expected text (as the toggle guard does), or should the menu add an anchor first? This blocks "set due/priority from the row".
6. Should the Tasks view and the calendar share one sourcing and open/closed rule? The PRD keeps the calendar unchanged apart from the shared open rule.
7. Where should view state live (per vault in `.kokobrain/settings.json` as A6 says, or app-level)? analysis-01 had suggested app settings; A6 (not vetoed) chose per vault, and it waits on settings Issue 030.
8. Any visual reference you like (the archived `mockup.html`, another app)? The old PRD had none beyond that mockup and an ASCII layout, and the stated goal is "not ugly".

## Evidence index

- `.scratch/archived/tasks-view/PRD.md`, `spec.md`, `ledger.md`, `mockup.html`, `research/analysis-01-ux-audit.md`, `analysis-15-history-and-risk.md`, `scout-18-scratch-history.md`
- `.scratch/open-itens/ledger.md`, `priority-2026-11-08.md`, `issues/108..130`, `074`, `075`, `198`, `227`, `021`
- `docs/adr/0037-todoist-two-way-sync.md`
- `.scratch/archived/ux-polish/work/views.md` (lines 13-40, 77-79), `issues/50-pane-toolbar-band.md`
- `src/lib/features/tasks/TasksView.svelte`, `tasks.store.svelte.ts`, `task-status.logic.ts`, `tasks.service.ts`
- `src/lib/app/commands.ts:197-200`, `src/lib/app/global-keybindings.ts:116`
- `help/documentation/10-tasks-and-todoist.md`, `e2e/specs/tasks-view.spec.ts`
- `git log -- src/lib/features/tasks` (commits in F1)
- Not checked: Rust parser line numbers (`parsing.rs:1739` etc.) were taken from the PRD at `47ecf60ef`, not re-read; whether any of Issues 108-113 were edited after 2026-11-08 beyond what the ledger shows; contents of `tasks.logic.ts` beyond the first 60 lines; the 30 scouts in `archived/tasks-view/research/` beyond the ones quoted.

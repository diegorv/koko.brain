# Validated 10: scout 19 (interactions) and scout 20 (history and decisions)

Adversarial check of `scout-19-interactions.md` and `scout-20-history-and-decisions.md` against the code on main (`23f6c1f91`). Read-only: nothing was run (no check, vitest, cargo, e2e or app). Each claim was opened at its path:line. "Fact" means read in code or repo files; "opinion" is labelled.

## Confirmed

### Scout 19

- Only three interactions exist: circle toggle (`TasksView.svelte:177-187`), text click opens note at line (`:65-69`, `:190-193`), wikilink and URL segments (`:194-212`). The text span is mouse-only with an a11y suppression (`:189`).
- The text-selection guard is real (`TasksView.svelte:66-67`).
- Rows render raw `task.text` (`TasksView.svelte:194`). `metadata` is copied into every `TaskItem` (`tasks.service.ts:31-45`) and `TasksView.svelte` never reads it (no `metadata` token in the file).
- `parseTaskTextSegments` handles only `[[t#h|a]]` and `[l](url)` (`tasks.logic.ts:123`, `:130-161`): no bare URLs, no `#tags`.
- `TasksView` gets `openWikilinkTarget` as a prop (`EditorView.svelte:73`), the same function Kanban gets (`EditorView.svelte:81`), defined at `editor-host.ts:205-207`.
- `openNoteAt` converts a 1-based line to an offset against `tab.content` and hands it to `pendingScrollPosition` (`open-note-at.service.ts:35-49`). It has no stale-line guard. The jump line comes from the disk index, so on a dirty tab it can land on the wrong line (a visible, recoverable glitch).
- `toggle_task_status` is guarded by line, `expectedText` and `expectedStatus`, returns `stale` (`commands/vault.rs:770-809`), and only swaps the checkbox char (`parsing.rs:1887-1915`). No `✅` date, no `🔁` spawn.
- The command accepts any `TaskStatus` as `target` (`contracts/commands.ts:108-111`). `toggleTask` hard-codes `toggleTarget(task.status)` (`tasks.service.ts:152`). So cancel, in-progress and the other statuses need only a TS change.
- `write_task_lines` is all-or-nothing, and its only line-number form (`TaskLineReplace.line_number`) requires the new line to carry the anchor (`task_lines.rs:24-28`; enforced in `validate()`). Inserts carry no anchor requirement: `validate()` checks inserted lines only for line breaks and duplicate anchors. Scout 19 marked this as "not verified"; it is now verified in `validate()` and `apply_task_line_edits`.
- The TS token patchers exist and are pure: `setTaskStatus` (184), `setDueDate` (195), `setPriority` (211), `addTag` (248), `removeTag` (259), `replaceDescription` (309) in `features/todoist-sync/task-line.logic.ts`. They mirror the Rust regexes (header, lines 1-9).
- `settleTaskWrite` syncs the tab, marks the save, runs `applyNoteChange` with source `task` and fires `notifyContentInvalidated` (`core/filesystem/task-write.service.ts:23-37`). `toggleTask` refetches right after (`tasks.service.ts:176-179`), and the 2 s / 10 s throttle is documented at `:114-116`.
- The dirty tab is saved before a toggle, which aborts if the saved line moved (`tasks.service.ts:133-146`).
- `TasksView` has no context menu. The shadcn context-menu exists (`src/lib/components/ui/context-menu/`). `KanbanCard.svelte:163-273` is a per-card `ContextMenu.Root` with `ondblclick` edit (`:211`) and a `<textarea>` (`:189`). `NoteRow.svelte:72` sets the shared menu's target on `oncontextmenu`. `NoteRowMenu.svelte` holds one menu for the list (`:46`, `:59`, `:215`) and has the inline-rename discipline (cancel flag `:48`, rAF `:113`, Escape `:149-151`).
- Double-click edit would clash with single-click open. The first click calls `openNoteAt`, which switches tabs and unmounts the view.
- A native `type="date"` input exists in `EventForm.svelte:86-88`. `dayjs` is a dependency (`package.json:64`, `note-composer.service.ts:1`).
- `dragDropEnabled: false` is set (`src-tauri/tauri.conf.json:24`). Kanban uses HTML5 DnD with a `text/plain` payload (`KanbanView.svelte:348-354`), and so does NoteRow (`NoteRow.svelte:74-80`).
- Calendar task chips are read-only and open the note at the line (`EventTaskChip.svelte:20-23`, `:34`). `tasksFromGroups` projects only by due date (`event-calendar-tasks.logic.ts:49-65`).
- `CaptureKind` has no task kind (`deep-link.types.ts:72`). The only tasks palette command is `tasks:toggle` (`commands.ts:197`, keybinding `global-keybindings.ts:116`).
- The section filter is `heading_text.contains(&tag)` (`parsing.rs:1755`). Scout 19's range 1721-1775 is right.

### Scout 20

- History: every commit in F1 exists with the dates and subjects given (`git log -- src/lib/features/tasks`, plus `25d91cdc3`, `c28d1489d`, `0c586dce1`, `71f599701`, `8ab6672fa`, `f95d2e1f9`). No layout redesign commit exists. The revert grep returns only `9f457365b`.
- F2 line citations for `TasksView.svelte` (223 lines) are correct: `:25-29`, `:94-105`, `:108-121`, `:124-133`, `:37-39`, `:92`, `:137-146`, `:152-165`, `:170-193`. Store defaults are in memory only (`tasks.store.svelte.ts:4-33`). `toggleTarget` is at `task-status.logic.ts:7-9`.
- The Todoist popover and Sync button are gone from the view. `TasksView.test.ts:191-243` asserts their absence.
- The archived plan exists: `.scratch/archived/tasks-view/PRD.md` (421 lines), `mockup.html` (55 155 bytes), 45 research files. The owner complaint is at PRD:3. The owner answers and "No assumption (A1 to A12) was vetoed" are at PRD:54-69.
- 29 Issues moved to `.scratch/open-itens` on 2026-11-08 (archived `ledger.md:47`). Done: 021, 114, 229 (open-itens ledger rows 58, 151, 266). Wontfix: 072, 073, 127, 128, 130 (rows 109, 110, 164, 165, 167). 122 and 123 are `needs-triage` in their files (`122-...md:25`, `123-...md:15`) and show as `todo` in the ledger.
- Issue 122's gap is real: it plans to use `write_task_lines`, which cannot address a line with no `🆔` (`122-row-menu-edits-with-undo.md`, "Gap to settle at triage").
- The open Issues cite line numbers that no longer exist. For example, 108 cites `TasksView.svelte:169-170` for "Indexing tasks..." (now `:139-140`), 109 cites `:197-269`, and 113 cites `:216`. The file was 305 lines before `5417b0501`.
- ADR-0037 moved Todoist sync out of the view: it has a visible `🆔 td-` anchor and state in `kokobrain.db` (`docs/adr/0037-todoist-two-way-sync.md:22-27`).
- Help copy is wrong about scope. It says "every Markdown file" (`help/documentation/10-tasks-and-todoist.md:5`, `:13`), and "Hide `- [x]` done tasks" (`:102`) contradicts the real `checked` rule.
- "Completed" means `task.checked` (`TasksView.svelte:191`, `tasks.logic.ts:40`). The date pills filter on note mtime (`tasks.logic.ts:76-88`).
- Every refetch swaps the list for "Indexing tasks..." (`tasks.service.ts:67`, `:84`; `TasksView.svelte:139-140`).
- `pane-toolbar` is a single `h-10` row. The test also requires exactly one `pane-toolbar` per file and forbids `h-*`, `p*-*`, `gap-*` and `flex-wrap` overrides (`src/tests/lib/pane-toolbar.test.ts:41-50`; utility at `src/app.css:148`). Extra rows must go in the body.
- The Tasks tab hides the right sidebar (`25d91cdc3`), and the view has no max-width.

## Refuted or corrected

### Scout 20

1. **"No component test of TasksView exists" (F6, Problem 9, Slice B "introduces the component test harness"). Refuted.** `src/tests/lib/features/tasks/TasksView.test.ts` exists. It is 243 lines, jsdom, with real `tasksStore` and `editorStore` and only Tauri mocked. It has existed since `ce1f0ac3c` (2026-11-06) and covers text click, circle toggle, status-driven icons, the selection guard, wikilinks and the Todoist absence. Scout 20 copied the claim from `archived/tasks-view/research/analysis-01-ux-audit.md:11`, which predates that commit. Slices extend the existing harness; they do not create one.
2. **"Help page is wrong about grouping" (Problem 8). Overstated.** Groups really are sorted by `modified_at` descending, both in `get_all_tasks_v2` (`commands/vault.rs:648`, `index.rs:1082`) and in `tasks_in_section` (`commands/vault.rs:728`). The help is wrong about scope (`#to-list` default) and the status semantics, not the sort.
3. **PRD line numbers.** These are off by about 7 lines across the board. The layout is PRD:154-174 (not 163-177). Narrow pane is PRD:174 (not 181). Non-goals are PRD:25-40 (not 34-46). Owner answers are PRD:54-69 (not 61-76). Opaque settings is PRD:313 (not 320). The writes rule is PRD:330 and :370 (not 377). Tests-that-change is PRD:377 (not 384). Manual visual quality is PRD:381 (not 388). The quoted content is accurate.
4. **"29 Issues sit as 108-130 and 074/075/198/227".** 198 and 227 are not among the 29 migrated (archived `ledger.md:47`). They come from other audits (`priority-2026-11-08.md:60`: "audit 84 (198), 78 (227)"). The 29 include 021, 072, 073, 114 and 229.
5. **"129 ... todo, ready-for-agent".** `129-todoist-state-on-rows-and-filter.md:22` says `needs-triage`.
6. **"The five view Issues all edit the same file".** The priority file lists eight: 108, 109, 110, 111, 113, 129, 198 and 227 (`priority-2026-11-08.md:60`).
7. **Theme token lines.** `--success` / `--warning` are at `src/app.css:72-73` (Tailwind color map), `:200-201` (light) and `:274-275` (dark), not `:69`, `:193`, `:266`.
8. **`parsing.rs:1739`.** The section match is now at `parsing.rs:1755`. The behavior claim (case-sensitive substring, `#to-list` matches `#to-listing`) stands. Also, a tag typed without `#` gets one prepended (`parsing.rs:1725-1729`).
9. **E2E selectors PRD:384 says will break.** "Click on task text" is no longer in the spec. Toggling uses `[data-task-row]` plus the button name `Mark task as done` (`e2e/specs/tasks-view.spec.ts:52-56`). `button[title*="completed"]` (`:47`) and the section-tag textbox by name (`:20` etc.) are still there.
10. **"No visual reference in the repo".** Partly wrong in the other direction. Besides `mockup.html`, the help page embeds `screenshots/tasks-view.png` (`10-tasks-and-todoist.md:15`), but `help/documentation/screenshots/` does not exist, so it is a broken image. The ux-polish audit cites `lavender/12-cmd-toggle-tasks-view.png`, which is not in the repo either.

### Scout 19

11. **"Context menu used in four views".** It is used in eight app components: `MarkdownEditor`, `EditorTabs`, `KanbanCard`, `KanbanLane`, `CollectionView`, `NoteRowMenu`, `CanvasInner` (there is no `CanvasContextMenu` file), `FilesNavigator` and `TypesNavigator`.
12. **"`write_task_lines` locates lines by `🆔 td-` anchor".** The Rust locator matches any `🆔` value (`ID_RE` at `parsing.rs:1552-1554`, `anchors()` in `task_lines.rs`). `td-` is a sync convention, not a check. This does not open a cheap path: putting a non-`td-` `🆔` on arbitrary lines collides with the Obsidian Tasks dependency meaning, and ADR-0037 keeps a user `🆔` without `td-` out of the sync (`0037-todoist-two-way-sync.md:39`). So Issue 122's option "give the line an anchor first" is the worse option.
13. **"Better: route open tabs through the live-editor transaction (`note-writer.service.ts:76-88`)". Refuted for the Tasks view.**
    - The Tasks view is itself an editor tab (`TASKS_VIRTUAL_PATH`, `tasks.service.ts:187-200`). While it is shown, no note is `editorStore.activeTabPath`, so the CodeMirror branch (`note-writer.service.ts:69-82`) can never run from it.
    - Every open note would take the string branch (`:83`, `syncExternalContentToEditor(..., 'body')`). That leaves the tab dirty and the disk unchanged until autosave.
    - The Tasks list reads the disk index (or the disk scan for section tags, `commands/vault.rs:753-755`), so the edited row would show the old line until the autosave lands and the index catches up.
    - The open-tab router also goes through `applyTaskLineEdits`, a TS port of the Rust batch that must change with it (`task-line-edits.logic.ts:1-6`, "Change both together"). It is anchor-based too, so an anchorless locator means a Rust change plus a TS-port change.
    - The `toggleTask` protocol (save the dirty tab, compare the line, Rust write, `settleTaskWrite`, refetch) is the right model for Tasks-view edits.
14. **Line nits.** `DRAG_THRESHOLD_PX` is at `event-calendar-drag.logic.ts:17` (not 19). The background-tab write is at `note-writer.service.ts:83` (not 86-88). `TASKS_VIRTUAL_PATH` is imported at `tasks.service.ts:5` from `core/editor/editor.logic.js`, not defined there.
15. **"Todoist is not in your daily use per memory" (open question 8, rec 7 "owner does not use external sync").** Stale. The PRD records owner answer B3, "The owner wants to use Todoist" (PRD:60). ADR-0037 (2026-11-10) built two-way sync, and the same PRD notes the memory line conflicts with it (PRD:43). Do not argue for moving the patchers on the grounds that Todoist is unused.
16. **Open question 2 (write `✅` date and spawn `🔁`) is presented as new.** The owner already accepted it as out of scope. The PRD non-goals list "recurrence spawning, done-date stamping" (PRD:38), and A7 says "No done-date stamp, no recurrence spawn" (PRD:127). It was not vetoed. Re-asking is fine, but cite the prior decision.

## Conflicts with CLAUDE.md, ADRs and prior owner decisions

- **Scout 19 rec 7 (quick add, default target the daily note)**
  - `features/tasks` importing `plugins/periodic-notes` is a forbidden `features->plugins` edge (ADR-0003, `0003-four-layer-source-taxonomy.md:28`, `:91`; `layer-rules.test.ts`). It needs a registration port like `registerCalendarDailyNoteOpener` (`periodic-notes.service.ts:83`).
  - `createNoteFile` writes an empty note (`closed-note-writer.service.ts:74-81`) and would skip the daily template.
  - `TaskLineInsert.after_heading` matches only a `##` heading by exact trimmed text (`task_lines.rs:36-41`), so "under the section tag's heading" fails as `headingMissing` on `###` or other headings.
  - Quick add and natural-language dates are both listed PRD non-goals (PRD:33, :38). Owner confirmation is needed before ticketing.
- **Scout 19 rec 8 (drag, cross-file move).** Moving tasks between notes is a PRD non-goal (PRD:38). With ADR-0037, a non-atomic insert-then-remove that fails half way leaves two lines with one `td-` anchor, which freezes that link (`0037-todoist-two-way-sync.md:30`, `:46`). Scout 19 rated this "risky" but missed the sync consequence.
- **Scout 19 rec 9 (`e`, `F2`, `d` shortcuts).** A8 says "No bare-letter shortcuts in v1" (PRD:128). Issue 113 specifies arrows, Home/End, Space, Enter and two palette commands only.
- **Scout 19 rec 3 (new Rust command plus pure patchers from `features/todoist-sync`)**
  - Feature to feature imports are allowed while acyclic (ADR-0003 line 37), but `tasks -> todoist-sync` would be a new pair. Today there is no edge either way, and `settleTaskWrite` was put in `core/` precisely "so the Tasks feature and the Todoist sync both call it without importing each other" (`task-write.service.ts:10-11`).
  - Issue 122 plans a third copy (`features/tasks/task-line-edit.logic.ts`) of the same Rust regex mirror. Either move `task-line.logic.ts` (plus `ID_EMOJI` from `anchor.logic.ts`) to a neutral home, or import it and accept the new pair. Do not write a third mirror. This is an owner or triage call.
- **Scout 19 rec 1 (hover icon buttons).**
  - Hover-only controls must also show on keyboard focus (ux-polish Issue 67, `22178ce9e`).
  - Issue 122 requires the row menu to be "a visible row action (not `opacity-0`)" with an accessible name.
- **Scout 19 recs 1-7 duplicate the open backlog without citing it.**
  - Row chips and the description render are Issue 109.
  - The keyboard work is Issue 113.
  - Status, due and priority from the row with undo is Issue 122.
  - Scout 20's warning (reconcile, do not write a parallel backlog) applies to every scout 19 recommendation.
- **Scout 19 rec 2 ("render `metadata.description` instead of `text`") is unsafe as written.**
  - `TASK_TAG_RE` (`parsing.rs:1579-1580`, no boundary) strips `#...` anywhere, so `[[Book#Chapter 2]]` becomes `[[Book 2]]` in the description. The same happens to a URL `#fragment` (applied at `parsing.rs:1871-1873`). The PRD records this defect (PRD:117).
  - A tag-only task has an empty description. The Calendar already falls back to `task.text` (`event-calendar-tasks.logic.ts:59`).
  - Issue 109 already specifies the needed `taskDisplayText` fallback. Use it.
- **Live Preview rules** (`docs/agents/live-preview-rules.md`) do not apply to this view. It renders no CodeMirror decorations. They would apply only if a ticket put task chips into the editor.
- **Indexing rules** (`docs/agents/indexing-watcher-rules.md`, now read): any new write must go through `settleTaskWrite` so `applyNoteChange` stays the one owner (rule 6). The `task` source skips the IPC because the Rust command already indexed. Reads stay on `*_v2` commands keyed on `vaultIndexVersion` (rules 1-2), with absolute paths (rule 9). `write_task_lines` takes a vault-relative `relPath`, so a Tasks-view caller must derive it (as `closed-note-writer.service.ts:40` does in reverse). Both scouts are consistent with this. Scout 19 had not read the file.

## Missed by scouts

1. **The list reorders under the cursor after every toggle.** Groups are sorted by `modified_at` descending (`commands/vault.rs:728`, `index.rs:1082`). A toggle rewrites the file and its mtime (`commands/vault.rs:801-803`), so the toggled note's group jumps to the top on the next refetch. PRD A3 ("files sort by path, not mtime, so groups stop moving after each save", PRD:123) and Issue 112 cover it, but neither scout lists it as a current UX defect. It is one of the most visible "feels broken" behaviors.
2. **A completed task vanishes instantly.** With `hideCompleted` on by default (`tasks.store.svelte.ts:10`), the refetch after a toggle (`tasks.service.ts:178`) drops the row, and the group too if it was the last open task (`tasks.logic.ts:59-69`). There is no grace period or undo. Together with item 1 and the loading swap, one click flashes the list, removes the row and moves the group.
3. **Two loading flashes per toggle.** `afterTaskWrite` refetches at once (`tasks.service.ts:178`), and the throttled version bump about 2 s later refetches again through the effect (`TasksView.svelte:73-78`). Each one swaps the list for "Indexing tasks..." (`:139-140`). Background autosaves and Todoist sync writes also bump the version while the tab is open.
4. **Duplicate `#` in the toolbar.** A `Hash` icon (`TasksView.svelte:125`) sits in front of the value `#to-list` (`tasks.store.svelte.ts:8`), so it reads "# #to-list". The ux-polish audit flagged it ("drop the duplicate `#`", `archived/ux-polish/work/views.md:79`). Scout 20 cited that line for the empty-state half only.
5. **The section-tag input has no label.** It has only `placeholder="section tag"` (`TasksView.svelte:126-132`). The e2e locates it by its placeholder-derived name. Issue 108 adds `aria-label="Section tag"`.
6. **The default section filter reads disk, not tabs.** `get_tasks_in_section_v2` re-reads files on a blocking thread (`commands/vault.rs:753-755`). Unsaved tasks in an open note do not appear, and the scan runs on every version bump (documented at `tasks.service.ts:88-95`).
7. **A TS port of the batch writer exists** (`todoist-sync/task-line-edits.logic.ts`) and must change in lockstep with Rust `apply_task_line_edits`. A line-number locator added to `write_task_lines` doubles in cost. A separate guarded command modelled on `toggle_task_status` avoids touching the port.
8. **Relay may auto-launch the stale Issues.** Memory `relay-auto-launch-ready-issues` lets ready-for-agent Issues launch without asking. 108-113, 115-121, 124-126, 198 and 227 are all `ready-for-agent` (Status lines in each file) and carry stale `TasksView.svelte` line citations. Fix the citations (or move the Issues to `needs-triage`) before any relay run.
9. **Hard-coded locale date.** `formatDate` uses `toLocaleDateString('en-US', ...)` (`TasksView.svelte:80-87`), while Issue 109 plans `#lib/utils/date.js` formatting. Minor, but the header date and the future chips would disagree unless both move.
10. **The broken help screenshot** (see Refuted 10). Any docs slice should drop or regenerate it.

## Net recommendations that survive

Opinion, constrained by the facts above.

1. **Reconcile, do not duplicate.** New UX tickets are rewrites of 108, 109, 110-113 and 122 with corrected line numbers and no Todoist UI. Scout 19's interaction ideas fold into 109 (chips), 113 (keyboard) and 122 (row edits). Retire or rewrite 129 against ADR-0037.
2. **First visible slice, no data change.**
   - Do 108 (list stays mounted, rule sentence with Clear, cause-specific empty state, input label).
   - Remove the duplicate `#`.
   - Swap `text-purple-400` for a token (198, this file only).
   - Extend the existing `TasksView.test.ts`.
3. **Stop the jumping.** Sort groups by path (PRD A3; Issue 112) or at least keep the current order across a refetch. Consider keeping a just-completed row visible (dimmed) until the next manual refresh. That is a behavior change, so it needs owner confirmation.
4. **Row display** (109) uses `taskDisplayText` with the raw-text fallback for heading links, URL fragments and empty descriptions, plus chips from `metadata`. The parser fix itself is Issue 075.
5. **Row edits** (122):
   - Address untagged lines by line number plus expected line, with the `toggle_task_status` guard. The safest shape is a new guarded command next to `toggle_task_status` (IPC DTO change, so the "Both" gate per CLAUDE.md rule 6) or a `toggle_task_status` sibling that takes `newText`. Do not put a `🆔` on lines.
   - Reuse the `toggleTask` dirty-buffer protocol, not the open-tab router.
   - Reuse the existing patchers rather than writing a third regex mirror, after an owner or triage decision on where they live.
   - Status-only actions (cancel, in progress) need no Rust change: `toggle_task_status` already takes any `target`.
6. **Context menu.** A single shared menu (NoteRowMenu pattern) plus one visible row action button that is also reachable by keyboard. Context menu items that need no new writes can ship before 122: open at line, copy text, reveal, toggle, cancel or reopen.
7. **Keep the owner's prior decisions as constraints** unless re-asked explicitly: B1, B2, B5, A1, A2, A3, A7, A8 and A9. That rules out bare-letter shortcuts, done-date stamping, recurrence spawn, quick add, NL dates and cross-note moves for now.
8. **Each slice updates the help page** (227, A12) and the e2e spec in the same delivery. Visual check stays manual (PRD:381).

## Not verified

- Tauri `dragDropEnabled` semantics are from memory, made consistent by Kanban's working HTML5 DnD. Not checked against the Tauri docs.
- Whether `syncExternalContentToEditor(..., 'body')` arms autosave for background tabs was taken from the `note-writer.service.ts:28-29` doc comment, not traced.
- `TASK_TAG_RE` stripping inside links was read from the regex and confirmed by PRD:117 and Issue 109's text. No Rust test of that case was found, and nothing was run.

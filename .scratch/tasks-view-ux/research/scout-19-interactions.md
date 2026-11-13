# Scout 19: interaction affordances around tasks

Read-only research. Facts cite path:line, verified in code on main (23f6c1f91). Opinions are labelled.

## Summary

The Tasks view today supports exactly three interactions: toggle (circle button), open the note at the task line (click on text), and follow a wikilink or URL inside the text. Everything else a useful task view needs (edit text, set due date or priority, reschedule, move, quick add, context menu, keyboard) has no task-specific code, but most of the lower-level pieces exist somewhere in the repo: a guarded Rust line writer, a TS token patcher for due date / priority / description / tags, an open-tab-aware write router, a shadcn context menu used in four views, HTML5 drag and drop (enabled in the webview), and a native date input. The one hard gap: the existing multi-field writer (`write_task_lines`) is anchor-only (requires a Todoist `🆔 td-` anchor on the line), so a general "edit this task" slice needs one new line-number-guarded Rust command modelled on `toggle_task_status`, plus a TS write path that handles open and dirty tabs.

## Facts

### What the view does today

- Row layout, toggle and text click: `src/lib/features/tasks/TasksView.svelte:169-214`. Only the circle `<button>` (177-187) toggles; the text `<span>` (190-213) has `onclick` and an `a11y_click_events_have_key_events` suppression (189), so it is mouse-only.
- File header button opens the note via `openFileInEditor` (TasksView.svelte:56-58, 153-158). Header click does not jump to a line.
- Text click guards against text selection (TasksView.svelte:64-69) so the user can select-and-copy a task. This is a deliberate affordance; any inline edit must not break it.
- Wikilink segments call the `onOpenWikilink` prop with `stopPropagation` (TasksView.svelte:197-201). URL segments render `<a target=_blank rel=noopener>` (203-210). Both are parsed by `parseTaskTextSegments` (`tasks.logic.ts:130-161`); the regex handles `[[t#h|alias]]` and `[l](url)` only, not bare URLs, not `#tags`, not `[[x]]` inside emoji metadata.
- The row renders `task.text` (raw, with signifiers) not `task.metadata.description`: `parseTaskTextSegments(task.text)` at TasksView.svelte:194. So `📅 2026-11-20 ⏫ 🔁 every week` show as literal text today. `metadata` (dueDate, scheduledDate, startDate, priority, recurrence, tags, id, dependsOn) is copied into every `TaskItem` (`tasks.service.ts:31-45`) but never read by `TasksView.svelte` (grep of the file: no `metadata` reference).
- Wikilink host: `TasksView` is mounted from `src/lib/app/EditorView.svelte:73` with `openWikilinkTarget` (`src/lib/app/editor-host.ts:205-207`, `followWikilink(appEditorHost, target)`), the same function Kanban receives (EditorView.svelte:81). The component does not import the editor host itself (layer rule), so it takes the callback as a prop.
- The tab is virtual: `TASKS_VIRTUAL_PATH` (`tasks.service.ts:5, 187-200`). No note path, so note-level menus keyed on the active tab do not apply.
- Test coverage: `src/tests/lib/features/tasks/{TasksView,tasks.service,task-toggle-dirty-buffer,...}.test.ts`, E2E `e2e/specs/tasks-view.spec.ts`.

### Line jump infra (`openNoteAt`)

- `src/lib/core/editor/open-note-at.service.ts:35-49`: `openNoteAt(path, { kind: 'line', line })` opens the note if not active, converts the 1-indexed line to an offset (`lineStartToOffset`), clamps, and sets `editorStore.setPendingScrollPosition`. Consumer is `MarkdownEditor.svelte` (doc comment at 26-30). Already used by TasksView.svelte:68 and by the Calendar chip (`EventTaskChip.svelte:34`).
- `lineNumber` comes from the Rust index of the disk copy (`tasks.service.ts:122-128`), so for a dirty open tab the jump line can be stale. The toggle path handles this (save, compare line, refresh) at `tasks.service.ts:133-146`; `openNoteAt` has no such guard.
- Not present: opening the note in a split or new pane, or a hover preview of the task's section.

### Write infra for task mutations

1. `toggle_task_status` (Rust, `src-tauri/src/commands/vault.rs:770-860`, contract `src/lib/contracts/commands.ts:108-112`): guarded by `lineNumber` + `expectedText` + `expectedStatus`, returns `stale` when the line moved (vault.rs:777-781, 797-806). It only swaps the checkbox char via `set_task_status_in_content` (`src-tauri/src/vault/parsing.rs:1887-1915`). It does NOT add a `✅ date` on completion, does NOT spawn the next occurrence of a `🔁` task, and `ToggleTaskResult` carries no per-field edit capability. (Grep of `tasks.service.ts` and `parsing.rs` for `doneDate`/`recurrence` writes: none.)
2. `write_task_lines` (Rust, `vault.rs:893-975`, contract `commands.ts:113-116`, batch types `src-tauri/src/vault/task_lines.rs:16-100, 184`): all-or-nothing batch with replace / insert-under-heading / remove / rename-heading. Lines are located by `🆔 td-` anchor plus expected line; the only anchorless form is `lineNumber` replace, which requires the new line to carry the anchor (task_lines.rs:16-33 and the error clause at 180-183). A move within a note is remove + insert (task_lines.rs:79-83). Written for Todoist, ADR-0037.
3. TS token patchers (pure, no framework): `src/lib/features/todoist-sync/task-line.logic.ts` exports `setTaskStatus` (184), `setDueDate` (195, replaces or inserts `📅 YYYY-MM-DD`, null removes), `setPriority` (211), `replaceDescription` (309, refuses mid-sentence conflicts), `addTag` (248), `removeTag` (259), `taskLineText`, `taskLineStatus`. They mirror the Rust parser regexes (header comment, lines 1-9). They live under `features/todoist-sync`, so using them from `features/tasks` is a features-to-features import; the layer rules only name core/features/plugins/utils tiers, so this is allowed by the table but couples Tasks to a sync module (opinion: promote them to `features/tasks` or `utils/` if reused).
4. Open-tab write router: `src/lib/features/todoist-sync/note-writer.service.ts:41-90` (`writeTaskLinesToNote`): closed note goes to Rust (`closed-note-writer.service.ts:35-64`, then `settleTaskWrite`); active tab gets one CodeMirror transaction kept out of undo history (note-writer.service.ts:76-84); a background tab gets `syncExternalContentToEditor` and the autosave writes it (86-88). It consumes `TaskLineEdits`, i.e. anchor-based, and refuses to save or reload tabs. This is the closest existing model for "edit a task whether or not its note is open".
5. `settleTaskWrite(path, content)` (`src/lib/core/filesystem/task-write.service.ts:23-37`): syncs the open tab, marks recent save, runs `applyNoteChange` (source `task`), clears QueryJS caches. Every task write must go through it; `tasks.service.ts:176-179` then refetches immediately because the version bump is throttled (2 s, up to 10 s, per the comment at 114-117).
6. Toggle on a dirty tab saves the tab first and aborts if the saved line moved (`tasks.service.ts:133-146`). Any new edit action needs the same guard, or the TS router above.
7. Indexing/watcher invariants apply to any new write path (`.claude/rules/indexing-watcher.md` -> `docs/agents/indexing-watcher-rules.md`). I did not read that file for this report; a ticket touching saves, `applyNoteChange` or the index must read it first.

### Context menus

- shadcn `context-menu` is installed (`src/lib/components/ui/context-menu/`, Item, Sub, Separator, destructive variant).
- Pattern A (per-card): `src/lib/plugins/kanban/KanbanCard.svelte:163-273`: `ContextMenu.Root` > `Trigger` wrapping the card, items Edit / Archive / Color submenu / Delete (destructive). Card also has `ondblclick={onStartEdit}` (211) and an inline `<textarea>` (189).
- Pattern B (shared menu for a list): `src/lib/features/note-list/NoteRowMenu.svelte` wraps the whole list; rows call `menu.setContextTarget(note)` on `oncontextmenu` (`NoteRow.svelte:73`) and the single menu reads `contextTarget`. Cheaper for long lists (one menu instance, not one per row). Also has inline rename via a context object and `extraItems: MenuActionItem[]` (`src/lib/utils/menu-action.types.ts`) for data-only items.
- Other users: EditorTabs, MarkdownEditor, CollectionView, CanvasContextMenu, FilesNavigator, TypesNavigator, KanbanLane.
- `TasksView.svelte` has no `oncontextmenu` or ContextMenu import. A right-click on a task today shows the webview default.
- Existing generic actions reusable in a task menu: `openFileInEditor`, `revealInSystemExplorer` (`fs.service.js`, used in NoteRowMenu.svelte:17), clipboard copy (NoteRowMenu imports `Copy`; copy-block-link feature exists in `features/copy-block-link`).

### Inline editing

- Kanban card: double-click or menu "Edit" swaps the card body for a `<textarea>` (`KanbanCard.svelte:30, 55, 189, 211, 235`). That is the in-repo precedent for inline text edit.
- NoteRowMenu inline rename: prefill, focus, select via `requestAnimationFrame`, Escape cancel flag to stop blur-commit (NoteRowMenu.svelte:46-117). Same pitfalls apply to a task edit field.
- Tasks view: none. And the text-selection guard at TasksView.svelte:64-69 means a double-click would currently select a word and also run the click handler once per click (first click navigates away to the note). Opinion: double-click edit would conflict with single-click-opens-note; edit needs a different gesture (hover pencil, `Enter` or `F2` on a focused row, or context menu).

### Date and priority editing

- Native `<input type="date">` inside the shadcn `Input` is already used in the Calendar form (`src/lib/features/event-calendar/EventForm.svelte:88`). No calendar-grid date picker component exists (`grep` for DatePicker/date-picker: only that file and KanbanCard matched `type="date"`-style usage).
- `popover` and `dropdown-menu` primitives exist (`src/lib/components/ui/popover`, `dropdown-menu`), enough for a "Due: Today / Tomorrow / Next week / Pick date / Clear" menu. Date strings must be `YYYY-MM-DD` (`TaskMetadata.dueDate`, `src/lib/contracts/generated/TaskMetadata.ts`, and `setDueDate` in task-line.logic.ts:195). dayjs is already a dependency (`note-composer.service.ts:1`).
- Reschedule by drag already exists for events (not tasks): pointer-based day-cell drag in `event-calendar-drag.logic.ts` and `event-calendar-day-drag.svelte.ts`, with `DRAG_THRESHOLD_PX = 4` (drag.logic.ts:19).
- The Calendar already projects tasks by due date and shows them read-only: `event-calendar-tasks.logic.ts:46-62` (`tasksFromGroups`, due date only), `EventTaskChip.svelte` (explicitly "no data-event-path: the day drag, the popover and the Delete key only act on events", lines 21-24). Chips open the note at the line (34); they cannot toggle or be dragged. So a due-date mutation API is also the missing piece for rescheduling in the Calendar.

### Drag and drop

- Tauri `dragDropEnabled: false` (`src-tauri/tauri.conf.json:24`), so HTML5 DnD events reach the webview. Used by Kanban (`KanbanView.svelte:352-354, 418-420, 431, 518`: `dataTransfer.setData('text/plain', 'item:<id>:<lane>')`, `ondrop` on lanes), NoteRow (`NoteRow.svelte:74-80`, payload is the note path), Rail, FilesNavigator, EventMonthGrid, EventAllDayLane, SortPanel.
- No task payload type exists. A task is addressed by `path + lineNumber + text + status` (the guard tuple of `toggle_task_status`), which would be the drag payload.
- Moves are only meaningful between existing line-oriented structures: (a) task to another note or another heading (cross-file text move: remove + insert, two writes, not atomic across files), (b) task to a due-date bucket (a date edit, atomic, one line). Opinion: (b) is cheap and safe; (a) is risky.

### Quick add

- `src/lib/plugins/quick-capture/` creates notes (`note-composer.service.ts` builds a path and calls `openOrCreateNote`); `CaptureKind = 'note' | 'clip' | 'link' | 'shot' | 'file'` (`src/lib/features/deep-link/deep-link.types.ts:72`). There is no task-kind capture and no "append a task line" function.
- `insert` in `TaskLineEdits` (`task_lines.rs:36-56`) can add lines under a `##` heading, above the sections (`before_sections`), or at note end, and `writeTaskLinesToClosedNote` creates a missing note first (`closed-note-writer.service.ts:43-47`). That is the infra for "add a task to a target note", but it is reached through the Todoist-oriented API and requires an anchor only for replace/remove, not for insert (TaskLineInsert has no anchor requirement; per the type docs at task_lines.rs:36-56 it takes whole lines). Not verified end to end for anchorless inserts: the validate() clauses were not read in full.
- The section tag filter (default `#to-list`, `tasks.store.svelte.ts:8`) matches headings containing the tag (`parsing.rs:1721-1775`, `heading_text.contains(&tag)`). So the owner's workflow is plausibly "a `## ... #to-list` heading in notes". A quick-add destination would naturally be: under a tagged heading in a chosen note (daily note via periodic-notes is the obvious target; not verified here, see Open questions).
- Command palette entries for tasks: only `tasks:toggle` (`src/lib/app/commands.ts:197`, keybinding at `global-keybindings.ts:116`). No `tasks:add`.
- note-creator: `openOrCreateNote` (`src/lib/core/note-creator/note-creator.service.ts:79`) creates a note from template and opens it; reusable only for "target note missing" cases.

### Gaps in the toggle itself (adjacent, relevant to any "complete" interaction)

- Completing a task writes only the checkbox char (parsing.rs:1887-1915). No `✅ YYYY-MM-DD`, and a `🔁` recurring task is simply closed, no next occurrence. `TaskMetadata` has `doneDate` and `recurrence` (generated type) so the data model anticipates both; the writer does not. (Fact for the code; whether the owner wants it is an open question.)
- Circle semantics: toggle target is `done` for any status except done/cancelled which reopen to todo (`task-status.logic.ts:7-9`). Statuses `in-progress`, `question`, `forwarded`, `important`, `cancelled` have no way to be set from the view; only open-the-note works.

## Problems / opportunities

1. The only interactive surface is the 16px circle and a text span. No right-click, no keyboard, no hover actions. The row looks static, which matches the owner's "simple and ugly".
2. Raw task text shows emoji metadata inline (`📅 2026-11-20 ⏫`); structured metadata is fetched and discarded. Rendering chips for due, priority, tags, recurrence is a display win with zero write infra, and it is the natural handle for interactions (click due chip to reschedule).
3. A general edit path does not exist. Everything that edits a task line beyond the checkbox is built around the Todoist anchor.
4. Clicking text means "open note", which makes any in-place affordance on text conflict. The circle is the only safe click target; new interactions need their own targets (hover icons, a `...` button, context menu, keyboard).
5. Stale line numbers: `openNoteAt` and any new write rely on index line numbers that can lag a dirty tab (comment at `tasks.service.ts:122-128`). New writes must reuse the dirty-tab guard or the open-tab router.
6. The Calendar shows dated tasks read-only, so a due-date mutation primitive serves two views.
7. Not atomic across files: moving a task to another note is two writes.

## Recommendations for the redesign (opinion, ordered by value/cost)

Interaction tickets, each a vertical slice with its own tests (project rule: store/logic tests with real stores, Rust tests for the command):

1. **Row actions + context menu (no new write infra).** Right-click menu (Pattern B, one shared menu, like `NoteRowMenu`) with: Open note at line, Open note in...(if split exists, check), Copy task text, Copy link to note, Reveal in Finder, Toggle done, Cancel/Reopen (uses existing `toggle_task_status` with `target: 'cancelled'`; the command already accepts any `TaskStatus`, `commands.ts:109`, so cancelled and in-progress are free). Hover shows the same actions as icon buttons. Cost: small, UI only plus a `toggleTask` variant with an explicit target (`tasks.service.ts:130-167` currently hard-codes `toggleTarget`).
2. **Metadata chips (display).** Render `metadata.dueDate` (overdue / today / soon colouring), priority, tags, recurrence from the already-fetched `task.metadata`; render `metadata.description` instead of `text` so signifiers stop polluting the line. Wikilink and URL segments must still parse from the description (`parseTaskTextSegments` takes any string).
3. **One new Rust command for general line edits.** Add `edit_task_line` (or extend `toggle_task_status`'s family) guarded by `path + lineNumber + expectedLine`, taking `newLine`, with `stale` result, all inside the same lock/write/index/emit chain as `toggle_task_status_inner` (`vault.rs:770-828`) and tested with a tmpdir like the existing `_inner` tests. Pair it with a TS service function that: saves a dirty tab first (reuse `tasks.service.ts:133-146`) or, better, routes open tabs through the live-editor transaction used in `note-writer.service.ts:76-88`, then `settleTaskWrite` and an immediate `buildTaskIndex`. Compute the new line in TS with the existing patchers (`setDueDate`, `setPriority`, `replaceDescription`, `addTag`, `removeTag`). This unlocks tickets 4 to 6. Needs an IPC DTO change, so it is a "Both" gate (cargo test + generated bindings + pnpm check + vitest), per CLAUDE.md rule 6.
4. **Due date / reschedule menu.** Due chip click opens a popover or dropdown: Today, Tomorrow, Next Monday, In 1 week, Pick date (native `type="date"` as in `EventForm.svelte:88`), Remove. Writes via ticket 3's `setDueDate`. Same primitive can later make Calendar chips draggable.
5. **Inline text edit.** Triggered by hover pencil, `F2`/`Enter` on a focused row, or menu "Edit" (not double-click, see Facts). Edit the description only, using `replaceDescription` (returns a `conflict` for mid-sentence signifiers; surface it as "edit this task in the note" with a jump). Follow the NoteRowMenu inline-rename discipline (cancel flag, prefill-once, focus via rAF; NoteRowMenu.svelte:46-117).
6. **Priority cycle** (chip click or menu) with `setPriority`.
7. **Quick add** (after 3): an input at the top of the view or a command-palette command `tasks:add`; destination = one configurable note + heading, defaulting to the section tag's heading in the daily note. Reuse `insert` in `TaskLineEdits` via `writeTaskLinesToNote`, or the new command, and create the note through `createNoteFile` when missing (`closed-note-writer.service.ts:74-81`). Parse a small natural-language date (`tomorrow`, `fri`) into `📅`. Do not build a Quick Capture task kind; that plugin is clipboard/note oriented and the owner does not use external sync (memory: owner-feature-usage).
8. **Drag to reschedule** only after the Calendar embeds tasks as drop targets; HTML5 DnD works (`tauri.conf.json:24`), payload `path:line:text:status`. Skip cross-file move for the first pass (non-atomic).
9. **Keyboard.** Rows focusable (`role=listitem`, roving tabindex), `Space` toggle, `Enter` open at line, `e`/`F2` edit, `d` due. Today the text span is click-only (TasksView.svelte:189). Overlaps scout 12; mentioned because every interaction above needs a keyboard route.

Ordering suggestion: 2 and 1 first (visible win, little risk), then 3 as an enabling ticket with its own tests, then 4, 5, 6 in parallel-able slices, then 7. Keep 8 as a later epic.

## Open questions for the owner

1. Which interactions do you actually want: edit text, set/change due date, priority, move between notes, quick add? Ranking drives ticket order; ticket 3 is the shared cost.
2. Should completing a task also write `✅ YYYY-MM-DD` and spawn the next `🔁` occurrence? Today it does neither. That changes note content on every toggle, so it needs an explicit decision.
3. Do you want to set status beyond done/open from the view (cancelled, in-progress `[/]`, important `[!]`, question, forwarded)? The command supports it already.
4. Where should a quick-added task go: the daily note, a fixed inbox note, or under the `#to-list` heading of a chosen note? Is the `## ... #to-list` heading really your convention (the filter default suggests it)?
5. Is moving a task between notes worth the non-atomic two-write cost, or is reschedule-only enough?
6. Should the Calendar's dated tasks become interactive (toggle, drag to reschedule) in the same effort, since they share the due-date primitive?
7. Context menu vs hover icons vs both? (Opinion: both, menu is the complete list, hover shows the 2 or 3 frequent ones.)
8. Is it acceptable to move the TS token patchers out of `features/todoist-sync` into `features/tasks`/`utils` so Tasks does not depend on the sync module (Todoist is not in your daily use per memory)?

## Not verified

- Did not read `docs/agents/indexing-watcher-rules.md`, `docs/PATTERNS.md`, ADR-0037 or the `validate()` body in `task_lines.rs` (anchorless insert behaviour is inferred from type docs).
- Did not check whether a split-pane "open to the side" API exists, nor periodic-notes' API for resolving today's daily note.
- Did not run any code, tests or the app.

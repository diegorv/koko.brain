# Lens review: Feedback, states and motion

Cross-app pattern review. Paths are relative to the repo root. Every claim was checked against code (file:line) or a screenshot in `.scratch/design-review/screens/`. Area reviews already cover local cases; this file names the patterns that repeat across areas and proposes one rule for each.

## Clear

### 1. Destructive actions follow four different policies; the most reversible one asks the most
- Move a note or folder to the Trash (reversible, the Trash keeps it) blocks on a native `ask()` dialog and offers no undo: `src/lib/features/note-list/NoteRowMenu.svelte:163`, `src/lib/core/filesystem/delete-note.service.ts:14`, `src/lib/features/rail-shell/FilesNavigator.svelte:196`.
- Delete a calendar event (also to the Trash) has no confirmation and an Undo toast: `src/lib/features/event-calendar/event-calendar.service.ts:1468-1480`. Task status menu writes have the same Undo toast: `src/lib/features/tasks/tasks.service.ts:482-493`.
- Canvas has its own in-view undo stack (`src/lib/features/canvas/canvas-history.logic.ts`).
- No confirmation and no undo for permanent, content-bearing deletes: kanban card, lane with all its cards, archived card (`src/lib/plugins/kanban/KanbanView.svelte:106, 124, 338`; no undo code in `src/lib/plugins/kanban/`), user theme (`src/lib/core/settings/sections/AppearanceSection.svelte:92-103`, also switches the active theme silently), auto-organize rule saved to disk at once (`src/lib/features/auto-organize/AutoOrganizeSection.svelte:67-70`), property removal (`src/lib/features/properties/PropertiesView.svelte:133`), Tasks "Clear" sources (review-tasks 8).
- File History restore asks a native confirm (`src/lib/features/file-history/FileHistoryDialog.svelte:44`) even though the restore is a CodeMirror dispatch (`src/lib/features/file-history/file-history.service.ts:89-94`), so Cmd+Z already reverses it.
- Several of the unguarded delete buttons are also hover-only: `src/lib/features/properties/PropertyField.svelte:159,176`, `AppearanceSection.svelte:190`, `src/lib/plugins/kanban/KanbanLane.svelte:356`.
- Undo toasts use the svelte-sonner default (4 s); nothing sets a longer duration for them.
- Proposal: one rule. Reversible actions (Trash moves, event delete, restore, status changes, rule/property/theme removal) act at once and show an Undo toast that lasts about 8 s and pauses on hover. Kanban deletes snapshot the serialized board for Undo. Only irreversible or bulk actions confirm (Trash "Delete permanently", Empty trash, delete a lane that holds cards, Todoist caps), and they confirm in an in-app dialog with the count ("Delete lane In progress and its 4 cards?") rather than a native sheet. Drop the native confirm for Trash moves and File History restore.

### 2. Background refreshes replace content with a loading line, so lists collapse and lose state
- Tags: `TagsView.svelte:41-45` reruns `scheduleTagIndexRebuild()` on every `vaultIndexVersion` bump, `tags.service.ts:27` sets `isLoading` true, and `TagsView.svelte:79-80` swaps the whole tree for "Indexing tags...", which unmounts every `TagItem` (local `open` state at `TagItem.svelte:19`). With the Tags tab open, any save, capture or sync collapses the expanded tree and hides the count (`TagsView.svelte:52`). (Traced in code, not observed at runtime.)
- Search: `search.service.ts:138` sets `isSearching` on every debounced query and `SearchPanel.svelte:115-116` replaces the results with "Searching...", so the list empties and refills while typing.
- The right model already exists: Tasks keeps the list and shows a small spinner in the header once loaded (`TasksView.svelte:910-913`), and the note-list search shows its spinner inside the input (`RailNoteList.svelte:823`).
- Proposal: one rule for every view. Show the full-area loading text or skeleton only for the first load (`!hasLoaded`). Later refreshes keep the current content, dim nothing, and show a header spinner that appears only after about 300 ms. Apply it to Tags and Search first; Collection "Building index..." (`CollectionView.svelte:509-512`) and Backlinks "Indexing vault..." (`BacklinksPanel.svelte:59-60`) already gate on first load and only need the shared component.

### 3. Errors go to the wrong channel, two channels, or none
- 104 `toast.error` calls versus 9 inline `role="alert"` blocks. View-level failures that should sit in the view are toasts that vanish after 4 s, while some failures reach nobody:
  - Silent: search failure is only logged and shows "No results found" (`search.service.ts:268-269`, `SearchPanel.svelte:119`); auto-organize config save only logs (`AutoOrganizeSection.svelte:32-37`); tag index failure only logs and leaves the old tree (`tags.service.ts:52-53`); Labs mod start only logs with the switch left on (`LabsSection.svelte:27-29`); File History restore has no try/catch (`FileHistoryDialog.svelte:50`).
  - Twice: the theme catalog failure shows an inline error with Retry and a toast for the same event (`AppearanceSection.svelte:52` and `:259-268`; `settings-appearance-dark.png`, the toast also covers content).
  - Raw error objects in user text: `TrashSection.svelte:28, 42, 57` (`${err}`).
- Good models already in the app: the note-list view error box with message and "Open view" action (`RailNoteList.svelte:872-891`), and the Collection parse error box (`CollectionView.svelte:504-507`).
- Proposal: routing rule. A failure of the thing on screen (a list, a panel, a dialog, a settings section) renders inline in that place with the cause and a Retry or fix action, and no toast. A failure of a background or fire-and-forget action (save, sync, capture, file operation from a menu) is a toast that stays until dismissed when it is an error. Never only a log. Never both channels.

## Moderate

### 4. Copy actions confirm in four different ways
- 13 clipboard writes, four behaviors:
  - Success toast: "Path copied" / "Deeplink copied" from the action bar (`note-action-bar.service.ts:33-41`).
  - Inline label swap "Copied!" for 1.5 s: code block Copy (`code-block-widget.ts:95-99`, no error path).
  - Silent success, error toast: copy block link (`copy-block-link.service.ts:36-42, 58-62`), copy task text (`TasksView.svelte:585-590`), folder copy path (`FilesNavigator.svelte:206-207`).
  - Silent success, unhandled failure: note row Copy absolute/relative path (`NoteRowMenu.svelte:246, 249`), Types navigator copy path (`TypesNavigator.svelte:325, 328, 372, 375`).
- The same "Copy path" therefore confirms from the action bar and says nothing from the context menu.
- Proposal: one `copyToClipboard(text, label)` helper used everywhere. When the trigger stays on screen (code block button), swap its label to "Copied" for 1.5 s. When the trigger disappears (menus, shortcuts, palette), show a short neutral toast "Block link copied" with the copied text as the description. Failures always toast.

### 5. Empty states say "nothing" without saying why; Tasks already knows how to explain
- Tasks has a full explainer that names the cause and offers the one-click fix ("Every matching note is excluded" with "Edit excludes", "Reset Due filter", `task-query.logic.ts:1459-1501`).
- Everywhere else a filtered-out list and a truly empty one read the same: Collection "No results match the current filters" with no action (`CollectionTableView.svelte:34-37`); note list "No notes here" even with an active filter (`RailNoteList.svelte:894-897`), "Nothing here" for an empty group (`:852`); kanban lanes just go blank under a filter (`KanbanView.svelte:181`); Search "No results found" for no match, error, and hybrid queries under 3 characters (`SearchPanel.svelte:119`); Favorites and Archive "No notes here" (`rail-favorites-light.png`).
- Proposal: reuse the Tasks pattern as a shared shape (message plus optional action). Each list computes why it is empty: no items yet (say how to get one: "Star a note with the star in the action bar"), filters exclude all (name the filter, button "Clear filters"), search had no match vs failed vs too short. This pairs with the shared EmptyState component proposed in review-foundation 5; this finding is about the cause and the action, not the markup.

### 6. "Selected" has at least nine recipes; some equal another surface's hover
- Lists: rail lens tinted with the lens color at 18% (`Rail.svelte:359-371`); note rows and navigator rows `primary/25` + primary text, hover `primary/10` (`NoteRow.svelte:70,89`, `FilesNavigator.svelte:293-298`, `TypesNavigator.svelte:285-287`); Tasks lists `bg-accent`, hover `accent/50` (`TaskLists.svelte:185`); Settings nav uses the hover token as the selected fill (`SettingsPanel.svelte:137`: selected `bg-settings-hover-bg`, hover the same at 60%); command and switcher rows `aria-selected:bg-accent` (`command-item.svelte:16`).
- Segmented controls: Search modes raised white pill on a muted track (`SearchPanel.svelte:84-89`), Calendar D/W/M and Graph global/local `bg-muted` (`EventCalendarHeader.svelte:117`, `GraphControls.svelte:30-41`), Kanban board/list/table `primary/10` + primary text (`KanbanView.svelte:465-479`, the same 10% the rail uses for hover), Collection view tabs `primary/15` (`CollectionView.svelte:535`), Theme editor underline (`ThemeEditor.svelte:177-179`).
- Visible in `tasks-all-open-light.png`: the rail "Today" is peach, the Tasks "All open" list is grey, the tab strip uses an underline, all on one screen.
- Proposal: two tokens and one segmented component. `--selected-bg` / `--selected-fg` for any list row that is the current item (one strength, distinct from `--hover-bg`); the rail may keep its per-lens tint as a deliberate exception. One `Segmented` primitive (muted track, raised selected pill, `aria-pressed`) for Search, Calendar, Graph, Kanban and Collection tabs.

### 7. Async actions have no shared pending-to-done loop
- `TypeNameDialog.svelte:40-45` closes before `onConfirm` resolves; errors arrive as toasts after the typed name is gone (review-properties 8).
- `ViewDialog.svelte:218` and `EventForm.svelte:187` only disable Save while saving; the label never changes, so a slow write looks like a dead button.
- No success signal where the result is off screen: Trash restore (`TrashSection.svelte:23-30`), note Duplicate (`NoteRowMenu.svelte:84-85`, the copy is not opened or revealed), File History restore (`FileHistoryDialog.svelte:50`).
- Good model: calendar events show a dashed "pending" border while the write is in flight (`EventBlock.svelte:70-82`), and Todoist "Load projects" swaps to "Loading..." (`TodoistSection.svelte:130`).
- Proposal: one rule for buttons that start async work. The dialog stays open; the button shows a spinner and a verb in progress ("Saving...") after about 300 ms; on failure the error renders inline in the dialog with the input kept; on success the dialog closes, and a toast appears only when the result is not visible ("Restored Roadmap.md", with Open or Reveal).

### 8. Form validation fires at three different moments
- On a pristine form: EventForm shows "Enter a title." in red as soon as it opens (`EventForm.svelte:38-39, 73-75`).
- After the first keystroke: ViewDialog guards with `typed` (`ViewDialog.svelte:189-192`).
- Only on submit, cleared on input: ThemeEditor (`ThemeEditor.svelte:81, 141-145`).
- Error text sizes also differ: `text-xs` (EventForm, `TypeNameDialog.svelte:66`) vs `text-meta` elsewhere (`ViewDialog.svelte:192`, `FormulaRow.svelte:62`, `AutoOrganizeRuleRow.svelte:394`).
- Proposal: validate after the first edit or blur and on submit, never on open; Save stays enabled until an attempt fails (or carries a one-line reason next to it). Field errors use one style: `text-meta`, destructive color, `aria-describedby` linked.

## Polish

### 9. The save indicator pulses and changes width while typing
- `SaveStatus.svelte:14-23` renders "Modified" with `animate-pulse` for up to 2 s after each pause (debounce `editor.service.ts:276`, max wait 10 s), then "Saved". The two labels differ in width and the group is right-aligned (`AppShell.svelte:307-311`, `StatusBar.svelte:16`), so the Todoist chip to its left shifts on every save cycle.
- Proposal: no pulse (a static dot is enough during autosave); reserve a fixed width for the slot or show only the icon with the word in a tooltip.

### 10. Motion is mostly consistent, but has no tokens and only one reduced-motion guard
- About 100 elements use the Tailwind `transition-colors` default; live preview uses `0.15s ease` (`styles.ts:242, 354, 424, 484, 507, 730`); canvas uses `transition: all 0.15s` (`CanvasInner.svelte:748`, `CanvasToolbar.svelte:62`); dialogs `duration-200` zoom-95 (`dialog-content.svelte`); the Settings sheet flies 820px in 200 ms (`SettingsPanel.svelte:117`); canvas fit-view 300 ms (`CanvasInner.svelte:283`).
- `prefers-reduced-motion` exists once (`EventCalendarView.svelte:284`). Spinners and pulses ignore it (`SaveStatus.svelte:16`, `TasksView.svelte:912`, `SearchStatus.svelte:11,16`, `TodoistSyncStatus.svelte:27`, `ModDialogHost.svelte:112`).
- Proposal: two tokens (`--motion-fast` 120-150 ms for hover and color, `--motion-base` 200 ms for overlays) with one easing; the Settings sheet uses a shorter slide (or a fade plus 24px offset) matching dialogs; one base `@media (prefers-reduced-motion: reduce)` block that shortens transitions and stops spin and pulse.

### 11. No pressed state, and the cursor policy is split
- Only 4 `active:` variants in the app, none visual except an opacity (`KanbanLane.svelte:236`, `KanbanCard.svelte:218`); 288 `hover:` variants. Buttons do not acknowledge a click until the result arrives.
- `cursor-pointer` appears 88 times (Tasks, Collection, Tags, Search results) and `cursor-default` 54 times (rail, navigators, note rows, calendar plugin), so the same kind of row shows a hand in one panel and an arrow in the next.
- Proposal: a subtle pressed fill on the shared button and row recipes (one step darker than hover); pick the macOS convention (arrow cursor on chrome, hand only on real links) and apply it everywhere.

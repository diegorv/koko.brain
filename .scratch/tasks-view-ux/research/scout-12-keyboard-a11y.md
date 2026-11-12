# Scout 12: keyboard navigation and accessibility of TasksView

Read-only audit. Nothing was run (no tests, no app). Facts cite path:line, opinions are marked as such.

## Summary

TasksView has no keyboard model of its own. Every control is a plain `<button>` or `<input>`, so Tab reaches them, but a user cannot move between rows with arrows, cannot open a task's note without a mouse (the text span is a non-focusable click target silenced with a `svelte-ignore`), and loses focus when the default "hide completed" filter removes a row they just ticked. The repo already has two good in-view keyboard patterns to copy: the Calendar view (pure `resolveCalendarKey` + typing guard + body fallback + a shortcuts table tied to help docs) and the Kanban board (focused index in a store, ArrowUp/Down, Space toggles, Enter acts, Escape clears). Accessibility is thin: only the toggle circle has an `aria-label`; there is no list semantics, no `aria-pressed` on filters, no live region, no group headings, and the section-tag input is named only by its placeholder.

## Facts (verified in code)

### TasksView today

- No keydown handler, no `tabindex`, no `role`, no focus call anywhere in the component. `grep` for `aria|role=|focus` over `src/lib/features/tasks/*.svelte` returns only the focus ring class on the tag input (TasksView.svelte:131) and one `aria-label` (TasksView.svelte:179).
- Date filter pills are bare `<button>`s with text labels and a color class for the active one; no `aria-pressed`, no `role="group"` (TasksView.svelte:94-104). The active state is conveyed by color only.
- Hide-completed toggle is an icon-only button whose only name is `title` (TasksView.svelte:108-121). No `aria-pressed`; the icon swaps Eye/EyeOff.
- Section tag input: `type="text"`, `placeholder="section tag"`, no `<label>` and no `aria-label` (TasksView.svelte:126-132). The leading `#` icon is decorative. The e2e specs find it with `getByRole('textbox', { name: /section tag/i })` (e2e/specs/tasks-view.spec.ts:19), which only works because the browser falls back to the placeholder as the accessible name. The input removes the outline (`focus:outline-none`) and replaces it with a border color change at 50% alpha (TasksView.svelte:131), a weak focus indicator.
- File header is a `<button>` (TasksView.svelte:153-158), styled `text-purple-400 hover:underline`. Keyboard reachable via Tab. Date and count are plain `<span>`s in parentheses with no relation to the button (TasksView.svelte:159-164).
- Toggle circle: `<button>` with a dynamic `aria-label` "Mark task as done" / "Mark task as not done" (TasksView.svelte:177-187). The label names the action but not the task, so a screen reader hears the same label for every row. The icon-swap logic follows `toggleTarget(status)` (TasksView.svelte:171, task-status.logic.ts:7-9).
- Task text: a `<span>` with `onclick` that opens the note at the line, wrapped in `<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->` (TasksView.svelte:188-193). It is not focusable and has no key handler, so "open the note at this task" has no keyboard path at all. The only keyboard route to the note is the file-name button, which opens the file without the line (TasksView.svelte:56-58 uses `openFileInEditor`, the text click uses `openNoteAt(..., { kind: 'line' })` at :68).
- Inline wikilinks inside the text are `<button class="inline">` and URLs are `<a href target=_blank>`; both stop propagation of the click (TasksView.svelte:198-210). They are Tab stops inside the clickable span, so a keyboard user hits them in document order.
- Rows are `<div data-task-row>` in `<div class="space-y-1">` (TasksView.svelte:168-174). No `role="list"/"listitem"`, no `role="group"` with the file name as label. Indentation is a `padding-left` style only (TasksView.svelte:175); the nesting level is not exposed to assistive tech.
- The stats line "N tasks in M files" is a plain `<p>` (TasksView.svelte:144-146); the loading and empty states are plain `<p>`s (TasksView.svelte:139-142). None is a live region, so filtering, toggling or an index refresh changes the list silently for a screen reader.
- The completed state is conveyed by `line-through` plus a muted color on the text and the circle icon (TasksView.svelte:191); the filled/open circle also differs in shape, which helps, but the row has no text equivalent of its status. The data model carries richer statuses (`status`, `TaskStatus`) than the two circle icons show (tasks.types.ts:13-14, task-status.logic.ts:1-9).
- The list is wrapped in the shared `ScrollArea` (TasksView.svelte:137). The shadcn viewport has `focus-visible:ring-4 focus-visible:outline-1` (src/lib/components/ui/scroll-area/scroll-area.svelte:32), so Tab/PageUp/Down scrolling works only if the viewport itself is focused.

### Where focus goes and what survives a toggle

- Opening: `toggleTasksTab` adds or activates a virtual tab (tasks.service.ts:187-220). TasksView never focuses anything on mount (no `onMount`, no `bind:this`). Focus is left wherever it was (the editor unmounts, so it likely falls to `<body>`; this last step is inference, not verified at runtime).
- `Cmd+Shift+T` on the active Tasks tab closes it (tasks.service.ts:215-216), so it is a true toggle.
- Rows are keyed by `task.lineNumber` (TasksView.svelte:169), so a refetch after a toggle keeps the DOM node and its focus, but only while the row is still rendered. With the default `hideCompleted = true` (tasks.store.svelte.ts:11, :17 on reset), ticking a task removes its row via `filterCompleted` (TasksView.svelte:48-50) and focus drops to `<body>`. Nothing in the view restores it.
- `toggleTask` is async, can show a toast and refetch on a stale line (tasks.service.ts:130-167). A keyboard flow must tolerate the list changing under the cursor.
- The effect that refetches on `vaultIndexVersion` runs on every bump (TasksView.svelte:73-78). A refetch that reorders or removes rows during keyboard navigation would invalidate a positional selection; identity must be `filePath + lineNumber` (the same pair `toggleTask` uses), not an array index.

### Global shortcuts and how they reach this view

- `registerKeybinding` listens on `document` and has no typing guard: it matches modifiers and key, then `preventDefault()` and runs the handler (src/lib/utils/keybindings.ts:77-98). A bare-key binding here would swallow the character in inputs and the editor; the Calendar view comments on exactly this (EventCalendarView.svelte:45-47).
- Cmd+Shift+T is declared once in `GLOBAL_KEYBINDINGS` (global-keybindings.ts:115-123), and the palette label comes from `shortcutFor` (global-keybindings.ts:211-216).
- "/" opens rail Search with a dedicated listener that skips typing targets and anything inside `[role="dialog"]` (global-keybindings.ts:40-50). So "/" would still fire from the Tasks tab and move focus to the rail Search; any in-view "/" to focus the tag/filter input would conflict unless it stops propagation or the global one learns to skip the view.
- `isTypingTarget` (event-calendar-keys.logic.ts:80-85, tags INPUT/TEXTAREA/SELECT or contenteditable) is a reusable guard, already imported by global-keybindings.ts:11 from the event-calendar feature (a features-to-features import, so a move to `utils/` would be cleaner if TasksView adopts it; opinion).
- Documentation: Cmd+Shift+T is listed in help/documentation/20-keyboard-shortcuts.md:14 and again in the cheat sheet at :129. The Calendar tab has its own shortcut table tied by tests to the resolver and to `20-keyboard-shortcuts.md` / `27-calendar.md` (event-calendar-keys.logic.ts:41-71). Tasks has no in-view shortcut table today; help/documentation/10-tasks-and-todoist.md is the Tasks doc.

### Patterns in comparable views

| View | Keyboard model | Evidence |
|---|---|---|
| Quick Switcher | Full list keyboard model for free: `Command.Dialog` (bits-ui command) gives input-focused filter, ArrowUp/Down, Enter via `onSelect`, Escape closes. `shouldFilter={false}`, own ranking. | QuickSwitcher.svelte:63-80 |
| Note list (rail) | Each row is one `<button data-note-row>` with `focus-visible:ring-2 ring-inset`, Tab stops only. No arrow navigation. One extra key (RENAME_SHORTCUT) on keydown. | NoteRow.svelte:67-73 |
| Search panel | Input only handles Escape (blur); results are `<button>`s, Tab only, no arrow navigation from the input into the results. "/" focuses the input via a `focusRequest` counter. | SearchPanel.svelte:22-39, SearchResult.svelte (button at the card) |
| Calendar view | Pure resolver `resolveCalendarKey(e, state)`, typing and dialog guards, root `tabindex` focused on mount, body-target fallback listener, shortcut table + help dialog, focus parking after destructive actions. | EventCalendarView.svelte:38-110, event-calendar-keys.logic.ts:1-98 |
| Kanban | Focused lane/item indices in a store, ArrowUp/Down/Left/Right, Enter to edit, Space to toggle, Delete, `n` to add, Escape to clear focus; handler is on a `tabindex="-1"` root with a svelte-ignore. | KanbanView.svelte:236-322, :459-460, :519-520 |
| Properties picker | Per-row checkbox keydown, ArrowUp/Down between rows, explicit refocus after reorder. | RailPropertiesPicker.svelte:62-66, :93-96, :153 |
| TagsView | Only icon imports match "ArrowDown" (sort icons); no keyboard handler at all. | TagsView.svelte:3-4 |

Observation: of the six in-pane lists, only Kanban, Calendar and the properties picker implement arrow navigation. Rail lists and search rely on Tab. A keyboard-first Tasks list would be the first "flat list with arrow navigation and per-row actions" in the app, so it should copy Kanban's model (store-held focus, Space toggles) and Calendar's guards.

### Tests that currently pin behavior

- Unit: src/tests/lib/features/tasks/TasksView.test.ts covers row clicks, circle labels and wikilink clicks (titles at :54, :101, :114, :138, :152, :160, :176). Nothing covers keyboard.
- e2e: e2e/specs/tasks-view.spec.ts selects the toggle by role+name `Mark task as done` inside `[data-task-row]` (spec :56-58), the hide-completed button by `button[title*="completed"]` (spec :48) and the tag input by role textbox name /section tag/ (spec :19). A redesign that renames these breaks e2e; keep `data-task-row`, the toggle name and the input name, or update the spec in the same ticket.
- pane-toolbar.test.ts lists TasksView as a consumer of the `pane-toolbar` utility (src/tests/lib/pane-toolbar.test.ts:20).

## Problems and opportunities

Facts first, then opinion.

1. No keyboard path to "open the note at this task line" (fact: TasksView.svelte:188-193 span, svelte-ignore). This is the main action of the view. Opinion: highest-priority gap.
2. No row-to-row navigation; with N tasks a keyboard user presses Tab through 2 stops per row plus every link/wikilink inside the text (fact: :177, :198, :203). Opinion: a long list is nearly unusable without a mouse.
3. Focus loss after a toggle when completed tasks are hidden (fact: default hideCompleted true, TasksView.svelte:48-50; rows keyed by lineNumber :169; no refocus logic). Calendar already solved the same problem with `parkFocusAfterDelete` (EventCalendarView.svelte:93-104).
4. Nothing receives focus on open (fact: no focus code). Opinion: Cmd+Shift+T should land focus on the list (or the filter field, depending on the owner's answer below) so arrows work immediately, as Calendar does with `root?.focus()` at mount (EventCalendarView.svelte:38-42).
5. Screen reader semantics are missing: icon-only hide button has only `title`, filters lack `aria-pressed`, tag input lacks a real label, toggle label does not include the task text, no list/group roles, nesting not exposed, no live region for count/empty/loading (facts above). Opinion: all are cheap fixes once rows become a proper listbox/list.
6. Weak focus indicators: tag input uses `focus:outline-none` with a faint border (TasksView.svelte:131); pills, toggle and file button rely on the UA default ring. Note-list rows already define a consistent ring (`focus-visible:ring-2 ring-ring/50 ring-inset`, NoteRow.svelte:70). Opinion: reuse that token for the selected/focused row.
7. Color-only state: active filter pill and "hide completed" active state differ by background tint only (:96-99, :109-112). Opinion: add `aria-pressed` and a non-color cue.
8. Contrast: file name uses `text-purple-400` (:154) rather than a theme token; not measured here. Opinion: verify against the light theme, since `bg-card` is white in `:root` (app.css `--card: oklch(1 0 0)`).
9. Bare-key shortcuts are a hazard: `registerKeybinding` has no typing guard (keybindings.ts:77-98), so in-view bare keys must use a local handler like Calendar, not the global registry. And "/" is already claimed globally (global-keybindings.ts:40-50).
10. The "text click opens note" and "circle toggles" split is mouse-only; a keyboard equivalent needs two distinct keys (Space toggles, Enter opens), which matches Kanban (KanbanView.svelte:294 Space toggles; :282 Enter edits).

## Recommendations for the redesign

Opinions, ordered by value. Each is a candidate vertical slice.

1. **Row model: roving focus, identity by `filePath:lineNumber`.** Make the list a single Tab stop (`role="listbox"` with `aria-activedescendant`, or `role="list"` with roving `tabindex`) and move a "current row" with ArrowUp/ArrowDown, Home/End, and optionally PageUp/PageDown. Keep the current row in a small store field or local `$state` keyed by `filePath + ':' + lineNumber`, not an index, because refetches reorder rows. Scroll the current row into view (the `ScrollArea` viewport is the scroll parent). Prefer a roving model over bits-ui `Command` here because Command is built around a filter input and a dialog (QuickSwitcher.svelte:63-80); the Kanban store-held model fits a persistent view better (KanbanView.svelte:236-322).
2. **Per-row keys (when a row or the list container is focused and the target is not a typing target):**
   - Space or `x`: toggle the current task (same call as `handleToggle`).
   - Enter: open the note at the task line (`openNoteAt` kind `line`, as TasksView.svelte:68).
   - Cmd/Ctrl+Enter or `o`: open in a new/background context only if the app has such a call; otherwise skip (not verified in this audit).
   - ArrowLeft/ArrowRight (or `[`/`]`) to collapse or jump between file groups, or `Shift+ArrowDown/Up` to jump to the next/previous file header; opinion: group jumping is the one extra that pays for itself on long lists.
   - `/` or `f`: focus the filter/search input, with `stopPropagation` or a global-side skip so rail Search does not also open (global-keybindings.ts:40-50).
   - Escape: leave the input, then clear the current row.
   - `h`: toggle hide-completed; `1/2/3` or `[`/`]`: cycle date range. These mirror Calendar's `D/W/M` and `T` (event-calendar-keys.logic.ts:57-70). Keep the set small; every bare key needs a help-table entry.
3. **Reuse the Calendar architecture, not Kanban's inline switch:** a pure `resolveTasksKey(e, state)` in a `tasks-keys.logic.ts` returning an action union, a `TASKS_SHORTCUTS` table, a root handler plus a body-target fallback listener (EventCalendarView.svelte:106-114), `isTypingTarget` for the guard, and a test that ties the table to help/documentation docs (event-calendar-keys.logic.ts:41-57). This satisfies the repo rule that logic is pure and testable (`.logic.ts`, no framework imports).
4. **Focus on open and after mutation.** On mount, focus the list root (or first row). After a toggle that removes the row (hide-completed on), move the current selection to the next surviving row (or the previous if last) using `await tick()` then focusing, as `parkFocusAfterDelete` does. If the list becomes empty, park focus on the list root, not `<body>`. Consider keeping a ticked task visible until the next refetch (strikethrough) so the user sees what happened; that is a design choice for the owner.
5. **Semantics.** Rows: `role="option"` (listbox) or `listitem`; group per file with `role="group"` and `aria-labelledby` pointing at the file header; expose nesting with `aria-level` for indent. Toggle button label includes the task text, or make the row itself the checkbox (`role="checkbox"` + `aria-checked`, tri-state for `[/]`/`[!]` if those statuses are shown). Filter pills: `aria-pressed` (or a `role="radiogroup"` for the three mutually exclusive date ranges). Hide button: `aria-pressed` + `aria-label` instead of `title`-only. Tag input: a real `aria-label="Section tag"` (keeps the e2e role/name query working). Status line: `role="status"` / `aria-live="polite"` for "N tasks in M files", loading and empty states.
6. **Focus styling.** Use one visible ring token for the current row, matching NoteRow (`focus-visible:ring-2 ring-ring/50 ring-inset`, NoteRow.svelte:70), and do not remove outlines from the input without an equivalent ring.
7. **Make links in the text secondary stops.** Give wikilinks and URLs `tabindex="-1"` while the row model is active and expose them through a key (for example Tab to step into the row's links, or `l` to open the first link), so one task does not cost four Tab presses (compare NoteRow's `tabindex="-1"` link pills, NoteRow.svelte:115-118).
8. **Docs and tests with each slice:** add a Tasks section to help/documentation/10-tasks-and-todoist.md and the shortcuts table in 20-keyboard-shortcuts.md; unit-test the resolver with real stores (project rule: never mock stores or `.logic.ts`); add one e2e that presses arrows, Space and Enter and asserts rendered content (project rule 8). Keep `data-task-row`, the toggle accessible name and the tag input name stable or update e2e/specs/tasks-view.spec.ts in the same commit.

Suggested slice order (opinion): (a) open note at line from the keyboard + focus on open, (b) arrow navigation with a focus ring and Space toggle, (c) focus handoff after a row disappears, (d) ARIA semantics and live region, (e) filter shortcuts and help table.

## Open questions for the owner

1. Should Cmd+Shift+T land focus on the list (arrows work at once) or on a filter/search field (type-to-filter first)? This decides whether bare letters are shortcuts or text.
2. Is bare-key shortcut style acceptable in Tasks (as in Calendar: `T`, `N`, `D/W/M`), or should everything use modifiers? Bare keys are faster but need the typing guard and help table.
3. When "hide completed" is on and the user ticks a task: should the row vanish immediately (current behavior, needs focus handoff) or stay struck through until the next refresh/refilter?
4. Should Space toggle and Enter open the note, or the reverse? Kanban uses Space = toggle, Enter = edit (KanbanView.svelte:282-300); Quick Switcher uses Enter = open.
5. Is the `/` key allowed to mean "focus the task filter" while the Tasks tab is active, overriding the global "/ opens Search"? If not, pick `f`.
6. Should the richer statuses in the data model (`TaskStatus`, task-metadata.types.ts) get their own key (for example cancel or in-progress), or does the view stay done/not-done only? This affects the ARIA role (two-state checkbox vs tri-state).
7. Do you want a visible in-view shortcut hint (Calendar has a help dialog opened with `?`), or only the doc tables?
8. Is screen reader support a goal for this app, or is the target "keyboard-first for sighted users"? It changes how much ARIA work belongs in the first tickets versus a later pass.

## Not verified

No runtime check of where focus lands after Cmd+Shift+T or after a toggle (inferred from code). Color contrast of `text-purple-400` and of the tinted pills was not measured. Whether `openNoteAt` has a background/new-tab variant was not checked.

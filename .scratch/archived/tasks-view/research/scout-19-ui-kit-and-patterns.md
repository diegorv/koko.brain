# Scout 19: ui-kit-and-patterns

Recovered from the workflow journal: the agent's Write was refused, so this is its returned text.

I did not write the `.md` file: the agent-thread rules say to return findings directly, so the full text below is the output.

## Facts

- **shadcn-svelte components present** (`src/lib/components/ui/`): button, collapsible, command, context-menu, dialog, dropdown-menu, input, popover, resizable, scroll-area, select, separator, switch, tooltip. Button sizes include `icon`, `icon-sm`, `icon-lg` (`button/button.svelte` ~19-25). Select trigger has `default` (h-9) and `sm` (h-8) (`select/select-trigger.svelte:22`).
- **Absent:** badge, tabs, toggle-group, checkbox, label, calendar/date-picker, toggle, textarea.
- **Tasks view is an editor tab, not a rail item.** `src/lib/app/EditorView.svelte:71-72` renders `<TasksView>` when `isTasksTab`. Its width is the editor pane's remaining space.
- **Rail layout** (`src/lib/app/AppShell.svelte:198-263`): Rail is `w-12` (48px) at `Rail.svelte:87`. Navigator pane: `minSize=3 maxSize=30` (207-213). Note list: `minSize=3 maxSize=40` (238-244). Editor pane is `order=3` with no size, so it takes the remainder (261-263). Defaults `noteListSize: 20`, `navigatorSize` also set in `settings.store.svelte.ts:69-70`. Pane sizes are percentages (from memory: paneforge).
- **pane-toolbar** utility: `src/app.css:141-143` = `flex h-10 shrink-0 items-center gap-1 px-3 border-b border-divider`. Docs at `app.css:134-140` forbid site overrides.
- **pane-toolbar is enforced by a test:** `src/tests/lib/pane-toolbar.test.ts:20` lists TasksView among 7 toolbars. Its OVERRIDE regex forbids `h-`, `p*-`, `gap-`, `border-` (non-b), `flex-wrap` on the toolbar element. A two-row or wrapping Tasks toolbar would break this test unless the test is updated.
- **TasksView toolbar** (`src/lib/features/tasks/TasksView.svelte:105-164`): date filter text buttons on file mtime (31-35, 107-117; applied to `fileTaskGroups` at line 53). Hide-completed icon toggle (120-135, title-only labels, no `aria-pressed`). Todoist sync button shown only with token (137-152). Section-tag input with Hash icon, `w-28`, placeholder "section tag", 400ms debounce (40-46, 154-163).
- **TasksView content:** grouped only by file (178-180); file header uses hard-coded `text-purple-400` (184); done-in-Todoist icon uses `text-green-400` (252), not tokens. Clicking task text toggles it (215-220, a11y ignore comment). Row action is `TodoistPopover` (265) with `opacity-0 group-hover:opacity-100` (TodoistPopover.svelte:113).
- **TodoistPopover** (`src/lib/features/tasks/TodoistPopover.svelte`): `Popover` `w-64` (119). Three fields only: project Select (144-166), section Select (170-195, shown only when sections exist), priority Select with hard-coded labels Normal/High/Urgent/Very Urgent (31-36, 198-214). Due date and recurrence are read-only pills, with emoji glyphs 📅 and 🔁 (123-141, lines 127 and 132). Only send action (221-234). No labels, due-date edit, or bulk send.
- **Good patterns elsewhere:**
  - `CollectionView.svelte:512-528`: view tabs in pane-toolbar with ContextMenu and inline rename.
  - `KanbanView.svelte:463-476`: segmented icon control (board/list) with border group and `bg-primary/10 text-primary` active state.
  - `RailSortMenu.svelte`: Popover with radio-style rows, arrow/Home/End/Enter keyboard handler (`handleMenuKeydown`), trigger that shows `+N` for extra sort columns, "customized" color state, and `@[16.5rem]` container query to hide the label when narrow.
  - `list-toolbar.types.ts`: `ListSortConfig` and per-list persisted `ListPrefs` (sort, properties).
  - `RailPropertiesPicker.svelte` and `RailSortMenu.svelte`: Popover + Input for pickers.
- **Tokens** (`app.css:84-88`): `text-label` 11px, `text-meta` 12px, `text-row` 14px.

## Problems and gaps

1. The only filter is a file-mtime date range, not task due date or status. There is no rule model, no source selection (which notes or folders are scanned), and no category or tag grouping.
2. The section-tag field is a free-text box with no explanation, autocomplete, or validation. It is not a combobox; the Command component exists but is unused here.
3. No `aria-pressed` on filter or toggle buttons (TasksView 107-135). Icon-only controls rely on `title` only; no Tooltip used.
4. Hover-only Todoist affordance (TodoistPopover:113). Focus-within is listed, but discoverability is low.
5. Hard-coded colors (`text-purple-400`, `text-green-400`) bypass tokens.
6. Emoji glyphs in popover pills conflict with the lucide icon style elsewhere.
7. No Badge, Tabs, Checkbox, ToggleGroup, or Calendar primitives, so any richer filter UI needs new shadcn components added via the CLI (CLAUDE.md convention).
8. Narrow-width behavior of the toolbar is not verified (from memory: four groups in one `h-10` row, no wrap allowed by the test).

## Ideas worth keeping

- Saved task views as tabs in the pane-toolbar, following CollectionView 512-528.
- Kanban-style segmented control for list/group mode (KanbanView 463-476).
- RailSortMenu keyboard model and `+N` extra-count trigger for multi-criteria sort or group.
- `ListSortConfig`/`ListPrefs` shape for persisted task-view settings.
- Container-query label collapse (`@[16.5rem]`) for a narrow toolbar.
- Popover with Select rows for the Todoist send form, extended to due date and labels.
- Command component for a searchable source or tag picker.

## Open questions

- Keep Tasks as an editor tab (widest space) or make it a rail item with a navigator pane (max 30%)? A rule builder probably needs more width than a navigator gives.
- Should rule editing use a Dialog (exists) or an inline panel?
- Should the pane-toolbar test be relaxed or a second toolbar row utility added?
- Add new shadcn primitives (tabs, badge, checkbox, toggle-group) or reuse the segmented-button pattern?

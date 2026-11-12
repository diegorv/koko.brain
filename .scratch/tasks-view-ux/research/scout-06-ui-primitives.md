# Scout 06: UI primitives for a Tasks view redesign

Scope: inventory of `src/lib/components/ui` (shadcn-svelte), where each primitive is already used, project wrappers, and the constraints from ADR-0002 and the source-scan tests. Read-only research; nothing was run.

## Summary

The repo ships 14 shadcn-svelte primitives. Of the 14 candidates in the brief, 9 exist (collapsible, select, dropdown-menu, context-menu, tooltip, input, popover, scroll-area, separator, command) and 4 do not: checkbox, toggle-group, tabs, badge. The 4 missing ones are all available in the installed bits-ui 2.20.4 (checkbox, tabs, toggle-group exist under `node_modules/bits-ui/dist/bits`; badge is a plain styled span in shadcn, not a bits-ui part), so adding them means running the shadcn-svelte CLI per ADR-0002. `TasksView.svelte` uses only one primitive (`ScrollArea`) and hand-rolls everything else (filter pills, icon toggle, raw `<input>`, hardcoded `text-purple-400`). Several other views already hand-roll segmented controls and pills, so a shared segmented control and a shared chip would pay off beyond Tasks.

## Facts (verified in code)

### Inventory of `src/lib/components/ui`

Directories present (listed by `ls`): button, collapsible, command, context-menu, dialog, dropdown-menu, input, popover, resizable, scroll-area, select, separator, switch, tooltip. Absent: checkbox, toggle, toggle-group, tabs, badge, label, skeleton, progress, card, table, alert, sheet, accordion.

Usage count outside `components/ui` (files importing `#lib/components/ui/<name>/`, from `src/lib` and `src/routes`):

| Primitive | Files using it | Examples |
|---|---|---|
| button | 33 | settings sections, dialogs (`src/lib/features/todoist-sync/TodoistSyncLogDialog.svelte:36`) |
| input | 25 | settings sections, `AutoOrganizeRuleRow.svelte:3` |
| switch | 17 | settings sections |
| popover | 9 | `src/lib/features/collection/CollectionView.svelte:30,593-615`, `TagColorPicker.svelte`, `RailPropertiesPicker.svelte` |
| context-menu | 8 | `EditorTabs.svelte`, `KanbanCard.svelte`, `NoteRowMenu.svelte`, `CollectionView.svelte` |
| dialog | 8 | `EventDialog.svelte`, `ViewDialog.svelte` |
| scroll-area | 8 | `TasksView.svelte:137`, `SettingsPanel.svelte`, `SnapshotList.svelte` |
| command | 7 | `QuickSwitcher.svelte`, `TemplatePicker.svelte`, `ModActionPicker.svelte` |
| select | 7 | `AutoOrganizeRuleRow.svelte:6`, `UpdateSection.svelte`, `EventCalendarSection.svelte` |
| dropdown-menu | 6 | `NoteActionBar.svelte`, `collection/toolbar/SortPanel.svelte`, `FilterRow.svelte`, `PropertiesView.svelte` |
| separator | 5 | `BacklinksPanel.svelte:6`, `PropertiesView.svelte`, `TableOfContentsPanel.svelte` |
| collapsible | 4 | `BacklinksPanel.svelte:7,64-101`, `TagItem.svelte:28`, `SidebarSection.svelte:57`, `FilterPanel.svelte` |
| tooltip | 3 | `DailyNoteButton.svelte:3-22`, `EventCalendarView.svelte`, `EventCalendarHeader.svelte` |
| resizable | 1 | `AppShell.svelte` |

### The Tasks view today

- Only primitive imported: `ScrollArea` (`src/lib/features/tasks/TasksView.svelte:10`, used at `:137`). Everything else is raw elements.
- Toolbar uses the shared `pane-toolbar` utility (`TasksView.svelte:92`). The utility is `flex h-10 shrink-0 items-center gap-1 px-3 border-b border-divider` (`src/app.css:148-150`).
- Date filter pills and the hide-completed toggle are raw `<button>` with `bg-primary/20 text-primary` for active state (`TasksView.svelte:94-120`). No `aria-pressed`, no roles; the hide toggle only has `title=` (`:114`).
- Section tag filter is a raw `<input>` with its own classes (`:126-133`), not the `Input` primitive. It has only a `placeholder`, no `aria-label` (`:130`).
- File header uses hardcoded `text-purple-400` (`:154`), a palette color, not a theme token.
- Row toggle is a `Circle` / `CircleCheckBig` lucide icon inside a button with `aria-label` "Mark task as done" / "Mark task as not done" (`:179-186`). It is not a checkbox primitive; it represents only done vs not-done and ignores `status` beyond `toggleTarget`.
- Type scale used in the view: `text-xs` and `text-sm` (`:96,144,154`), not the named roles `text-label/meta/rail/row/title` (`src/app.css:80-100`).

### Project-specific wrappers and tokens

- Button: `tv()` variants default/destructive/outline/secondary/ghost/link and sizes default/sm/lg/icon/icon-sm/icon-lg (`src/lib/components/ui/button/button.svelte:9-27`). Renders `<a>` when `href` is set. `ghost` + `icon-sm` is the obvious replacement for the hand-rolled toolbar buttons.
- Input: uses `bg-input-bg` token and `h-9` default height (`ui/input/input.svelte`), which is taller than the 24px (`h-6`) input in the toolbar (40px `pane-toolbar` row). It needs a `class` override for compact height.
- Switch: custom `bg-switch-unchecked-bg` token (`ui/switch/switch.svelte`).
- Separator: uses `bg-divider` token (`ui/separator/separator.svelte`).
- ScrollArea: wrapper exposes `orientation`, `viewportRef`, and tags the viewport `data-slot="scroll-area-viewport"` (`ui/scroll-area/scroll-area.svelte`); the Tasks E2E relies on that slot (`e2e/specs/tasks-view.spec.ts:75`).
- Tooltip: `Tooltip.Provider` is mounted only inside `EventCalendarView.svelte:237-265`; `DailyNoteButton.svelte:8-22` uses `Tooltip.Root` without one. Tooltip content is `bg-foreground text-background` with arrow (`ui/tooltip/tooltip-content.svelte`).
- Dropdown/Context menu items: `text-sm` row, `gap-2`, `size-4` icons, `data-highlighted:bg-accent` (`ui/dropdown-menu/dropdown-menu-item.svelte`). Includes checkbox-item, radio-group, radio-item, sub-menus, shortcut.
- Collapsible: thin pass-through of bits-ui Collapsible (`ui/collapsible/collapsible-content.svelte`), no animation classes. Consumers build their own trigger styling (`BacklinksPanel.svelte:65`).
- Select: full set including group, label, scroll buttons (`ui/select/index.ts`).
- Command: full cmdk-style set including `command-dialog`, `command-input`, `command-item`.
- Popover: only `Root`, `Trigger`, `Portal`, `Content` (`ui/popover/index.ts`). Kanban imports bits-ui Popover directly (`src/lib/plugins/kanban/KanbanCardText.svelte:4`, `KanbanDatePicker.svelte:4`), the only bits-ui direct imports outside `components/ui`.
- shadcn config: style `vega`, baseColor `zinc`, aliases under `#lib` (`components.json`).

### Hand-rolled patterns elsewhere that a redesign could reuse or converge with

- Segmented tablist with roving tabindex and arrow keys: `src/lib/features/event-calendar/EventCalendarHeader.svelte:24-32,100-125` (`role="tablist"`, `rounded-md border p-0.5`, selected `bg-muted`).
- Pressed-state filter chips built from `Button` `variant={filter === f.value ? 'secondary' : 'ghost'}` with `aria-pressed`: `TodoistSyncLogDialog.svelte:36-46`. Also `aria-pressed` buttons in `NoteActionBar.svelte:150-230`, `RailArchivedMenu.svelte:51`, `LayoutSection.svelte:60`.
- Count badges as inline spans: `FilterPanel.svelte:102,164` (`rounded-full bg-primary/15 px-1.5 text-label font-semibold text-primary`), `TrashSection.svelte:68` (`rounded-full bg-muted px-2 py-0.5 text-label`), `EventCalendarNeedsAttention.svelte:69` (destructive pill).
- Due-date proximity chips with hardcoded palette colors: `src/lib/plugins/kanban/KanbanListView.svelte:48` (overdue red-500, today yellow-500, else muted) and `KanbanDatePicker.svelte:21-22`. Tasks already have `metadata` (due, priority, recurrence; `task-metadata.types.ts` re-exports `TaskPriority`, `TaskMetadata`, `RecurrenceRule` from `#lib/contracts/index.js`), so a due chip is a natural reuse.
- Native checkboxes (no primitive) in 6 places: `PropertiesPanel.svelte:80,98,127`, `PropertyField.svelte:126`, `EventDialog.svelte:202`, `RailPropertiesPicker.svelte:149`. There is no checkbox primitive in the repo, so there is no project convention to follow for one.
- Theme-token palette available for colored accents: `--color-type-red/orange/yellow/green/teal/blue/purple/pink` (`src/app.css:63-70`), plus `primary`, `destructive`, `muted`, `accent`.

### ADR-0002 and test-enforced constraints

- Primitives are shadcn-svelte copies in `src/lib/components/ui/*`, built on bits-ui (`^2.20.4`, `package.json:57`; installed 2.20.4) and Tailwind 4 (`ADR-0002` Decision). New primitives are added with the shadcn-svelte CLI (`pnpm dlx shadcn-svelte@next add ...`) then edited in place (Consequences). The ADR's own pins are stale: it cites `package.json:67` for bits-ui `^2.16.5`; the file now has `^2.20.4` at line 57. Do not rely on its line numbers.
- 2026-10-29 amendment: the CLI "has not been run against these aliases yet"; generated imports must carry an extension to pass `src/tests/lib/lib-specifier-convention.test.ts`. Expect to hand-fix imports (`#lib/utils.js`, `./index.js`) after generating. Existing generated files already follow this (`ui/button/button.svelte:2`).
- ADR-0002 Consequences: "components should read tokens, not hardcode colors." Hardcoded palette colors exist (14 sites in features, e.g. `BuildInfo.svelte:30`, kanban chips, and `TasksView.svelte:154`), but a redesign should use tokens.
- 2026-11-05 amendment: `dark:` follows `html.dark` (applied theme), not OS appearance (`src/app.css` `@custom-variant dark`). Primitives that use `dark:` variants (Button outline, Switch thumb) are correct under that rule.
- Custom primitives that no shadcn template fits are feature-local, not placed in `components/ui/` (ADR-0002 Consequences). A segmented control built for Tasks and then reused would belong in `ui/` only if generated from a template (toggle-group); otherwise feature-local.
- `src/tests/lib/pane-toolbar.test.ts:17-24,45-48`: `TasksView.svelte` must have exactly one class list with `pane-toolbar` and no `h-*`, `p*-`, `gap-*`, `border-*` (except `border-b`), or `flex-wrap` on that element. A second filter row must not reuse `pane-toolbar`; wrapping filters inside the toolbar element is not allowed. Child wrappers inside the toolbar may use their own classes (the current ones do).
- `src/tests/lib/chrome-type-scale.test.ts`: no `text-[Npx]` under 11px; any `uppercase` must go through `section-label` (or be listed in `OWN_UPPERCASE`); `section-label` cannot carry a `text-*/NN` opacity. `components/ui` is out of scope for this scan.
- `src/tests/lib/radius-scale.test.ts`: ratchet on bare `rounded` and arbitrary `rounded-[...]`; use ladder rungs `rounded-xs/sm/md/lg/xl`. New code should add none.
- `src/tests/lib/menu-item-anatomy.test.ts`: menu items at call sites add no horizontal margin on icon/content, no `text-xs` label, shortcuts via `formatShortcut(...)`. Applies if a row context menu or filter dropdown is added.
- Existing tests that pin the current DOM (a redesign will touch them):
  - `src/tests/lib/features/tasks/TasksView.test.ts:117,133,144-157`: row toggle found as `[data-task-row] button` with `aria-label` "Mark task as done" / "Mark task as not done", and the SVG `circle` element present or absent as the done signal. Swapping to a checkbox primitive changes these assertions.
  - `TasksView.test.ts:96`: `[data-task-row] span` is the click target for open-at-line.
  - `TasksView.test.ts:226-232`: asserts no Todoist action, no Sync button, no Todoist badge for the no-token case.
  - `e2e/specs/tasks-view.spec.ts:20,31,42,69,99`: section tag input located as `getByRole('textbox', { name: /section tag/i })`; `:47` hide button as `button[title*="completed"]`; `:53-54` toggle as `[data-task-row]` with button name "Mark task as done"; `:75` the scroll viewport by `data-slot`.
- Tooltips versus `title=`: the repo has about 130 `title=` attributes and only 3 files using the Tooltip primitive, so `title=` is the dominant convention for icon-button hints, including the Tasks hide toggle.

## Problems and opportunities

Facts first, then opinion where marked.

1. Fact: Tasks hand-rolls three controls (pills, icon toggle, tag input) that exist as, or map onto, primitives (`Button` ghost/secondary, `Input`). Fact: the pills have no `aria-pressed` or tab semantics; the hide toggle has no `aria-pressed`; the tag input has no accessible name beyond placeholder.
2. Fact: no checkbox, toggle-group, tabs or badge primitive exists. Opinion: the circle toggle is acceptable visually, but it is not a semantic control. A real checkbox (bits-ui Checkbox) gives `role="checkbox"`, `aria-checked`, space-key toggling and an indeterminate state, which can represent in-progress `[/]` tasks (status is richer than checked; `TasksView.svelte` already special-cases it in a comment).
3. Fact: the "section tag" is a free-text input debounced 400 ms (`TasksView.svelte:30-39`) with default `#to-list`. Opinion: this is a settings-like power feature taking permanent toolbar width; a Popover (existing pattern at `CollectionView.svelte:593-615`) or a Select of known tags could hold it.
4. Fact: grouping is a flat list; no collapse. Collapsible is proven for exactly this shape (file group with a count: `BacklinksPanel.svelte:64-101`, `TagItem.svelte:28`).
5. Fact: due/priority metadata is parsed (`TaskItem.metadata`, `tasks.types.ts`) but the view does not render it. Opinion: chips for due date and priority are the highest-value visual gain and the repo already has two chip idioms to converge on.
6. Fact: the file color is a hardcoded palette (`text-purple-400`), which contradicts ADR-0002's token rule and can clash with light themes. Opinion: use `text-foreground` with an icon from `file-icons`, or `text-primary`.
7. Fact: Tooltip needs a `Tooltip.Provider` only in one place today. Opinion: bits-ui Tooltip works without a Provider (as `DailyNoteButton` does), but delay behavior differs; wrap the toolbar in `Tooltip.Provider delayDuration={400}` to match the calendar if tooltips are used.

## Recommendations for the redesign (opinion, ordered by cost)

1. No new primitives needed for a good first slice: Button (`ghost`, `icon-sm`, `aria-pressed`) for filters, Input for the tag field, Collapsible for file groups, Separator, Popover and DropdownMenu (checkbox/radio items) or Select for filter menus, Tooltip for hints. Each is already generated and used.
2. A segmented date filter is the most reusable gap. Two routes: (a) feature-local segmented control copying `EventCalendarHeader.svelte:100-125` (roving tabindex, arrows, `role="tablist"`); (b) generate `toggle-group` via the CLI and use it with `type="single"`. Route (b) is the ADR-conformant way to share it; route (a) has zero new files in `ui/` and an existing pattern. A `Select` (`ui/select`) for the three date ranges is the cheapest and fits a 40px toolbar when width is tight.
3. For the completion control, generate `checkbox` only if the redesign wants real checkbox semantics or an in-progress/indeterminate state. If the circle stays, add `role="checkbox"` and `aria-checked` to the existing button to avoid new primitives. Either way, plan to rewrite `TasksView.test.ts:117-157` and `e2e/specs/tasks-view.spec.ts:53-54`, which pin the icon SVG and the aria-label strings.
4. For count and due/priority chips, generate `badge` (CLI) or add a feature-local chip class following `FilterPanel.svelte:102` (`rounded-full bg-primary/15 px-1.5 text-label font-semibold text-primary`). Use `--color-type-*` tokens for priority levels instead of palette classes (Kanban's `bg-red-500/15` is existing debt, not a model).
5. Layout rules to respect: keep one `pane-toolbar` element with no overrides (`pane-toolbar.test.ts`); put any second row (active-filter chips, search) in a separate non-`pane-toolbar` div; use `text-label/meta/rail/row` and `section-label` instead of `text-xs/text-sm` and ad hoc uppercase; use radius rungs only.
6. Keep the E2E hooks stable or update them in the same slice: `data-task-row`, `role=textbox` named "section tag" (add an explicit `aria-label="Section tag"`), a `title` containing "completed" on the hide toggle, and the `data-slot="scroll-area-viewport"` on the scroll container.
7. For long lists, ScrollArea is already in place; a `command`-based filter input is possible but heavy (it is a cmdk list, built for pickers). Opinion: a plain `Input` with a search icon is enough for a text filter.

## Open questions for the owner

1. Is adding shadcn primitives (toggle-group, checkbox, badge) via the CLI acceptable in this effort, given the ADR note that the CLI has not been run against the `#lib` aliases (imports need hand-fixing)? Or should the first slices use only primitives already in the repo?
2. Should the circle checkbox stay, or should in-progress (`[/]`) and cancelled tasks get their own visual states (which would argue for a checkbox primitive with an indeterminate state)?
3. Should the section-tag input stay always visible, move into a popover or a Select of existing tags, or become a persisted setting?
4. Is `title=` still the intended hint convention for icon buttons (about 130 uses), or should the Tooltip primitive become the standard for new work?
5. May the E2E spec and `TasksView.test.ts` selectors (aria-labels, SVG circle assertions) be rewritten as part of the slice that changes the toggle?

# Scout 07: pane-toolbar convention, tab/pane layout, rail shell

Read-only research. Facts are verified in code at the current `main` working tree unless marked "unverified". Opinions are in their own sections.

## Summary

The Tasks view is a singleton virtual editor tab (`__virtual__/tasks`) rendered by `EditorView.svelte`, so it is the widest surface the app offers: the right sidebar is hidden for it, and it shares the editor pane with nothing but the rail, the optional navigator and the note list on its left. Its one toolbar must be a single `pane-toolbar` row (40px, fixed height, no wrapping), and `pane-toolbar.test.ts` forbids any height, padding, gap, border-color or `flex-wrap` class on that element and allows exactly one such class list per file. Anything richer than one row (rule sentence, quick-filter chips, list column) has to live below the toolbar in plain content markup. A rail slot is a poor fit: a rail item is a lens that resolves to a list of notes, and a navigator pane is capped at 30 percent of the window and sits beside a note list, so a task list would have to become a new kind of list rather than reuse the rail.

An important finding for the orchestrator: this redesign was already researched and specified once. `.scratch/archived/tasks-view/` holds a PRD, a mockup and 55 research files, and `.scratch/open-itens/issues/108..129` hold the vertical slices that came out of it (several are `ready-for-agent`, and `TasksView.svelte` is listed as a "run in series" hot file). New tickets must be reconciled with those, not written from scratch.

## Facts

### The toolbar utility and its test

- `src/app.css:148-150`: `@utility pane-toolbar { @apply flex h-10 shrink-0 items-center gap-1 px-3 border-b border-divider; }`. The comment above it (`src/app.css:141-147`) says a site adds no height, padding, gap or border color of its own.
- `src/tests/lib/pane-toolbar.test.ts:16-24`: seven toolbars are listed: `NoteActionBar`, `CollectionView`, `TagsView`, `TasksView`, `KanbanView`, `EventCalendarHeader`, `SidebarSection`.
- `pane-toolbar.test.ts:39-44`: the utility's `@apply` list must contain `flex h-10 shrink-0 items-center gap-1 px-3 border-b border-divider`. Changing the utility itself breaks the test and every neighbouring pane's bottom edge.
- `pane-toolbar.test.ts:46-50`: for each file, `toolbarClassLists` (line 35-37) scans literal `class="..."` attributes and keeps those that contain the word `pane-toolbar`; the count must be exactly 1, and that list must not match `OVERRIDE`.
- `pane-toolbar.test.ts:30`: `OVERRIDE = /(^|\s)(h-\S+|p[xytblr]?-\S+|gap-\S+|border-(?!b\b)\S+|flex-wrap)(?=\s|$)/`. Consequences, all checked against the regex:
  - forbidden on the toolbar element: `h-*`, `p-*`, `px-*`, `py-*`, `pl-*` and the other sides, `gap-*`, `border-<anything but b>` (so `border-border` fails), `flex-wrap`;
  - allowed: `bg-*`, `text-*`, `min-w-0`, `overflow-*`, `w-full`, `cursor-*`, `transition-*`, `justify-*`, `border-b-*`, and `min-h-*` (the `h-` alternative needs a start or whitespace before it);
  - children are not scanned, so inner wrappers may use any class, including `gap-*` and `px-*`.
- Only a second `class="..."` containing the word `pane-toolbar` breaks the count, so a second, non-toolbar row is legal; a second `pane-toolbar` in the same file is not. A dynamic `class={...}` is not matched, so the one toolbar must stay a literal string (an expression inside the quotes, `class="pane-toolbar {x}"`, is fine for the regex).
- Component tests assert the class on rendered elements for other panes (`src/tests/lib/app/AppShell.test.ts:281,396-397`, `NoteActionBar.test.ts:281`, `EventCalendarView.test.ts:121-127`, `SidebarSection.test.ts:47`). There is no such component-level assertion for Tasks: `src/tests/lib/features/tasks/TasksView.test.ts` mounts the view for row clicks and Todoist-absence only.
- Today's Tasks toolbar is `<div class="pane-toolbar">` at `TasksView.svelte:92` with three inner groups (date pills 93-105, hide-completed toggle 107-122, section-tag input 124-133). It has no title and no count; the count line sits in the content (`TasksView.svelte:144-146`). Compare `TagsView.svelte:50-54` (title, count, `ml-auto` icon buttons) and `EventCalendarHeader.svelte:35-39` (`truncate` title, `min-w-0 flex-1`).
- Sibling toolbars show what fits in one 40px row: `CollectionView.svelte:516` (saved-view tabs with context menu and inline rename, `overflow-x-auto` on the inner wrapper), `KanbanView.svelte:462` (segmented control, sort select, search input).
- The toolbar cannot wrap, and `TasksView` sets no `min-w-0`/`overflow` handling, so what happens to its three groups at a narrow tab width is unverified. The e2e viewport for the scroll test is 1000 px wide (`e2e/specs/tasks-view.spec.ts:70`).

### Where the view lives

- `EditorView.svelte:40` `isTasksTab = fileType === 'tasks'`; `:71-73` renders `<TasksView onOpenWikilink=... />` inside `<div class="relative flex-1 min-h-0 bg-editor-bg">` under `EditorTabs` (`:67`). `NoteActionBar` (a second `pane-toolbar` row) renders only for Markdown notes (`:68-70`), so Tasks gets no action bar and its own toolbar is the only second row.
- `TasksView.svelte:90` root is `flex h-full flex-col bg-card`, while the wrapper is `bg-editor-bg`. `CollectionView.svelte:501` also uses `bg-card`. `--card` and `--editor-bg` are equal on the light theme (`app.css:155`, `:187`) and on the default dark theme (`app.css:216`, `:251`); a preset where they differ is unverified.
- The tab is a singleton: `TASKS_VIRTUAL_PATH = '__virtual__/tasks'` (`editor.logic.ts:6`); `openTasksTab` / `toggleTasksTab` (`tasks.service.ts:187-221`) open, focus or close it; Cmd+Shift+T (`global-keybindings.ts:115-122`) and the command `tasks:toggle` (`commands.ts:196-204`) both call `toggleTasksTab`. A second press on the active tab closes it, so filter state that lives only in the component or store is dropped on close (the store is not reset on close: `tasks.store.svelte.ts` is module state and `closeTasksTab` does not reset it, only `resetTasks` on vault change does, `tasks.service.ts:226-233`).
- The right sidebar never renders for the Tasks tab: `layout.logic.ts:13-18,26` (`NO_RIGHT_SIDEBAR_PATHS` includes `TASKS_VIRTUAL_PATH`), and `AppShell.svelte:189` hides its toggle. `e2e/specs/tasks-view.spec.ts` ("the right sidebar hides while the Tasks tab is active") keeps this under test.
- No split editor panes exist (`grep` of `editor.store.svelte.ts` for split or group found nothing), so the tab is the whole editor area.
- Persistence of the Tasks tab across restarts: unverified (no search of the session-restore code was done).

### The rail shell and ADR-0033

- `AppShell.svelte:198-263` layout: `Rail`, then (when `layout.railPanelsVisible`) an optional navigator pane (`minSize 3`, `maxSize 30`, `:207-212`), then the note list pane (`minSize 3`, `maxSize 40`, `:238-243`), then the editor pane (`order=3`, no size, takes the remainder, `:261-263`), then the right sidebar (`maxSize 30`, `:268-273`).
- Rail default form: 140 px (`RAIL_WIDTH.default`, ADR-0033 amendment 2026-11-06); navigator, note list and right sidebar default to their 3 percent minimums, and saved sizes win per vault. Because of this, how wide the Tasks tab is at first run depends on the owner's saved sizes, not on a fixed number; the ADR measures the editor at about 575 to 610 px with every panel open (ADR-0033 lines 195-198, written before the 2026-11-06 default change).
- Rail items are lenses: `rail-items.logic.ts:30-60` builds Search, Inbox, Today, Favorites; Types, registered navigators, Files; pins; Archive. A lens resolves to `ResolvedLens { label, rule, notes, groups }` where `notes` are `LensNote[]` (`rail-shell.types.ts:62-74`, `:37-50`). The list is note-shaped: no task rows. `RailNoteList.svelte:714-717` has its own `h-10 ... bg-tab-bar` header, which is the top band, not a `pane-toolbar`.
- A registered navigator (`RailNavigator`, `rail-shell.types.ts:176-188`) is a panel "shown between the rail and the note list" and must supply a `lens`; the note list still fills the next column (`AppShell.svelte:214-216,245-249`). Only Calendar uses it (`calendar-rail.service.ts:26`).
- A `RailAction` (`rail-shell.types.ts:200-217`) runs a callback on click: "never picked, no highlight, no Go to command or Settings > Layout row". Only vault mods register them today (`mods-host.service.ts:600`); it renders under an "Actions" section (`Rail.svelte:294-301`).
- Hidden items drop their palette command (ADR-0033 amendment, `railItems` feeds both the rail and `rail:go-to:<key>` commands, `commands.ts:56-67`). A Tasks rail item would also need entries in `layout.railOrder` / `railHidden` handling and the Settings > Layout page.
- While the Tasks tab is active the rail keeps highlighting whatever lens was last picked (`AppShell.svelte:202` passes `railItem.item`, derived from `layout.railItem` only); the tab and the rail are not linked.
- Another consumer: `lens.logic.ts` is 1111 lines and `RailNoteList` is serialized with `TasksView` among the "run in series" hot files in `.scratch/open-itens/priority-2026-11-08.md` (list at "Run in series").

### Components and tokens available

- `src/lib/components/ui/`: button, collapsible, command, context-menu, dialog, dropdown-menu, input, popover, resizable, scroll-area, select, separator, switch, tooltip. Not present: tabs, badge, checkbox, toggle-group, calendar, textarea.
- Type-scale tokens: `text-label` 11px, `text-meta` 12px, `text-rail` 13px, `text-row` 14px, `text-title` 15px/600 (`app.css:89-99`). `TasksView` uses raw `text-xs`/`text-sm` and hard-coded `text-purple-400` (`TasksView.svelte:154`); `TagsView` and `EventCalendarHeader` use tokens (`text-meta`).
- Reusable toolbar patterns in the repo: `RailSortMenu.svelte` and `RailPropertiesPicker.svelte` (popover menus with keyboard handling), `list-toolbar.types.ts` (`ListSortConfig`, `ListPrefs` persisted per list), container queries via `@container` in `RailNoteList.svelte:717` (`@max-[12rem]:hidden` at `:725`).

### Prior planning that overlaps this work

- `.scratch/archived/tasks-view/PRD.md` (421 lines): owner's words "very bad, too simple" and the same complaint set; target layout is an in-tab design (title and search in the toolbar, a left list column of built-in and saved lists, a rule sentence, quick filters, group and sort, Display menu). It keeps Tasks as an editor tab (PRD `Narrow pane`, line 174): below 720 px the list column becomes a dropdown, below 560 px the quick filters fold into one "Filters (n)" button.
- `.scratch/open-itens/issues/108-125,127-129` carry the slices (list stays mounted, row chips, open/closed rule, quick filters, group and sort, keyboard and a11y, sources panel, saved views, smart lists, Todoist state). 108 explicitly says "Do not add height, padding or gap classes to the toolbar itself" (`108:..., origin text`).
- Several statuses (122, 123, 127, 128 `needs-triage`, others `ready-for-agent`) are in `priority-2026-11-08.md`; their current state was not re-verified here.
- The older scout `.scratch/archived/tasks-view/research/scout-19-ui-kit-and-patterns.md` already raised the question "keep the tab or move to a rail item?" and the question of relaxing the toolbar test. Its line numbers (`TasksView.svelte:105-164`, Todoist sync button) predate the current file: today's view has no Todoist button (`TasksView.test.ts:191-232` asserts that).

## Problems and opportunities (opinion, grounded in the facts above)

1. **One 40px row is not enough room for what the owner wants.** Date pills, hide-completed, section tag, plus search, group and sort will not fit at a narrow tab width, and the toolbar cannot wrap. The row should hold only primary, always-visible controls: title with count, search, a Display menu, and a trailing icon or two. Quick filters and the rule sentence belong in a second, plain row (not `pane-toolbar`).
2. **The test shapes the design but does not block it.** A second row is legal as long as it does not carry the `pane-toolbar` word and the one toolbar stays literal and override-free. The test never checks the Tasks view's inner layout, so a left list column, chips row and group headers are free.
3. **A center tab beats a rail slot for the content.** Rail items resolve to note lists (`LensNote`), a navigator is capped at 30 percent and still sits next to a note list that has nothing to do with tasks, and ADR-0033's re-evaluation trigger is about "a new top-level area that does not fit the lens model", which is exactly what a task list would be. The rail slot can still help as an entry point only (see recommendation 4).
4. **The tab and the rail are disconnected.** The rail keeps showing an unrelated note list beside the Tasks tab; Cmd+1 (hide panels) is the only way to give the tab the space, and the Tasks tab is invisible to the rail and to `Go to` commands.
5. **Non-token styling.** `text-purple-400`, `text-xs`/`text-sm`, `bg-primary/20` pills differ from the toolbars that use `text-meta`, tabs and segmented controls (`KanbanView.svelte:463-476`, `CollectionView.svelte:512-528`). A redesign should use the type-scale tokens, `bg-primary/10 text-primary` for active state like Kanban, and a left list/saved-views pattern like Collection's tabs.
6. **Filter state is ephemeral and lost on close.** Cmd+Shift+T on an active tab closes it; the store survives that but nothing is persisted to settings (the saved-views Issue 123 owns this).
7. **Hard-coded `bg-card` root** over the `bg-editor-bg` wrapper is harmless on the default themes (same values) but diverges from the note action bar (`NoteActionBar.svelte:124` uses `bg-editor-bg`); unverified on every theme preset.
8. **Collision risk with the existing Issue chain.** Seven or more open Issues edit `TasksView.svelte` (see priority list). A new set of tickets must either reuse those numbers or declare blockers, otherwise relay runs would conflict.

## Recommendations for the redesign

1. Keep the Tasks view as the singleton editor tab. Do not add a rail lens or navigator for the list itself.
2. Keep exactly one `<div class="pane-toolbar">` in `TasksView.svelte`, a literal class string, no `h-`, `p*-`, `gap-`, `border-*` (non-b) or `flex-wrap` on it. Put layout inside child wrappers (`min-w-0 flex-1`, `ml-auto`, `overflow-x-auto`, `gap-*` on children). Suggested content: title and count (like `TagsView`), a search input, a Display menu (group, sort, show completed), one trailing action.
3. Put rule sentence, quick filters, group and sort summary in a separate non-toolbar row beneath, with its own classes and `border-b border-divider`. Design it to fold into a single "Filters (n)" button under a width threshold using a container query (`@container` on the view root, as `RailNoteList.svelte:717` does), matching the PRD's 720 px and 560 px steps; the toolbar test needs no change for this.
4. Optional entry point, low cost: register a `RailAction` that calls `openTasksTab` (`rail-shell.types.ts:200-217`) so the rail reaches Tasks with no lens work. Caveats: actions have no highlight, no Go to command and no Settings > Layout row, and today only mods use the path; a built-in feature registering one would need an owner decision (see open questions).
5. Add component-level tests for the redesigned toolbar: one mounted-DOM assertion that the toolbar element carries `pane-toolbar` (same style as `EventCalendarView.test.ts:121-127`), plus a narrow-width assertion that nothing in the toolbar relies on wrapping. Add `src/tests/lib/pane-toolbar.test.ts` entries only if a new file with a toolbar is created (for example a split-out `TasksToolbar.svelte`); the `TOOLBARS` list is by file, so moving the toolbar to a new file requires updating that list.
6. If the toolbar is split into its own component, update `pane-toolbar.test.ts:20` to point at the new file, or the existing `toHaveLength(1)` for `TasksView.svelte` fails (zero lists).
7. Use tokens (`text-meta`, `text-row`, `text-title`) and theme colors instead of `text-purple-400`; keep the `[data-task-row]`, `aria-label` "Mark task as done" and `button[title*="completed"]` hooks until the e2e spec (`e2e/specs/tasks-view.spec.ts:17-67`) is rewritten in the same Issue, because those selectors are the current contract (`getByRole('textbox', { name: /section tag/i })`, `[data-task-row]`, scroll viewport with `min-h-0`).
8. Keep `min-h-0` on the scroll container and the `flex h-full flex-col` skeleton: the e2e test at 260 px viewport height depends on it (`tasks-view.spec.ts:67-86`).
9. Reconcile with the existing Issue chain before writing new tickets; reuse 108-113, 120-125, 129 where they match (slices for toolbar and chips already exist), and mark any new ticket's blockers explicitly.

## Open questions for the owner

1. Do the archived PRD (`.scratch/archived/tasks-view/PRD.md`) and Issues 108-129 still represent the intended redesign, or is this research meant to replace them? This decides whether the new tickets supersede the open ones.
2. Is a rail entry point for Tasks wanted at all (a `RailAction`, or a real rail item with a lens)? The action route skips Go to commands and the Settings > Layout hide list; a real item needs a lens kind that resolves to non-note rows, which the lens model does not support today.
3. Should Cmd+Shift+T keep toggling (second press closes the tab), or should it focus the tab and leave closing to the tab's close button? It decides whether filter state needs to survive a close.
4. At what tab width should the view still be fully usable? The PRD's 720 px and 560 px steps were never measured against the owner's saved pane sizes, which now start at 3 percent minimums.
5. Is relaxing `pane-toolbar.test.ts` (for example allowing a second toolbar row in a file) acceptable, or must the two-row design stay as "one toolbar plus a plain row" so the shared recipe stays strict?

## What was not checked

No code was run, no app was launched, and no pnpm or cargo commands were run. Pane widths at real window sizes, behavior of the current toolbar at narrow widths, theme presets where `--card` differs from `--editor-bg`, and tab restoration after restart are unverified. The current statuses of Issues 108-129 were read from the priority file only.

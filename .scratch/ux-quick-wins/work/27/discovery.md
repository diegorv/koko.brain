# 27 discovery: the Tasks toolbar and list say what they do

No `spec.md` in `.scratch/ux-quick-wins/`. Order follows the Issue's split point: items 1 to 3, then 4 to 6, then the doc (7).
Same shape as `work/24` (UI copy and markers in one feature, test-first per item); nothing reused from it.

## Files that change

- `src/lib/features/tasks/TasksView.svelte`
  - item 1: `:930` `<span>Display</span>` becomes `Display ·` plus a value span (`data-task-display-value`, `min-w-0 max-w-24 truncate`). Label from a `$derived`: `{ property }` gives the key, `'heading'` gives "Heading", else `GROUP_OPTIONS` (`:124-131`).
  - item 2: `:1094` "Edit" becomes "Edit sources"; attributes unchanged.
  - item 3: `:921` `border-border/50` to `border-border`, `placeholder:text-muted-foreground/50` to `placeholder:text-muted-foreground`; `bind:this={searchEl}`; an `$effect` adds a `document` keydown listener (removed on teardown): `f` with Meta or Ctrl, no Shift/Alt, and `document.activeElement` is `<body>`/null or inside `rootEl` → `preventDefault`, `focus()`, `select()`. Shift returns early, so Cmd+Shift+F reaches `global-keybindings.ts` (untouched).
  - item 4: `:776-778` the `<p data-task-group-subtitle>` becomes a `<span class="min-w-0 truncate ...  @max-[560px]:hidden">` inside the title/count row (`:766`); `:1135` `space-y-6` to `space-y-4`.
  - item 5: `:812` `opacity-60` replaced by an inset box-shadow rule (`shadow-[inset_2px_0_0_color-mix(in_oklab,var(--muted-foreground)_55%,transparent)]`, prior art `shadow-[inset_0_-1px_0_var(--border)]` in `src/lib`), plus `title="Shown for context"` and `data-task-context` when `row.dimmed`. Inline `padding-left` (`:813`) untouched.
- `src/lib/features/tasks/SourcesPanel.svelte:350-351`: `{#if ci > 0}` an `aria-hidden` `data-task-sources-or` divider ("or" between two `bg-border` rules) before each card but the first.
- `help/documentation/10-tasks-and-todoist.md:107` ("Edit sources"), `:158` (context rule + tooltip), `:165` (Cmd+F).

## Tests

- `TasksView.grouping.test.ts`: `displayTrigger()` (`:38-41`) matches `startsWith('Display')`; new case for Note / Due date / area / Heading labels. Header-row case next to `:159` (subtitle in the same parent as title and count; flat groups none; list `space-y-4`).
- `TasksView.keyboard.test.ts`: Cmd+F on a row focuses + selects the search; from an outside contenteditable nothing and not `defaultPrevented`; after `unmount` nothing; Cmd+Shift+F not prevented by the view and reaches a `registerKeybinding` handler; search input has no `/50` class.
- `TasksView.filters.test.ts:186-189` (dimmed parent): `data-task-context`, title, no `opacity-60`, toggle enabled, padding-left equals a passing row's at the same indent. `:210` subtitle row check.
- `TasksView.sources.test.ts`: every `'Edit'` lookup to `'Edit sources'`; `:287-291` sentence button via `[data-task-sources-edit]`, empty-state button scoped to its container; new "or" case (0, 1, 2 cards).
- `TasksView.lists.test.ts`, `tasks-view-settings.test.ts:345`, `TasksView.test.ts:401,409,455,1050`, `e2e/specs/tasks-view.spec.ts:279`: name updates; `TasksView.test.ts:409` scoped to the empty-state container.

## Risks and defaults

- Two buttons named "Edit sources" in the empty state: tests that need the sentence one use `[data-task-sources-edit]`.
- Cmd+F accepts Ctrl+F too (Issue: "Cmd or Ctrl+F"). Alt or Shift held: ignored.
- The value span has a max width because the trigger is `shrink-0`; "by eye at 420 and 800 px" is not checked here (no Tauri window in this step).
- The rule colour (55% muted-foreground) follows the prototype `calendar-tasks.html` `.tr.dim.s-rule`.

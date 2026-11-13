# Scout 30: ext-list-a11y-keyboard

Recovered from the workflow journal: the agent's Write was refused, so this is its returned text.

Summary: Researched WAI-ARIA treegrid and focus patterns, Todoist/Things/Superhuman keys, and Svelte 5 virtualization. The key findings: use the APG treegrid model (row and cell focus, aria-expanded on parents only), choose roving tabindex or aria-activedescendant but not both, and expect TanStack Virtual's Svelte adapter to be store-based with a reactivity caveat. I did not write the .md file because the harness forbids report files from subagents. The full findings below can be saved by the parent.

## Facts

**WAI-ARIA treegrid (W3C APG)**
- Both rows and cells are focusable. Container is `role=treegrid`; rows are `role=row`; cells are `columnheader`, `rowheader` or `gridcell`. Parent rows carry `aria-expanded` (true/false) on the row or one of its cells. Childless rows must not carry it. Source: https://www.w3.org/WAI/ARIA/apg/patterns/treegrid/
- Keys (row focus / cell focus): Right expands a collapsed row, otherwise moves to first cell; Left collapses an expanded row, or moves to the row from the first cell; Up/Down move by row or by cell in the column; Home/End = first/last cell (row mode: first/last row); Ctrl+Home/End = first/last row in the same column; PageUp/PageDown by author-chosen count; Tab moves to the next control in the row and leaves the grid from the last one. Enter in cell-only mode toggles the first `aria-expanded` cell. Same source.
- Virtualized rows need `aria-rowcount`, `aria-colcount`, `aria-rowindex`, `aria-colindex`. Ctrl+End may stop at the last DOM row, not the last backend row. Same source.
- ARIA 1.3 says authors MUST manage focus of descendants for treegrid. https://w3c.github.io/aria/
- Arrow keys cannot also drive in-cell widgets such as a combobox or text caret. Grid pattern covers editing. Same source.

**Roving tabindex vs aria-activedescendant (W3C APG, Developing a Keyboard Interface)**
- Roving: one `tabindex=0`, the rest `-1`; move via `focus()`. Stated advantage: the user agent scrolls the focused element into view.
- activedescendant: container keeps DOM focus; the referenced child must be a descendant, be in `aria-owns`, or be reached via `aria-controls` from a combobox, textbox or searchbox. The author must draw the focus ring and handle scrolling.
- The page does not say when to choose each. Clicks must update focus state the same way keys do. https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/
- Secondary source (accessibility.build, not fetched): pick one, never both; activedescendant requires stable option ids. https://accessibility.build/guides/accessible-listbox (from search, not fetched)

**Todoist (official help, fetched)**
- Focus: K/J or arrows; Enter opens task; Esc closes; Shift+G opens task in project.
- Acting: E completes; Cmd/Ctrl+E edits; Cmd/Ctrl+Enter saves; V moves to; Cmd+Delete deletes; Cmd/Ctrl+Up/Down jump between tasks while editing; A adds at bottom, Shift+A at top.
- Selection: X selects focused task; Cmd/Ctrl+Click and Shift+Click multi-select; `,` focuses the multi-select toolbar.
- Scroll: Cmd+Up/Down or Ctrl+Home/End.
- Sub-tasks (list layout only): Ctrl+] / Ctrl+[ indent/outdent; Shift+E shows or hides sub-tasks. These need `[` and `]`, so they may fail on non-English layouts.
- Sections: S adds a section; G then `/` goes to a section.
- Source: https://www.todoist.com/help/todoist/features/use-keyboard-shortcuts-in-todoist-Wyovn2
- Older third-party cheat sheets list "." for move; the official page says V. Use the official source.

**Things 3 (official support, fetched)**
- Lists: Cmd+1 Inbox, +2 Today, +3 Upcoming, +4 Anytime, +5 Someday, +6 Logbook.
- Edit dates: Cmd+S When, Cmd+T Today, Cmd+E This Evening, Cmd+R Anytime, Cmd+O Someday.
- Move item to list: Shift+Cmd+M. Start typing inside the Move dialog to jump to a list.
- Source: https://culturedcode.com/things/support/articles/2785159/ ; moving items: https://culturedcode.com/things/support/articles/9651894/ (from search, not fetched). The page is about 4 years old per search metadata.

**Superhuman (search results only, official PDF not fetched)**
- E archive (done), Shift+E not done, H snooze/remind, Z undo, S star, U read/unread, # trash, ! spam, J/K next/prev, X select, Shift+J add to selection, G then I go to Important, / search, ? shortcuts. Official v8 PDF: https://download.superhuman.com/Superhuman%20Keyboard%20Shortcuts.pdf. One blog says Ctrl+H for snooze; the PDF says H. Verify before relying on it. Source list: https://tutorialtactic.com/blog/superhuman-shortcuts/ (from search).

**TanStack Virtual, Svelte (official guide, fetched)**
- `createVirtualizer` from `@tanstack/svelte-virtual` returns a Svelte store. Read as `$rowVirtualizer` in markup and `get(store)` elsewhere. Runes are used for table state (`$derived(table.getRowModel().rows)`). https://tanstack.com/table/latest/docs/framework/svelte/guide/virtualization
- Warning quoted in the guide: "The svelte-virtual store adapter does not reactively track getter options." The fix is an `$effect` calling `get(rowVirtualizer).setOptions({ count: rows.length })`. Same URL.
- Dynamic heights: `estimateSize`, a `use:measureElement` action, and `data-index` on each `<tr>`. The guide skips measurement in Firefox. Same URL.
- Layout: `table` becomes grid, `tr` becomes flex, rows are absolutely positioned with `translateY`, and `tbody` is sized to `getTotalSize()`. Native table layout does not work with dynamic-height virtual rows. Same URL.
- Svelte table example (Svelte 4-style stores): https://tanstack.com/virtual/latest/docs/framework/svelte/examples/table (from search, not fetched)

**Virtua (search results, not fetched)**
- `virtua` 0.53.5 on npm, zero dependencies, `VList`/`VGrid`/`VMasonry`, `import { VList } from "virtua/svelte"`, requires svelte >= 5, `getKey` prop, `{#snippet children(item, index)}`. Needs ResizeObserver. https://github.com/inokawa/virtua and https://www.npmjs.com/package/virtua

**Other Svelte 5 virtual list options (search only)**
- `@humanspeak/svelte-virtual-list`: dynamic heights, Svelte 5.
- `svelte-virtuallists`: flagged as possibly unmaintained.
- `@tutorlatin/svelte-tiny-virtual-list`: fork with variable height; Svelte 5 support not confirmed.
- Sources: https://virtuallist.svelte.page/ , https://madewithsvelte.com/svelte-virtuallists

**Virtualized list a11y (search results, low-authority sources)**
- Lists: `aria-setsize` and `aria-posinset` on items (posinset is 1-based). Tables and grids: `aria-rowcount` on the table and `aria-rowindex` on rows. `aria-rowcount` on `role=list` is invalid per ARIA. Source: https://www.disabilityworld.org/toolkit/standards/aria/setsize/ ; https://azukiazusa.dev/en/blog/virtualize-large-list-with-tanstack-virtual/
- Use -1 when the total is unknown; keep setsize values consistent across the window; update after filter, sort or delete.
- Screen reader testing with NVDA, JAWS or VoiceOver was not found in the results.

## Problems and gaps
- The current TasksView (src/lib/features/tasks/TasksView.svelte, 277 lines, from the brief) has no roles, no keyboard model and no focus management. From memory, I did not verify the markup.
- Grouping by file only means nested tasks (subtasks, indent levels) have no tree structure to expose. A treegrid needs a row hierarchy plus `aria-level`/`aria-expanded`.
- Filters (date, hide-completed) and sync controls are mouse-only in the brief. There is no shortcut layer.
- Virtualization with a treegrid makes roving focus harder: a focused row that scrolls out of the DOM loses focus. The APG notes this as a concern.
- Mixing grid roles with in-row controls (checkbox, due date, priority) needs the Grid pattern, not the simple treegrid, to avoid arrow-key conflicts.
- Svelte 5 + the store-based TanStack adapter means `setOptions` must be pushed manually on every count change. A runes-native virtualizer may not exist (from search, unconfirmed).

## Ideas worth keeping
- Adopt the APG treegrid for the nested task view, with a row-focus default and a cell-mode toggle for editing.
- Use roving tabindex for the task list (simpler, scroll-into-view for free) and reserve activedescendant for the command palette or combobox-style inputs.
- Borrow Todoist's keys: J/K, E to complete, X to select, V to move, Shift+G to open in project, Cmd+Enter to save.
- Borrow Things' list-jump model: Cmd+1..6 for Inbox/Today/Upcoming/Anytime/Someday/Logbook, and a single "when" key picker. Use the Move dialog with type-to-filter for moving tasks.
- Consider Superhuman-style triage queues: one key per action with undo (Z) and a "remind me" snooze.
- Virtua is a candidate if the list reaches thousands of rows and supports Svelte 5. Verify size and fit before adopting.

## Open questions
- How many rows does the owner expect (hundreds vs tens of thousands)? That decides whether virtualization is needed at all.
- Is nested task hierarchy (subtasks) in scope, or only flat lists grouped by file?
- Screen reader target: does the owner need NVDA/VoiceOver-level validation, or basic keyboard operability?
- Should Todoist shortcuts match Todoist exactly, or only borrow the ideas?
- Verify virtua's Svelte 5 integration (current API, `getKey`, dynamic heights) and @humanspeak's maintenance status before choosing. Not fetched.
- Verify Superhuman snooze key (H vs Ctrl+H) from the official PDF. Not fetched.

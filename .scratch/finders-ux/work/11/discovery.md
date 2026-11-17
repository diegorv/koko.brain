# 11 discovery: Tags view filter box matching full paths

No `spec.md` in `.scratch/finders-ux/` (same as 08, 09); the Issue is the spec. Builds on 09 (header, `countVisibleTags`) and 10 (row layout); see `work/09/discovery.md`.

## Files that change

- `src/lib/features/tags/tags.logic.ts:94-108` (after `filterTagTree`): new `filterTagTreeByQuery(nodes, query): { nodes, forceOpen }`. Query trimmed, one leading `#` stripped, lowercased; empty -> same `nodes` reference and an empty set. Otherwise a node is kept when its lowercased `fullPath` contains the query or a child survives; `totalCount` recomputed from kept children (as `filterTagTree`). Every kept node with kept children goes into `forceOpen`. Because a child's `fullPath` extends its parent's, every descendant of a match matches too, so a matching parent keeps its whole subtree without a special case.
- `src/lib/features/tags/TagItem.svelte:11-19,28`: optional `forceOpen?: ReadonlySet<string>` prop, passed down to children. `isOpen = open || forceOpen.has(node.fullPath)`; `Collapsible.Root` uses a function binding (precedent `src/lib/core/layout/SidebarSection.svelte:57`) whose setter ignores writes while forced, so the chevron cannot collapse a forced row (criterion 8) and the local `open` is untouched, ready to come back when the query clears. Chevron rotation reads `isOpen`.
- `src/lib/features/tags/TagsView.svelte`: `let query = $state('')`; `queryResult = $derived(filterTagTreeByQuery(tagsStore.tagTree, query))` used only when the trimmed query is active; `displayedTree` becomes the query result while active (rare filter bypassed), else as today. Header: active -> "N matching tag(s)" with N = `countVisibleTags(queryResult.nodes)`; `isPartial` and `isFilteredEmpty` gated on no active query. Body: new branch "No tags match {q}" before "No tags found". `Input` (`h-7 w-32 text-xs`, `aria-label="Filter tags"`, placeholder "Filter tags") at the start of the `ml-auto` button group, as in the prototype `.tv-filter`. The `.pane-toolbar` class list is unchanged.
- `help/documentation/07-sidebar-panels.md:113-116`: "Filter" bullet.

## Tests (test-first)

- `src/tests/lib/features/tags/tags.logic.test.ts`: `describe('filterTagTreeByQuery')`: "pro" on `work/projects`, `projects`, `home` -> `work` (with only `projects` child) and `projects`, `forceOpen` has `work`; "#Work" matches `work`; matching parent keeps its whole subtree; empty and whitespace query -> same reference, empty set; no match -> empty.
- `src/tests/lib/features/tags/TagsView.test.ts`: new describe, same mount helpers as the rare-filter block; set the input value + dispatch `input`. Rare tag (count 3, filter on) shown by query; "No tags match"; clearing restores "Showing 1 of 2 tags" and the filtered list; header "N matching tags"/"1 matching tag", no Show all; nested match visible without clicking; parent opened by the user before the query stays open after clearing, and one closed stays closed.
- `src/tests/lib/features/tags/TagItem.test.ts`: `forceOpen` opens a row; its chevron click does not close it; removing the path restores the local state.

## Defaults taken

- Forced open = every kept node with kept children, so a matching parent's subtree is expanded (the prototype's `isOpen = open.has(n) || q && kids.some(matches)`).
- No debounce, no clear button, no Escape handling: the Issue asks for none and filtering is in-memory.
- A query of only `#` counts as empty.

## Risks

- A row the query hides is unmounted, so its own expansion resets to closed when the query clears. Only rows visible through the query (ancestors of matches) keep their state. Hoisting expansion out of `TagItem` is beyond this Issue.
- A one-letter query expands most of a large tree at once. The rows are already mounted (bits-ui `Collapsible.Content` keeps closed children in the DOM under `hidden`), so the cost is layout, not mounting.
- With no match the header reads "0 matching tags" next to the "No tags match" body.
- The toolbar width with the 128px input next to a long "Showing X of Y tags Show all" header is not checked in jsdom.

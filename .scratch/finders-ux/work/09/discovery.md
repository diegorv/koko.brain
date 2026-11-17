# 09 discovery: Tags header says "Showing X of Y" and the empty state explains the rare-tag filter

No `spec.md` in `.scratch/finders-ux/` (same as 08); the Issue is the only spec.

## Files that change

- `src/lib/features/tags/tags.logic.ts:94-108`: new pure `countVisibleTags(nodes)` next to `filterTagTree`: recursive count of nodes with `count > 0` (a pure container, `count === 0`, is not a row of its own tag).
- `src/lib/features/tags/TagsView.svelte:35-39`: `visibleTagCount = $derived(countVisibleTags(displayedTree))`; `isPartial = hideRareTags && 0 < visibleTagCount < totalTagCount`; `isFilteredEmpty = hideRareTags && tagTree.length > 0 && displayedTree.length === 0`.
- `TagsView.svelte:56-60`: inside the count `<span>`, "Showing X of Y tags" + inline plain `<button>` "Show all" (`onclick={toggleFilter}`, text-link classes, no padding) when `isPartial`; else "Y tag(s)" as today. No class change on the `.pane-toolbar` row.
- `TagsView.svelte:85-86`: split the empty branch: `isFilteredEmpty` shows "All Y tags are used fewer than {MIN_COUNT_THRESHOLD} times." plus shared `Button` (`size="sm"`, `variant="outline"`) "Show all tags" calling `toggleFilter()`; else "No tags found".
- `help/documentation/07-sidebar-panels.md:107-109`: describe the "Showing X of Y tags" header and Show all; the filtered-empty message.

## Tests (test-first)

- `src/tests/lib/features/tags/TagsView.test.ts`: new `describe('TagsView rare-tag filter')` with the existing mount/flushSync pattern (`:27-52`), real `tagsStore`, service mocked as today.
  - tags at 12 and 3, total 2, filter on: header "Showing 1 of 2 tags", Show all button; click -> `hideRareTags` false, both listed, header "2 tags".
  - filter off -> "2 tags", no Show all; filter on with no tag hidden (one tag at 12, total 1) -> "1 tag", no Show all.
  - all below 10, total 3: body "All 3 tags are used fewer than 10 times.", no "No tags found", exactly one button whose text contains "Show all"; click -> `hideRareTags` false, tags listed.
  - existing "No tags found" case stays.
- `tags.logic.test.ts`: `countVisibleTags` cases: empty tree 0, pure container not counted, rare parent kept for popular child counted.

## Defaults taken

- "Show all" buttons are found by `textContent`; the filter icon button's `title="Show all tags"` is not text, so it does not count toward "exactly one Show all button".
- Y is never 1 when the partial header shows (X >= 1 and X < Y), so the partial header always says "tags".
- Header inline button is a plain `<button>` (the shared `Button` brings `h-*`/`px-*` sizing that breaks an inline text span); the Issue names the shared `Button` only for the empty state.

## Risks

- `pane-toolbar.test.ts` scans only class lists that carry `pane-toolbar`; the inline button sits inside the span, so the row's single class list is unchanged.

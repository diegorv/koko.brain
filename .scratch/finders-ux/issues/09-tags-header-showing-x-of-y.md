# 09: Tags header says "Showing X of Y" and the empty state explains the rare-tag filter

**Origin:** design review 2026-11-17, proposal P76 (`.scratch/design-review/review.md`), prototype `.scratch/design-review/prototypes/finders-search-tags-graph.html`, research `.scratch/finders-ux/research/verdict-tags.md` (fold P76 into 212) and `.scratch/finders-ux/research/breakdown.md` (fold into 212). Absorbs `.scratch/open-itens/issues/212-tags-view-explains-when-rare-tag-filter.md`.

**What to build:** in `src/lib/features/tags/TagsView.svelte`, with the default "hide rare tags" filter (`tags.store.svelte.ts:5`, threshold `MIN_COUNT_THRESHOLD = 10` at `TagsView.svelte:15`):

1. **Header.** With `tagsStore.hideRareTags` on and 0 < X < Y, the count reads "Showing X of Y tags" with an inline "Show all" button that calls the existing `toggleFilter()`. Otherwise it reads "Y tag(s)" as today. When X is 0 the header shows no Show all link (the body carries the button). X is the number of nodes with `count > 0` in `displayedTree`, from a new pure helper in `tags.logic.ts`: a rare parent kept only to hold a popular child counts (it is a visible row); a pure container (`count === 0`) does not. Y stays `tagsStore.totalTagCount`.
2. **Empty state.** When `hideRareTags` is on, `tagsStore.tagTree.length > 0` and `displayedTree` is empty, the body reads "All Y tags are used fewer than 10 times." (the threshold from `MIN_COUNT_THRESHOLD`) with a "Show all tags" button that calls `toggleFilter()`. Otherwise "No tags found" stays (empty vault). Plain markup matching the existing empty paragraph, with the shared `Button` (`#lib/components/ui/button/index.js`, `size="sm"`, `variant="outline"`).
3. **Toolbar row.** The inline button goes inside the count `<span>`. No `h-*`, `p*-*`, `gap-*` or `border-*` utilities on the `.pane-toolbar` row (`src/tests/lib/pane-toolbar.test.ts:30`).
4. **Help.** Rewrite `help/documentation/07-sidebar-panels.md:107-109`, which today documents the header as the unfiltered total, to describe "Showing X of Y tags" and the Show all control.

Out of scope: the default of `hideRareTags`, and the Tasks filtered-empty message.

**Blocked by:** 08

**Status:** ready-for-agent

**Gate:** `pnpm check` + `pnpm vitest run`

- [ ] Failing test first, `src/tests/lib/features/tags/TagsView.test.ts`: real `tagsStore` with tags at count 12 and 3, `totalTagCount` 2, filter on. The header reads "Showing 1 of 2 tags" with a Show all button; clicking it sets `hideRareTags` false, both tags are listed and the header reads "2 tags".
- [ ] With the filter off, or with no tag hidden, the header reads "N tags" with no button.
- [ ] Failing test first, filtered-empty case: a tree whose every node has a count below 10, filter on, `totalTagCount` 3. The body shows "All 3 tags are used fewer than 10 times." and does not show "No tags found"; exactly one Show all button is in the view; clicking it sets `hideRareTags` false and the tags are listed.
- [ ] `tags.logic.test.ts` covers the count helper: an empty tree is 0, a pure container is not counted, a rare parent kept for a popular child is counted.
- [ ] The existing "No tags found" case (empty tree), `pane-toolbar.test.ts` and the `tags.service.test.ts` totals stay green.
- [ ] `help/documentation/07-sidebar-panels.md` describes the "Showing X of Y" header.
- [ ] Frontend gate: `pnpm check` and `pnpm vitest run` pass.

## Original proposal

- **P76.** The Tags view hides rare tags by default, and its header contradicts the body. The header says "Showing X of Y" with an inline "Show all". The empty state reads "All N tags are used fewer than 10 times. Show all". Validation: keeps the default.
- **212 (absorbed).** Split the empty branch: when the filter is on and the tree is not empty but `displayedTree` is, show a filtered message and a "Show all tags" button that calls `toggleFilter()`; otherwise keep "No tags found". 212 also said "The header count keeps meaning tags in the vault and does not change"; that decision is reversed here.

## Problem

A vault whose tags are all used fewer than 10 times shows "3 tags" in the header over "No tags found" in the list: the header counts all tags (`tags.service.ts` sets `totalTagCount` from the unfiltered entries), the list shows the filtered tree. The view looks broken, and nothing says the filter is the cause.

## Evidence

Checked at `bb57e6165`.

- `src/lib/features/tags/TagsView.svelte:15` threshold 10; `:31-33` `toggleFilter()`; `:35-39` `displayedTree`; `:52-56` header prints `totalTagCount`; `:81-82` single "No tags found".
- `src/lib/features/tags/tags.store.svelte.ts:5`: `hideRareTags` defaults to true.
- `src/lib/features/tags/tags.service.ts:45`: `setTotalTagCount(entries.length)`. `get_all_tags_v2` returns one entry per case-insensitive tag (`src-tauri/src/vault/index.rs:1039` `lookup_all_tags`) and `buildTagTree` folds case the same way (`tags.logic.ts:18-19`), so X is never larger than Y. `totalTagCount` has no consumer other than `TagsView.svelte:54`.
- `src/lib/features/tags/tags.logic.ts:98-108`: a node survives the filter on its own `count >= 10` or a surviving child.
- `help/documentation/07-sidebar-panels.md:107-109`: "The tag count in the header is the unfiltered total, so it does not change when the filter does."
- Two Show all controls would collide in the filtered-empty case (header and body), hence the header link hides when X is 0.

## Comments

- 2026-11-17, triage: ready-for-agent. Decided: reverse 212's "header shows the unfiltered total" decision: "Showing X of Y tags" with an inline Show all; hide the header link when X is 0. Y stays `totalTagCount`.

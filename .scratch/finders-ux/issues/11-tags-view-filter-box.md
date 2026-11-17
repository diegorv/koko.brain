# 11: Tags view filter box matching full paths

**Origin:** design review 2026-11-17, proposal P157, filter part (`.scratch/design-review/review.md`), prototype `.scratch/design-review/prototypes/finders-search-tags-graph.html`, research `.scratch/finders-ux/research/verdict-tags.md` (ticket T4) and `.scratch/finders-ux/research/breakdown.md` (10). The rest of P157 is 10.

**What to build:**

1. **Input.** A "Filter tags" `Input` (`h-7 text-xs`, `aria-label="Filter tags"`; precedent `src/lib/features/rail-shell/RailListSearch.svelte`) in the `TagsView` toolbar, without override classes on the `.pane-toolbar` row (`src/tests/lib/pane-toolbar.test.ts:30`).
2. **Pure filter.** `filterTagTreeByQuery(nodes, query)` in `src/lib/features/tags/tags.logic.ts`: case-insensitive substring match on `fullPath`, with a leading `#` stripped from the query. It keeps the ancestors of every match and the whole subtree of a matching node, and returns the set of ancestor paths to force open. An empty or whitespace query returns the tree unchanged and an empty set.
3. **Forced open.** `TagItem` gets a `forceOpen` prop OR-ed with its local `open`, so a matching nested tag is visible without clicking, and clearing the query restores the user's own expansion.
4. **Bypass the rare filter.** While a query is active, the query runs over `tagsStore.tagTree`, not the rare-filtered tree, so an existing rare tag is found. With no query, the rare filter and the 09 header apply as before.
5. **No match.** A third empty branch reads "No tags match {q}" (plain markup matching the existing empty paragraph).
6. **State.** The query is local `$state` in `TagsView` (the view remounts on each tab open); nothing goes into `tagsStore`.
7. **Help.** Add a "Filter" bullet to "Controls at the top" in `help/documentation/07-sidebar-panels.md:113`.

**Blocked by:** 09, 10

**Status:** ready-for-agent

**Gate:** `pnpm check` + `pnpm vitest run`

- [ ] Failing test first, `tags.logic.test.ts`: query "pro" on a tree with `work/projects`, `projects` and `home` keeps the first two plus their ancestors, and the forced-open set contains `work`. "#Work" matches `work`. A matching parent keeps its whole subtree. An empty query returns the tree unchanged.
- [ ] Failing test first, `TagsView.test.ts`: typing a query that matches a rare tag (count 3, filter on) shows it. A query with no match shows "No tags match". Clearing the query restores the filtered list and the header.
- [ ] A matching nested tag is visible without clicking its parent's chevron, and after the query is cleared the parent returns to its previous open state.
- [ ] The input has an accessible name; `pane-toolbar.test.ts` stays green.
- [ ] `help/documentation/07-sidebar-panels.md` lists the filter box.
- [ ] Frontend gate: `pnpm check` and `pnpm vitest run` pass.

## Original proposal

- **P157 (filter part).** A filter that matches full paths and expands matching parents.

## Problem

The Tags tree has no filter, so finding a nested tag means expanding parents by hand. With the default rare-tag filter on, a filter applied only to the visible tree would report "No tags match" for a tag that exists, which is the contradiction 09 fixes.

## Evidence

Checked at `bb57e6165`.

- `src/lib/features/tags/TagsView.svelte:49-77`: toolbar with the title, count, filter and sort buttons, no input; `:35-39` `displayedTree`.
- `src/lib/features/tags/TagItem.svelte:19`: `let open = $state(false)`, local per row.
- `src/lib/features/tags/tags.logic.ts`: `filterTagTree` exists for the rare filter; no query filter.
- `help/documentation/07-sidebar-panels.md:113-116`: "Controls at the top" lists Sort and Hide rare tags.
- The Tags tab is not on the owner's daily list (`.scratch/open-itens/research/deep-dive-2026-11-12/validate-s7+s8.md:43`); the owner chose to build it anyway.

## Comments

- 2026-11-17, triage: ready-for-agent. Decided: build it; the query bypasses the rare-tag filter; substring match on the full path, and a matching parent shows its subtree; the query is local component state.

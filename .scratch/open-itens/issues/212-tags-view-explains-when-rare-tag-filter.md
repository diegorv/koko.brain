# 212: The Tags view explains when the rare-tag filter hides everything

**Origin:** `audit-2026-11-05` Issue 63, moved here on 2026-11-08. Its PRD, raw evidence and closed siblings stay in `.scratch/archived/audit-2026-11-05/`. Bare Issue numbers in the text below use that feature's numbering; `priority-2026-11-08.md` in this folder maps them to the numbers here.

**Migrated from:** `.scratch/archived/ux-polish/issues/13-tags-filtered-empty-state.md` (audit 2026-11-05). Priority: polish (bucket 3-polish). Still present, polish/medium. It is an empty-state message.

**Audit check at `5f8003d67`:** still_present (polish, medium). src/lib/features/tags/TagsView.svelte:15 MIN_COUNT_THRESHOLD = 10, :35-39 displayedTree filters rare tags when hideRareTags (default true, src/lib/features/tags/tags.store.svelte.ts:5), :52-55 header shows the unfiltered totalTagCount, :81-82 renders 'No tags found' for an empty filtered tree. No split message or 'Show all tags' button exists.

**Stale in the text below:** The empty branch is at TagsView.svelte:81-82 (Issue says about line 81, accurate); the existing 'No tags found' test reference 'about line 62' should be re-checked in src/tests/lib/features/tags/TagsView.test.ts.

**What to build:** With the default "hide rare tags" filter on (`tags.store.svelte.ts` about line 5, threshold `MIN_COUNT_THRESHOLD = 10` in `TagsView.svelte`), a vault whose tags are all used fewer than 10 times shows "3 tags" in the header over "No tags found" in the list: the header counts all tags (`tags.service.ts` sets `totalTagCount` from the unfiltered entries), the list shows the filtered tree. In `src/lib/features/tags/TagsView.svelte`, split the empty branch (about line 81):

- when `tagsStore.hideRareTags` is on and `tagsStore.tagTree.length > 0` but `displayedTree` is empty: show "No tags are used {MIN_COUNT_THRESHOLD} or more times." and a "Show all tags" button that calls the existing `toggleFilter()`
- otherwise keep "No tags found"

The header count keeps meaning "tags in the vault" and does not change.

**Blocked by:** none

**Status:** ready-for-agent

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`.

- [ ] Failing first, in `src/tests/lib/features/tags/TagsView.test.ts`: with the real `tagsStore` holding a tree whose every node has a count below 10, `hideRareTags` at its default and `totalTagCount` 3, the view shows the filtered message and a "Show all tags" button and does not show "No tags found". It fails on the current code
- [ ] Clicking "Show all tags" sets `tagsStore.hideRareTags` to false and the tags are listed
- [ ] The existing "No tags found" case (empty tree, about line 62) stays green
- [ ] `tags.service.test.ts` totals are unchanged

## Notes

- **Other tickets:** Optional overlap with an EmptyState primitive ticket (review work breakdown 11): if it lands first, use it for the message; not a blocker.
- **Source:** review-2026-11-04.md "Feature views" row "No empty-state, error or badge primitive" (Tags "3 tags" over "No tags found") and work breakdown ticket 11 ("filtered-empty messages for Tags and Tasks").
- **Overlap:** if an `EmptyState` primitive ticket (review ticket 11) lands first, use it for this message; otherwise use the existing paragraph style and the shared `Button` (`#lib/components/ui/button/index.js`, `size="sm"`, `variant="outline"`).
- **Out of scope:** the Tasks filtered-empty message, the default of `hideRareTags`, and the header's styling.
- **Size:** S.

## Comments

- 2026-11-06: migrated from `.scratch/archived/ux-polish/issues/13-tags-filtered-empty-state.md` by audit 2026-11-05, which re-checked it at `5f8003d67`.

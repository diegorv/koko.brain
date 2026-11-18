# Verdict: cluster "Background refresh flicker" (P30)

Adversarial check of `scout-background-refresh.md` against HEAD `f2cd7f97b`. Read-only.

## Is P30 still real

Yes, both halves. I opened every cited line myself.

- Tags: `TagsView.svelte:41-46` effect on `vaultIndexVersion` (runs on mount), `tags.service.ts:27` unconditional `setLoading(true)`, `TagsView.svelte:79-80` swaps the keyed `{#each}` (:85) for "Indexing tags...", `TagItem.svelte:19` `let open = $state(false)`, header count hidden while loading (:52-56). `tags.store.svelte.ts` has no `hasLoaded`. Confirmed.
- Search: `search.service.ts:138` `setSearching(true)` without clearing lists; `SearchPanel.svelte:115-116` `{#if searchStore.isSearching}` renders only "Searching...", so the stored previous list is hidden; count line `{resultCount} results`. Empty-query branch (:127-136) never clears `isSearching` (Issue 057). Confirmed.
- "50 results" at the cap: text FTS asks `maxResults: 50` (:199-203). Confirmed.

## Where the scout is wrong or incomplete

1. **Legacy fallback is not uncapped.** `performSearchOverFiles` defaults `maxResults = 100` (`search.logic.ts:197-241`), like operator-only (:164-185). Caps: text FTS 50, operator-only 100, fallback 100, semantic and hybrid 20.
2. **The Tags header spinner is the scout's own addition.** P30 says only "Tags shows the loading line only on the first build". The "spinner after about 300 ms" is for Search. It is left out of the Tags ticket and listed as an owner question. Without it, a refresh just changes the rows where they are, which is what P30 asks for.
3. **Neither precedent uses a delay.** Tasks (`TasksView.svelte:907-914`) and `RailListSearch.svelte:97-99` both show their spinner right away. The 300 ms delay is new behaviour, so it needs a fake-timer test.
4. **Dimming at once would still flash.** FTS queries often come back in tens of ms. If the list dims as soon as `isSearching` turns on, each keystroke past the 200 ms debounce still gives a short opacity blink. The dim and the spinner should both wait for the same ~300 ms.
5. **The input's right edge is taken.** In text mode the fuzzy `~` toggle sits at `right-2` and the input has `pr-8` (`SearchPanel.svelte`, `searchInput` snippet). A spinner placed there has to shift left, as `RailListSearch` does (`right-7`). The scout's advice to keep the spinner out of the block that Issue 220 deletes (:98-111) is correct.
6. **Missed overlaps.** The grep turned up `161-fuzzy-search-finds-close-spelling-wherever-sits.md` (ready-for-agent). It is Rust only (`fuzzy.rs`, `fts_repo.rs`), so there is no conflict. The sibling scout `scout-tags.md` proposes P76 (header "Showing X of Y", replacing 212) and P157 (a filter that forces parents open). Both edit the same header and `TagItem.open` region as 159, and that scout also says 159 goes first. The orders agree.
7. **The E2E risk is smaller than the scout says.** `e2e/specs/search.spec.ts:31-37` uses `fill()` once on a fresh panel, so no stale rows exist when "No results found" is expected. It should stay green.

## Overlapping Issues (each opened, Status and Comments read)

| Issue | Status | Finding |
|---|---|---|
| open-itens/159 | ready-for-agent, ledger todo, no comments | Covers the Tags half exactly. It leaves the first-load signal open: with `tagTree.length === 0`, a vault with zero tags shows "Indexing tags..." on every refresh. **Fold in** a `hasLoaded` criterion. |
| open-itens/057 | ready-for-agent, first wave (owner pick 2026-11-06), no comments | This is the stuck-flag prerequisite. Its second-opinion correction asks for a new "older call does not clear a newer flag" test. Do not grow it: the owner picked it as a small first-wave fix. The new Search ticket is blocked by it. |
| open-itens/045 | ready-for-agent, Issue 24 merged in 2026-11-06 | Moves where the 50 cap applies, maybe into Rust, and pins "No results found" with no count in `SearchPanel.test.ts`. The N+ label is blocked by it. |
| open-itens/160 | ready-for-agent | `open-search.service` sets the mode. It shares `search.service.test.ts` but no lines. Not a blocker. |
| open-itens/212 | ready-for-agent | Same TagsView header and empty branch. Land it after 159. The tags cluster may replace it with P76. |
| open-itens/220 | ready-for-agent, owner decision recorded | Deletes `SearchPanel.svelte:98-111` and the `Loader2` import. The new spinner must not live there. Text conflict only, either order. |
| open-itens/205 | ready-for-agent, blocked by 204 | Keeps "Indexing tags..." and "Searching..." as plain text. Lands after these. |
| tasks-view-ux/108 | resolved | The pattern to follow, not a fix for this. |

No resolved Issue already fixes P30. No ADR or help page records the loading lines or the cap as a deliberate choice.

## Tickets

### A. Fold into `.scratch/open-itens/issues/159-tags-view-keeps-list-expanded-tags-screen.md` (P30 Tags half), size S, blocked by none

Add to 159:
- `tagsStore.hasLoaded`: set on a successful build, cleared by `reset()`. The view shows "Indexing tags..." only while `isLoading && !hasLoaded`.
- The header count stays visible during a refresh once `hasLoaded` is set.
- New criteria: a vault with zero tags shows "No tags found" during a refresh, not "Indexing tags..." (failing test first in `TagsView.refresh.test.ts`); a `tags.store.test.ts` case for `hasLoaded` and its reset; a first build that fails leaves `hasLoaded` false and shows "No tags found".
- Order: before 212 or the P76 ticket, and before 205.

### B. New: Search keeps the previous results on screen while a new search runs (P30 Search half), size S, blocked by 057

Files: `SearchPanel.svelte` and `SearchPanel.test.ts`. The service already keeps the lists during a request; pin that with one `search.service.test.ts` case.
- While `isSearching` and the current mode's list is not empty, the list and its count stay rendered.
- After about 300 ms of searching, the list dims, gets `aria-busy="true"`, and a `role="status"` spinner appears in the header input row, beside the fuzzy toggle.
- "Searching..." shows only when there is nothing to keep.
- A search that finishes in under 300 ms shows no dim and no spinner.
- The existing "shows the searching notice" test changes on purpose into the "nothing to keep" case.

### C. New: the result count says "N+" when the list hits the search cap (P30 tail), size S, blocked by 045

- One named cap per path instead of inline numbers.
- The count line reads "50+ results" when text FTS returned exactly its cap. Semantic, hybrid and operator-only per the owner's answer.
- One sentence in `help/documentation/06-search-and-navigation.md`.
- Soft order: after B, which edits the same count line.

## Owner questions

1. Should Tags also get a refresh spinner in the header, like Tasks? Default: no, since P30 does not ask for one.
2. "N+" for text FTS only (the review's wording), or for every capped mode (20 for semantic and hybrid, 100 for operator-only and fallback)?
3. After a mode switch, should the other mode's list from an older query show dimmed, or should it be blank until the new search returns? Default: show it dimmed.

## Not verified

Code reading only. Neither the Tags collapse nor the Search blink was reproduced in the running app.

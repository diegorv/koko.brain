# Scout: cluster "Background refresh flicker" (P30)

Checked against HEAD `f2cd7f97b` (main). Review block: `.scratch/design-review/review.md` line 462, long form in `.scratch/design-review/research/proposals-merged.md:272` and `lens-feedback-motion.md:17`. Read-only research; nothing edited.

## Verdict

P30 is still real on HEAD, in both halves, with the evidence lines in the review still accurate (`TagsView.svelte:41-46, 79-80`, `tags.service.ts:27`, `TagItem.svelte:19`, `search.service.ts:138, 201`, `SearchPanel.svelte:115-116`). It is not a new finding: the Tags half is already open-itens Issue 159 (ready-for-agent, status "todo" in the ledger, not launched), and the "stuck Searching..." neighbour is Issue 057. What P30 adds on top of those is: (a) the Search half (keep previous results dimmed, delayed spinner), (b) the "50+" cap label, (c) the header spinner after about 300 ms.

Proposal id: P30 only. Still real: **yes**.

## What the code does now

### Tags

- `src/lib/features/tags/TagsView.svelte:41-46`: `$effect` reads `vaultStore.vaultIndexVersion` and calls `scheduleTagIndexRebuild()` inside `untrack`. Runs on mount and on every index bump.
- `src/lib/features/tags/tags.service.ts:90-92, 108-110`: 300 ms trailing debounce, single flight (`runScheduledRebuild` :73-88). The comment at :101-105 records 0.7-1.2 s rebuilds at 4.5k notes.
- `tags.service.ts:26-57` `buildTagIndex`: `tagsStore.setLoading(true)` at :27 unconditionally, even when a tree is already loaded; `setLoading(false)` in `finally` :55. On IPC error it logs and keeps the old tree (:52-53).
- `TagsView.svelte:79-80`: `{#if tagsStore.isLoading}` renders only `<p>Indexing tags...</p>` instead of the list, so the keyed `{#each}` (:85) and every `TagItem` are destroyed.
- `src/lib/features/tags/TagItem.svelte:19`: `let open = $state(false)` is local to the component, so expansion is lost on that unmount. Scroll position of the container (:78 `overflow-y-auto`) also resets because the content collapses to one line.
- `TagsView.svelte:52-56`: the header count (`totalTagCount`) is hidden while `isLoading`, so it blinks too.
- `tags.store.svelte.ts:6-19`: has `isLoading`, `tagTree`, `totalTagCount`; there is **no `hasLoaded`** flag. `reset()` (called by `resetTags` on vault teardown) empties the tree, so "tree empty" is a usable first-load signal, but an empty vault with zero tags would show the loading line on every refresh unless a flag is added.
- Vault-open build: `src/lib/app/lifecycle/app-lifecycle.service.ts:433` calls `buildTagIndex()` directly (Step 5b), so by the time the Tags tab opens the tree is usually already built. `EditorView.svelte:73-75` mounts `TagsView` only while the Tags tab is active, so every tab open is a fresh mount that triggers a rebuild ~300 ms later, which is the "blink on open" case in Issue 159.
- Precedent for the fix in-repo: Tasks. `TasksView.svelte:907-914` shows the count only when `tasksStore.hasLoaded` and a `role="status" aria-label="Refreshing tasks"` spinner when `hasLoaded && isLoading`; `tasksStore.hasLoaded` at `tasks.store.svelte.ts:44, 126, 159, 189`; tested via `[role="status"][aria-label="Refreshing tasks"]` in `src/tests/lib/features/tasks/TasksView.test.ts:358`. Note-list search uses an in-input spinner (`RailListSearch.svelte:97-99`, `data-note-list-search-loading`, driven by `fullTextLoading` in `RailNoteList.svelte:500, 540-548, 823`).

### Search

- Debounce lives in `src/routes/(app)/+layout.svelte:170-180`: 200 ms after any change of query, mode or fuzzy, `performSearch()` runs, including for an empty query.
- `src/lib/features/search/search.service.ts:127-136`: empty query clears all four lists and returns. It does **not** call `setSearching(false)` (this is Issue 057).
- `search.service.ts:138`: `setSearching(true)` for any non-empty query. The lists are **not** cleared at start, so the previous results stay in the store during the request. `finally` at ~:270-274 clears `isSearching` only when `searchVersion === version`.
- `src/lib/features/search/SearchPanel.svelte:113-146`: the branch order is `isSearching` ("Searching...", :115-116), then empty query hint, then "No results found", then the list. So the old results are in the store but are not rendered while a search runs: the list collapses to one line and re-expands, on every query/mode/fuzzy change that gets past the 200 ms debounce. For fast text (FTS) queries this is a visible blink; for semantic/hybrid (seconds) it is a long blank.
- `SearchPanel.svelte:122-124`: count text is `{resultCount} results`. `resultCount` (:63-69) is `ftsResults.length || results.length` in text mode, `semanticResults.length`, or `hybridResults.length`.
- Caps in the pipeline (all inline magic numbers, no shared constant):
  - text: `search_fts` with `maxResults: 50` (`search.service.ts:199-203`); Rust default also 50 (`src-tauri/src/commands/search_index.rs:163`). The tag/path filter then runs in JS on those 50 (:206-223), so with operators the shown count is below the cap even when the list was truncated (Issue 045).
  - operator-only: `performOperatorOnlySearch(..., maxResults = 100)` in `search.logic.ts:166-185`, shown through `searchStore.results`; hits 100 silently.
  - semantic and hybrid: `maxResults: 20` (`search.service.ts:151, 251`); semantic also drops below `minScore 0.3`. The legacy in-memory fallback is uncapped.
  - So "50 results" is a truncated-list signal only for text mode through FTS; the other modes cap at 20 (or 100 for operator-only) with the same hidden truncation.
- Stuck-flag interplay: because of the Issue 057 bug, `isSearching` can stay `true` after clearing the box mid-flight. Today that shows "Searching..." over an empty box; after P30's change the same stuck flag would dim and spinner a result list forever. So the P30 Search half must not ship before 057 (or in the same change).

## Existing .scratch Issues that touch the same behaviour

All under `.scratch/open-itens/issues/`. Ledger status for each is `todo`, nothing launched.

| Issue | Status | Overlap |
|---|---|---|
| 159 tags view keeps its list and expanded tags on screen while it refreshes | ready-for-agent | **Same bug as the Tags half of P30**: show loading only while no tree has loaded, keep keyed rows mounted, header count must not flicker. Already has acceptance criteria and a new test file `TagsView.refresh.test.ts` (mocks only `@tauri-apps/api/core`). It does NOT add the delayed header spinner. |
| 057 clearing the search box while a search is still running | ready-for-agent | `isSearching` stuck true after an empty-query call; same two files and tests as the Search half of P30. Must be fixed first (see above). Its criterion "a newer non-empty search still owns isSearching" is a prerequisite of showing a dimmed list under a busy flag. |
| 045 text search with tag:/path: returns every note that matches words and operators | ready-for-agent | Changes where the 50 cap applies (before vs after the operator filter, possibly Rust side, `cargo test` gate). The "50+" label must read the cap at the place that owns it, so it depends on how 045 lands. Same `performSearch` words-plus-operators branch. Also merged-in Issue 24: results/ftsResults cleared when a text search has no hits. |
| 160 tag click lists notes even when Semantic/Hybrid was selected | ready-for-agent | `openSearch` should switch to Text mode for operator-only queries. Touches `open-search.service.ts`, `TagsView.svelte:17-19`, `search.service.ts`; no overlap in lines with P30 but same test file `search.service.test.ts`. Reduces cases where the cap label is read in semantic mode after a tag click. |
| 212 Tags view explains when the rare-tag filter hides everything | ready-for-agent | Same `TagsView.svelte` empty branch (:81-82) and the same header count (:52-56). Rewrites the empty branch into two messages + "Show all tags" button. Conflicts textually with 159 if both edit the header/branch; the header block is changed by both. |
| 220 Search panel stops repeating index status the status bar shows | ready-for-agent | Removes the "Index stats + progress" block `SearchPanel.svelte:98-111` and the `Loader2` import. P30's delayed spinner must NOT live in that block or it will be deleted; put it in the header input like `RailListSearch` does, or keep an import of `Loader2`. Owner decision already recorded (status bar keeps the count). |
| 205 sidebar panels and settings use the empty/error primitives | ready-for-agent, blocked by 204 | Migrates `TagsView` "No tags found" and `SearchPanel` "No results found" to `EmptyState`; explicitly says "Indexing tags...", "Searching..." and "Type to search across all files" are loading/hint copy and stay plain text. Notes same-file conflicts with 159, 160, 212 (TagsView) and 045, 057, 160, 220 (SearchPanel). Not a blocker for P30; it lands after. |
| 107, 037, 085, 066 | ready-for-agent | Only mention `search.service` / `searchStore` incidentally (semantic queue, read_files_batch, status bar count); no behaviour overlap. |
| tasks-view-ux 108 | resolved | The Tasks "list stays mounted" model that P30 cites as the pattern. Not a conflict. |

Archived (do not reopen): `archived/ux-polish/issues/13-tags-filtered-empty-state.md` (became 212), `.../14-search-panel-drops-duplicate-index-status.md` (became 220).

Ledgers: `.scratch/open-itens/ledger.md` lines 82 (045), 94 (057), 175-176 (159, 160), 221 (205), 228 (212), 236 (220). No ledger in `.scratch/design-review/` tracks P30 yet, and `.scratch/finders-ux/` has no other files yet.

Not touched by any of this and not in the supplied examples: 042, 164, 218 (quick switcher, command palette) and 087, 208 (graph) do not touch Tags/Search refresh behaviour.

## ADRs and help docs

- No ADR records a deliberate decision about "Indexing tags..." or "Searching..." or the 50-result cap. Relevant ADRs only by context: `0006-effect-untrack-pattern.md` (the `$effect` + `untrack` shape both views already follow), `0011-sqlite-fts5-wal-local-search.md` (FTS), `0012-onnx-semantic-search-content-hash-skip.md`, `0005-svelte-runes-getter-stores.md` and `0034-derived-allowed-behind-store-getters.md` (a new `hasLoaded` flag follows the getter pattern; a module-level `$derived` for "truncated" would need a store test per CLAUDE.md rule 3).
- `help/documentation/06-search-and-navigation.md`: documents the "top 50 candidates" for the semantic and hybrid pipelines (:108-114), which is the rerank candidate pool, not the number of rows shown (the UI asks for 20). It does not mention the 50-row text cap or "Searching...". If a "50+" label ships, one sentence there is warranted. `help/documentation/07-sidebar-panels.md:98-143` covers the Tags view and does not mention loading. No help text contradicts the proposal.

## Tests that cover this code

Unit (jsdom, real stores, only Tauri/side-effect services mocked):
- `src/tests/lib/features/search/SearchPanel.test.ts`: `'shows the searching notice while a search runs'` (~:209-213) pins `setSearching(true)` => text contains "Searching..." and will change deliberately; `'says so when a query finds nothing'` (~:200-205); the result-count assertion `'2 results'` (~:164); mode buttons, header and focus tests unaffected.
- `src/tests/lib/features/search/search.service.test.ts`: `isSearching` false after completion (:285), after FTS failure (:462, :481), after `resetSearch` (:1026), `:126`; null-vault cases (:440-482); operator-only and fuzzy tests (:294-442). No test covers an older call finishing while a newer one runs (Issue 057 asks for it).
- `src/tests/lib/features/search/search.store.test.ts` (:12, :26-28, :54-61): store flags; any new getter (`truncated`, `showBusy`) needs a test here.
- `src/tests/lib/features/search/search.logic.test.ts`, `open-search.service.test.ts`, `SearchResult.test.ts`, `search-hybrid.logic.test.ts`: logic helpers, unaffected unless a cap constant moves into `search.logic.ts`.
- `src/tests/lib/features/tags/TagsView.test.ts`: only two tests (tag click opens rail Search; empty notice). It mocks `tags.service.js` wholesale (`scheduleTagIndexRebuild`, `updateTagSort`), so it cannot see the loading branch. Issue 159 therefore proposes a second file, `TagsView.refresh.test.ts`, that mocks only Tauri.
- `src/tests/lib/features/tags/tags.service.test.ts`: `'clears loading state on completion'` (:62-70), `'clears loading state even on IPC error'` (:~103-111, asserts tree left as before), timing/log-shape test (:~85-100). `tags.store.test.ts` (:13, :28-30, :47-55) covers `isLoading`/`reset`; a new `hasLoaded` needs a test there.
- `src/tests/lib/features/tasks/TasksView.test.ts:358` is the model for the "Refreshing" status assertion.

E2E (`bash scripts/e2e.sh`):
- `e2e/specs/search.spec.ts`: four tests (open, type a query and see `[data-search-result]` for "Roadmap", "No results found" for a nonsense query, Escape keeps results). The "No results found" test is a timing risk once old results are kept dimmed (a stale result row from a previous query could still be present for a moment); it filters on the text with a 5 s timeout so it should hold, but re-check. No E2E for Tags view.
- `e2e/specs/calendar-feature-46-created-note-search.spec.ts`: touches search only incidentally.

## Owner-only questions

1. Spinner placement for search: in the header input (like `RailListSearch`, independent of Issue 220), or next to the result count? Recommendation: in the input row, so 220 cannot delete it. Dimming amount (opacity) is a design choice; propose `opacity-60` plus `aria-busy="true"` on the list and a `role="status"` spinner. Is a 300 ms delay wanted for Tags too, or immediate like the Tasks spinner (no delay today)? Recommendation: same 300 ms rule for both, via one small helper.
2. "50+" scope: only text-mode FTS (the review's wording), or also semantic/hybrid (cap 20) and operator-only (cap 100)? Recommendation: one constant per mode and "N+" whenever the raw list length equals its cap (semantic after its `minScore` filter may under-report; accept). Needs an owner nod because 045 may move the text cap.
3. Order against 045: ship P30's "50+" after 045 so the cap lives in one place, or ship it now keyed to the current `maxResults: 50` and let 045 adjust? Recommendation: after 045, or make the flag derive from a single `FTS_MAX_RESULTS` constant that 045 will keep.
4. Tags first-load signal: add `tagsStore.hasLoaded` (mirrors Tasks, correct for a vault with zero tags) or use `tagTree.length === 0 && isLoading`? Recommendation: `hasLoaded`, reset in `reset()`; this is not owner-only, only noted because Issue 159 left it open.
5. Whether stale results from another mode may show dimmed after a mode switch (mode toggles re-run the search and the other mode's array still holds an older query's results). Recommendation: show them dimmed like any refresh; or clear the target mode's list on a mode change. Minor.

## Suggested tickets

Do not make one ticket per half of P30: the Tags half is already a ticket (159), and the Search half only makes sense on top of 057. Proposed grouping (three tickets, the first two exist):

**T1 = existing Issue 159 + P30 Tags tail (Tags refresh keeps the tree).** Files: `TagsView.svelte`, `tags.service.ts`, `tags.store.svelte.ts`, new `TagsView.refresh.test.ts`, `tags.store.test.ts`. Add to 159: `hasLoaded` in the store, header spinner (`role="status"`, label like "Refreshing tags") shown only after about 300 ms of `isLoading` when `hasLoaded`. Land before or together with 212 (same header and empty branch; whichever lands second reconciles). Frontend gate only. Fits one fresh context.

**T2 = Search refresh keeps the results (new Issue) with 057 as its first commit.** Files: `search.service.ts`, `SearchPanel.svelte`, `search.store.svelte.ts`, `SearchPanel.test.ts`, `search.service.test.ts`, `search.store.test.ts`, optional e2e tweak in `search.spec.ts`. Content: (1) 057 fix (empty-query branch clears `isSearching`; test that an older call does not clear a newer search's flag); (2) panel keeps and dims the previous results while `isSearching` and the list is non-empty, shows "Searching..." only when there is nothing to keep; (3) delayed spinner (about 300 ms) in the header input; (4) update the `'shows the searching notice while a search runs'` test on purpose. Keep 057's own criteria in the ticket so the issue can close it. Frontend only. Fits one context.

**T3 = "N+" cap label (new small Issue, after 045).** Files: a cap constant (`search.logic.ts` or `search.types.ts`), `SearchPanel.svelte` (count line :122-124), `SearchPanel.test.ts`, maybe `help/documentation/06-search-and-navigation.md` (one sentence). Blocked by 045 if 045 moves the cap or filters in Rust; otherwise independent. If the owner prefers fewer tickets, T3 can be the last commit of T2 once 045 is merged. Size S.

Not in this cluster (leave as is, but they share files with T1/T2, so serialize): 160 (open-search mode), 212 (rare-tag empty state), 220 (panel index-status row removal), 205 (EmptyState migration, blocked by 204), 045 (cap placement). Same-file order that minimizes conflicts: 057 -> T2 -> 220 and 045 -> T3 in SearchPanel/search.service; 159 -> 212 -> 205 in TagsView.

Prefactor: none is required. A tiny shared "show after delay" helper (e.g. in `src/lib/utils/`, a function or small rune-based store used by both views) is optional; with only two call sites that differ (a store flag vs a component prop) it is simpler to inline a 300 ms `setTimeout` effect in each, so I would not extract it unless a third caller appears (Collection "Building index..." and Backlinks "Indexing vault..." are named in the review as later candidates but already gate on first load).

Sizing: T1 S, T2 S-M, T3 S. All frontend-only; no Rust unless 045 goes the Rust route and T3 follows it.

## Not checked

- Runtime behaviour: the Tags collapse is traced in code (as the review says), not reproduced in the app; the Search blink was read, not observed.
- Whether `RailNoteList` search or other finders (quick switcher, palette) have the same flicker; out of this cluster.
- Whether the `docs/agents/indexing-watcher-rules.md` rules constrain the tag rebuild trigger (the change only reads `isLoading`, it does not alter the rebuild trigger, so I did not open it).

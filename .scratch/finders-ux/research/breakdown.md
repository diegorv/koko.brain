# finders-ux: ticket breakdown

Combined from the five cluster verdicts in this folder (`verdict-command-dialogs.md`, `verdict-search-panel.md`, `verdict-tags.md`, `verdict-graph.md`, `verdict-background-refresh.md`). Source proposals: `.scratch/design-review/review.md` (the `#### Pxx.` blocks) and `.scratch/design-review/prototypes/finders-search-tags-graph.html`.

All referenced `open-itens` Issues were `todo` in `.scratch/open-itens/ledger.md` when this was written.

## ID coverage

Each proposal ID is counted in exactly one place. A proposal that splits across slices is counted under the slice that carries most of it; the other slices name it as "part of Pxx".

| ID | Counted in | Other slices that build part of it |
|----|------------|------------------------------------|
| P55 | fold into 218 | |
| P56 | fold into 218 | (480px cap not built, see below) |
| P57 | 06 | |
| P159 | 05 | (word-start bonus not built) |
| P160 | 05 | footer in 218 fold, "Recent notes" heading in 07 |
| P179 | 07 | no close X in 218 fold |
| P58 | 01 | |
| P158 | 01 | |
| P59 | 02 | |
| P161 | 02 | |
| P162 | 02 | span-only result markup in 01 |
| P30 | 03 | Tags half in 159 fold, "N+ results" in 04 |
| P76 | fold into 212 | |
| P187 | 08 | |
| P157 | 09 | filter box in 10 |
| P78 | 11 | |
| P154 | fold into 208 | |
| P155 | fold into 206 | depth stepper in 12 |
| P156 | dropped | |

### Parts not built

- **P56, 480px list cap:** contradicts the owner-approved `max-h-[min(60vh,400px)]` in Issue 218 and the archived 2026-11-04 overlay-anatomy rule. 400px at h-9 rows shows about 11 rows.
- **P159, word-start bonus in `fuzzyMatch`:** the review's own validation says it ties the labels, it changes ranking for 6 consumers (palette, switcher, wikilink and tag completion, ModDialogHost), and the Undo/Redo gating in 05 carries the fix.
- **P30, Tags header spinner:** not in P30. Kept as an owner question on the 159 fold.

### Dropped

- **P156:** the premise is false. `GraphView` `handleClick` calls `openFileInEditor` (`editor.service.ts:143-195`), which focuses an existing tab or pushes a new one through `editorStore.addTab` (`editor.store.svelte.ts:52-61`). The app has no replace-current-tab or preview-tab model, so a plain graph click already opens a new tab and a Cmd-click branch would behave the same. A preview-tab model is a separate tab-model decision.

## Dependency graph

```
218 ──> 05 palette
218 ─┬> 06 switcher Create <── 164
     └> 07 switcher rows <── 06

01 cards ──> 02 states <── 057, 220
             02 ──> 03 keep results <── 057
                    03 ──> 04 N+ <── 045

159 fold ──> 212 fold (P76) ──> 10 tags filter <── 09 tags rows
08 tags tab icon (free)

208 fold (P154) ──> 12 depth stepper
087, 204 ──> 206 fold (P155)
11 graph labels (free)
```

Free to start now: 01, 08, 09, 11, and the folds into 218, 159 and 208.

## Folds into existing Issues

### Fold into 218: Command dialogs anchor at 18vh with one-line rows, a 400px list, a key-hint footer and no close X

- **Issue:** `.scratch/open-itens/issues/218-command-palette-shows-dense-one-line-rows.md`
- **IDs:** P55, P56. Also builds the footer half of P160 (counted in 05) and the no-X half of P179 (counted in 07).
- **Size:** M. **Blocked by:** none.
- **What to add to 218** (which already covers P56 density, the footer and no close X, with an owner decision):
  1. P55: `command-dialog.svelte` gives its `Dialog.Content` `top-[18vh] translate-y-0` (tailwind-merge overrides the base `top-[50%] translate-y-[-50%]` at `dialog-content.svelte:30`) plus `showCloseButton={false}`. Ordinary dialogs stay centred.
  2. Keep `max-h-[min(60vh,400px)]`, not the review's 480.
  3. The density prop sets a minimum row height, so `ModActionPicker` action rows with a description (`ModActionPicker.svelte:178-186`) are not clipped. Remove the `pr-6` close-X allowance at `ModActionPicker.svelte:105`.
  4. The footer takes its hints from the caller (snippet or prop), so the quick switcher adds Shift+Enter in 06; dialogs that pass none get no footer.
  5. Refresh the stale line pointers (`command-list.svelte:15`, `command-dialog.svelte:31-33`, `command-input.svelte:14` `pe-8`).
- **Acceptance:**
  - [ ] Failing test first: new `src/tests/lib/components/ui/command/command-dialog.test.ts` asserts that a `Command.Dialog`'s `[data-slot=dialog-content]` has `top-[18vh]` and `translate-y-0`, not `top-[50%]`, and renders no Close button
  - [ ] `dialog-content.test.ts` gains a case that a plain dialog keeps `top-[50%]` and its close button
  - [ ] E2E via `bash scripts/e2e.sh`: the palette input's `boundingBox().y` is the same before and after typing a filter that shrinks the list; `overlay-motion.spec.ts` stays green
  - [ ] Palette rows are one line: label left, category muted right, shortcut after it; the list carries `max-h-[min(60vh,400px)]`
  - [ ] A `ModActionPicker` action with a description shows both lines; the run view's Stop and Close still work (`ModActionPicker.test.ts`)
  - [ ] Escape closes every command dialog; TemplatePicker, OneOnOnePicker, ModActionPicker, QuickSwitcher and CommandPalette tests stay green
- **Owner questions:** none (400px comes from 218 and the archived overlay-anatomy rule).

### Fold into 159: The Tags view keeps its list and expanded tags on screen while it refreshes (add a hasLoaded first-load signal)

- **Issue:** `.scratch/open-itens/issues/159-tags-view-keeps-list-expanded-tags-screen.md`
- **IDs:** none counted here. Builds the Tags half of P30 (counted in 03).
- **Size:** S. **Blocked by:** none. Land before the 212 fold and before 205 (same header and empty branch).
- **What to add to 159:** a `tagsStore.hasLoaded` flag, true after a successful build and cleared by `reset()`. Show "Indexing tags..." only while `isLoading && !hasLoaded`. Keep the header count visible during a refresh once `hasLoaded` is set. Without the flag, a "tree is empty" check makes a vault with zero tags show "Indexing tags..." on every refresh. No header spinner.
- **Acceptance:**
  - [ ] Failing test first in `src/tests/lib/features/tags/TagsView.refresh.test.ts` (mocks only `@tauri-apps/api/core`): with a loaded tree holding `work` and `get_all_tags_v2` pending past the 300 ms debounce, the `work` row is still rendered and "Indexing tags..." is not
  - [ ] A parent tag expanded before a refresh is still expanded after the refresh resolves
  - [ ] A vault with zero tags, after its first successful build, shows "No tags found" (not "Indexing tags...") while a refresh is in flight
  - [ ] Header count stays visible during a refresh after the first load
  - [ ] First load still shows "Indexing tags..." until the IPC resolves; a failed first build leaves `hasLoaded` false and shows "No tags found"
  - [ ] `tags.store.test.ts` covers `hasLoaded` and its `reset()`; the `tags.service.test.ts` error case keeps the previous tree
- **Owner questions:** should the Tags header also get a Tasks-style refresh spinner (`role=status`)? Default: no.

### Fold into 212: Tags header says "Showing X of Y" and the empty state explains the rare-tag filter

- **Issue:** `.scratch/open-itens/issues/212-tags-view-explains-when-rare-tag-filter.md`
- **IDs:** P76.
- **Size:** S. **Blocked by:** the 159 fold (same lines `TagsView.svelte:52-56,79-82`; sequencing only).
- **What to change in 212:** amend, do not supersede (205's Notes reference 212 by number). Remove 212's sentence "The header count keeps meaning tags in the vault and does not change" and its "header styling" non-goal. Header: with `hideRareTags` on and 0 < X < Y, show "Showing X of Y tags" with an inline Show all button (calls `toggleFilter`) inside the count span; otherwise "Y tag(s)" as today. X = nodes with count > 0 in `displayedTree`, from a new pure helper in `tags.logic.ts` (rare parents kept for a popular child count; pure containers do not). Y stays `tagsStore.totalTagCount` (Rust `lookup_all_tags` and `buildTagTree` both fold case, so X <= Y). Empty state: "All Y tags are used fewer than 10 times." plus a Show all tags button. The header link is hidden when X is 0, so only one Show all control appears. "No tags found" stays for an empty vault. Rewrite `help/documentation/07-sidebar-panels.md:107-109`. No `h-*`/`p*-*`/`gap-*`/`border-*` classes on the `.pane-toolbar` row.
- **Acceptance:**
  - [ ] Failing test first in `src/tests/lib/features/tags/TagsView.test.ts`: real `tagsStore` with tags at count 12 and 3, `totalTagCount` 2, filter on. The header reads "Showing 1 of 2 tags" with a Show all button; clicking it sets `hideRareTags` false, both tags are listed and the header reads "2 tags"
  - [ ] With the filter off, or with no tag hidden, the header reads "N tags" with no button
  - [ ] Filtered-empty case: the body shows "All 3 tags are used fewer than 10 times." with exactly one Show all button in the view
  - [ ] `tags.logic.test.ts` covers the count helper: empty tree is 0, a pure container is not counted, a rare parent kept for a popular child is counted
  - [ ] Existing "No tags found" case, `pane-toolbar.test.ts` and `tags.service.test.ts` totals stay green
  - [ ] `help/documentation/07-sidebar-panels.md` describes the "Showing X of Y" header
- **Owner questions:** reverse 212's documented "header is the unfiltered total" decision and the help page? (recommended yes). Hide the header link when X is 0? (recommended yes).

### Fold into 208: Graph controls on shadcn Switch/Select, plus Close removal, sentinel All, aria-labels and the trapped-filter fix

- **Issue:** `.scratch/open-itens/issues/208-graph-controls-event-dialog-use-shadcn-select.md`
- **IDs:** P154.
- **Size:** M. **Blocked by:** none (do not run in parallel with 166, which edits the Arrows toggle).
- **What to add to 208's graph half:**
  1. Remove the Close button (`GraphControls.svelte:65-73`) and the `X`/`closeGraphTab` imports; `closeGraphTab` stays in the service for `resetGraphView`. Edit `help/documentation/14-graph-view.md:55`.
  2. "All tags" / "All folders" items use a sentinel value mapped to null, because bits-ui 2.20.4 treats `''` as no value (`select.svelte.js:151,199`).
  3. Mode and zoom icon buttons get an `aria-label`; the Switches are named by their visible labels.
  4. Fix: build the filter options from the graph before filters are applied (global graph, or the local graph in local mode), not from `simNodes` (`GraphView.svelte:457`). Today picking a folder with no subfolders hides the folder select (`folders.length > 1` at :112) and the filter cannot be cleared (confirmed in `archived/audit-2026-11-04/findings.md:65`, never ticketed). `fullData` is not reactive, so keep a `$state.raw` copy of the pre-filter nodes. Search stays a filter. The "Filters (n)" popover is skipped.
- **Acceptance:**
  - [ ] Failing test first in new `src/tests/lib/plugins/graph-view/GraphControls.test.ts` (real `graphViewStore`; Select recipe from `UpdateSection.channel.test.ts:33-100`): with notes in folders `a/` and `b/`, after picking folder `a` the folder control is still shown and offers "All folders" and `b`; choosing "All folders" sets `filters.folder` to null
  - [ ] Orphans and Arrows are `role=switch` with `aria-checked`; toggling them sets `filters.showOrphans` and `display.showArrows`
  - [ ] Picking a tag sets `filters.tag`; "All tags" sets null
  - [ ] No Close button in the controls; the graph tab still closes from the tab bar and with Cmd+G (existing service tests green)
  - [ ] Mode and zoom buttons have accessible names
- **Owner questions:** accept removing Close because the tab has an X and Cmd+G toggles it? (recommended). Accept the trapped-filter fix inside 208 rather than a separate fix Issue? (same lines, same test file).

### Fold into 206: Local graph isolated, loading and error states

- **Issue:** `.scratch/open-itens/issues/206-graph-collection-kanban-views-show-real-empty.md`
- **IDs:** P155. The depth stepper half is 12.
- **Size:** M. **Blocked by:** 087, 204 (206's existing edges). See the 087 note under Cross-cluster notes.
- **What to add to 206's graph half:**
  1. Isolated: in local mode, when the center is in the full graph with zero links, show `EmptyState` "This note has no links yet". It must also show when Orphans is off (then `filterGraphData` removes the center and 0 nodes draw). It must not show when the center is missing from the graph (087's hint).
  2. Loading: a "Building graph..." line until the first snapshot resolves only. `loadAndRebuild` runs on every `vaultIndexVersion` bump (every save), so later rebuilds keep the current graph without the line.
  3. Error with Retry is already in 206; Retry re-runs `loadAndRebuild` and clears the alert on success.
- **Acceptance:**
  - [ ] Failing test first in `GraphView.test.ts`: a local graph centered on a note with no links shows "This note has no links yet", with Orphans on and off
  - [ ] While the first `invoke('get_all_vault_entries_v2')` is pending the loading line shows and is gone after it resolves; a later `vaultIndexVersion` bump with a pending fetch does not show it
  - [ ] A rejected load shows `InlineAlert` with Retry (existing 206 AC); Retry with a resolving invoke shows the graph
- **Owner questions:** wording of the isolated message (default: the review's "This note has no links yet").

## New tickets

### 01: Search result cards show the note name and folder, plain-text snippets and a themed highlight

- **Slug:** `search-result-cards-note-name-folder-plain-snippets`
- **IDs:** P58, P158. Also builds the span-only result markup of P162 (counted in 02).
- **Size:** M. **Blocked by:** none. Do not run in parallel with 209 (same subtitle and snippet rows in `SearchResult.svelte`).
- **Suggested status:** ready-for-agent.
- **What to build:** the note name is the title in every mode; the subtitle is the parent folder (none at vault root) plus `§ heading`. The hybrid adapter at `search.service.ts:161-170` strips `.md`, derives the title from the path and omits `source`, which becomes optional at `search.types.ts:46`, so the badge shows only on the legacy merge fallback where the source really varies. A new pure markdown-to-plain-text util in `src/lib/utils/` (shared later with review P74) keeps `<mark>`, tolerates unbalanced or cut syntax, and runs before `sanitizeSnippetHtml` on all snippets: Text FTS, the hybrid raw chunk (which never has `<mark>`) and semantic. The result `<button>` holds only spans (block/flex), no div or p. One `mark` rule in `app.css` uses the existing `--lp-highlight-bg` token with `color: inherit`; no new theme token. Update the help doc's Search Results section. Correction to the review: in the real app WebKit paints `mark` yellow by default; the screenshot came from a mock whose snippets have no `<mark>`.
- **Acceptance:**
  - [ ] Failing test first: the util strips headings, emphasis, `==highlight==`, `~~`, links, images, wikilinks (alias, else the last segment), checkboxes, list and quote markers, inline code, fences and callouts; keeps `<mark>`; tolerates a `...` cut or an unbalanced cut
  - [ ] Failing test first: `search.service.test.ts` adapts hybrid chunk `Projects/a.md` with heading `Intro` to title `a` with no source (the :282 assertion changes on purpose); a new test covers the `search_hybrid`-throws fallthrough, where results keep a real source
  - [ ] Failing test first: `SearchResult.test.ts` asserts, in every mode, the title is the note name and the subtitle is folder + `§ heading` and never repeats the file name; a hybrid card without source shows no badge; one with source still does; the snippet has no raw markdown
  - [ ] The result button contains only phrasing content; the subtitle test uses a data hook instead of `querySelector('p')`
  - [ ] `mark` in search results uses `--lp-highlight-bg`; `theme-snapshot.test.ts.snap` unchanged
  - [ ] `e2e/specs/search.spec.ts` stays green; the help doc describes the new card
  - [ ] Gate: `pnpm check` + `pnpm vitest run`
- **Owner questions:** none blocking (the highlight reuses `--lp-highlight-bg`; a root-level note shows no folder).

### 02: Search panel separates short-query, error and disabled-mode states, hints operators, and labels its controls

- **Slug:** `search-panel-states-operator-hint-accessible-controls`
- **IDs:** P59, P161, P162.
- **Size:** M. **Blocked by:** 01 (both edit `search.service.ts` and `search.service.test.ts`), 057, 220. Do not run in parallel with 160 (`SearchPanel` mode handling) or 205 (`SearchPanel` "No results found").
- **Suggested status:** needs-triage until the owner questions are answered (defaults given).
- **What to build** in `SearchPanel.svelte`:
  1. In Semantic or Hybrid, a query under 3 code points (the same `parsed.text.trim() || raw` rule as the service) shows "Type at least 3 characters", through a pure helper in `search.logic.ts` with a named constant that points at `semantic.rs:804/991`.
  2. `searchStore` gains a `searchError` field (getter, setter, reset). The service sets it on a `search_semantic` failure in Semantic mode and in the outer catch, logs with `error()`, and clears it on a new or empty query. The panel shows "Search failed" with Retry calling `performSearch`, in `role=alert` (use 204's `InlineAlert` if 204 has landed; otherwise plain markup that 205 migrates). The FTS-to-in-memory and hybrid-to-legacy fallbacks are not errors.
  3. The Semantic and Hybrid buttons use `aria-disabled` instead of native `disabled`. Activating one calls `settingsPanelStore.open('search')` and does not change the mode. The tooltip says "Semantic search is off. Turn it on in Settings > Search." when the setting is off, or "Semantic search is starting..." when the setting is on but the model is not loaded. A model missing at startup turns the setting back off (`app-lifecycle.service.ts:477-482`), so "not installed" is never the reason.
  4. In Text mode only, the empty state adds "Try tag:work or path:Projects"; operators are ignored in the other modes by design (`help/examples/search-types/README.md:18`).
  5. `aria-label` on the input, `role=group` plus `aria-label` on the mode toggle, `aria-pressed` on each mode and on the `~` toggle (with `aria-label` "Fuzzy matching"), and one persistent `role=status` element for the Searching / N results / No results / short-query text. Update the help doc (3-character minimum, off until enabled).
- **Acceptance:**
  - [ ] Failing test first: in Semantic or Hybrid with a query of 1-2 characters, the panel shows "Type at least 3 characters", not "No results found"; Text mode is unchanged
  - [ ] Failing test first: a `search_semantic` rejection or the outer catch sets `searchStore.searchError`; the panel shows "Search failed" with a Retry button in `role=alert` that re-runs `performSearch`; a new search or an empty query clears it; the store getter has a test; the fallbacks stay silent and still return results
  - [ ] Failing test first: unavailable mode buttons have `aria-disabled="true"` (the `SearchPanel.test.ts:173-175` `.disabled` assertions change on purpose); activating one leaves the mode and opens Settings > Search; the tooltip text depends on `semanticSearchEnabled` and `modelAvailable`
  - [ ] The Text-mode empty state keeps "Type to search across all files" and adds the operator hint; there is no hint in Semantic or Hybrid
  - [ ] Tests assert `aria-label` on the input and on `~`, `aria-pressed` on the modes and on `~`, and `role=group` on the mode toggle, with `getAttribute`
  - [ ] One persistent `role=status` element (the same node across state changes) carries the status text
  - [ ] `e2e/specs/search.spec.ts:31-37` stays green; the help doc is updated
  - [ ] Gate: `pnpm check` + `pnpm vitest run`
- **Owner questions:** (1) Short query in Hybrid: show the message (default), or fall back to Text results for 1-2 characters? (2) Is it OK that activating a disabled mode opens Settings > Search, instead of a link inside the tooltip (not keyboard-reachable)? (3) Wait for the 204 primitives? (default no, plain markup). (4) After 220, should a Semantic search during the first index build say "index still building"? (default: not in this ticket).

### 03: Search keeps the previous results on screen, dimmed after about 300 ms, while a new search runs

- **Slug:** `search-keeps-previous-results-dimmed-while-searching`
- **IDs:** P30. The Tags half is the 159 fold; "N+ results" is 04.
- **Size:** S. **Blocked by:** 02 (same `isSearching` branch; 02 adds the persistent `role=status` element this ticket builds on), 057.
- **Suggested status:** ready-for-agent with the defaults below.
- **What to build:** `SearchPanel.svelte:115-116` renders only "Searching..." while `searchStore.isSearching`, so the previous results (still in the store, since `search.service.ts:138` does not clear them) disappear and come back on each query, mode or fuzzy change past the 200 ms debounce (`+layout.svelte:170-180`). While `isSearching` and the current mode's list is not empty, keep the count and list rendered. After about 300 ms of continuous searching, dim the list (`aria-busy=true`) and show a `role=status` spinner in the header input row. In text mode the spinner sits left of the fuzzy `~` toggle, like `RailListSearch`'s `right-7` offset, not in the index-stats block 220 deletes. Show "Searching..." only when there is nothing to keep. A search shorter than the delay shows no dim and no spinner. Panel-local timer; no shared helper. Reuse 02's persistent `role=status` node for the text, so the panel has one status region.
- **Acceptance:**
  - [ ] Failing test first in `SearchPanel.test.ts`: with `ftsResults` holding 2 rows and `setSearching(true)`, both rows and "2 results" stay rendered and "Searching..." is absent
  - [ ] With fake timers: before 300 ms there is no dim and no spinner; after 300 ms the list has `aria-busy=true` and a spinner is in the header row
  - [ ] With `isSearching` true and an empty current-mode list, "Searching..." still shows (the existing "shows the searching notice" test changes on purpose into this case)
  - [ ] When `isSearching` turns false, the dim and spinner disappear and the new results render
  - [ ] `search.service.test.ts` pins that the previous lists stay in the store while a non-empty search is in flight
  - [ ] `e2e/specs/search.spec.ts` stays green (`bash scripts/e2e.sh`)
  - [ ] Gate: `pnpm check` + `pnpm vitest run`
- **Owner questions:** after a mode switch, the target mode's list may hold an older query's results: show them dimmed (default), or show "Searching..." until the new search returns? Is 300 ms right for both the dim and the spinner (the in-repo precedents, Tasks and RailListSearch, show their spinner at once)?

### 04: The search result count says "N+" when the list hits the search cap

- **Slug:** `search-count-says-n-plus-at-cap`
- **IDs:** none counted here; part of P30 (counted in 03).
- **Size:** S. **Blocked by:** 03 (same count line), 045 (moves where the text cap applies for words plus operators, possibly into Rust).
- **Suggested status:** needs-triage until the scope question is answered.
- **What to build:** text search asks `search_fts` for `maxResults` 50 (`search.service.ts:199-203`), and the panel prints "50 results" when the cap cut the list. Other caps are inline too: semantic and hybrid 20 (:151, :251), operator-only and the in-memory fallback 100 (`search.logic.ts:168, :201`). Replace the inline numbers with one named cap per path. The service records whether the list it stored reached the cap it asked for, and the count line reads "{cap}+ results" in that case. One sentence in `help/documentation/06-search-and-navigation.md`.
- **Acceptance:**
  - [ ] Failing test first in `SearchPanel.test.ts` (or `search.service.test.ts`): a text search whose `search_fts` mock returns exactly the cap shows "50+ results"; 49 rows show "49 results"
  - [ ] Caps are named constants, with no inline 50/20/100 left in `performSearch` or its logic helpers
  - [ ] The modes in scope (owner answer) show N+ at their cap; the others are unchanged
  - [ ] Help page 06 states the cap in one sentence
  - [ ] Gate: `pnpm check` + `pnpm vitest run`
- **Owner questions:** "N+" for text FTS only (the review's wording), or for every capped path (semantic and hybrid 20, operator-only and fallback 100)? Semantic drops rows below `minScore` 0.3, so it can under-report truncation.

### 05: Palette lists calendar Undo/Redo only when they can act, files calendar commands under Calendar, and shows Recent / All commands groups

- **Slug:** `palette-calendar-undo-gated-recent-groups`
- **IDs:** P159, P160. The P160 footer lands in the 218 fold; the switcher's "Recent notes" heading in 07.
- **Size:** M. **Blocked by:** 218 (same `CommandPalette.svelte` rows and footer).
- **Suggested status:** needs-triage until the Undo/Redo question is answered (default given).
- **What to build:** `commands.ts`: include `event-calendar:undo` only when `eventCalendarStore.canUndo`, and redo only when `canRedo` (`event-calendar.store.svelte.ts:104,106`). Reading them inside `getBuiltInCommands()` keeps `AppOverlays.svelte:19` reactive. No "tab active" condition, because it would list a no-op. Ids stay stable for Issues 146/147. Move new-event, today, undo and redo to category "Calendar"; Toggle Calendar View stays Navigation next to the other Toggle X View commands. `command-palette.logic.ts`: for an empty query, return recents and rest separately (shape change or a second helper). `CommandPalette.svelte` renders `Command.Group` heading "Recent" and heading "All commands" when there are recents, and no headings otherwise. A non-empty query stays one flat ranked list. `fuzzy-match.ts` is unchanged. Docs: help `06-search-and-navigation.md` (category table, line 36), `27-calendar.md:177`, `20-keyboard-shortcuts.md:119`.
- **Acceptance:**
  - [ ] Failing test first in `src/tests/lib/app/commands.test.ts`: with empty history there is no `event-calendar:undo` or redo; after a recorded calendar change Undo is listed; after an undo Redo is listed and runs
  - [ ] The count literal at `commands.test.ts:137` becomes 43; the "Nothing to undo" palette test is rewritten for a non-empty history
  - [ ] `filterAndRankCommands('cal', getBuiltInCommands(), [])` with idle history contains no Calendar: Undo/Redo
  - [ ] new-event, today, undo and redo report category "Calendar"; the toggle category assertion at :205 stays Navigation
  - [ ] Failing test first in `command-palette.logic.test.ts`: an empty query returns recents and the label-sorted rest apart
  - [ ] `CommandPalette.test.ts`: "Recent" and "All commands" headings with recents, no headings without recents, none with a query; arrow keys still cross the group boundary
  - [ ] `fuzzy-match.ts` and its tests are unchanged; help docs updated
- **Owner questions:** hide Calendar Undo/Redo when there is nothing to undo (recommended, as with the Claude and rail Go to precedents) or keep them always listed? Hiding drops them from Issue 147's never-used list while idle.

### 06: Quick switcher offers Create while notes match, on Shift+Enter, showing the target folder

- **Slug:** `quick-switcher-create-row-shift-enter-target-folder`
- **IDs:** P57.
- **Size:** M. **Blocked by:** 164 (failure-cause toast and folder-path create, which covers the rest of P57), 218 (footer API).
- **Suggested status:** ready-for-agent (target-folder default accepted).
- **What to build:** render the Create `Command.Item` as the last row after the matches whenever the trimmed query is not empty, except when a note with that exact name (case-insensitive) already exists in the target folder: `createFile`'s `generateUniqueName` (`fs.service.ts:198-203`) would otherwise make "Ideas 1.md". The selection stays on the first match, so Enter opens it; Enter with no match still creates (042). Add `onkeydown` on `Command.Input`: Shift+Enter (not `isComposing`) with a Create row present calls `preventDefault` and `stopPropagation`, then runs `createAndOpenNote`. `stopPropagation` is required because bits-ui's root handler (`command.svelte.js:957-968`) treats Shift+Enter as Enter and does not check `defaultPrevented`. The row shows its target, "in <folder>" or "in vault root", from the same split 164 introduces. The default target is the typed folder, else the vault root. Add the Shift+Enter hint to the switcher footer from 218. Update help `06-search-and-navigation.md:15`.
- **Acceptance:**
  - [ ] Failing test first in `QuickSwitcher.test.ts`: invert :215-227. With `Ideas.md` present, typing "Idea" renders the match then Create "Idea" last; Enter opens `/vault/Ideas.md`; Shift+Enter creates and opens `/vault/Idea.md`
  - [ ] Typing "Ideas" with `Ideas.md` present renders no Create row, and Shift+Enter creates no "Ideas 1.md"
  - [ ] "Projects/Idea" shows "in Projects" on the row and creates there
  - [ ] The 042 tests (Enter on no match, both query transitions) stay green
  - [ ] The switcher footer shows the Shift+Enter Create hint; help doc updated
- **Owner questions:** target folder default: the typed folder, else the vault root (recommended; today's behaviour plus 164). The active note's folder or the Quick Capture folder would need a new rule. Not blocking if the default is accepted.

### 07: Quick switcher rows show type icon, folder, Archived tag, match highlight and a Recent notes heading

- **Slug:** `quick-switcher-rows-type-icon-folder-highlight`
- **IDs:** P179. Also builds the "Recent notes" heading of P160 (counted in 05). P179's "no X" lands in the 218 fold.
- **Size:** M. **Blocked by:** 218, 06 (same `QuickSwitcher.svelte`).
- **Suggested status:** ready-for-agent.
- **What to build:** row model in `core/filesystem/file-entries.logic.ts`: the folder relative to the vault (`''` at the root) and the kind from `fileKind()` (`features/rail-shell/lens.logic.ts:913`). Add a separate `fuzzyMatchPositions(query, target)` in `utils/fuzzy-match.ts` using the same greedy scan; `fuzzyMatch` and its 6 consumers stay untouched. Icon: `resolveIconForPath` first, otherwise the kind icon from one kind-icon map shared with `RailNoteList.svelte:665-673` (moved to a non-`.logic` module, not copied, because `pure-logic.test` forbids lucide in `.logic.ts`). The path line shows only the folder (no file name, no `.md`), right-aligned and muted per 218. Archived: an "Archived" text tag at full muted strength. Drop `opacity-50` and the Archive icon swap (`QuickSwitcher.svelte:80-86`), since the type icon takes that slot. Highlight the matched characters with a theme-token style (for example `font-semibold text-foreground`) without changing the option's accessible name. With an empty query and recents, show a "Recent notes" heading. Update help `06-search-and-navigation.md:14,18`.
- **Acceptance:**
  - [ ] Failing test first in `file-entries.logic.test.ts`: folder for nested and root files; kind for `.md`, `.canvas`, `.kanban` and `.view`
  - [ ] Failing test first in `fuzzy-match.test.ts`: positions agree with `fuzzyMatch` on match and no match
  - [ ] `QuickSwitcher.test.ts`: a `.canvas` row shows the canvas icon, not FileText; a note with a frontmatter icon shows it; `/vault/Projects/A.md` shows "Projects"; an archived note shows the "Archived" tag and no `opacity-50`; typing "wel" wraps the matched characters in highlight elements
  - [ ] e2e `quick-switcher.spec.ts` `getByRole('option', { name: /Welcome/i })` still passes
  - [ ] The "Recent notes" heading appears only for an empty query with recents
  - [ ] RailNoteList icons are unchanged; chrome-type-scale, menu-item-anatomy, palette-classes, pure-logic, layer-rules and feature-cycle tests are green
- **Owner questions:** none (the archived design system bans opacity on informative text, so Archived becomes a text tag).

### 08: The Tags tab shows a tag icon

- **Slug:** `tags-tab-shows-tag-icon`
- **IDs:** P187.
- **Size:** S. **Blocked by:** none.
- **Suggested status:** ready-for-agent (lucide Tag by default).
- **What to build:** in `src/lib/core/markdown-editor/EditorTabs.svelte`, import `@lucide/svelte/icons/tag` and add an `{:else if tab.fileType === 'tags'}` branch with `size-3.5 shrink-0 text-muted-foreground` before the `tabIcon` snippet branch (`EditorTabs.svelte:69-82`). Today the Tags tab falls to `EditorView.svelte` `fileTabIcon`, which shows FileText or whatever icon a user file-icon rule matches on `__virtual__/tags`. No rail navigator.
- **Acceptance:**
  - [ ] Failing test first in `src/tests/lib/core/markdown-editor/EditorTabs.test.ts`: mounting a tab with fileType `tags` at `TAGS_VIRTUAL_PATH` renders an svg whose class contains `lucide-tag`, and no `lucide-file-text` in that tab (precedent `mod-rail-icon.test.ts:77`)
  - [ ] A markdown tab still renders through the `tabIcon` snippet or FileText, unchanged
  - [ ] `pnpm check` and `pnpm vitest run` pass
- **Owner questions:** glyph: lucide Tag (recommended; Hash already marks an uncoloured tag dot in the view) or Hash.

### 09: Tags rows align leaves with parents and name their chevron and colour controls

- **Slug:** `tags-rows-align-leaves-label-controls`
- **IDs:** P157. Its filter box is 10.
- **Size:** S. **Blocked by:** none.
- **Suggested status:** ready-for-agent.
- **What to build:** in `TagItem.svelte` the leaf row (:56) gets a fixed 20px leading slot matching the parent chevron trigger (:30, `p-1` + `size-3`). Name and count offsets match the parent row: today the name is 2px off once the dot is aligned, and the count sits 4px from the right edge in parents vs 8px in leaves. The chevron `Collapsible.Trigger` gets a static `aria-label` and `title` naming the tag path. bits-ui already emits `aria-expanded` (`collapsible.svelte.js:174`), so the label must not flip between Expand and Collapse. `TagColorPicker.svelte` (one caller, TagItem) gets a required `label` prop applied to `Popover.Trigger` (:32) as `aria-label` and `title`, e.g. "Color of {fullPath}". Swatch internals stay untouched (review P88). The local open state is unchanged.
- **Acceptance:**
  - [ ] Failing test first: new `src/tests/lib/features/tags/TagItem.test.ts` (jsdom, real `settingsStore`). A parent and a leaf rendered as siblings have the same-width leading element before the dot and the same name/count classes (assert classes and DOM order, not pixels)
  - [ ] The chevron trigger has an accessible name containing the tag path, and `aria-expanded` goes from false to true on click
  - [ ] Every row's colour-dot trigger has an accessible name containing the tag path
  - [ ] `TagsView.test.ts` tag click still opens Search with `tag:work`
  - [ ] `pnpm check` and `pnpm vitest run` pass
- **Owner questions:** none.

### 10: The Tags view has a filter box that matches full paths and opens matching parents

- **Slug:** `tags-view-filter-box-full-paths`
- **IDs:** none counted here; part of P157 (counted in 09).
- **Size:** M. **Blocked by:** the 212 fold (empty branch and header), 09 (`TagItem.svelte`), the 159 fold (in case it hoists TagItem open state). Do not run in parallel with 205 (TagsView "No tags found").
- **Suggested status:** needs-triage until the owner answers.
- **What to build:** a "Filter tags" `Input` (`h-7 text-xs`, `aria-label`; precedent `RailListSearch.svelte`) in the TagsView toolbar without override classes on the `.pane-toolbar` row. A pure `filterTagTreeByQuery(nodes, query)` in `tags.logic.ts`: case-insensitive substring on `fullPath`, leading `#` stripped. It keeps the ancestors of a match and the whole subtree of a matching node, and returns the ancestor paths to force open. TagItem gets a `forceOpen` prop OR-ed with its local open, so clearing the query restores the user's own expansion. While a query is active the rare filter is bypassed (otherwise an existing rare tag shows "No tags match", the contradiction P76 fixes). A third empty branch reads "No tags match {q}". Query state is local `$state` in TagsView (recommended; the view remounts on each tab open) or a `tagsStore` field with `reset()` and a store test. Add a "Controls at the top" bullet to `help/documentation/07-sidebar-panels.md`.
- **Acceptance:**
  - [ ] Failing test first in `tags.logic.test.ts`: query "pro" on a tree with `work/projects`, `projects` and `home` keeps the first two plus ancestors, and the forced-open set contains `work`. "#Work" matches `work`. An empty query returns the tree unchanged
  - [ ] `TagsView.test.ts`: typing a query that matches a rare tag (count 3, filter on) shows it. A query with no match shows the "No tags match" message. Clearing the query restores the filtered list and the header
  - [ ] A matching nested tag is visible without clicking its parent's chevron, and after the query is cleared the parent returns to its previous open state
  - [ ] `pane-toolbar.test.ts` stays green
  - [ ] `pnpm check` and `pnpm vitest run` pass
- **Owner questions:** is it worth building, given that the Tags tab is not on the daily list (`validate-s7+s8.md:43`)? Does a query bypass the rare-tag filter (recommended yes)? Match semantics: case-insensitive substring on full path with a leading `#` stripped, and a matching parent shows its whole subtree (recommended)? Query in local state (recommended) or in `tagsStore`?

### 11: Graph labels are drawn by priority and skip overlaps

- **Slug:** `graph-labels-priority-skip-overlaps`
- **IDs:** P78.
- **Size:** M. **Blocked by:** none. Do not run in parallel with 165 or 166 (both edit `GraphView.svelte` and may add the recording 2D-context harness).
- **Suggested status:** ready-for-agent.
- **What to build:** a pure label-selection function in `src/lib/plugins/graph-view/graph-view.logic.ts`. Input: candidates `{id, x, y, width, height, degree, forced}` in one coordinate space. Output: the set of ids to draw. Forced labels (the hovered node, its neighbours, and `graphViewStore.centerPath`) always draw. The rest go by descending degree with a stable id tiebreak, and a label is skipped when it overlaps one already placed. Use a grid or a test against placed labels only, not all pairs. In `render()` (`GraphView.svelte:240-268`), keep the existing candidate gate (k > 0.8 or connected or active), measure widths through a cache keyed by name and font size, call the function, and draw only the selected labels. The orphan default and the font size stay unchanged (font size is out of scope per 213). Reuse the recording 2D-context harness from 165/166 if it has landed; otherwise add `src/tests/fixtures/canvas-context.fixture.ts`.
- **Acceptance:**
  - [ ] Failing test first in `graph-view.logic.test.ts`: of two overlapping candidates, only the higher-degree one draws; equal degree breaks by id; a forced candidate draws even when it overlaps a higher-degree one; overlapping forced candidates all draw; non-overlapping candidates all draw; empty input returns an empty set
  - [ ] Render test with a recording 2D context (sibling `GraphView.render.test.ts`, avoiding the `getContext` null stub at `GraphView.test.ts:18`): at the default zoom, 40 unlinked notes with long names draw fewer label `fillText` calls than nodes, and the center note's label is always drawn
  - [ ] Text widths are measured once per name and font size, not on every simulation tick
  - [ ] Orphans stay visible by default; existing GraphView tests stay green
- **Owner questions:** optional: also skip labels that cover another node's circle, as the prototype does? Default no.

### 12: Local graph depth stepper (1 to 3)

- **Slug:** `local-graph-depth-stepper`
- **IDs:** none counted here; part of P155 (counted in the 206 fold).
- **Size:** S. **Blocked by:** the 208 fold (same `GraphControls.svelte` and its new test file).
- **Suggested status:** ready-for-agent (session-only depth by default).
- **What to build:** `localDepth` (1-3, default 1) in `graph-view.store.svelte.ts`, with a clamping setter, reset to 1 in `reset()`. In `GraphView.svelte`, `getDisplayData` passes it to `getLocalGraph` (:65, which already takes a depth), and the rebuild effect (:386-396) tracks it. GraphControls shows a stepper in local mode only: group "Link depth" with "Decrease depth" and "Increase depth" buttons, disabled at the bounds, and the value visible (prototype `finders-search-tags-graph.html:961`). Update `help/documentation/14-graph-view.md:32` ("1 hop away"). Session state, not a persisted setting.
- **Acceptance:**
  - [ ] Failing test first in `graph-view.store.test.ts`: `localDepth` defaults to 1, the setter clamps to 1-3, `reset()` returns it to 1
  - [ ] Failing test first in `GraphView.test.ts` local mode: for chain A-B-C centered on A, depth 1 shows 2 notes and depth 2 shows 3 (footer count), with no extra invoke call
  - [ ] `GraphControls.test.ts`: the stepper shows only in local mode; Increase is disabled at 3 and Decrease at 1
  - [ ] Global mode ignores depth
- **Owner questions:** persist depth across sessions, or reset it with the graph like the filters? Default: reset.

## Cross-cluster notes

- **Shared dialog shell:** the palette (05) and the quick switcher (06, 07) share `CommandDialog` through 218, along with TemplatePicker, OneOnOnePicker and ModActionPicker. 218 lands first and exposes the caller-provided footer; 05, 06 and 07 only pass hints. 06 and 07 both edit `QuickSwitcher.svelte` and run in that order. The Search panel is not a command dialog and shares nothing with 218.
- **Shared empty/error primitives (204):** only the 206 fold uses them as a hard dependency. 02's "Search failed" alert, the 212 fold's empty state and 10's "No tags match" use plain markup unless 204 has landed; 205 migrates `TagsView` "No tags found" and `SearchPanel` "No results found", and its Notes already say whichever lands second reconciles. Do not run 205 in parallel with 02, 10 or the 212 fold.
- **087 stalls the 206 fold:** 206 is blocked by 087, and 087's notes say the owner deferred it on 2026-11-05/06 ("do not launch it"), while its `Status:` line reads ready-for-agent. Until the owner launches 087 or cuts the edge, P155's isolated, loading and error states wait. The isolated state needs 087's center-missing hint to tell "no links" from "center gone", so cutting the edge would mean 206 checks center presence itself. Owner decision.
- **Pre-filter graph data:** the 208 fold keeps a `$state.raw` copy of the pre-filter nodes; 087 makes `fullData` reactive. Whichever lands second reuses the other's state instead of adding a second copy.
- **Search chain:** 01, 02, 03 and 04 all edit `search.service.ts`, `SearchPanel.svelte` or their tests, so they run in order. External same-file Issues: 209 (`SearchResult.svelte`, vs 01), 057 and 220 (blockers of 02/03), 045 (blocker of 04), 160 (tag click forces Text mode; `SearchPanel` and `search.service.ts`, do not run in parallel with 02 or 03).
- **Tags chain:** 159 fold, then the 212 fold, then 10. 09 and 08 are independent (08 only touches `EditorTabs.svelte`). 10 waits for 09 because both edit `TagItem.svelte`.
- **Graph:** 11 edits `render()` in `GraphView.svelte`, while the 208 fold and 12 edit other regions of the same file (filter options, `getDisplayData`, the rebuild effect), so no blocking edge; 11 should not run in parallel with 165/166. 166 edits the Arrows toggle that the 208 fold turns into a Switch; do not run them in parallel.
- **Help docs:** `06-search-and-navigation.md` is edited by 01, 02, 04, 05, 06 and 07 in different sections; parallel runs across the search and palette chains may need a trivial rebase. `07-sidebar-panels.md` (212 fold, 10) and `14-graph-view.md` (208 fold, 12) are already serial.
- **Usage stats (146/147):** 05 keeps command ids stable; hiding idle Undo/Redo removes them from 147's never-used list while idle (owner question on 05).
- **Owner-decision tickets:** 02, 04, 05 and 10 carry owner questions; per the repo's relay practice they need the answers recorded in Notes before launch. 03, 06, 08, 09, 11 and 12 have defaults that need no answer.

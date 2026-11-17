# Verdict: Graph view cluster (P78, P154, P155, P156)

Adversarial check of `research/scout-graph.md` against main at `f2cd7f97b`. Every cited line was reopened; every overlapping Issue was read in full (Status, ACs, Comments) together with its `open-itens/ledger.md` row. No `open-itens/work/NN` folder exists for 087, 165, 166, 204, 206, 208 or 213, so none has started.

## Result

| Proposal | Real? | Ticket |
|---|---|---|
| P78 labels collide | yes | **T1 (new)**, M |
| P154 controls | yes | **fold into open-itens 208**, with four additions |
| P155 depth | yes | **T2 (new)**, S, blocked by 208 |
| P155 isolated / loading / error | yes | **fold into open-itens 206** (already blocked by 087, 204) |
| P156 Cmd-click | **no** | dropped |

## Where the scout was right, and what I checked

- **P78.** `GraphView.svelte:260-267` draws every label when `currentTransform.k > 0.8 || isConnected || isActive`, with no overlap test. `onMount` zooms to 1.3 (`:428`), so every label draws by default. `render()` runs on each tick (`:135`), on zoom (`:314`), on resize (`:285`) and on a hover change (`:368`). Confirmed.
- **P154.** The two fake switches are at `GraphControls.svelte:88-96` and `:131-139` (no `role="switch"`). The native selects are at `:100-109` and `:113-122`. The Close button is at `:67-73`. The icon buttons have only a `title` (`:29-63`). Confirmed. The tab bar shows a close X for the graph tab (`EditorTabs.svelte:71, 84-89`, unless the tab is pinned), and Cmd+G toggles the tab (`toggleGraphTab`, `graph-view.service.ts:60-70`). So removing Close leaves two ways to close the graph, even when it is pinned.
- **bits-ui `""` value.** The scout left this unverified; I checked it. bits-ui 2.20.4 treats `""` as "no value" (`dist/bits/select/select.svelte.js:151, 199, 233`). An "All" item with `value=""` would show as unselected, so a sentinel (for example `__all__`, mapped to `null`) is required. A jsdom recipe for opening a Select already exists in `src/tests/lib/core/settings/UpdateSection.channel.test.ts:33-100` (pointer-capture shims, `[data-slot="select-trigger"]`, `[role="option"]`).
- **P155.** Depth is fixed at `GraphView.svelte:65`, and `getLocalGraph` already takes a depth (`graph-view.logic.ts:103`). `loadAndRebuild` (`:81-91`) shows nothing while pending and only logs on failure. `fullData` (`:44`) is a plain `let`. The only overlay is the no-center hint (`:451-455`). The store has no depth field and `reset()` would need one. Confirmed.
- **P156.** `handleClick` (`:353-359`) calls `openFileInEditor(node.id)`. `openFileInEditor` (`editor.service.ts:143-195`) focuses the existing tab, or else calls `editorStore.addTab`, which pushes a new tab (`editor.store.svelte.ts:52-61`). No code path replaces the current tab, and grepping `src/lib` for newTab, replaceTab or previewTab finds no such model. `isOpenLinkModifier` is used only by the live-preview click handlers and the wikilink click gate (`click-handler.ts:18, 53`, `widgets.ts:285`, `wikilink-click-target.ts:70`). A plain graph click already opens a new tab. **Dropped.**

## Where the scout was wrong or incomplete

1. **Missed bug in the lines P154 rewrites: a folder or tag filter can trap itself.** `GraphView.svelte:457` passes `nodes={simNodes}`, which is the data after filtering, and `GraphControls.svelte:22-23` builds the options from it. Pick a folder that has no subfolders: `getUniqueFolders` then returns one folder, `folders.length > 1` (`:112`) is false, the select disappears, and nothing in the panel can clear the filter. A tag plus folder combination that leaves zero nodes hides the tag select the same way (`:99`). This was confirmed in `.scratch/archived/audit-2026-11-04/findings.md:65`, but no open or archived Issue tickets it. It is still present. Swapping in the shadcn Select while keeping this would ship a control that vanishes, so it goes into the 208 fold as a fix with a failing test first.
2. **166's test does not drive the Arrows control.** Its AC calls `graphViewStore.setDisplay({ showArrows: true })` directly. Switching Arrows to a Switch therefore does not break 166's test. The two touch different files (166 changes the `GraphView.svelte` effects, 208 changes `GraphControls.svelte`), so they are independent.
3. **The isolated note disappears entirely with Orphans off.** The center's `linkCount` is 0, so `filterGraphData` (`graph-view.logic.ts:79-87`) removes it: the result is 0 nodes, not "a lone dot". The isolated message must test "the center is in the full graph with zero links", not "the displayed graph has one node". Otherwise it vanishes when Orphans is off.
4. **The loading line must not flash on every save.** `loadAndRebuild` runs on every `vaultIndexVersion` bump (`:411-416`), which happens on each save. A loading line tied to "a fetch is pending" would blink while the user writes. It must show only until the first snapshot arrives.
5. **`highlightedNodeId` is dead.** Only `reset()` writes it, and grep finds no `setHighlightedNode` caller. P78's priority set is therefore the hovered node, its neighbours and the center. No external highlight needs handling. Do not remove it in this cluster (pre-existing dead code); I only mention it.
6. **The cross-cluster overlap was understated.** P94 (native selects to Select, kanban plus graph) has the same graph half as 208. P86 (SegmentedControl, citing `GraphControls.svelte:29-31`) would restyle the mode buttons. If the main run tickets P94 or P86, the graph half of P94 must point at 208, and P86 should land after 208 or keep 208's aria-labels.

## Ticket breakdown

### T1 (new): Graph labels are drawn by priority and skip overlaps (P78). Size M

**What to build.** Add a pure label-selection function to `graph-view.logic.ts`. Input: candidate labels `{ id, x, y, width, height, degree, forced }` in one coordinate space (screen or world, but consistent). Output: the set of ids to draw. Forced labels (the hovered node, its neighbours, and the center note `graphViewStore.centerPath`) always draw. The rest go in descending `degree` with a stable tiebreak (id), and any rectangle that overlaps an already placed one is skipped. Use a grid or "test only against placed labels", not all pairs. In `render()` (`GraphView.svelte:240-268`), keep the current gate (`k > 0.8` or connected or active) for which nodes are candidates, measure text widths through a cache keyed by name and font size (`ctx.measureText` per node per tick is the cost to avoid), call the function, and draw only the selected labels. Dimmed or normal colour stays as today. The orphan default stays (validation line). Font size is out of scope (213 Notes).

**Acceptance.**
- [ ] Failing test first, in `src/tests/lib/plugins/graph-view/graph-view.logic.test.ts`: two overlapping candidates draw only the higher-degree one; equal degrees break by id; a forced candidate draws even when it overlaps a higher-degree one; overlapping forced candidates all draw; non-overlapping candidates all draw; empty input returns an empty set.
- [ ] A render test with a recording 2D context (reuse the harness 165/166 put in `src/tests/fixtures/` if it has landed, otherwise add `src/tests/fixtures/canvas-context.fixture.ts` there; a sibling `GraphView.render.test.ts` avoids the module-level `getContext` null stub at `GraphView.test.ts:18`): at the default zoom, a vault of 40 unlinked notes with long names draws fewer label `fillText` calls than nodes, and the center note's label is drawn in local and global mode.
- [ ] Text widths are measured once per name and font size, not once per tick (cache in the component).
- [ ] Orphans stay visible by default; existing GraphView tests stay green.

**Blocked by:** none. Sequencing: `GraphView.svelte` is a hot spot (087, 165, 166, 206, 213, T2). T1 edits only the label block of `render()`, so it does not conflict with them, but run it after 166 if the harness should be reused.

**Owner questions:** none blocking. Optional: also skip a label that covers another node's circle (the prototype does this, the review does not ask for it). Default: no.

### Fold into `.scratch/open-itens/issues/208-graph-controls-event-dialog-use-shadcn-select.md` (P154)

208 (ready-for-agent, ledger todo, Blocked by none) already covers Select and Switch in GraphControls. Add these to its graph half (EventDialog is untouched):

- Remove the Close button (`GraphControls.svelte:67-73`), its separator `:65` and the `X`/`closeGraphTab` imports (`:2, :8`; `closeGraphTab` stays in the service for `resetGraphView`). Edit `help/documentation/14-graph-view.md:55`.
- The "All tags" and "All folders" items use a sentinel value (bits-ui 2.20.4 treats `""` as no value), mapped back to `null` in `setFilters`.
- `aria-label` on the mode and zoom icon buttons (they have only `title` today). The Switches get an accessible name from their visible label ("Orphans", "Arrows").
- **Fix:** the filter options come from the graph before filters are applied (the global graph, or the local graph in local mode), not from `simNodes`. Picking a folder or a tag then never hides its own control. This adds a small prop change in `GraphView.svelte` (`:457`); `fullData` is not reactive, so keep a `$state.raw` copy of the pre-filter nodes, or pass them where `initSimulation` runs.
- Search stays a filter (validation line). The "Filters (n)" popover is skipped.

**Added ACs.**
- [ ] Failing test first, in a new `src/tests/lib/plugins/graph-view/GraphControls.test.ts` (real `graphViewStore`, no store mock; Select recipe from `UpdateSection.channel.test.ts`): with notes in folders `a/` and `b/`, pick folder `a`, and the folder control is still shown and offers "All folders" and `b`. Choosing "All folders" sets `filters.folder` to `null`. It fails today (the select disappears).
- [ ] Orphans and Arrows are `role="switch"` with `aria-checked`, and toggling them sets `filters.showOrphans` / `display.showArrows`.
- [ ] Picking a tag sets `filters.tag` to that tag, and "All tags" sets `null`.
- [ ] There is no Close button in the controls; the graph tab still closes from the tab bar and with Cmd+G (existing service tests).
- [ ] The mode and zoom buttons have accessible names.

**Size:** S becomes M. **Blocked by:** none (the `GraphView.svelte:457` prop edit is a small rebase against 087 at most).

**Owner questions:** accept removing Close because the tab has an X and Cmd+G toggles it? (Recommended yes; the review says so.) Accept the trapped-filter fix inside 208 rather than a separate fix Issue? (Recommended: same lines, same test file.)

### T2 (new): Local graph depth stepper, 1 to 3 (P155 depth). Size S

**What to build.** Add `localDepth` (1-3, default 1) to `graph-view.store.svelte.ts`, with a setter that clamps and a `reset()` back to 1 (session state, like `mode` and `filters`). In `GraphView.svelte`, `getDisplayData` passes it to `getLocalGraph` (`:65`), and the rebuild effect (`:386-396`) tracks it. GraphControls shows a stepper in local mode only: group label "Link depth", "Decrease depth" and "Increase depth" buttons disabled at the bounds, value visible (prototype `finders-search-tags-graph.html:961`). Build it with the shadcn `Button` already used in the controls after 208. Update `help/documentation/14-graph-view.md:32` ("1 hop away").

**Acceptance.**
- [ ] Failing test first, in `graph-view.store.test.ts`: `localDepth` defaults to 1, the setter clamps to 1-3, and `reset()` returns it to 1.
- [ ] Failing test first, in `GraphView.test.ts` local mode: for a chain A-B-C centered on A, depth 1 shows 2 notes and depth 2 shows 3 (footer count), without a refetch (`invoke` call count unchanged).
- [ ] In `GraphControls.test.ts`: the stepper shows only in local mode, and Increase is disabled at 3 and Decrease at 1.
- [ ] Global mode ignores the depth.

**Blocked by:** `.scratch/open-itens/issues/208-graph-controls-event-dialog-use-shadcn-select.md` (same `GraphControls.svelte`, and 208 creates `GraphControls.test.ts`). The rebuild effect is also edited by 166 (`display` redraw) and `getDisplayData` by 087; run T2 after them in one worktree at a time, or rebase.

**Owner questions:** should depth persist across sessions (a setting) or reset with the graph? Default: reset, like the filters.

### Fold into `.scratch/open-itens/issues/206-graph-collection-kanban-views-show-real-empty.md` (P155 states)

206 (ready-for-agent, Blocked by 087 and 204) already plans the graph error with Retry and the empty-vault state, uses the 204 primitives, and runs after 087, which touches the same `{#if}` block and `fullData`. Add to its graph half:

- **Isolated note:** in local mode, when the center is in the full graph with zero links, show an `EmptyState` with "This note has no links yet" (review wording). It shows also when Orphans is off, where the center is filtered out and 0 nodes draw. It does not show when the center is missing from the graph; that is 087's hint.
- **Loading:** a "Building graph..." line until the first snapshot resolves. Later rebuilds on `vaultIndexVersion` bumps keep the current graph without the line.
- **Error:** already in 206. Retry calls `loadAndRebuild()` again, and a successful retry removes the alert.

**Added ACs.**
- [ ] Failing test first, in `GraphView.test.ts`: a local graph centered on a note with no links shows "This note has no links yet", with Orphans on and with Orphans off.
- [ ] While `invoke('get_all_vault_entries_v2')` is pending on mount, the loading line shows; after it resolves the line is gone; a second `vaultIndexVersion` bump with a pending fetch does not show it again.
- [ ] A rejected load shows the InlineAlert with Retry (already 206's AC); clicking Retry with a resolving `invoke` shows the graph.

**Size:** stays M. **Blocked by:** 087, 204 (unchanged).

**Owner question:** wording of the isolated message (default: review text).

## Dropped

- **P156.** The premise is false. A plain click on a graph node already opens a new tab, or focuses the note's existing tab (`openFileInEditor`, `editor.service.ts:164-195`). The app has no replace-current-tab model, so a Cmd-click branch would behave exactly like a plain click. The prototype's "before" column models a behaviour the app does not have. A preview or replace tab model, or "Cmd-click opens a split", would be a tab-model product decision, not an S ticket. Ask the owner only if one of those is wanted.

## Not a ticket

- **Recording 2D-context harness.** 165 and 166 each plan one. Whichever lands first should put it in `src/tests/fixtures/` so T1 reuses it. It is not a separate ticket: that would duplicate their scope.
- **Other confirmed graph findings in `archived/audit-2026-11-04/findings.md`** (folder filter uses a bare `startsWith`, `:250/:468`; a duplicate `[[B]]` marks an edge bidirectional, `:247`; out-of-order `buildGraph` results, `:249`; hover not cleared on mouseleave, `:575`; radial force keeps its old centre after a resize, `:576`; the folder option shows only the last path segment, `:577`). They are outside these four proposals and none is ticketed in open-itens as far as grep shows. I list them for the owner; they are not added here.

## Suggested order (`GraphView.svelte` serial)

166 -> 165 -> 087 -> T1 -> 208 (+P154) -> T2 -> 204 -> 206 (+P155 states) -> 213.

## Not verified

I did not run any test or the app. The 40-long-name collision in T1's render AC is an estimate from the default 800x600 jsdom size and zoom 1.3, not a measurement.

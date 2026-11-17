# Scout: Graph view (P78, P154, P155, P156)

Checked against main at `f2cd7f97b` (working tree clean apart from `.scratch/design-review/`). Last commit touching `src/lib/plugins/graph-view` is `2526c56d4` (theme palette, Issue 88); nothing since the review changed it. All line numbers below are from the current files.

Files in the cluster (all under `src/lib/plugins/graph-view/`): `GraphView.svelte` (464 lines, canvas + d3 sim + render), `GraphControls.svelte` (142), `graph-view.logic.ts` (226, pure), `graph-view.store.svelte.ts` (37), `graph-view.service.ts` (76), `graph-view.types.ts`.

Tests that cover the cluster:
- `src/tests/lib/plugins/graph-view/GraphView.test.ts` (139 lines, jsdom): local mode shows center + neighbours, hint when no center, global shows whole vault, theme background. `getContext` is stubbed to return `null` (line 18), so `render()` returns early: **nothing in the suite can observe canvas drawing today**.
- `graph-view.logic.test.ts` (478): getFolderFromPath, buildGraphData, filterGraphData, getLocalGraph (incl. depth), getNodeRadius, getUniqueFolders/Tags, graphPalette.
- `graph-view.store.test.ts` (69), `graph-view.service.test.ts` (305).
- No `GraphControls.test.ts` exists.
- E2E: only `e2e/specs/theme-mode.spec.ts:19-23, 54` (graph tab background). No graph interaction e2e.
- `src/tests/lib/utils/platform.test.ts` covers `isOpenLinkModifier`.

ADRs: none about the graph view (grep of `docs/adr/` finds only incidental mentions). Help doc `help/documentation/14-graph-view.md` documents: click opens note (l.10), drag repositions (l.11), Local mode = 1 hop (l.32), filters table, Display/Arrows, "Zoom In / Zoom Out buttons and a **Close** button" (l.55), stats "N notes · M links" (l.67). No deliberate decision against any proposal; the doc needs edits if Close is removed or depth becomes adjustable.

---

## P78. Graph labels collide

**Still real: yes.**

**Current state.** `GraphView.svelte:260-267`: inside the per-node loop of `render()`, a label is drawn when `currentTransform.k > 0.8 || isConnected || isActive`, with `fillText(node.name, x, y + r + 3)` and font `Math.max(10, 11 / k)px` (world units, so about 11 screen px). There is no overlap test, no priority, no truncation. `onMount` zooms to 1.3 (`:428`), so every label draws by default, which is the collision seen in `screens/graph-view-light.png`. `render()` runs on every sim tick (`:135`), on zoom (`:314`), on resize (`:285`) and on each hovered-node change (`:368`). Node order is `simNodes` order, so the first node in the array wins an overprint, not the most important.

Facts a ticket must respect:
- Nodes have `linkCount` (degree) already (`graph-view.types.ts:6`); `getNodeRadius` is in logic.
- Hover/highlight state: `highlightedId = hoveredNode?.id ?? graphViewStore.highlightedNodeId`, `connectedIds` built at `:154-162`. Hovered node and neighbours must always get a label (the review says so); active note (`centerPath`) too.
- Collision needs text widths: `ctx.measureText` (canvas) is only available with a real 2D context, which jsdom tests stub as `null`. A pure function in logic should take measured widths as input (`{id, x, y, w, h, priority}[]` in screen or world space) and return the set of ids to draw, so it is unit-testable without a canvas.
- Cost: `render()` runs per tick; an O(n^2) overlap test on 200+ nodes per tick is the thing to watch. A rect grid or "only test against already-placed labels, sorted by priority" is enough. The existing sim already shrinks forces above 200 nodes (`:112-113`), so 200+ is a supported size.
- The review's "Keep the orphan default" (validation line): do not hide orphans to fix labels.
- Dropped elsewhere: `.scratch/open-itens/issues/213` says "graph label font size (dropped in this cluster)", so font size is not part of this.

**Overlapping Issues (all in `.scratch/open-itens/issues/`):** none covers label collision. Same file/function edited by: 165 (`setupInteractions`), 166 (render effect), 213 (footer), 087/206 (template). Status of each below. No Issue is a duplicate.

**Tests:** `graph-view.logic.test.ts` (new pure function belongs here); `GraphView.test.ts` cannot assert drawing (null context). Needs a recording-context stub, which 165 and 166 already ask for ("recording 2D context stub, or a sibling GraphView.render.test.ts if the module-level getContext stub at :18 gets in the way").

**Owner-only questions:** none blocking. Optional: should labels below a tiny priority be hidden entirely at low zoom, or only deduplicated by overlap (review text says only overlap)?

---

## P154. Graph controls: fake switches, native selects and a duplicate Close

**Still real: yes.**

**Current state** (`GraphControls.svelte`):
- Two hand-built toggle buttons with no `role="switch"`/`aria-checked`: Orphans (`:88-96`) and Arrows (`:131-139`), each wrapped in a `<label>` whose button is the only focusable thing.
- Two native `<select>`s: tags (`:100-109`, shown only when `tags.length > 0`) and folders (`:113-122`, shown only when `folders.length > 1`). Both use `""` as the "All" value and write `tag: value || null` / `folder: value || null`.
- A Close button (`:67-73`) calling `closeGraphTab()` imported from the service (`:8`). `closeGraphTab` is still needed by `toggleGraphTab`/`resetGraphView` in the service, so only the button and the import go.
- Mode/zoom icon buttons use `title` only, no `aria-label`; no toolbar semantics (the P86 segmented-control proposal in the same review, and P94, P23 touch the same markup).
- shadcn primitives already exist: `src/lib/components/ui/switch/` (used in `PeriodicNotesSection.svelte`, `SentrySection.svelte`, `FilesSection.svelte`) and `src/lib/components/ui/select/` (used in `UpdateSection.svelte:305-318` etc. with `Select.Root/Trigger/Content/Item`).
- Search filter stays (review: "Search keeps filtering, as in Obsidian").
- Optional "Filters (n)" popover is a separate nice-to-have; `ui/popover` exists.

Unverified implementation detail to check when building: the existing Select call sites use `Select.Item value=... label=...`; an empty-string "All" item value may not be accepted by bits-ui, so the ticket should pick a sentinel (for example `__all__`) mapped back to `null`. I did not read bits-ui to confirm either way.

**Overlapping Issues:**
- `open-itens/issues/208-graph-controls-event-dialog-use-shadcn-select.md`, **Status: ready-for-agent** (ledger: todo, blocked by none). Same change for GraphControls (AC "No native `<select>` left in GraphControls") plus an EventDialog checkbox. It does not cover removing Close, and its Switch coverage includes the Arrows toggle. Its own triage note says "drafted without deep dive; check cited lines". Line numbers cited there are stale (`:100`, `:113` are right for the selects).
- `166-switching-graph-arrows-toggle-redraws-graph-once.md`, **ready-for-agent**: the Arrows toggle does not redraw after the sim cools. Bug is in `GraphView.svelte` (effect must read `graphViewStore.display`), not in the control markup, but its test drives the Arrows toggle, so it interacts with P154 (a Switch changes how the test clicks).
- `open-itens` ledger: 208 `todo`, 166 `todo`.
- Review items touching the same markup: P94 (native selects to Select; kanban + graph), P86 (segmented controls), P23 (focus ring), P24-ish "controls band" at `review.md:316`. If the P94 or P86 tickets from the main run land first they will already have converted these controls.

**Tests:** none for `GraphControls` today. `graph-view.store.test.ts` covers setFilters/setDisplay. A new `src/tests/lib/plugins/graph-view/GraphControls.test.ts` should mount the real component against the real store (project rule: no store mocks).

**Owner-only questions:**
1. 208 mixes Graph and EventDialog. Should the new ticket supersede only 208's graph half (leave 208 for the EventDialog checkbox), or should we leave 208 alone and make P154 depend on it? Duplicating them would give two agents the same file.
2. Removing the Close button: is "the tab already has an X" an accepted reason? (Review says yes. `help/documentation/14-graph-view.md:55` must change.)
3. Include the optional "Filters (n)" popover, or skip? Default recommendation: skip.

---

## P155. The local graph has a fixed depth and no isolated, loading or error state

**Still real: yes** (all four sub-points).

**Current state:**
- Depth fixed at 1: `GraphView.svelte:65` calls `getLocalGraph(fullData, graphViewStore.centerPath, 1)`. `getLocalGraph(data, centerPath, depth = 1)` in `graph-view.logic.ts:103` already supports any depth and is tested for depth (`graph-view.logic.test.ts`, describe `getLocalGraph`, `:323-385`). There is no `depth` in `GraphDisplay`/`GraphFilters` or in the store (`graph-view.store.svelte.ts:3-6`, `types.ts:28-37`), and `reset()` would need it.
- Isolated note: in local mode a note with no links yields 1 node + 0 links, drawn as a lone dot with the footer "1 notes · 0 links". No message. The only overlay is the "Open a note to see its local graph" hint, shown only when `mode === 'local' && !centerPath` (`GraphView.svelte:451-455`).
- Loading: `loadAndRebuild` (`:81-91`) awaits `buildGraph()`; until it resolves the canvas is blank, no indicator.
- Error: `catch` at `:84-87` only calls `error('GRAPH_VIEW', ...)` (Sentry + log) and returns; the canvas stays blank, footer says "0 notes · 0 links". No retry.
- `fullData` is a plain `let` (`:44`), not reactive, so a template cannot derive "center missing" or "loading" from it today. Issue 087 calls this out explicitly ("needs `fullData` reactive").
- Also the local center can be a note that is not in the graph at all (renamed/deleted): `getLocalGraph` then returns empty nodes; the "no links" message must not claim "This note has no links yet" for that case (it is Issue 087's separate hint).

**Overlapping Issues:**
- `087-local-graph-center-follows-every-way-graph.md`, **ready-for-agent** (first wave, owner picked 2026-11-06): center tracking plus "hint when the center note is gone"; makes `fullData` reactive or rekeys center via `registerPathChangeConsumer`. Edits the same template block (`:451-455`) and `getDisplayData`. Strong overlap with the isolated state and with any "center missing" message.
- `206-graph-collection-kanban-views-show-real-empty.md`, **ready-for-agent**, **Blocked by 087, 204**: graph part is exactly the error + Retry + empty state ("a graph test with a rejected load shows the error with Retry, and an empty vault shows the empty state"), also canvas/collection/kanban. Overlaps P155's error and arguably loading. Its Audit check line numbers (`:72-76`, `:441`) are stale (now `:81-91`, `:461-463`).
- `204-empty-error-badge-primitives.md`, **ready-for-agent**: adds `EmptyState` and `InlineAlert` to `src/lib/components/ui/` (not present today: `ls ui/` shows no empty/alert dirs). 206 and any P155 error UI should use those; P155 should not invent its own.
- `213-word-count-graph-stats-read-correctly-zero.md`, **ready-for-agent**: `formatGraphStats` in logic for the footer string (the footer is adjacent to the isolated-state copy).
- `208`/`166`: indirect (same files).

**Tests:** `GraphView.test.ts` has the local-mode and hint cases to extend (isolated note, loading, error with a rejected `invoke`); `graph-view.logic.test.ts` for any new pure helper (depth clamp 1-3); `graph-view.store.test.ts` for a depth field + reset; no GraphControls test for the stepper.

**Owner-only questions:**
1. How to split against 206: should loading and error/Retry be left to 206 (blocked by 204 and 087) and P155 reduced to depth stepper plus the isolated message? Recommended, because otherwise two tickets build the same error UI. If the owner wants P155 whole, 206's graph half should be removed from 206.
2. Depth range and persistence: 1-3 per the review. Is depth per-session store state (reset with the graph) or a persisted setting? Default recommendation: store state, reset to 1, like filters.
3. Isolated copy: review text is "This note has no links yet"; wording is the owner's call.

---

## P156. The graph canvas ignores the open-in-new-tab modifier

**Still real: no, as described. Premise is wrong against current code. Recommend not ticketing it as written; ask the owner.**

**Current state:** `GraphView.svelte:353-359` `handleClick` calls `openFileInEditor(node.id)` and ignores modifiers. But `openFileInEditor` (`src/lib/core/editor/editor.service.ts:148-195`) has no "replace the current tab" path: it focuses the existing tab for that path, otherwise `editorStore.addTab(...)` pushes a new tab (`editor.store.svelte.ts:52-61`). So a plain click on a graph node already opens a new tab (or switches to one). Cmd-click would do exactly the same.

The review's claim "unlike every other link" does not hold: all 41 callers of `openFileInEditor` (checked with `node scripts/codemap.mjs q callers openFileInEditor`; they include `appEditorHost.openLink` at `src/lib/app/editor-host.ts:143-145`, backlinks, outgoing links, note list, quick switcher, collection rows, canvas file node) use the same function with no modifier branch. Editor wikilink follow (`MarkdownEditor.svelte:273-289`, `resolveWikilinkClickPosition(e, view, IS_MAC)`) uses the platform modifier to decide whether a click follows the link while editing, not to choose current vs new tab. `isOpenLinkModifier` (`utils/platform.ts:30`) is used only in `live-preview/click-handler.ts:18, 53` (open external URL, open tag search) and the wikilink click gate. The prototype (`finders-search-tags-graph.html:980-996`) models a replace-in-current-tab behaviour that does not exist in the app: the "before" column there is a fiction.

What could still be a real, different ask:
- Cmd-click on a graph node should be a deliberate "follow link" gesture like the editor (not needed: plain click already opens).
- A new "preview/replace tab" model for graph clicks is a product decision with tab-model impact, not an S ticket.

**Overlapping Issues:** none. No ADR on tab replacement was found (grep of `docs/adr` and open-itens for "replace tab" / "preview tab" had no relevant hit).

**Tests:** `GraphView.test.ts` has no click test. If this is kept: a mousedown/click dispatched on the canvas needs a node placed under the pointer (the 165 recipe: use `canvas.__zoom` to compute the screen point).

**Owner-only question:** Drop P156, or is there a specific desired behaviour (for example "Cmd-click opens in a split pane", or "plain click reuses the graph tab's neighbour")?

---

## Existing Issues that edit the same files (ledger status)

All in `.scratch/open-itens/`, all `ready-for-agent`, ledger `todo`, none started:

| Issue | Subject | Files |
|---|---|---|
| 087 | Center follows every focus; hint when center is gone; makes `fullData` reactive | GraphView.svelte (template, getDisplayData), graph-view.service.ts, new app-layer tracker |
| 165 | Drag pans instead of moving the node (zoom registered before drag; also screen vs sim coords bug per its second opinion) | GraphView.svelte `setupInteractions` (`:304-351`) |
| 166 | Arrows toggle does not redraw after sim cools | GraphView.svelte (effect on `display`), GraphControls Arrows toggle |
| 206 | Graph load error + Retry, empty state (blocked by 087, 204) | GraphView.svelte, other views |
| 204 | EmptyState / InlineAlert primitives | `components/ui/` |
| 208 | shadcn Select/Switch in GraphControls + EventDialog checkbox | GraphControls.svelte, EventDialog.svelte |
| 213 | `formatGraphStats` footer + WordCount copy | graph-view.logic.ts, GraphView.svelte footer |

Incidental (not relevant): 055, 132, 152, 171, 201, 202, 214, 217, 233, `tasks-view-ux/108`, `preview-channel/02`, `.scratch/archived/*`.

Conflict hot spot: `GraphView.svelte` is touched by 087, 165, 166, 206, 213, P78 and P155. They must be sequenced, not parallel, in one worktree at a time; line numbers will shift.

---

## Suggested ticket grouping

Principle: same component + same test file together; each ticket fits one agent context; no duplicate of an existing Issue.

### Prefactor (recommended, but it is already scheduled work in existing Issues)
A shared canvas test harness: a recording 2D context stub for jsdom (`getContext` currently returns `null`, `GraphView.test.ts:18`) plus a helper that mounts the graph with N notes and returns node screen positions from `canvas.__zoom`. Issues 165 and 166 each plan their own. Whoever lands first should put it in `src/tests/fixtures/` (for example `canvas-context.fixture.ts`) so P78 and later graph tickets reuse it. Without it P78 can only be unit-tested at the pure-function level.

### Ticket G1: Graph labels without collisions (P78)
Scope: new pure function in `graph-view.logic.ts` (input: candidate labels with screen rect and priority; output: ids to draw; priority = hovered/highlighted + neighbours, active note, then degree), `render()` in `GraphView.svelte` measures text and calls it; keep the `k > 0.8` gate semantics only as a fast path. Tests: logic unit tests (overlap, priority, hovered neighbour always wins, empty input), plus a render test with the recording context if the prefactor exists.
Size M. Touches `graph-view.logic.ts`, `GraphView.svelte` render block only. Independent of the others; do it after 166 so the harness exists.

### Ticket G2: Graph controls on shadcn Switch/Select, no Close, local depth stepper (P154 + the depth part of P155)
Why together: both edit `GraphControls.svelte`, the store (`depth` plus `reset()`), and a new `GraphControls.test.ts`; the stepper is a new control that should be built with the new primitives and only appears in local mode. `GraphView.svelte` change is one line (`getLocalGraph(..., graphViewStore.localDepth)` and effect dependency).
Includes: Switch for Orphans/Arrows, Select for tag/folder with a sentinel "All", remove Close + `closeGraphTab` import, `aria-label`s on icon buttons (cheap, same lines), stepper 1-3 in local mode, help doc `14-graph-view.md` edits (Close sentence, Local Mode depth).
Size M. Decision needed on 208 (see P154 question 1): this ticket either supersedes 208's graph half or is blocked by 208.

### Ticket G3: Local graph states (P155 isolated + loading + error)
Recommendation: do not create a new ticket for loading/error. Fold them into 206 (already scoped: error + Retry, empty state), and add one new acceptance criterion there: the isolated-note message and a loading line. The isolated message belongs with 087's "center is gone" hint (both live in the same template `{#if}` block, both need reactive `fullData`), so the order should be 087, 204, then 206 with the P155 additions. If the owner prefers a standalone ticket, make it "Blocked by 087, 204" with exactly these ACs: isolated (center in graph, zero links) message, loading line while `buildGraph` is pending, error + Retry via `InlineAlert`.

### P156
No ticket until the owner answers; the premise does not match the app.

### Suggested order
166 and 165 (small bug fixes, create the harness) -> 087 -> G1 (P78) -> G2 (P154 + depth) -> 204 -> 206 (+P155 states) -> 213. G1 and G2 touch different regions and could be parallel if run in separate worktrees, but both rebase against the 165/166/087 edits to `GraphView.svelte`.

## Owner questions (summary)
1. P156: drop, or what behaviour is wanted? (Plain click already opens/focuses a tab; there is no replace-current-tab model.)
2. 208: split off its graph half into G2, or make G2 depend on 208?
3. P155: leave loading/error to 206 (recommended) or deliver all of P155 as one ticket and edit 206?
4. Depth: store-only (resets to 1) or persisted setting? Isolated message wording.
5. Optional "Filters (n)" popover in P154: skip (recommended)?

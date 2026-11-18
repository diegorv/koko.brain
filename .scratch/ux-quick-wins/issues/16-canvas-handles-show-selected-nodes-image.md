# 16: Canvas handles show on selected nodes; image cards get 8 handles and real loading and error states

**Origin:** design review 2026-11-17, proposals P136, P137 (ImageNode part), prototype `.scratch/design-review/prototypes/canvas.html`, research `.scratch/ux-quick-wins/research/verdict-canvas.md` (ticket Q3) and `breakdown.md` (old ticket 18).

**What to build:** component markup and CSS only. No `.canvas` serialization function changes (`flowToCanvas`, `flowNodeToCanvasNode`, `flowEdgeToCanvasEdge`, `serializeCanvas`, `parseCanvas`) and no new write; adding handles writes nothing and changes no id.

1. **Eight handles on image cards.** `src/lib/features/canvas/ImageNode.svelte:63-66` has four handles (`top-target`, `bottom-source`, `left-target`, `right-source`); `canvasEdgeToFlowEdge` maps `fromSide: top` to `top-source` (`canvas.logic.ts:163`), which an image node lacks. Give it the same eight handles with the same ids as `TextNode.svelte:81-88` (a target and a source on each side). The paired handles stay: the JSON Canvas side mapping depends on them.
2. **Handles on selected nodes.** `CanvasInner.svelte:807-816` shows handles only on `.svelte-flow__node:hover`. Add `.svelte-flow__node.selected` to the visible rule. A 16 px `::after` hit area applies only on hovered or selected nodes (an opacity-0 handle still takes pointer hits, so an always-on hit area would steal node drags near the side midpoints). The visible handle stays 8 px.
3. **Image states.** `ImageNode.svelte:54-58` uses one placeholder for loading and error. Loading shows a skeleton (static under `prefers-reduced-motion`); a rejected `resolveImageSrc` shows a separate "Image not found" state with the path; a remote `https` image that fails to load (it goes through `<img>`, not `resolveImageSrc`, `canvas-image.service.ts:31`) reaches the same state through `onerror` on the `<img>`. `alt` is the basename, not the full path (`:60`); `.canvas-image` uses `object-fit: contain` (`:100`, `cover` today).
4. **Radii.** The radius ratchet is exact (`src/tests/lib/radius-scale.test.ts:164-205` pins the count of px `border-radius` per canvas file). New rules use `var(--radius-*)` only; the existing 8 px in `ImageNode.svelte` stays as it is (ticket 06 owns the colour and token cleanup there).

Not in this ticket: FileNode reload when the index changes (watcher or index territory, indexing-watcher rules), node-tint hex suffixes, any `.canvas` write guard (open-itens 026, 027).

**Size:** S

**Blocked by:** 06

**Status:** ready-for-agent

**Gate:** pnpm check + pnpm vitest run (no selector or E2E surface changes).

- [ ] Failing test first (new `src/tests/lib/features/canvas/canvas-image-node.test.ts`, mounted the way the other canvas tests mount nodes): an image node renders 8 `.svelte-flow__handle` elements whose `data-handleid` set equals a text node's. It fails today (4). Do not rely on an edge round trip: an edge to a missing handle stays in `edges` and is serialized anyway, and jsdom never measures nodes.
- [ ] With `@tauri-apps/plugin-fs` `readFile` mocked to reject (the real `resolveImageSrc` runs, `URL.createObjectURL` stubbed), the node shows "Image not found" and the path; while the read is pending a loading element shows and "Image not found" does not; resolved, the `img` `alt` is the basename. A failing remote `https` image (an `error` event on the `<img>`) shows the same not-found state.
- [ ] Source assertions: a rule shows handles under `.svelte-flow__node.selected`; the `::after` hit-area rule is scoped to hover or selected; `.canvas-image` uses `object-fit: contain`; the skeleton animation is off under `prefers-reduced-motion`.
- [ ] `radius-scale.test.ts` passes with the `ImageNode.svelte` baseline unchanged.
- [ ] By-eye check recorded in the commit body: a selected node still resizes from a side midpoint (the NodeResizer lines run along the same edges), and an edge drawn from the top handle of an image card connects.
- [ ] Frontend gate: `pnpm check` and `pnpm vitest run` pass.

## Original proposal

- **P136.** "Show handles on selected nodes too, give them a 16 px invisible hit area, and give ImageNode the same 8 handles as the other nodes." Validation: revise, keep the paired handles.
- **P137 (ImageNode part).** "ImageNode gets a loading skeleton and a separate 'Image not found' state with the path, alt text from the basename, and `object-fit: contain`." The FileNode reload on index change is not taken.

## Problem

Connection handles are 8 px and invisible until the pointer is over the node, so a selected node shows no way to connect. An image card has half the handles of the other nodes, so an edge saved from a top-side handle cannot attach. Loading and failure look the same, the alt text is the full path, and images are cropped.

## Evidence

Checked at 085b23c5d.

- `ImageNode.svelte:54-58` single placeholder, `:60` `alt={data.file ?? ''}`, `:63-66` four handles, `:100` `object-fit: cover`.
- `CanvasInner.svelte:807-816` handle CSS (`opacity: 0`, hover only), `:795` the existing `.svelte-flow__node.selected > .canvas-node` rule.
- `TextNode.svelte:81-88` the eight handles; `canvas.logic.ts:163` the side mapping.
- xyflow 1.7.1 sources were read in the verdict; behaviour in WKWebView is not run.

## Why blocked

- 06: it moves the colours of `ImageNode.svelte` (the `rgba(255, 255, 255, 0.15)` border) and of the `<style>` block of `CanvasInner.svelte` to theme tokens; both files are edited here, and the radius baseline must stay one number.

## Sequence with

- 04 (file and link cards: plain click selects) edits `FileNode.svelte` and `LinkNode.svelte` and passes `onopenfile` and `onopenurl` in `CanvasInner.svelte`; 06 follows it, so by the time this ticket runs both are done.
- 43 (new text cards open ready to type) is blocked by this ticket and edits the add paths in `CanvasInner.svelte`; 17 (context menu) is blocked by 06 and does not touch these files.
- shell-sidebars-ux 25 (view title row) replaces `CanvasToolbar` in `CanvasInner.svelte`; never in parallel with it.
- open-itens 026, 027, 039, 051 (canvas data paths): not touched.

## Comments

- 2026-11-18, triage: ready-for-agent. Decided by the owner: the order and grouping. No owner questions on this ticket.

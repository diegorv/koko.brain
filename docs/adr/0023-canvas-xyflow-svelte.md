---
type: ADR
id: "0023"
title: "Canvas as a feature backed by @xyflow/svelte"
status: active
date: 2026-04-22
---

## Context

The vault is not purely linear prose. Users think in maps: project overviews, mind maps, research graphs, workflow diagrams. Obsidian popularized the "canvas" format — a JSON file describing nodes (files, text blocks, images, groups) and edges between them — and it has become a de facto standard that users expect.

Rendering a canvas is non-trivial:

- Pan + zoom with smooth 60 fps on thousands of nodes.
- Node-specific rendering: embedded markdown note (with live preview), image, text block, link, group container.
- Connection drawing with multiple marker styles, routing, bidirectional support.
- Selection, resize, drag, context menus, undo/redo.
- Persistent on disk as a single JSON file (the `.canvas` format).

Implementing this from scratch with raw DOM + SVG + pan/zoom state machines would be months of work. The space is already well-served by visualization libraries.

## Decision

**Render the canvas using `@xyflow/svelte` (the Svelte port of React Flow / xyflow) inside a feature at `src/lib/features/canvas/`, persisted as JSON on disk using an Obsidian-compatible schema, with custom node types for file embeds, text, images, links, and groups.**

### Feature location

`src/lib/features/canvas/` — deliberately placed in `features/`, not `plugins/`, because the canvas file extension (`.canvas`) is a first-class vault artifact the app is expected to open. The code is modest enough that always-loading it is not a bundle concern, and the UX promise ("open any file in your vault") requires it be always available.

### Dependencies

- `@xyflow/svelte ^1.5.2` (`package.json:66`) — node/edge rendering, pan/zoom, selection, handles, resizing.
- `d3-drag`, `d3-force`, `d3-selection`, `d3-zoom` (`package.json:70-73`) — underpinnings used by xyflow; pinned explicitly because different d3 majors break xyflow in subtle ways.

### Module layout (`src/lib/features/canvas/`)

- **`CanvasView.svelte`**, **`CanvasInner.svelte`** — top-level pane and the xyflow mount. `SvelteFlowProvider` (`CanvasView.svelte:2`) wraps the inner flow.
- **Custom node components**: `FileNode.svelte` (embedded note with live preview), `TextNode.svelte`, `ImageNode.svelte`, `LinkNode.svelte`, `GroupNode.svelte`. All use `Handle`, `Position`, `NodeResizer` from `@xyflow/svelte`.
- **`CanvasEdge.svelte`** — custom edge rendering with arrow markers (`MarkerType`).
- **Supporting UI**: `CanvasToolbar.svelte`, `CanvasContextMenu.svelte`, `CanvasFilePicker.svelte`, `CanvasLinkInput.svelte`, `ColorPicker.svelte`.
- **`canvas.logic.ts`** — pure transforms: Obsidian canvas JSON ⇄ xyflow `Node`/`Edge` shapes (`canvas.logic.ts:11-12`), layout helpers.
- **`canvas.service.ts`** — persistence (read/write `.canvas` files via Tauri FS plugin), undo/redo dispatch.
- **`canvas-history.logic.ts`** — in-memory undo/redo stack for the canvas editor.
- **`canvas-image.logic.ts`**, **`canvas-markdown.logic.ts`**, **`canvas-markdown.css`** — per-node-type supporting logic.

### Persistence

`.canvas` files are JSON with Obsidian-compatible keys (`nodes`, `edges`, positions, dimensions, colors). `canvas.logic.ts` converts between the on-disk schema and xyflow's runtime representation. Interoperability with Obsidian users' existing canvases is a goal; 1:1 feature parity is not.

## Alternatives considered

- **Custom SVG implementation**: maximum control, months of engineering. Rejected — xyflow gives us ~90% of what we need out of the box.
- **React Flow wrapped in Svelte via a mini-adapter**: would tether us to React runtime + hydration costs inside a Svelte app. xyflow ships a first-party Svelte port, which makes that unnecessary.
- **Mermaid / D3-only / ELK.js**: excellent for static / layout-first diagrams; poor fit for interactive canvases where the user drags nodes and draws their own edges.
- **Place canvas under `plugins/`**: would let users disable it, at the cost of making `.canvas` files "specially supported only when the plugin is on." The `.canvas` extension is integral to the vault format we aim to support, so it's core-feature-level.
- **Roll a custom Obsidian canvas clone with per-file diffing for sync**: out of scope; we read/write the whole JSON on save and let the file watcher (ADR-0017) handle external edits.

## Consequences

- xyflow + d3 adds ~200 KB gzipped to the bundle. Paid on every startup because canvas lives in `features/`. Acceptable — the alternative is a worse experience for the users who do use canvases, which is a significant fraction.
- The custom node set is fixed at compile time. Third-party canvas node types are not supported; adding one requires a code change. Intentional — the surface is narrow and we don't want a plugin-inside-plugin problem.
- Obsidian canvas format compatibility is maintained best-effort at the `canvas.logic.ts` transform layer. New Obsidian canvas fields appear over time; opening an Obsidian canvas with newer fields should round-trip cleanly (unknown fields preserved), but UI for those features may be absent.
- Image nodes and embedded file nodes inherit the app's path-security constraints (ADR-0020) — a canvas cannot reference files outside the vault.
- Undo/redo is canvas-local (`canvas-history.logic.ts`) and not unified with the editor's undo/redo. This is intentional; merging them would require a cross-feature command bus that doesn't exist today.
- Re-evaluation triggers: xyflow/svelte stalls or the API diverges dramatically from xyflow/react (losing community resources); canvas performance on 1 000+ node documents becomes the UX bottleneck (would profile and possibly specialize rendering); Obsidian canvas format changes significantly and the transform layer becomes brittle.

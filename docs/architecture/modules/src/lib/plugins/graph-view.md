---
summary: "Force-directed canvas graph of notes and wikilinks, built from the vault index snapshot, shown in its own virtual editor tab."
---

## Responsibility

Owns the Graph View: notes as nodes and resolved wikilinks as edges, drawn on a canvas in a virtual editor tab. It builds the graph model from the get_all_vault_entries_v2 snapshot, keeps UI state (global or local mode, search, tag, folder and orphan filters, arrow display, center note) and manages opening, toggling, closing and resetting the tab. It does not own the vault index or note list (Rust and core/vault), the editor tab model (core/editor) or theme values (core/settings).

## Key files

- `src/lib/plugins/graph-view/graph-view.service.ts`: buildGraph (IPC fetch) and the tab lifecycle: openGraphTab, toggleGraphTab, closeGraphTab, resetGraphView.
- `src/lib/plugins/graph-view/graph-view.logic.ts`: Pure graph model: buildGraphData, filterGraphData, getLocalGraph, node radius and palette derivation from theme tokens.
- `src/lib/plugins/graph-view/graph-view.store.svelte.ts`: Module-level UI state (mode, filters, display, highlight, center path) with getters and setters; reset restores defaults.
- `src/lib/plugins/graph-view/GraphView.svelte`: Canvas component: d3-force simulation, zoom, drag, hover, click, rendering and the cached full snapshot.
- `src/lib/plugins/graph-view/GraphControls.svelte`: Overlay controls: mode toggle, zoom, close, search, orphan toggle, tag and folder selects, arrows toggle.
- `src/lib/plugins/graph-view/graph-view.types.ts`: GraphNode, GraphLink, GraphData, GraphMode, GraphFilters and GraphDisplay.

## State

- graphViewStore: module-level $state for mode, filters, display, highlightedNodeId and centerPath. In memory only.
- GraphView.svelte keeps the last full graph snapshot (fullData) plus the d3 simulation, zoom and palette state; discarded on unmount.
- The graph tab itself is an editor tab with path GRAPH_VIRTUAL_PATH (defined in core/editor/editor.logic.ts) and fileType 'graph'.

## Collaborators

- `IPC:get_all_vault_entries_v2`: The only command the graph calls, from buildGraph. Implemented in src-tauri/src/commands/vault.rs; the plugin has no Rust module.
- `src/lib/contracts`: The typed call() wrapper used by buildGraph.
- `src/lib/types`: NoteEntryV2, the entry shape buildGraphData reads.
- `src/lib/core/vault`: vaultStore.vaultIndexVersion triggers refetches and vaultStore.path is the root for path-style wikilink resolution.
- `src/lib/core/editor`: editorStore tab operations open, focus, toggle and close the tab. editor.logic.ts supplies GRAPH_VIRTUAL_PATH, findTabIndex and isMarkdownNoteTab, and openFileInEditor opens a clicked node.
- `src/lib/core/filesystem`: buildResolutionCache and resolveWikilinkCached resolve wikilinks (the same rules as backlinks), and isViewFile excludes .view files.
- `src/lib/core/settings`: appliedThemeStore.revision triggers palette re-reads and repaints.
- `src/lib/utils`: mixColors derives palette colors and error() logs a failed fetch.
- `src/lib/app`: EditorView.svelte mounts GraphView for graph tabs, commands.ts and global-keybindings.ts call toggleGraphTab, and app-lifecycle.service.ts calls resetGraphView. tauri-listeners.service.ts bumps vaultIndexVersion, which is how the graph learns the vault changed.

## Gotchas

- buildGraph fetches the whole index snapshot on every vaultIndexVersion bump. Mode, filter and center changes reuse the cached fullData and only reinitialize the simulation.
- Wikilink resolution runs in TypeScript, not in the Rust snapshot, so edges follow the same rules as backlinks.
- buildGraphData skips .view files and self-links, deduplicates links per unordered pair and marks a pair seen in both directions as bidirectional.
- The center note is captured before the graph tab becomes active, because afterward the active tab is the graph itself. openGraphTab returns early while the graph is already active, so the existing center is kept; toggleGraphTab on the active graph tab closes it.
- If buildGraph fails, loadAndRebuild logs through error() and leaves the current graph untouched. No message is shown to the user.
- Local mode calls getLocalGraph with a fixed depth of 1 in GraphView.svelte.
- The palette is read from CSS custom properties and falls back to FALLBACK_GRAPH_PALETTE when a token is empty or unparseable.
- graphViewStore.reset() does not close the tab. resetGraphView calls both reset and closeGraphTab.

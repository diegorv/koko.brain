# Graph View

Visualize the connections between your notes as an interactive knowledge graph.

**Shortcut:** `Cmd+G` or Command Palette → **"Toggle Graph View"**

---

## Overview

The graph view opens as a virtual tab showing an interactive force-directed graph of your entire vault. Each **node** represents a note, and each **edge** represents a wikilink between two notes.

![Graph View](screenshots/graph-view.png)

## Interacting with the Graph

- **Click a node** to open that note in the editor.
- **Drag a node** to reposition it. The position is temporary and resets on reload.
- **Zoom** with the scroll wheel.
- **Pan** by clicking and dragging on the background.
- **Hover** over a node to highlight it and all directly connected nodes.

## Node Appearance

- **Size**: Node size is proportional to the number of connections — hub notes with many links appear larger.
- **Active note**: The currently open note is highlighted in purple.
- **Hover effect**: When you hover over a node, it and all its direct connections are highlighted while other nodes fade.

## Modes

The graph view has two modes, selectable from the controls panel:

### Global Mode (default)

Shows **all** notes and connections in the vault. This gives you a bird's-eye view of your entire knowledge base and reveals clusters of related notes.

### Local Mode

Shows only the **current note** and its direct neighbors (1 hop away). This is useful for focusing on a specific cluster of related notes without the noise of the full graph.

## Filters

The controls panel lets you narrow down what the graph displays:

| Filter | Description |
|--------|-------------|
| **Filter by tag** | Show only notes that contain specific tags |
| **Filter by folder** | Show only notes in specific folders |
| **Filter by search** | Text filter on note names |

Filters work in all modes and can be combined to focus on exactly the subset of notes you care about.

## Stats

The bottom-right corner of the graph displays a summary: **"N notes · M links"**, showing how many notes and connections are currently visible.

## Tips

> [!TIP]
> Use the graph view to discover orphan notes — notes with no links in or out. These may need to be connected to your knowledge base, or they may be candidates for deletion.

> [!TIP]
> If the graph feels crowded, switch to Local Mode (`Cmd+G` while a note is open) to see only the immediate neighborhood of your current note.

---

## Next Steps

- [Wikilinks & References](05-wikilinks.md) — How to create the links that power the graph
- [File History](15-file-history.md) — Browse and restore previous versions of your notes

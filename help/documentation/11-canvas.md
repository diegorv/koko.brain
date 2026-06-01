# Canvas

Learn how to use the infinite visual canvas for laying out ideas, connecting notes, and brainstorming.

## What is Canvas?

Canvas is an infinite visual canvas -- like a digital whiteboard built right into Kokobrain. It lets you create cards, embed notes, add images, group related items, and connect them with arrows, all within a free-form spatial workspace.

Canvas files are saved as `.canvas` files using the [JSON Canvas 1.0](https://jsoncanvas.org/) format, an open specification for infinite canvas data.

Canvas is great for:

- **Brainstorming** -- freely jot down ideas and rearrange them spatially
- **Mind maps** -- connect related concepts with arrows and labels
- **Project planning** -- lay out tasks, references, and dependencies visually
- **Visual organization** -- group notes, images, and links into a spatial overview

## Creating a Canvas

There are two ways to create a new canvas:

1. **Right-click** in the file explorer and select "New Canvas".
2. **Command Palette** (`Cmd+P`) -- Search for "New Canvas".

This creates a new `.canvas` file and opens it in the canvas editor.

## The Canvas Editor

The canvas editor is an infinite, zoomable workspace where you build your visual layouts.

- **Zoom**: Use the scroll wheel to zoom in and out.
- **Pan**: Click and drag on the background to move around the canvas.
- **Toolbar**: A toolbar at the bottom of the canvas provides buttons for adding different node types.

![Canvas editor with toolbar](screenshots/canvas-editor.png)

## Node Types

The canvas supports five types of nodes:

| Node Type | Description | How to Add |
|-----------|-------------|------------|
| **Text** | A card with editable Markdown content | Click "Text" in the toolbar |
| **File** | Embeds a vault note -- shows its content inside the card | Click "File" in the toolbar, select a note |
| **Link** | An external URL reference with optional display label | Click "Link" in the toolbar, enter a URL |
| **Image** | Displays an image from your vault | Click "Image" in the toolbar, select an image |
| **Group** | A visual container to group other nodes, with an optional label and background image | Click "Group" in the toolbar |

## Working with Nodes

Once you have nodes on the canvas, you can manipulate them in several ways:

- **Move** -- Click and drag a node to reposition it anywhere on the canvas.
- **Resize** -- Drag the corners or edges of a node to change its size.
- **Edit text** -- Double-click a text node to edit its Markdown content. Double-click a link node to edit its URL and title.
- **Duplicate** -- Right-click a node and select "Duplicate" to create a copy.
- **Select multiple** -- Click and drag on the background to create a selection rectangle around multiple nodes.
- **Delete** -- Select a node and press `Delete` or `Backspace`, or right-click the node and choose "Delete".
- **Drag in from the file explorer** -- Drag a note onto the canvas to create a file node, or drag an image to create an image node. Dropping a `.canvas` file opens it as a tab instead.
- **Group nesting** -- Drag a node onto a group to make it a child; the node moves with the group and stays inside its bounds. Drag it back out to release it.

## Connections (Edges)

Edges are arrows or lines that connect two nodes, letting you express relationships between ideas.

- **Create a connection** -- Drag from a handle on one node to a handle on another node. Dragging from a handle and releasing on empty canvas creates a new text node already connected to the source.
- **Arrow direction** -- New edges are directed, with an arrowhead at the target node. The arrowhead at each end (`fromEnd` / `toEnd`) is stored in the file and can be changed in Source Mode.
- **Labels** -- Right-click an edge and choose "Edit label" to add or change a text label describing the relationship.

![Canvas with connected nodes](screenshots/canvas-connections.png)

## Colors

Both nodes and edges support colors to help you visually categorize items:

- **Right-click** a node or edge and pick a color swatch under the "Color" section of the menu.
- **6 preset colors** are available: Red, Orange, Yellow, Green, Cyan, and Purple. Pick the crossed-out swatch to clear the color.
- **Groups** also support colors, which tint the container background.

## Context Menu

Right-click anywhere on the canvas for context-sensitive options:

- On a **text node** -- Edit, Change Color, Duplicate, Delete.
- On a **file node** -- Open in Editor, Change Color, Duplicate, Delete.
- On a **link node** -- Open URL, Edit (change URL and title), Change Color, Duplicate, Delete.
- On an **edge** -- Edit label, Color, Go to source, Go to target, Delete.
- On **empty space** -- Add new nodes of any type at that position.

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd+A` | Select all nodes |
| `Escape` | Clear the current selection |
| `Shift+1` | Zoom to fit all nodes |
| `Shift+2` | Zoom to the current selection (no-op when nothing is selected) |
| `Cmd+Z` | Undo |
| `Cmd+Shift+Z` | Redo |
| `Delete` / `Backspace` | Delete selected node(s) |

The canvas maintains a complete undo/redo history for every change made during the current editing session.

## Source Mode

For advanced users, the canvas editor includes a source mode toggle:

- Click the toggle button in the bottom-right corner to switch between the visual canvas and the raw JSON source.
- The JSON follows the [JSON Canvas 1.0 specification](https://jsoncanvas.org/).
- Source mode is useful for debugging layout issues or making precise, programmatic edits.

> [!TIP]
> Use groups to organize related nodes visually. For example, create a "Research" group containing all your research-related text cards and file embeds, then create a separate "Ideas" group for brainstorming notes.

## Canvas File Format

Canvas files are stored as JSON, making them easy to version control, diff, and even generate programmatically:

```json
{
  "nodes": [
    { "id": "...", "type": "text", "x": 0, "y": 0, "width": 300, "height": 200, "text": "..." }
  ],
  "edges": [
    { "id": "...", "fromNode": "...", "toNode": "...", "fromSide": "right", "toSide": "left" }
  ]
}
```

Each node has a position (`x`, `y`), dimensions (`width`, `height`), and type-specific data. Edges reference nodes by their IDs and specify which side of each node the connection attaches to.

## Next Steps

- [Collection](12-collection.md) -- Query your notes as a database
- [Graph View](14-graph-view.md) -- Visualize your notes as an interactive knowledge graph

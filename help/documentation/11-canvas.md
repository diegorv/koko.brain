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

There are three ways to create a new canvas:

1. **File explorer header** -- Click the canvas button in the file explorer header (if available).
2. **Right-click** in the file explorer and select "New Canvas".
3. **Command Palette** (`Cmd+P`) -- Search for "New Canvas".

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
| **Link** | An external URL reference | Click "Link" in the toolbar, enter a URL |
| **Image** | Displays an image from your vault | Click "Image" in the toolbar, select an image |
| **Group** | A visual container to group other nodes, with an optional label | Click "Group" in the toolbar |

## Working with Nodes

Once you have nodes on the canvas, you can manipulate them in several ways:

- **Move** -- Click and drag a node to reposition it anywhere on the canvas.
- **Resize** -- Drag the corners or edges of a node to change its size.
- **Edit text** -- Double-click a text node to edit its Markdown content.
- **Select multiple** -- Click and drag on the background to create a selection rectangle around multiple nodes.
- **Delete** -- Select a node and press `Delete` or `Backspace`, or right-click the node and choose "Delete".

## Connections (Edges)

Edges are arrows or lines that connect two nodes, letting you express relationships between ideas.

- **Create a connection** -- Drag from the edge handle on one node to another node.
- **Arrow direction** -- Edges are directed, going from the source node to the target node.
- **Edge endpoints** -- Each end can be set to show an arrow or none (no arrowhead).
- **Labels** -- Right-click an edge to add a text label describing the relationship.

![Canvas with connected nodes](screenshots/canvas-connections.png)

## Colors

Both nodes and edges support custom colors to help you visually categorize items:

- **Right-click** a node or edge and select the option to change its color.
- **6 preset colors** are available: Red, Orange, Yellow, Green, Cyan, and Purple.
- **Custom hex** -- Enter any hex color code for full control over the appearance.
- **Groups** also support colors, which tint the container background.

## Context Menu

Right-click anywhere on the canvas for context-sensitive options:

- On a **node** -- Change color, edit content, delete the node.
- On an **edge** -- Change color, add or edit a label, delete the edge.
- On **empty space** -- Add new nodes of any type at that position.

## Undo and Redo

The canvas supports full undo and redo within your current session:

- **Undo** -- Press `Cmd+Z` to revert the last action.
- **Redo** -- Press `Cmd+Shift+Z` to reapply the undone action.

The canvas maintains a complete undo/redo history for all changes made during the current editing session.

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

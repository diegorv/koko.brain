# Table of Contents

The **Table of Contents** panel shows an auto-generated outline of all headings in the active markdown document. It updates in real time as you type.

## Opening the Panel

The Table of Contents panel lives in the right sidebar. It appears alongside other panels (backlinks, outgoing links, tags, properties) in the sidebar area.

## How It Works

- Headings (`# H1` through `###### H6`) are extracted from the document as you type.
- The panel displays them in document order with visual indentation reflecting the heading level.
- Clicking any heading scrolls the editor to that position and places the cursor on the heading line.

## Nesting and Indentation

Headings are indented based on their level:

- `# Heading 1` appears at the leftmost position
- `## Heading 2` is indented one level
- `### Heading 3` is indented two levels
- And so on, up to level 6

Vertical indent guide lines help visualize the nesting depth.

## Heading Text Cleanup

The panel strips markdown formatting from heading text for a clean display:

- Bold, italic, and strikethrough markers are removed
- Wikilinks show only their display text (or target if no alias)
- Regular markdown links show only the link text
- Inline code backticks are stripped
- Emoji characters are removed

## Non-Markdown Files

When a non-markdown file is active (e.g., `.canvas`, `.kanban`, `.collection`), the panel shows "Not available". When a markdown file has no headings, it shows "No headings found".

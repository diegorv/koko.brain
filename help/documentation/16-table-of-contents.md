# Table of Contents

The **Table of Contents** panel shows an auto-generated outline of all headings in the active markdown document. It updates in real time as you type when the panel is expanded.

## Opening the Panel

The Table of Contents panel lives in the right sidebar as a **collapsible section**. Click it to expand and view the outline. It appears alongside other panels (backlinks, outgoing links, properties) in the sidebar area.

The panel can be hidden entirely. Toggle it from the command palette with **Toggle Table of Contents** (category: Layout), or in **Settings -> Sidebar**, switch off "Table of Contents". It is shown by default.

The panel is **lazy-loaded** — headings are only parsed when the panel is expanded. If you switch files while the panel is collapsed, it resets and requires re-expanding to show the new file's headings.

## How It Works

- Headings (`# H1` through `###### H6`) are extracted from the document as you type.
- Headings inside fenced code blocks are excluded (e.g., a `# comment` inside a code block does not appear in the TOC).
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

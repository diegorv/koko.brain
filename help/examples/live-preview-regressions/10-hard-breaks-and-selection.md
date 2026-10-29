# Hard breaks and selection edges

Line ending with two spaces  
next line after a hard break

Line ending with a backslash\
next line after a backslash break

Checks:
- Cursor on the line after a hard break: the previous line's break stays rendered.
- Triple-click a line: only that line reveals, not the one below.
- Cursor at column 0, Shift+Down: the line the caret lands on stays rendered (known trade-off).

Setext heading
==============

Paragraph after the setext heading.

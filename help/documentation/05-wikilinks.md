# Wikilinks & References

Learn how to connect your notes together using wikilinks, block references, and embeds.

## What Are Wikilinks?

Wikilinks are the core way to connect notes in Kokobrain. They create a web of knowledge — each link is a connection between two ideas.

Unlike regular web links, wikilinks point to other notes in your vault by name. You don't need to remember file paths or URLs; just use the note's title.

The power of wikilinks becomes clear as your vault grows: the connections between notes become a knowledge graph you can explore visually (see [Graph View](14-graph-view.md)).

## Creating a Wikilink

1. Type `[[` in the editor to trigger the autocomplete popup.
2. Start typing a note name to filter the list.
3. Press **Enter** to select a note, or **Escape** to dismiss.

![Wikilink autocomplete popup](screenshots/wikilink-autocomplete.png)

For example, typing `[[Meeting` shows all notes with "Meeting" in the name.

## Wikilink Formats

Kokobrain supports several wikilink formats, each serving a different purpose:

| Format | What it does | Example |
|--------|-------------|---------|
| `[[Note Name]]` | Links to a note by its filename | `[[Project Ideas]]` |
| `[[Note Name\|Display Text]]` | Links to a note but shows different text | `[[2026-02-17\|Today's Note]]` |
| `[[Note Name#Heading]]` | Links to a specific heading within a note | `[[Meeting Notes#Action Items]]` |
| `[[Note Name#^blockid]]` | Links to a specific block (paragraph, list item) | `[[Research#^abc123]]` |
| `![[Note Name]]` | Embeds the entire note's content inline | `![[Template Header]]` |
| `![[Note Name#Heading]]` | Embeds a specific section | `![[FAQ#Getting Started]]` |
| `![[Note Name#^blockid]]` | Embeds a specific block | `![[Notes#^key-insight]]` |
| `![[image.png]]` | Embeds an image | `![[photo.jpg]]` |
| `![[image.png\|300]]` | Embeds an image with width | `![[photo.jpg\|300]]` |
| `![[image.png\|300x200]]` | Embeds an image with width and height | `![[photo.jpg\|300x200]]` |

## Navigating Wikilinks

How you follow a wikilink depends on the editing mode:

- **Source mode**: Hold `Cmd` and click the `[[wikilink]]`.
- **Live preview**: Simply click the rendered link.

The linked note opens in a new tab, or switches to an existing tab if the note is already open.

## Linking to Headings

When you type `[[Note Name#`, a second autocomplete popup appears showing all headings in that note:

```
[[Meeting Notes#           <- type the # to see headings
  -> Action Items
  -> Discussion Points
  -> Attendees
```

This lets you link directly to a specific section within a note, so readers jump straight to the relevant content.

## Block References

A "block" is any paragraph, list item, or other content element in a note. You can create a link that points to a specific block.

### Creating a block link

1. Place your cursor on the line you want to reference.
2. Press `Cmd+Shift+L` (or right-click and select "Copy Link to Block").
3. Kokobrain automatically adds a block ID (like `^a1b2c3`) to the end of that line.
4. A wikilink is copied to your clipboard: `[[Note Name#^a1b2c3]]`.
5. Paste it anywhere in any note.

### Creating a block embed

1. Use the Command Palette (`Cmd+P`) and select "Copy Block Embed".
2. This works the same as a block link, but copies `![[Note Name#^a1b2c3]]` — which embeds the block's content inline instead of just linking to it.

> [!NOTE]
> Block IDs like `^a1b2c3` are generated automatically and appended to the line. Don't delete them if other notes reference that block.

## Embeds

Prefix any wikilink with `!` to embed the content instead of just linking to it. Embedded content is rendered inline, directly inside the current note.

```markdown
Regular link (navigates on click):
[[My Note]]

Embedded content (shows inline):
![[My Note]]

Embed just one section:
![[My Note#Introduction]]

Embed just one block:
![[My Note#^abc123]]
```

### Image embeds

Embed images from your vault using wikilink syntax. Use the pipe `|` to set display dimensions:

```
![[photo.jpg]]              Full size
![[photo.jpg|300]]          300px width
![[photo.jpg|300x200]]      300px width, 200px height
```

Embeds are useful for reusing content across multiple notes — for example, embedding a shared header, a checklist template, or a key definition.

## Unresolved Links

If you write `[[Note That Doesn't Exist]]`, the link appears with a different style (typically dimmed or with a warning indicator) to signal that the target note has not been created yet.

Clicking an unresolved link will **create the note** for you automatically. This is a powerful pattern: write your ideas as links first, then fill in the content later.

> [!TIP]
> Don't be afraid to create links to notes that don't exist yet. This "link-first, write-later" approach is a great way to build your knowledge base organically.

## Seeing Your Links

Kokobrain tracks all links automatically. You can explore them in several ways:

- **Backlinks panel** (right sidebar): Shows which notes link **to** the current note. See [Sidebar Panels](07-sidebar-panels.md) for details.
- **Outgoing Links panel** (right sidebar): Shows which notes the current note links **to**.
- **Graph View** (`Cmd+G`): Visualize all connections as an interactive graph. See [Graph View](14-graph-view.md) for details.

## Next Steps

- [Search & Navigation](06-search-and-navigation.md) — Find notes quickly across your vault.
- [Sidebar Panels](07-sidebar-panels.md) — See backlinks, outgoing links, and more.

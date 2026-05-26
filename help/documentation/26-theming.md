# Theming

A complete reference for the color theme system. Themes control every color in the app -- backgrounds, text, borders, accents, syntax highlighting, and live preview rendering.

## How Themes Work

Themes are stored per vault in `.kokobrain/settings.json` under the `appearance` key:

```json
{
  "appearance": {
    "activeTheme": "KokoBrain Default",
    "themes": [
      {
        "name": "KokoBrain Default",
        "colors": {
          "ui": { ... },
          "syntax": { ... },
          "preview": { ... },
          "wikilink": { ... },
          "callout": { ... }
        }
      }
    ]
  }
}
```

Each theme defines five color groups: **UI** (app shell), **Syntax** (markdown highlighting), **Preview** (live preview rendering), **Wikilink** (wikilink decorations), and **Callout** (callout block types).

Colors are applied as CSS custom properties on the document root. Every color token accepts any valid CSS color value (hex, oklch, rgb, hsl, etc.).

## Creating and Editing Themes

Open **Settings > Appearance**. The **Theme Editor** lets you:

- **Clone** a built-in theme to create an editable copy
- **Edit** any color token with a color picker or hex input
- **Import/Export** themes as JSON files
- **Live preview** -- every color change applies immediately

Missing tokens in user themes automatically fall back to the built-in default values.

## Region Layout

The app has four independently themeable regions:

```
+--------------------------------------------------+
|                    Tab Bar                        |
+------------+------------------+------------------+
|            |                  |                  |
|   Left     |                  |   Right          |
|   Sidebar  |     Editor       |   Sidebar        |
|            |                  |                  |
|            |                  |                  |
+------------+------------------+------------------+
|                  Status Bar                       |
+--------------------------------------------------+
```

Each region can have its own background, text, and accent colors. This lets you create themes like "light sidebar with dark editor" or "muted sidebars with bright editor" without conflicts.

---

## UI Colors

### Global

These apply to shared surfaces (popovers, dialogs, status bar) and act as defaults for regions that don't override them.

| Token | CSS Variable | Description |
|-------|-------------|-------------|
| `background` | `--background` | Base app background, status bar |
| `foreground` | `--foreground` | Default text color (global fallback) |
| `card` | `--card` | Generic card surface background |
| `cardForeground` | `--card-foreground` | Text on card surfaces |
| `popover` | `--popover` | Popover/dropdown background |
| `popoverForeground` | `--popover-foreground` | Popover text |
| `primary` | `--primary` | Primary accent (links, focus rings, headings) |
| `primaryForeground` | `--primary-foreground` | Text on primary surfaces |
| `secondary` | `--secondary` | Secondary surface |
| `secondaryForeground` | `--secondary-foreground` | Text on secondary surfaces |
| `muted` | `--muted` | Muted background (disabled, subtle) |
| `mutedForeground` | `--muted-foreground` | Muted text (global fallback) |
| `accent` | `--accent` | Accent surface (global hover/selected fallback) |
| `accentForeground` | `--accent-foreground` | Text on accent surfaces |
| `destructive` | `--destructive` | Destructive action color (delete, error) |
| `destructiveForeground` | `--destructive-foreground` | Text on destructive surfaces |
| `border` | `--border` | Border/separator color |
| `input` | `--input` | Input field border |
| `ring` | `--ring` | Focus ring color |
| `tabBar` | `--tab-bar` | Tab bar / header bar background |
| `divider` | `--divider` | Divider line color |

### Left Sidebar

Controls the file explorer, search panel, calendar panel, and type sidebar.

| Token | CSS Variable | Description |
|-------|-------------|-------------|
| `fileExplorerBg` | `--file-explorer-bg` | Background |
| `fileExplorerFg` | `--file-explorer-fg` | Primary text |
| `fileExplorerMutedFg` | `--file-explorer-muted-fg` | Secondary/muted text, icons |
| `fileExplorerAccent` | `--file-explorer-accent` | Hover and selection surfaces |

### Right Sidebar

Controls the properties panel, table of contents, backlinks, and outgoing links.

| Token | CSS Variable | Description |
|-------|-------------|-------------|
| `rightSidebarBg` | `--right-sidebar-bg` | Background |
| `rightSidebarFg` | `--right-sidebar-fg` | Primary text |
| `rightSidebarMutedFg` | `--right-sidebar-muted-fg` | Secondary/muted text, icons |
| `rightSidebarAccent` | `--right-sidebar-accent` | Hover and selection surfaces |

### Editor

Controls the markdown editor area, CodeMirror, and active tab.

| Token | CSS Variable | Description |
|-------|-------------|-------------|
| `editorBg` | `--editor-bg` | Editor background (CodeMirror + container) |
| `editorFg` | `--editor-fg` | Editor text and caret color |
| `editorEmptyBg` | `--editor-empty-bg` | Background when no file is open |

### Tab Bar and Tabs

| Token | CSS Variable | Description |
|-------|-------------|-------------|
| `tabBar` | `--tab-bar` | Tab bar background |
| `tabTextActive` | `--tab-text-active` | Active tab text |
| `tabTextInactive` | `--tab-text-inactive` | Inactive tab text |

### Settings Dialog

| Token | CSS Variable | Description |
|-------|-------------|-------------|
| `settingsDialogBg` | `--settings-dialog-bg` | Dialog background |
| `settingsSidebarBg` | `--settings-sidebar-bg` | Settings sidebar background |
| `settingsText` | `--settings-text` | Settings text |
| `settingsHoverBg` | `--settings-hover-bg` | Button hover background |
| `settingItemBg` | `--setting-item-bg` | Setting row background |

### Form Elements

| Token | CSS Variable | Description |
|-------|-------------|-------------|
| `inputBg` | `--input-bg` | Input field background |
| `inputText` | `--input-text` | Input field text |
| `switchUncheckedBg` | `--switch-unchecked-bg` | Switch unchecked track |

---

## Syntax Colors

Control CodeMirror syntax highlighting for markdown source.

| Token | CSS Variable | Description |
|-------|-------------|-------------|
| `heading1`--`heading6` | `--syntax-heading1` .. `--syntax-heading6` | Heading colors per level |
| `emphasis` | `--syntax-emphasis` | *Italic* text |
| `strong` | `--syntax-strong` | **Bold** text |
| `strikethrough` | `--syntax-strikethrough` | ~~Strikethrough~~ text |
| `link` | `--syntax-link` | Link text |
| `url` | `--syntax-url` | URL text |
| `code` | `--syntax-code` | Inline code text |
| `codeBg` | `--syntax-code-bg` | Inline code background |
| `quote` | `--syntax-quote` | Blockquote text |
| `meta` | `--syntax-meta` | Metadata/comments |
| `processing` | `--syntax-processing` | Processing instructions |
| `activeLine` | `--syntax-active-line` | Active line background |
| `selection` | `--syntax-selection` | Text selection background |
| `activeLineGutter` | `--syntax-active-line-gutter` | Active line gutter background |

---

## Preview Colors

Control live preview rendering (links, blockquotes, tables, code blocks, frontmatter, collections, embeds).

### Links

| Token | CSS Variable |
|-------|-------------|
| `link` | `--lp-link` |
| `linkDecoration` | `--lp-link-decoration` |
| `wikilink` | `--lp-wikilink` |
| `wikilinkDecoration` | `--lp-wikilink-decoration` |

### Blockquotes

| Token | CSS Variable |
|-------|-------------|
| `blockquoteBorder` | `--lp-blockquote-border` |
| `blockquoteBg` | `--lp-blockquote-bg` |
| `blockquoteBg2` | `--lp-blockquote-bg2` |
| `blockquoteBg3` | `--lp-blockquote-bg3` |

### Tasks

| Token | CSS Variable |
|-------|-------------|
| `taskBorder` | `--lp-task-border` |
| `taskHover` | `--lp-task-hover` |
| `taskChecked` | `--lp-task-checked` |
| `taskCheckmark` | `--lp-task-checkmark` |

### Code

| Token | CSS Variable |
|-------|-------------|
| `codeBg` | `--lp-code-bg` |
| `codeblockBg` | `--lp-codeblock-bg` |

### Tables

| Token | CSS Variable |
|-------|-------------|
| `tableBorder` | `--lp-table-border` |
| `tableHeaderBg` | `--lp-table-header-bg` |
| `tableAlt` | `--lp-table-alt` |
| `tableHover` | `--lp-table-hover` |

### Frontmatter

| Token | CSS Variable |
|-------|-------------|
| `frontmatterBg` | `--lp-frontmatter-bg` |
| `frontmatterBorder` | `--lp-frontmatter-border` |
| `frontmatterLabel` | `--lp-frontmatter-label` |
| `frontmatterCountBg` | `--lp-frontmatter-count-bg` |
| `frontmatterCountText` | `--lp-frontmatter-count-text` |
| `frontmatterRowBorder` | `--lp-frontmatter-row-border` |
| `frontmatterKey` | `--lp-frontmatter-key` |
| `frontmatterValue` | `--lp-frontmatter-value` |
| `frontmatterTagBg` | `--lp-frontmatter-tag-bg` |
| `frontmatterTagText` | `--lp-frontmatter-tag-text` |
| `frontmatterTagX` | `--lp-frontmatter-tag-x` |

### Collections

| Token | CSS Variable |
|-------|-------------|
| `collectionBg` | `--lp-collection-bg` |
| `collectionBorder` | `--lp-collection-border` |
| `collectionHeader` | `--lp-collection-header` |
| `collectionHeaderBorder` | `--lp-collection-header-border` |
| `collectionTableHeaderBg` | `--lp-collection-table-header-bg` |
| `collectionTableHeaderText` | `--lp-collection-table-header-text` |
| `collectionTableHover` | `--lp-collection-table-hover` |
| `collectionTableAlt` | `--lp-collection-table-alt` |
| `collectionNull` | `--lp-collection-null` |
| `collectionError` | `--lp-collection-error` |
| `collectionLoading` | `--lp-collection-loading` |
| `collectionEmpty` | `--lp-collection-empty` |

### Embeds

| Token | CSS Variable |
|-------|-------------|
| `embedBg` | `--lp-embed-bg` |
| `embedHover` | `--lp-embed-hover` |
| `embedHeader` | `--lp-embed-header` |
| `embedBorder` | `--lp-embed-border` |
| `embedContent` | `--lp-embed-content` |
| `embedError` | `--lp-embed-error` |

### Other

| Token | CSS Variable |
|-------|-------------|
| `hrBorder` | `--lp-hr-border` |
| `highlightBg` | `--lp-highlight-bg` |
| `olMarker` | `--lp-ol-marker` |
| `footnote` | `--lp-footnote` |

---

## Wikilink Colors

Control wikilink decoration rendering.

| Token | CSS Variable | Description |
|-------|-------------|-------------|
| `bracket` | `--wikilink-bracket` | `[[` and `]]` brackets |
| `target` | `--wikilink-target` | Link target text |
| `targetDecoration` | `--wikilink-target-decoration` | Target underline/decoration |
| `heading` | `--wikilink-heading` | `#heading` reference |
| `display` | `--wikilink-display` | Display text after `|` |

---

## Callout Colors

Control the accent color for each callout type.

| Token | CSS Variable |
|-------|-------------|
| `note` | `--callout-note` |
| `tip` | `--callout-tip` |
| `important` | `--callout-important` |
| `warning` | `--callout-warning` |
| `caution` | `--callout-caution` |
| `quote` | `--callout-quote` |

---

## Tips for Theme Creators

- **Start by cloning** the built-in theme and adjusting from there
- **Region variables default to global values** -- you only need to set them when you want a region to differ from the global palette
- **Use the live preview** in the Theme Editor to see changes instantly
- **Export your theme** as JSON to share it or back it up
- To create a "light sidebar + dark editor" theme: set `fileExplorerBg` to a light color, `fileExplorerFg` to a dark text color, and keep `editorBg`/`editorFg` dark

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

KokoBrain ships with two built-in themes: **KokoBrain Default** (dark) and **Lavender Haze** (light purple). The built-in themes always stay available even if the file is edited. Every other theme, including Sakura, Twilight Violet, Sepia and the Zettlr and Tolaria ports that earlier versions shipped, is in the [Theme Catalog](#theme-catalog).

Each theme defines five color groups: **UI** (app shell), **Syntax** (markdown highlighting), **Preview** (live preview rendering), **Wikilink** (wikilink decorations), and **Callout** (callout block types).

Colors are applied as CSS custom properties on the document root. Every color token accepts any valid CSS color value (hex, oklch, rgb, hsl, etc.).

## Creating and Editing Themes

Open **Settings > Appearance**. Each theme row has hover actions to **Edit** (pencil) and **Duplicate** (copy); the **Delete** (X) button stays visible on non-default theme rows. The KokoBrain Default theme cannot be edited or deleted; duplicate it to make an editable copy. The **Theme Editor** lets you:

- **Duplicate** a theme to create an editable copy
- **Edit** any color token with a color picker or hex input. The text field accepts 3- or 6-digit hex (with or without `#`); values entered through the editor are normalized to lowercase 6-digit hex
- **Import/Export** themes as JSON files
- **Live preview** -- every color change applies immediately

Missing tokens in user themes automatically fall back to the built-in default values.

> [!NOTE]
> The theme JSON itself accepts any valid CSS color value (hex, oklch, rgb, hsl) and the built-in themes use a mix of hex, oklch, and rgba. The in-app editor's text field only accepts hex; to use other formats, edit or import the theme JSON directly.

## Theme Catalog

**Settings > Appearance** also lists the themes published online in [diegorv/koko.brain-themes](https://github.com/diegorv/koko.brain-themes), under **Theme catalog**. The list is fetched each time you open the section; each entry shows a mini preview, its name, author and version.

- **Install** adds the theme to your theme list. Select it there to activate it, like any other theme. An installed theme is saved in the vault's settings, so it stays after a restart and works offline.
- **Update to x.y.z** appears on an installed theme when the catalog has a newer version. Click it to replace your copy; if the theme is active, the new colors apply at once. Nothing updates without the click. If the new version renamed the theme, it takes the new name (and stays active), unless another theme already uses that name: then the update is refused and you keep the installed version.
- **Installed** marks a theme you already have, at the catalog's version or newer. **Requires a newer KokoBrain** marks a theme made for a later app version; update the app to install it.
- Install is refused when your theme list already has a theme with the same name. Rename yours first.
- An installed theme cannot be edited in place. To customize it, **Duplicate** it: the copy is a normal user theme you can edit, and it does not change when you update or uninstall the original.
- **Uninstall** (X) removes an installed theme. If it was active, the app switches to KokoBrain Default.

If the catalog cannot be loaded (no connection, or an invalid file), the section shows an error with a **Retry** button. Your installed and built-in themes keep working. Catalog themes may only carry color values; an entry with anything else is skipped.

### Upgrading from a version with more built-in themes

Earlier versions shipped 24 built-in themes. On the first start after the upgrade:

- If your active theme was one of the 22 that moved to the catalog, it becomes an installed theme at version 1.0.0 with exactly the colors you had. It works offline, and **Update to x.y.z** appears once the catalog has a newer version.
- The others leave your theme list. Install any of them again from the catalog.
- Your own themes, including the "<name> (edited)" copies an earlier version made of an edited built-in, are kept.

This runs once per vault.

## Region Layout

The app has four independently themeable regions:

```
+--------------------------------------------------+
|                    Tab Bar                        |
+------------+------------------+------------------+
|            |                  |                  |
|  Rail and  |                  |   Right          |
|  Panels    |     Editor       |   Sidebar        |
|            |                  |                  |
|            |                  |                  |
+------------+------------------+------------------+
|                  Status Bar                       |
+--------------------------------------------------+
```

Each region can have its own background, text, and accent colors. This lets you create themes like "light rail panels with dark editor" or "muted side panels with bright editor" without conflicts. The left region is the rail with its navigators and note list ([Rail and Panels](#rail-and-panels) tokens); the right one is the right sidebar ([Right Sidebar](#right-sidebar) tokens).

---

## UI Colors

### Global

These apply to shared surfaces (popovers, dialogs) and act as fallback defaults for regions that don't override them.

> [!IMPORTANT]
> This table, without `tabBar`, is the color contract of [vault mods](28-mods.md#ctxtheme-colors): `ctx.theme` reports these colors and mods use their CSS variables in their own UI. Renaming or removing one of these tokens or its CSS variable is a breaking change for mods. `cardForeground` cannot be set from a theme yet: it takes the stylesheet's light or dark default.

| Token | CSS Variable | Description |
|-------|-------------|-------------|
| `background` | `--background` | Base app background; used by surfaces without a dedicated variable |
| `foreground` | `--foreground` | Default body text color; fallback for regions without their own fg |
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

### Rail and Panels

Controls the rail's buttons and border and the panels next to the rail: the Files, Types and Calendar navigators, the note list and Search.

| Token | CSS Variable | Description |
|-------|-------------|-------------|
| `fileExplorerBg` | `--file-explorer-bg` | Background fill of the panels next to the rail |
| `fileExplorerFg` | `--file-explorer-fg` | Primary readable text: file/folder names, search input text, calendar file list, daily note button labels |
| `fileExplorerMutedFg` | `--file-explorer-muted-fg` | Secondary text and icons: tree chevrons, folder/file icons, search placeholder, weekday headers, section labels ("Views", "Types") |
| `fileExplorerAccent` | `--file-explorer-accent` | Hover/selection background: file tree item hover, calendar day hover, search close button hover, quarter/week button hover |
| `fileExplorerPrimary` | `--file-explorer-primary` | Primary accent color: selected file name, "Search" heading, calendar month label, weekend day numbers, active fuzzy toggle, type/view selected state, dot indicators |
| `fileExplorerBorder` | `--file-explorer-border` | Borders and separators: the rail border and dividers, search input border, note list row separators, navigator dividers |
| `fileExplorerBadgeFg` | `--file-explorer-badge-fg` | Numeric count badges: file count in folders, note count in type/view/nav items |
| `searchSemanticBg` | `--search-semantic-bg` | Background of the "Semantic" badge pill in search results |
| `searchSemanticFg` | `--search-semantic-fg` | Text color of the "Semantic" badge pill in search results |

### Right Sidebar

Controls the properties panel, table of contents, backlinks, and outgoing links. All panels stack vertically in the right pane's scroll area.

| Token | CSS Variable | Description |
|-------|-------------|-------------|
| `rightSidebarBg` | `--right-sidebar-bg` | Background fill of the entire right sidebar pane |
| `rightSidebarFg` | `--right-sidebar-fg` | Primary readable text: property values, boolean labels, relationship link names, heading text in TOC |
| `rightSidebarMutedFg` | `--right-sidebar-muted-fg` | Secondary text and icons: property keys, file icons, snippet text, link/relationship counts, chevron icons, empty state messages ("No backlinks found") |
| `rightSidebarAccent` | `--right-sidebar-accent` | Hover/selection background: collapsible trigger hover, backlink/outgoing link item hover, property row hover, list item container bg |
| `rightSidebarPrimary` | `--right-sidebar-primary` | Primary accent color: panel headings ("Properties", "Backlinks", "TOC", "Outgoing links", "Relationships"), link highlight text in backlink snippets, TOC heading hover |
| `rightSidebarBorder` | `--right-sidebar-border` | Borders and separators: TOC indent guide lines (via CSS gradient) |

### Editor

Controls the markdown editor area, CodeMirror, and active tab.

| Token | CSS Variable | Description |
|-------|-------------|-------------|
| `editorBg` | `--editor-bg` | Background fill of the CodeMirror editor, gutter area, and active tab; the main writing surface |
| `editorFg` | `--editor-fg` | Editor body text, caret (blinking cursor), and drop cursor color |
| `editorEmptyBg` | `--editor-empty-bg` | Background shown when no file is open ("Select a file to view its contents") |

### Tab Bar and Tabs

| Token | CSS Variable | Description |
|-------|-------------|-------------|
| `tabBar` | `--tab-bar` | Background of the horizontal tab strip above the editor and the sidebar header bars |
| `tabTextActive` | `--tab-text-active` | Text color of the currently active/selected tab |
| `tabTextInactive` | `--tab-text-inactive` | Text color of inactive/unselected tabs; also used for property type icons |

### Status Bar

| Token | CSS Variable | Description |
|-------|-------------|-------------|
| `statusBarBg` | `--status-bar-bg` | Background of the bottom status bar strip (search status, save status, word count) |
| `statusBarFg` | `--status-bar-fg` | Text color of status bar items |

### Settings Panel

| Token | CSS Variable | Description |
|-------|-------------|-------------|
| `settingsDialogBg` | `--settings-dialog-bg` | Background of the Settings panel |
| `settingsSidebarBg` | `--settings-sidebar-bg` | Background of the Settings navigation sidebar (General, Notes, Tools, etc.) |
| `settingsText` | `--settings-text` | Text color inside the Settings panel |
| `settingsHoverBg` | `--settings-hover-bg` | Hover background for Settings sidebar navigation items |
| `settingItemBg` | `--setting-item-bg` | Background of individual setting rows |

### Form Elements

| Token | CSS Variable | Description |
|-------|-------------|-------------|
| `inputBg` | `--input-bg` | Background of text inputs, dropdowns, and select fields across the app |
| `inputText` | `--input-text` | Text color inside input fields |
| `switchUncheckedBg` | `--switch-unchecked-bg` | Background of toggle switch track when unchecked/off |

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

Control live preview rendering (links, blockquotes, tables, code blocks, collections, embeds).

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

- **Start by duplicating** a built-in theme (KokoBrain Default or Lavender Haze) or an installed catalog theme, and adjust from there
- **Region variables default to global values** -- you only need to set them when you want a region to differ from the global palette
- **Use the live preview** in the Theme Editor to see changes instantly
- **Export your theme** as JSON to share it or back it up
- To create a "light rail panels + dark editor" theme: set `fileExplorerBg` to a light color, `fileExplorerFg` to a dark text color, and keep `editorBg`/`editorFg` dark

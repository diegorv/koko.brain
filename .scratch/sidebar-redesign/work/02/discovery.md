# Issue 02 discovery: type palette and warning tokens in every theme

No `spec.md` for this feature; the source is `PRD.md` (Theming, Q13). The prototype colors types with
Tailwind classes, so it gives no token design to copy.

## Files that change
- `src/lib/core/settings/theme.types.ts:1-90` `UIColors`: add `typeRed` .. `typeGray` (9) and `warning`.
  The `ui` group has no CSS prefix, so they emit `--type-red` .. `--type-gray` and `--warning`.
- `src/lib/core/settings/theme-builder.logic.ts`: `TYPE_PALETTE_NAMES` const + `typePaletteToken(name)`;
  `buildTheme` derives the ten from the core (red = error, green/blue/purple/yellow = the callout hues,
  orange = mix(red, yellow), teal = mix(green, blue), pink = mix(red, purple), gray = mutedFg,
  warning = yellow); `READABILITY_PAIRS` gains each palette token at 3:1 and `warning` at 4.5:1 on
  `ui.fileExplorerBg` (the sidebar background).
- `src/lib/utils/color.ts`: `mixColors(a, b)`: OKLab midpoint as hex, null when unparseable.
- `src/lib/core/settings/theme-editor.logic.ts:40-83` `UI_COLOR_GROUPS`: new "Type Palette" group with
  the ten keys.
- `src/lib/features/file-icons/file-icons.logic.ts`: `iconColorCss(color)`: palette name ->
  `var(--type-<name>)` (case-insensitive), anything else passes through, undefined stays undefined.
- `src/lib/features/file-icons/IconRenderer.svelte:22,32`: style uses `iconColorCss(color)`. Every icon
  site (Types sidebar, TypeNoteList rows, FileTreeItem, EditorTabs, properties) renders through it, and
  inherited type icons already carry the type's `_color` via `icon-resolver.ts`.
- `src/app.css @theme inline`: `--color-warning` / `--color-type-*` mappings, like every other UI token.

## Plan (test-first)
1. `color.test`: mixColors. `file-icons.logic.test`: iconColorCss (name, hex, other CSS, undefined, "").
2. `theme.logic.test`: every `BUILTIN_THEMES` entry has the ten tokens; a user theme lacking them gets
   them from `mergeThemeWithDefaults`. `theme-builder.logic.test`: derivation + the existing
   "holds for every pair in every built-in theme" covers contrast. `theme-editor.logic.test` already
   checks UI groups cover every UI token once.
3. Rendered: `TypeSidebar.test` row with `_color: green` -> svg `color: var(--type-green)`; a new
   `IconRenderer.test` (hex passthrough, no color -> no style).
4. `theme-snapshot.test` snapshot updated: additions only (verify the diff).

## Risks / defaults
- A bare CSS named color like `green` used to render as CSS green; it now follows the theme (intended).
- `_title_color` is not touched (the Issue names only `_color`).
- Group label "Type Palette" holds `warning` too, since the Issue asks for one own group.

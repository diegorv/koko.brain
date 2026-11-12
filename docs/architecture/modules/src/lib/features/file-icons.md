---
summary: "Icon and color resolution for vault files, folders and types, icon pack loading, and the icon picker."
---

## Responsibility

Owns how an item looks once a user has assigned an icon or colors. It reads _icon, _color and _title_color (and unprefixed aliases) from note frontmatter and .view bodies, keeps an in-memory index of them by vault path, writes them back through the frontmatter write path, and resolves the final icon and colors for a path with a fallback to the type definition icon. It also loads icon packs lazily, normalizes them into one shape, and provides the icon picker dialog and renderer. It does not own the Rust vault index, the note write pipeline, the type definitions store, or default icons drawn by other features.

## Key files

- `src/lib/features/file-icons/file-icons.service.ts`: Write and load surface: setIconForPath, removeIconForPath, setIconColors, buildFrontmatterIconIndex, incremental updaters, recent icons, note-change consumer registration.
- `src/lib/features/file-icons/icon-resolver.ts`: Resolves the ResolvedIcon for a path (own icon, then type icon, colors laid over) and for a type name; holds the TypeIconLookup slot.
- `src/lib/features/file-icons/file-icons.store.svelte.ts`: Frontmatter icon index Map, recent icons, and packVersion that signals finished pack loads.
- `src/lib/features/file-icons/file-icons.logic.ts`: Pure parsing and color rules: icon value parsing, frontmatter extraction with line fallback, alias folding, .view icon extraction, CSS color safety, iconColorCss.
- `src/lib/features/file-icons/file-icons.icon-data.ts`: Lazy loading and caching of icon packs into normalized icons, getIconSync and preloadPacks.
- `src/lib/features/file-icons/frontmatter-icon.service.ts`: Writes icon keys into a note's frontmatter, keeping unsaved open-tab content.
- `src/lib/features/file-icons/IconPicker.svelte`: Dialog for choosing a pack, icon and colors, with search, recents and preset colors.
- `src/lib/features/file-icons/IconRenderer.svelte`: Renders one NormalizedIcon as sanitized inline SVG or emoji, with optional color.

## State

- fileIconsStore: frontmatterIcons (Map from vault path to icon ref), recentIcons, packVersion.
- Module state: packCache and lucideAliases in file-icons.icon-data.ts; the typeIconLookup slot in icon-resolver.ts; the onPacksLoaded callback set by file-icons.service.ts.
- Vault file .kokobrain/recent-icons.json with the recently used icons.
- Frontmatter keys _icon, _color and _title_color (aliases icon, color, title_color) in notes and .view bodies.
- A folder note <dir>/<dirname>.md created with empty frontmatter when an icon or color is set on a directory.

## Collaborators

- `IPC:get_all_vault_entries_v2`: buildFrontmatterIconIndex reads pre-parsed frontmatter for every note in one call.
- `src/lib/core/filesystem`: applyNoteChange and registerNoteChangeConsumer keep the index current; isViewFile picks the .view parsing path.
- `src/lib/core/frontmatter`: updateNoteFrontmatter, FrontmatterWriteError, toast helper and property helpers for icon reads and writes.
- `src/lib/core/editor`: frontmatter-icon.service reads editorStore.tabs so an open tab's unsaved content is the edit base.
- `src/lib/core/settings`: TYPE_PALETTE_NAMES from theme-builder.logic maps palette names such as green to var(--type-green).
- `src/lib/contracts`: Typed call() wrapper.
- `src/lib/utils`: debug and timeAsync; sanitizeSvgContent in IconRenderer.
- `src/lib/components/ui`: Dialog, Input and ScrollArea primitives for IconPicker.
- `src/lib/app`: boot installs the type icon lookup; app-lifecycle loads recent icons, builds the index, registers the consumer and resets; watcher-handler rebuilds the index; EditorView renders resolved icons.
- `src/lib/features/auto-organize`: Consumer: setIconForPath for rule icons, and the rule editors use IconPicker, IconRenderer, getIconSync and the store.
- `src/lib/features/note-list`: Consumer: NoteRow renders icons, NoteRowMenu opens IconPicker and calls the write functions.
- `src/lib/features/rail-shell`: Consumer: navigators open IconPicker and call the write functions; Rail and lists resolve icons.
- `src/lib/features/properties`: Consumer: PropertiesView and RelationshipSearch resolve and render icons.
- `src/lib/features/tasks`: Consumer: TasksView resolves icons and colors for source notes.
- `src/lib/features/type-definitions`: type-sidebar.logic.ts uses extractViewIcon and parseIconValuePermissive.
- `src/lib/plugins/mods`: mods-host.service exposes getIconSync, parseIconValuePermissive and preloadPacks to vault mods.

## Gotchas

- Import preloadPacks from file-icons.service.ts, not file-icons.icon-data.ts. The service sets the onPacksLoaded callback at load time, and that callback bumps packVersion. Without the service module loaded, a finished pack load never re-renders consumers.
- getIconSync returns undefined until the pack is cached. resolveIconForPath reads packVersion so reactive consumers re-run when packs arrive.
- Lucide names resolve through lucideAliases so older spellings still work. Other packs match by exact name.
- Icon writes go through updateNoteFrontmatter, which also edits the open tab's unsaved content. A refused or failed write toasts and leaves fileIconsStore untouched.
- Setting an icon or color on a folder creates the folder note with empty frontmatter and routes it through applyNoteChange. Removing the icon clears the keys but does not delete the folder note.
- A folder note X/X.md is indexed under two keys, its own path and the directory path X. The bulk builder and incremental updater write both and the remover clears both.
- Frontmatter parsing short-circuits when the block lacks the text icon or color and falls back to a line reader when YAML parsing rejects the block. Key set or value rule changes must be made in both paths.
- A .view file has no fences; its icon is read from the whole body with extractViewIcon.
- Color values reach an inline style, so values containing ; or url( are dropped by isSafeCssValue. Palette names map to var(--type-*) in iconColorCss.
- Type icons resolve through a TypeIconLookup slot installed in boot.ts so this folder does not import the type definitions store. Without registration, resolveTypeIconForPath returns nothing.
- Icon packs are npm packages loaded lazily per pack in getIconsForPack. Adding or removing a pack touches that dispatch and the IconPackId union in file-icons.types.ts.
- Recent icons read failures fall back to an empty list and write failures are logged without rethrowing.
- IconPicker caps the rendered search results and shows a notice when more match.

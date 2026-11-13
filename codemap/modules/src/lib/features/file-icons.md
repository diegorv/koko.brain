# module card src/lib/features/file-icons
cols: module <path> <layer> files <n> in-modules <n> out-modules <n> pub <public>/<exports> ipc <called>/<served> card ~<k>k · dep <from> -> <to> <file pairs> · in2/out2 <module> <n> modules: <module>(<via>) · entry <file> ext-in<n> <importers> · file … · sym … · grep: grep -rF -- '-> src/lib/features/file-icons ' codemap/modules
module src/lib/features/file-icons features files 9 in-modules 8 out-modules 8 pub 22/42 ipc 1/0 card ~3.7k
## neighbors
dep src/lib/app -> src/lib/features/file-icons 6
dep src/lib/features/auto-organize -> src/lib/features/file-icons 13
dep src/lib/features/note-list -> src/lib/features/file-icons 7
dep src/lib/features/properties -> src/lib/features/file-icons 6
dep src/lib/features/rail-shell -> src/lib/features/file-icons 20
dep src/lib/features/tasks -> src/lib/features/file-icons 3
dep src/lib/features/type-definitions -> src/lib/features/file-icons 1
dep src/lib/plugins/mods -> src/lib/features/file-icons 3
dep src/lib/features/file-icons -> src/lib/components 3
dep src/lib/features/file-icons -> src/lib/contracts 1
dep src/lib/features/file-icons -> src/lib/core/editor 1
dep src/lib/features/file-icons -> src/lib/core/filesystem 2
dep src/lib/features/file-icons -> src/lib/core/frontmatter 4
dep src/lib/features/file-icons -> src/lib/core/settings 1
dep src/lib/features/file-icons -> src/lib/types 1
dep src/lib/features/file-icons -> src/lib/utils 2
in2 src/lib/features/file-icons 4 modules: src/routes(2) src/lib/features/event-calendar(1) src/lib/plugins/calendar(1) src/lib/plugins/queryjs(1)
out2 src/lib/features/file-icons 1 modules: src/lib/core/vault(1)
## entry files
entry src/lib/features/file-icons/file-icons.logic.ts ext-in11 src/lib/app/EditorView.svelte src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte src/lib/features/note-list/NoteRow.svelte src/lib/features/properties/PropertiesView.svelte src/lib/features/properties/RelationshipSearch.svelte more importers 6 not shown: src/lib/features/rail-shell(3) src/lib/features/tasks(1) src/lib/features/type-definitions(1) +1 modules: q importers src/lib/features/file-icons/file-icons.logic.ts
entry src/lib/features/file-icons/IconRenderer.svelte ext-in10 src/lib/app/EditorView.svelte src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte src/lib/features/note-list/NoteRow.svelte src/lib/features/properties/PropertiesView.svelte more importers 5 not shown: src/lib/features/rail-shell(3) src/lib/features/properties(1) src/lib/features/tasks(1): q importers src/lib/features/file-icons/IconRenderer.svelte
entry src/lib/features/file-icons/icon-resolver.ts ext-in10 src/lib/app/EditorView.svelte src/lib/app/boot.ts src/lib/features/note-list/NoteRow.svelte src/lib/features/properties/PropertiesView.svelte src/lib/features/properties/RelationshipSearch.svelte more importers 5 not shown: src/lib/features/rail-shell(4) src/lib/features/tasks(1): q importers src/lib/features/file-icons/icon-resolver.ts
entry src/lib/features/file-icons/file-icons.service.ts ext-in7 src/lib/app/lifecycle/app-lifecycle.service.ts src/lib/app/lifecycle/watcher-handler.service.ts src/lib/features/auto-organize/auto-organize.service.ts src/lib/features/note-list/NoteRowMenu.svelte src/lib/features/rail-shell/FilesNavigator.svelte more importers 2 not shown: src/lib/features/rail-shell(1) src/lib/plugins/mods(1): q importers src/lib/features/file-icons/file-icons.service.ts
entry src/lib/features/file-icons/file-icons.store.svelte.ts ext-in6 src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte src/lib/features/note-list/NoteRowMenu.svelte src/lib/features/rail-shell/FilesNavigator.svelte src/lib/features/rail-shell/Rail.svelte more importers 1 not shown: src/lib/features/rail-shell(1): q importers src/lib/features/file-icons/file-icons.store.svelte.ts
entry src/lib/features/file-icons/file-icons.types.ts ext-in6 src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte src/lib/features/auto-organize/auto-organize.types.ts src/lib/features/note-list/NoteRowMenu.svelte src/lib/features/rail-shell/FilesNavigator.svelte more importers 1 not shown: src/lib/features/rail-shell(1): q importers src/lib/features/file-icons/file-icons.types.ts
entry src/lib/features/file-icons/IconPicker.svelte ext-in5 src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte src/lib/features/note-list/NoteRowMenu.svelte src/lib/features/rail-shell/FilesNavigator.svelte src/lib/features/rail-shell/TypesNavigator.svelte
entry src/lib/features/file-icons/file-icons.icon-data.ts ext-in4 src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte src/lib/features/rail-shell/Rail.svelte src/lib/plugins/mods/mods-host.service.ts
## files
file src/lib/features/file-icons/IconPicker.svelte component L323 module src/lib/features/file-icons in5 t2
file src/lib/features/file-icons/IconRenderer.svelte component L38 module src/lib/features/file-icons in11 t1
file src/lib/features/file-icons/file-icons.icon-data.ts other L320 module src/lib/features/file-icons in7 t30
file src/lib/features/file-icons/file-icons.logic.ts logic L245 module src/lib/features/file-icons in14 t2
file src/lib/features/file-icons/file-icons.service.ts service L310 module src/lib/features/file-icons in7 t18
file src/lib/features/file-icons/file-icons.store.svelte.ts store L59 module src/lib/features/file-icons in9 t26
file src/lib/features/file-icons/file-icons.types.ts types L44 module src/lib/features/file-icons in14 t0
file src/lib/features/file-icons/frontmatter-icon.service.ts service L90 module src/lib/features/file-icons in1 t2
file src/lib/features/file-icons/icon-resolver.ts other L98 module src/lib/features/file-icons in10 t2
## public
sym src/lib/features/file-icons/IconPicker.svelte:1 component IconPicker props:open=$bindable,currentPack,currentName,currentColor,currentTextColor,onSelect,onColorsChange,onRemove,onClose L323
sym src/lib/features/file-icons/IconRenderer.svelte:1 component IconRenderer props:icon,class=,color L38
sym src/lib/features/file-icons/file-icons.icon-data.ts:306 fn getIconSync(pack: IconPackId, name: string): NormalizedIcon | undefined L8 | Looks up a single icon by pack and name (for rendering in file tree).
sym src/lib/features/file-icons/file-icons.icon-data.ts:316 fn preloadPacks(packIds: IconPackId[]): Promise<void> L5 | Pre-loads specific packs into cache (call at startup for packs referenced in saved icons)
sym src/lib/features/file-icons/file-icons.logic.ts:41 fn parseIconValuePermissive(raw: string): { iconPack: IconPackId; iconName: string } | null L8 | Parses an icon value that may be either `pack:name` or a bare name.
sym src/lib/features/file-icons/file-icons.logic.ts:199 fn extractViewIcon(content: string): { iconPack?: IconPackId; iconName?: string; color?: string; titleColor?: string } | null L13 | Extracts the icon and its colors from a `.view` file.
sym src/lib/features/file-icons/file-icons.logic.ts:219 fn iconColorCss(color: string | undefined): string | undefined L5 | CSS color for an icon's `_color`: a type palette name (`green`, any case) becomes the active theme's token, `var(--type-green)`; any other value (a hex from th…
sym src/lib/features/file-icons/file-icons.logic.ts:231 fn iconColorStyle(color: string | undefined): string | undefined L4 | The inline `style` that colors an item's default icon, a Lucide component drawn in `currentColor`, with the item's `_color` when it has no icon of its own: the…
sym src/lib/features/file-icons/file-icons.service.ts:47 fn loadRecentIcons(vaultPath: string): Promise<void> L16 | Reads recently used icons from disk.
sym src/lib/features/file-icons/file-icons.service.ts:77 fn trackRecentIcon(vaultPath: string, iconPack: IconPackId, iconName: string): Promise<void> L5 | Tracks an icon as recently used and persists to disk
sym src/lib/features/file-icons/file-icons.service.ts:118 fn setIconForPath(vaultPath: string, path: string, iconPack: IconPackId, iconName: string, color?: string, textColor?: string, isDirecto… L28 | Sets a custom icon for a file/folder path. - .md files: writes to frontmatter (_icon, _color, _title_color). - Directories (isDirectory=true): writes to folder…
sym src/lib/features/file-icons/file-icons.service.ts:153 fn setIconColors(path: string, color?: string, textColor?: string, isDirectory = false): Promise<void> L14 | Saves the colors of a file/folder that has no icon, leaving any `_icon` key alone.
sym src/lib/features/file-icons/file-icons.service.ts:174 fn removeIconForPath(vaultPath: string, path: string, isDirectory = false): Promise<void> L20 | Removes a custom icon from a file/folder path. - .md files: removes _icon, _color, _title_color from frontmatter. - Directories (isDirectory=true): removes ico…
sym src/lib/features/file-icons/file-icons.service.ts:201 fn buildFrontmatterIconIndex(): Promise<void> L32 | Scans all vault notes for the frontmatter icon and colors and populates `fileIconsStore.frontmatterIcons`.
sym src/lib/features/file-icons/file-icons.service.ts:299 fn registerFileIconsNoteChangeConsumer(): () => void L7 | Registers the frontmatter icon index as a note-change consumer, so `applyNoteChange` keeps it in sync on every write and eviction.
sym src/lib/features/file-icons/file-icons.service.ts:308 fn resetFileIcons(): void L3 | Clears file icon state (e.g. when switching vaults)
sym src/lib/features/file-icons/file-icons.store.svelte.ts:16 store fileIconsStore L44 | Reactive store for file/folder icons
sym src/lib/features/file-icons/file-icons.types.ts:2 type IconPackId L13 | Supported icon pack identifiers
sym src/lib/features/file-icons/icon-resolver.ts:26 fn registerTypeIconLookup(lookup: TypeIconLookup): () => void L6 | Installs the lookup the resolver uses for type icons.
sym src/lib/features/file-icons/icon-resolver.ts:38 interface ResolvedIcon L8 | Result of icon resolution: the one answer to how an item looks, read by every place that shows one.
sym src/lib/features/file-icons/icon-resolver.ts:64 fn resolveIconForPath(path: string): ResolvedIcon | undefined L14 | Resolves the display icon and colors for a file path: 1.
sym src/lib/features/file-icons/icon-resolver.ts:84 fn resolveIconForType(typeName: string): ResolvedIcon | undefined L7 | Resolves the display icon for a type name by looking up the type definition note's frontmatter icon.
## stores
store src/lib/features/file-icons/file-icons.store.svelte.ts:16 fileIconsStore esc:0
## effects
fx-count svelte.$effect 2
fx-count tauri-fs.exists 5
fx-count tauri-fs.mkdir 1
fx-count tauri-fs.readTextFile 2
fx-count tauri-fs.writeTextFile 2
ipc-count ipc:get_all_vault_entries_v2 1
## debt
-

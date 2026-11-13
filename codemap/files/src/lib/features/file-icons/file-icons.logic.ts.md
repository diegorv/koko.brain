# file card src/lib/features/file-icons/file-icons.logic.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/file-icons/file-icons.logic.ts ' codemap/files
file src/lib/features/file-icons/file-icons.logic.ts logic L245 module src/lib/features/file-icons in14 t2
## imports
imp src/lib/features/file-icons/file-icons.logic.ts:2 -> src/lib/features/file-icons/file-icons.types.ts type:IconPackId,type:NormalizedIcon,type:RecentIcon
imp src/lib/features/file-icons/file-icons.logic.ts:3 -> src/lib/types/vault-v2.types.ts type:FrontmatterValue
imp src/lib/features/file-icons/file-icons.logic.ts:4 -> src/lib/core/frontmatter/properties.logic.ts extractRawFrontmatter
imp src/lib/features/file-icons/file-icons.logic.ts:5 -> src/lib/core/settings/theme-builder.logic.ts TYPE_PALETTE_NAMES
## imported-by
imp src/lib/app/EditorView.svelte:25 -> src/lib/features/file-icons/file-icons.logic.ts iconColorStyle
imp src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:11 -> src/lib/features/file-icons/file-icons.logic.ts parseIconValuePermissive
imp src/lib/features/file-icons/IconPicker.svelte:5 -> src/lib/features/file-icons/file-icons.logic.ts filterIcons
imp src/lib/features/file-icons/IconRenderer.svelte:4 -> src/lib/features/file-icons/file-icons.logic.ts iconColorCss
imp src/lib/features/file-icons/file-icons.service.ts:7 -> src/lib/features/file-icons/file-icons.logic.ts addRecentIcon,extractIconFromFrontmatter,extractIconColorsFromFrontmatter,extractIconFromParsedFrontmatter,extractIconColorsFromParsedFrontmatter,extractViewIcon,mergeIconRef
imp src/lib/features/note-list/NoteRow.svelte:9 -> src/lib/features/file-icons/file-icons.logic.ts iconColorStyle
imp src/lib/features/properties/PropertiesView.svelte:26 -> src/lib/features/file-icons/file-icons.logic.ts iconColorStyle
imp src/lib/features/properties/RelationshipSearch.svelte:11 -> src/lib/features/file-icons/file-icons.logic.ts iconColorStyle
imp src/lib/features/rail-shell/FilesNavigator.svelte:46 -> src/lib/features/file-icons/file-icons.logic.ts iconColorStyle
imp src/lib/features/rail-shell/Rail.svelte:19 -> src/lib/features/file-icons/file-icons.logic.ts iconColorCss,parseIconValuePermissive
imp src/lib/features/rail-shell/TypesNavigator.svelte:29 -> src/lib/features/file-icons/file-icons.logic.ts iconColorStyle
imp src/lib/features/tasks/TasksView.svelte:30 -> src/lib/features/file-icons/file-icons.logic.ts iconColorStyle
imp src/lib/features/type-definitions/type-sidebar.logic.ts:10 -> src/lib/features/file-icons/file-icons.logic.ts extractViewIcon,parseIconValuePermissive
imp src/lib/plugins/mods/mods-host.service.ts:12 -> src/lib/features/file-icons/file-icons.logic.ts parseIconValuePermissive
## reach
in2 src/lib/features/file-icons/file-icons.logic.ts 22 files in 9 modules: src/lib/app(7) src/lib/features/rail-shell(5) src/lib/features/type-definitions(3) src/lib/features/auto-organize(2) src/lib/features/event-calendar(1) +4 modules: q impact src/lib/features/file-icons/file-icons.logic.ts --depth 2
out2 src/lib/features/file-icons/file-icons.logic.ts 5 files in 4 modules: src/lib/utils(2) src/lib/contracts(1) src/lib/core/frontmatter(1) src/lib/core/settings(1)
## tests
test src/tests/lib/features/file-icons/file-icons.logic.test.ts imports src/lib/features/file-icons/file-icons.logic.ts mirror
test src/tests/lib/features/file-icons/file-icons.icon-data.test.ts imports src/lib/features/file-icons/file-icons.logic.ts
## symbols
sym src/lib/features/file-icons/file-icons.logic.ts:14 fn addRecentIcon(recent: RecentIcon[], iconPack: IconPackId, iconName: string): RecentIcon[] L4 | Adds an icon to the recently used list.
by src/lib/features/file-icons/file-icons.logic.ts:addRecentIcon <- src/lib/features/file-icons/file-icons.service.ts:78 in trackRecentIcon call
sym src/lib/features/file-icons/file-icons.logic.ts:41 fn parseIconValuePermissive(raw: string): { iconPack: IconPackId; iconName: string } | null L8 | Parses an icon value that may be either `pack:name` or a bare name.
by src/lib/features/file-icons/file-icons.logic.ts:parseIconValuePermissive <- src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:207 in iconRef=$derived call
by src/lib/features/file-icons/file-icons.logic.ts:parseIconValuePermissive <- src/lib/features/rail-shell/Rail.svelte:201 in actionIcon call
by src/lib/features/file-icons/file-icons.logic.ts:parseIconValuePermissive <- src/lib/features/type-definitions/type-sidebar.logic.ts:534 in updateViewIconYaml call
by src/lib/features/file-icons/file-icons.logic.ts:parseIconValuePermissive <- src/lib/plugins/mods/mods-host.service.ts:592 in createModContext call
sym src/lib/features/file-icons/file-icons.logic.ts:130 fn extractIconFromFrontmatter(content: string): { iconPack: IconPackId; iconName: string } | null L4 | Extracts icon assignment from raw markdown content's YAML frontmatter.
by src/lib/features/file-icons/file-icons.logic.ts:extractIconFromFrontmatter <- src/lib/features/file-icons/file-icons.service.ts:245 in updateFrontmatterIconForFile call
sym src/lib/features/file-icons/file-icons.logic.ts:139 fn extractIconColorsFromFrontmatter(content: string): { color?: string; titleColor?: string } L4 | Extracts `_color` and `_title_color`, or their aliases, from raw markdown frontmatter.
by src/lib/features/file-icons/file-icons.logic.ts:extractIconColorsFromFrontmatter <- src/lib/features/file-icons/file-icons.service.ts:245 in updateFrontmatterIconForFile call
sym src/lib/features/file-icons/file-icons.logic.ts:149 fn extractIconFromParsedFrontmatter(frontmatter: Record<string, FrontmatterValue>): { iconPack: IconPackId; iconName: string } | null L7 | Extracts the icon assignment from already-parsed frontmatter (from a Rust `NoteEntryV2.frontmatter` snapshot).
by src/lib/features/file-icons/file-icons.logic.ts:extractIconFromParsedFrontmatter <- src/lib/features/file-icons/file-icons.service.ts:208 in buildFrontmatterIconIndex call
sym src/lib/features/file-icons/file-icons.logic.ts:170 fn extractIconColorsFromParsedFrontmatter(frontmatter: Record<string, FrontmatterValue>): { color?: string; titleColor?: string } L10 | Extracts `_color` and `_title_color` from already-parsed frontmatter.
by src/lib/features/file-icons/file-icons.logic.ts:extractIconColorsFromParsedFrontmatter <- src/lib/features/file-icons/file-icons.service.ts:209 in buildFrontmatterIconIndex call
sym src/lib/features/file-icons/file-icons.logic.ts:182 fn mergeIconRef(icon: { iconPack: IconPackId; iconName: string } | null, colors: { color?: string; titleColor?: string }): { iconPack?… L7 | Joins an icon and its colors into one reference; null when the file sets neither.
by src/lib/features/file-icons/file-icons.logic.ts:mergeIconRef <- src/lib/features/file-icons/file-icons.service.ts:207 in buildFrontmatterIconIndex call +1
sym src/lib/features/file-icons/file-icons.logic.ts:199 fn extractViewIcon(content: string): { iconPack?: IconPackId; iconName?: string; color?: string; titleColor?: string } | null L13 | Extracts the icon and its colors from a `.view` file.
by src/lib/features/file-icons/file-icons.logic.ts:extractViewIcon <- src/lib/features/file-icons/file-icons.service.ts:244 in updateFrontmatterIconForFile call
by src/lib/features/file-icons/file-icons.logic.ts:extractViewIcon <- src/lib/features/type-definitions/type-sidebar.logic.ts:536 in updateViewIconYaml call +1
sym src/lib/features/file-icons/file-icons.logic.ts:219 fn iconColorCss(color: string | undefined): string | undefined L5 | CSS color for an icon's `_color`: a type palette name (`green`, any case) becomes the active theme's token, `var(--type-green)`; any other value (a hex from th…
by src/lib/features/file-icons/file-icons.logic.ts:iconColorCss <- src/lib/features/file-icons/IconRenderer.svelte:20 in cssColor=$derived call
by src/lib/features/file-icons/file-icons.logic.ts:iconColorCss <- src/lib/features/rail-shell/Rail.svelte:167 in pinRow call
sym src/lib/features/file-icons/file-icons.logic.ts:231 fn iconColorStyle(color: string | undefined): string | undefined L4 | The inline `style` that colors an item's default icon, a Lucide component drawn in `currentColor`, with the item's `_color` when it has no icon of its own: the…
by src/lib/features/file-icons/file-icons.logic.ts:iconColorStyle <- src/lib/app/EditorView.svelte:61 in (markup) markup
by src/lib/features/file-icons/file-icons.logic.ts:iconColorStyle <- src/lib/features/note-list/NoteRow.svelte:56 in (markup) markup +1
by src/lib/features/file-icons/file-icons.logic.ts:iconColorStyle <- src/lib/features/properties/PropertiesView.svelte:268 in (markup) markup
by src/lib/features/file-icons/file-icons.logic.ts:iconColorStyle <- src/lib/features/properties/RelationshipSearch.svelte:76 in (markup) markup
by src/lib/features/file-icons/file-icons.logic.ts:iconColorStyle <- src/lib/features/rail-shell/FilesNavigator.svelte:489 in (markup) markup +1
by src/lib/features/file-icons/file-icons.logic.ts:iconColorStyle <- src/lib/features/rail-shell/TypesNavigator.svelte:292 in (markup) markup +1
by src/lib/features/file-icons/file-icons.logic.ts:iconColorStyle <- src/lib/features/tasks/TasksView.svelte:762 in (markup) markup
sym src/lib/features/file-icons/file-icons.logic.ts:237 fn filterIcons(icons: NormalizedIcon[], query: string): NormalizedIcon[] L9 | Filters icons by a search query matching name or keywords
by src/lib/features/file-icons/file-icons.logic.ts:filterIcons <- src/lib/features/file-icons/IconPicker.svelte:104 in filteredIcons=$derived call
## locals
local src/lib/features/file-icons/file-icons.logic.ts:25 fn parseIconValue(raw: string): { iconPack: IconPackId; iconName: string } | null L11
local src/lib/features/file-icons/file-icons.logic.ts:62 fn foldIconAliases(parsed: unknown): Record<string, FrontmatterValue> | null L8
local src/lib/features/file-icons/file-icons.logic.ts:83 fn parseFrontmatterIconFields(content: string): Record<string, FrontmatterValue> | null L9
local src/lib/features/file-icons/file-icons.logic.ts:104 fn readIconFieldsByLine(raw: string): Record<string, FrontmatterValue> L15
local src/lib/features/file-icons/file-icons.logic.ts:162 fn isSafeCssValue(value: string): boolean L3
## calls
call src/lib/features/file-icons/file-icons.logic.ts:44 in parseIconValuePermissive -> src/lib/features/file-icons/file-icons.logic.ts:parseIconValue call
call src/lib/features/file-icons/file-icons.logic.ts:84 in parseFrontmatterIconFields -> src/lib/core/frontmatter/properties.logic.ts:extractRawFrontmatter call
call src/lib/features/file-icons/file-icons.logic.ts:87 in parseFrontmatterIconFields -> src/lib/features/file-icons/file-icons.logic.ts:foldIconAliases call
call src/lib/features/file-icons/file-icons.logic.ts:89 in parseFrontmatterIconFields -> src/lib/features/file-icons/file-icons.logic.ts:readIconFieldsByLine call
call src/lib/features/file-icons/file-icons.logic.ts:131 in extractIconFromFrontmatter -> src/lib/features/file-icons/file-icons.logic.ts:parseFrontmatterIconFields call
call src/lib/features/file-icons/file-icons.logic.ts:132 in extractIconFromFrontmatter -> src/lib/features/file-icons/file-icons.logic.ts:extractIconFromParsedFrontmatter call
call src/lib/features/file-icons/file-icons.logic.ts:140 in extractIconColorsFromFrontmatter -> src/lib/features/file-icons/file-icons.logic.ts:parseFrontmatterIconFields call
call src/lib/features/file-icons/file-icons.logic.ts:141 in extractIconColorsFromFrontmatter -> src/lib/features/file-icons/file-icons.logic.ts:extractIconColorsFromParsedFrontmatter call
call src/lib/features/file-icons/file-icons.logic.ts:154 in extractIconFromParsedFrontmatter -> src/lib/features/file-icons/file-icons.logic.ts:parseIconValuePermissive call
call src/lib/features/file-icons/file-icons.logic.ts:175 in extractIconColorsFromParsedFrontmatter -> src/lib/features/file-icons/file-icons.logic.ts:isSafeCssValue call +1
call src/lib/features/file-icons/file-icons.logic.ts:208 in extractViewIcon -> src/lib/features/file-icons/file-icons.logic.ts:foldIconAliases call
call src/lib/features/file-icons/file-icons.logic.ts:210 in extractViewIcon -> src/lib/features/file-icons/file-icons.logic.ts:extractIconColorsFromParsedFrontmatter call
call src/lib/features/file-icons/file-icons.logic.ts:210 in extractViewIcon -> src/lib/features/file-icons/file-icons.logic.ts:extractIconFromParsedFrontmatter call
call src/lib/features/file-icons/file-icons.logic.ts:210 in extractViewIcon -> src/lib/features/file-icons/file-icons.logic.ts:mergeIconRef call
call src/lib/features/file-icons/file-icons.logic.ts:220 in iconColorCss -> src/lib/features/file-icons/file-icons.logic.ts:isSafeCssValue call
call src/lib/features/file-icons/file-icons.logic.ts:232 in iconColorStyle -> src/lib/features/file-icons/file-icons.logic.ts:iconColorCss call

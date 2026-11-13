# file card src/lib/features/file-icons/frontmatter-icon.service.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/file-icons/frontmatter-icon.service.ts ' codemap/files
file src/lib/features/file-icons/frontmatter-icon.service.ts service L90 module src/lib/features/file-icons in1 t2
## imports
imp src/lib/features/file-icons/frontmatter-icon.service.ts:1 -> pkg:@tauri-apps/plugin-fs readTextFile
imp src/lib/features/file-icons/frontmatter-icon.service.ts:2 -> src/lib/core/editor/editor.store.svelte.ts editorStore
imp src/lib/features/file-icons/frontmatter-icon.service.ts:3 -> src/lib/core/frontmatter/frontmatter-write.service.ts FrontmatterWriteError,toastFrontmatterWriteError,updateNoteFrontmatter
imp src/lib/features/file-icons/frontmatter-icon.service.ts:8 -> src/lib/core/frontmatter/properties.logic.ts parseFrontmatterProperties,updatePropertyValue,addProperty,removeProperty
imp src/lib/features/file-icons/frontmatter-icon.service.ts:14 -> src/lib/core/frontmatter/properties.types.ts type:Property
imp src/lib/features/file-icons/frontmatter-icon.service.ts:15 -> src/lib/features/file-icons/file-icons.types.ts type:IconPackId
## imported-by
imp src/lib/features/file-icons/file-icons.service.ts:128 -> src/lib/features/file-icons/frontmatter-icon.service.ts dyn:setFrontmatterIcon
imp src/lib/features/file-icons/file-icons.service.ts:138 -> src/lib/features/file-icons/frontmatter-icon.service.ts dyn:setFrontmatterIcon
imp src/lib/features/file-icons/file-icons.service.ts:159 -> src/lib/features/file-icons/frontmatter-icon.service.ts dyn:setFrontmatterIconColors
imp src/lib/features/file-icons/file-icons.service.ts:176 -> src/lib/features/file-icons/frontmatter-icon.service.ts dyn:removeFrontmatterIcon
imp src/lib/features/file-icons/file-icons.service.ts:186 -> src/lib/features/file-icons/frontmatter-icon.service.ts dyn:removeFrontmatterIcon
## reach
in2 src/lib/features/file-icons/frontmatter-icon.service.ts 7 files in 5 modules: src/lib/app(2) src/lib/features/rail-shell(2) src/lib/features/auto-organize(1) src/lib/features/note-list(1) src/lib/plugins/mods(1)
out2 src/lib/features/file-icons/frontmatter-icon.service.ts 7 files in 3 modules: src/lib/core/editor(4) src/lib/utils(2) src/lib/core/vault(1)
## tests
test src/tests/lib/features/file-icons/frontmatter-icon.service.test.ts imports src/lib/features/file-icons/frontmatter-icon.service.ts mirror
test src/tests/lib/features/auto-organize/auto-organize.no-chain.test.ts imports src/lib/features/file-icons/frontmatter-icon.service.ts
## symbols
sym src/lib/features/file-icons/frontmatter-icon.service.ts:57 fn setFrontmatterIcon(filePath: string, iconPack: IconPackId, iconName: string, color?: string, titleColor?: string): Promise<boolean> L11 | Writes _icon, _color, and _title_color to a markdown file's frontmatter, keeping unsaved edits of an open tab.
by src/lib/features/file-icons/frontmatter-icon.service.ts:setFrontmatterIcon <- src/lib/features/file-icons/file-icons.service.ts:129 in setIconForPath call +1
sym src/lib/features/file-icons/frontmatter-icon.service.ts:74 fn setFrontmatterIconColors(filePath: string, color?: string, titleColor?: string): Promise<boolean> L3 | Writes _color and _title_color to a markdown file's frontmatter, leaving _icon as it is.
by src/lib/features/file-icons/frontmatter-icon.service.ts:setFrontmatterIconColors <- src/lib/features/file-icons/file-icons.service.ts:160 in setIconColors call
sym src/lib/features/file-icons/frontmatter-icon.service.ts:84 fn removeFrontmatterIcon(filePath: string): Promise<boolean> L7 | Removes _icon, _color, and _title_color from a markdown file's frontmatter, keeping unsaved edits of an open tab.
by src/lib/features/file-icons/frontmatter-icon.service.ts:removeFrontmatterIcon <- src/lib/features/file-icons/file-icons.service.ts:177 in removeIconForPath call +1
## locals
local src/lib/features/file-icons/frontmatter-icon.service.ts:20 fn upsertProperty(properties: Property[], key: string, value: string): Property[] L5
local src/lib/features/file-icons/frontmatter-icon.service.ts:26 fn withIconColors(props: Property[], color?: string, titleColor?: string): Property[] L6
local src/lib/features/file-icons/frontmatter-icon.service.ts:38 fn writeIconFrontmatter(filePath: string, mutate: (props: Property[]) => Property[]): Promise<boolean> L13
## calls
call src/lib/features/file-icons/frontmatter-icon.service.ts:22 in upsertProperty -> src/lib/core/frontmatter/properties.logic.ts:updatePropertyValue call +1
call src/lib/features/file-icons/frontmatter-icon.service.ts:23 in upsertProperty -> src/lib/core/frontmatter/properties.logic.ts:addProperty call
call src/lib/features/file-icons/frontmatter-icon.service.ts:27 in withIconColors -> src/lib/core/frontmatter/properties.logic.ts:removeProperty call +1
call src/lib/features/file-icons/frontmatter-icon.service.ts:27 in withIconColors -> src/lib/features/file-icons/frontmatter-icon.service.ts:upsertProperty call +1
call src/lib/features/file-icons/frontmatter-icon.service.ts:43 in writeIconFrontmatter -> src/lib/core/frontmatter/frontmatter-write.service.ts:updateNoteFrontmatter call
call src/lib/features/file-icons/frontmatter-icon.service.ts:47 in writeIconFrontmatter -> src/lib/core/frontmatter/frontmatter-write.service.ts:toastFrontmatterWriteError call
call src/lib/features/file-icons/frontmatter-icon.service.ts:64 in setFrontmatterIcon -> src/lib/features/file-icons/frontmatter-icon.service.ts:writeIconFrontmatter call
call src/lib/features/file-icons/frontmatter-icon.service.ts:65 in setFrontmatterIcon -> src/lib/features/file-icons/frontmatter-icon.service.ts:upsertProperty call
call src/lib/features/file-icons/frontmatter-icon.service.ts:65 in setFrontmatterIcon -> src/lib/features/file-icons/frontmatter-icon.service.ts:withIconColors call
call src/lib/features/file-icons/frontmatter-icon.service.ts:75 in setFrontmatterIconColors -> src/lib/features/file-icons/frontmatter-icon.service.ts:withIconColors call
call src/lib/features/file-icons/frontmatter-icon.service.ts:75 in setFrontmatterIconColors -> src/lib/features/file-icons/frontmatter-icon.service.ts:writeIconFrontmatter call
call src/lib/features/file-icons/frontmatter-icon.service.ts:87 in removeFrontmatterIcon -> src/lib/core/frontmatter/properties.logic.ts:parseFrontmatterProperties call
call src/lib/features/file-icons/frontmatter-icon.service.ts:89 in removeFrontmatterIcon -> src/lib/features/file-icons/frontmatter-icon.service.ts:writeIconFrontmatter call
## effects
fx src/lib/features/file-icons/frontmatter-icon.service.ts:86 tauri-fs.readTextFile in removeFrontmatterIcon

# file card src/lib/features/properties/PropertiesView.svelte
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/properties/PropertiesView.svelte ' codemap/files
file src/lib/features/properties/PropertiesView.svelte component L293 module src/lib/features/properties in1 t1
## imports
imp src/lib/features/properties/PropertiesView.svelte:7 -> src/lib/components/ui/separator/index.ts Separator
imp src/lib/features/properties/PropertiesView.svelte:8 -> src/lib/components/ui/dropdown-menu/index.ts *
imp src/lib/features/properties/PropertiesView.svelte:9 -> src/lib/core/editor/editor.store.svelte.ts editorStore
imp src/lib/features/properties/PropertiesView.svelte:10 -> src/lib/core/editor/editor.service.ts openFileInEditor
imp src/lib/features/properties/PropertiesView.svelte:11 -> src/lib/core/layout/SidebarSection.svelte default
imp src/lib/features/properties/PropertiesView.svelte:12 -> src/lib/core/filesystem/fs.store.svelte.ts fsStore
imp src/lib/features/properties/PropertiesView.svelte:13 -> src/lib/core/vault/vault.store.svelte.ts vaultStore
imp src/lib/features/properties/PropertiesView.svelte:14 -> src/lib/core/filesystem/file-entries.logic.ts flattenFileTree
imp src/lib/features/properties/PropertiesView.svelte:15 -> src/lib/core/filesystem/wikilink-resolution.logic.ts resolveWikilink
imp src/lib/features/properties/PropertiesView.svelte:16 -> src/lib/core/frontmatter/properties.logic.ts resolveRelationshipLinks,computeAddRelationshipValue,computeRemoveRelationshipValue,normalizeTypeCasing,type:ResolvedLink
imp src/lib/features/properties/PropertiesView.svelte:23 -> src/lib/core/frontmatter/properties.types.ts type:PropertyType
imp src/lib/features/properties/PropertiesView.svelte:24 -> src/lib/features/type-definitions/type-definitions.store.svelte.ts typeDefinitionsStore
imp src/lib/features/properties/PropertiesView.svelte:25 -> src/lib/features/file-icons/icon-resolver.ts resolveIconForPath,resolveIconForType
imp src/lib/features/properties/PropertiesView.svelte:26 -> src/lib/features/file-icons/file-icons.logic.ts iconColorStyle
imp src/lib/features/properties/PropertiesView.svelte:27 -> src/lib/features/file-icons/IconRenderer.svelte default
imp src/lib/features/properties/PropertiesView.svelte:28 -> src/lib/features/properties/properties.store.svelte.ts propertiesStore
imp src/lib/features/properties/PropertiesView.svelte:29 -> src/lib/features/properties/properties.service.ts updateProperty,renameProperty,removePropertyByKey,addNewProperty,upsertProperty,parseAndSetProperties,consumeSkipNextParse,syncPropertiesFromActiveTab
imp src/lib/features/properties/PropertiesView.svelte:40 -> src/lib/features/properties/PropertyField.svelte default
imp src/lib/features/properties/PropertiesView.svelte:41 -> src/lib/features/properties/RelationshipSearch.svelte default
## imported-by
imp src/lib/app/AppShell.svelte:45 -> src/lib/features/properties/PropertiesView.svelte default
## reach
in2 src/lib/features/properties/PropertiesView.svelte 1 files in 1 modules: src/routes(1)
out2 src/lib/features/properties/PropertiesView.svelte 46 files in 12 modules: src/lib/components(21) src/lib/utils(8) src/lib/core/editor(3) src/lib/features/file-icons(3) src/lib/core/filesystem(2) +7 modules
## tests
test src/tests/lib/features/properties/PropertiesView.test.ts imports src/lib/features/properties/PropertiesView.svelte mirror
## symbols
sym src/lib/features/properties/PropertiesView.svelte:1 component PropertiesView L293
by src/lib/features/properties/PropertiesView.svelte:default <- src/lib/app/AppShell.svelte:279 in (markup) mount
## locals
local src/lib/features/properties/PropertiesView.svelte:70 fn addRelationshipLink(key: string, fileName: string) L9
local src/lib/features/properties/PropertiesView.svelte:80 fn removeRelationshipLink(key: string, raw: string) L10
local src/lib/features/properties/PropertiesView.svelte:121 fn handleUpdate(key: string, value: string | number | boolean | string[], type?: PropertyType): boolean L7
local src/lib/features/properties/PropertiesView.svelte:129 fn handleRename(oldKey: string, newKey: string) L3
local src/lib/features/properties/PropertiesView.svelte:133 fn handleRemove(key: string) L3
local src/lib/features/properties/PropertiesView.svelte:137 fn handleAddProperty() L6
local src/lib/features/properties/PropertiesView.svelte:144 fn handleAddKeydown(e: KeyboardEvent) L9
## mounts
mount src/lib/features/properties/PropertiesView.svelte:156 SidebarSection -> src/lib/core/layout/SidebarSection.svelte
mount src/lib/features/properties/PropertiesView.svelte:179 IconRenderer -> src/lib/features/file-icons/IconRenderer.svelte
mount src/lib/features/properties/PropertiesView.svelte:193 IconRenderer -> src/lib/features/file-icons/IconRenderer.svelte
mount src/lib/features/properties/PropertiesView.svelte:211 PropertyField -> src/lib/features/properties/PropertyField.svelte
mount src/lib/features/properties/PropertiesView.svelte:244 Separator -> src/lib/components/ui/separator/separator.svelte
mount src/lib/features/properties/PropertiesView.svelte:252 RelationshipSearch -> src/lib/features/properties/RelationshipSearch.svelte
mount src/lib/features/properties/PropertiesView.svelte:266 IconRenderer -> src/lib/features/file-icons/IconRenderer.svelte
## mounted-at
mount src/lib/app/AppShell.svelte:279 PropertiesView -> src/lib/features/properties/PropertiesView.svelte
## calls
call src/lib/features/properties/PropertiesView.svelte:61 in relLinksMap=$derived -> src/lib/core/filesystem/file-entries.logic.ts:flattenFileTree call
call src/lib/features/properties/PropertiesView.svelte:65 in relLinksMap=$derived -> src/lib/core/filesystem/wikilink-resolution.logic.ts:resolveWikilink ref
call src/lib/features/properties/PropertiesView.svelte:65 in relLinksMap=$derived -> src/lib/core/frontmatter/properties.logic.ts:resolveRelationshipLinks call
call src/lib/features/properties/PropertiesView.svelte:72 in addRelationshipLink -> src/lib/core/frontmatter/properties.logic.ts:computeAddRelationshipValue call
call src/lib/features/properties/PropertiesView.svelte:74 in addRelationshipLink -> src/lib/features/properties/properties.service.ts:upsertProperty call
call src/lib/features/properties/PropertiesView.svelte:76 in addRelationshipLink -> src/lib/features/properties/properties.service.ts:updateProperty call
call src/lib/features/properties/PropertiesView.svelte:83 in removeRelationshipLink -> src/lib/core/frontmatter/properties.logic.ts:computeRemoveRelationshipValue call
call src/lib/features/properties/PropertiesView.svelte:85 in removeRelationshipLink -> src/lib/features/properties/properties.service.ts:removePropertyByKey call
call src/lib/features/properties/PropertiesView.svelte:87 in removeRelationshipLink -> src/lib/features/properties/properties.service.ts:updateProperty call
call src/lib/features/properties/PropertiesView.svelte:93 in typeName=$derived -> src/lib/core/frontmatter/properties.logic.ts:normalizeTypeCasing call
call src/lib/features/properties/PropertiesView.svelte:108 in $effect@105 -> src/lib/features/properties/properties.service.ts:syncPropertiesFromActiveTab call
call src/lib/features/properties/PropertiesView.svelte:113 in $effect@105 -> src/lib/features/properties/properties.service.ts:consumeSkipNextParse call
call src/lib/features/properties/PropertiesView.svelte:114 in $effect@105 -> src/lib/features/properties/properties.service.ts:parseAndSetProperties call
call src/lib/features/properties/PropertiesView.svelte:126 in handleUpdate -> src/lib/features/properties/properties.service.ts:updateProperty call
call src/lib/features/properties/PropertiesView.svelte:130 in handleRename -> src/lib/features/properties/properties.service.ts:renameProperty call
call src/lib/features/properties/PropertiesView.svelte:134 in handleRemove -> src/lib/features/properties/properties.service.ts:removePropertyByKey call
call src/lib/features/properties/PropertiesView.svelte:138 in handleAddProperty -> src/lib/features/properties/properties.service.ts:addNewProperty call
call src/lib/features/properties/PropertiesView.svelte:147 in handleAddKeydown -> src/lib/features/properties/PropertiesView.svelte:handleAddProperty call
call src/lib/features/properties/PropertiesView.svelte:173 in (markup) -> src/lib/features/file-icons/icon-resolver.ts:resolveIconForType markup +1
call src/lib/features/properties/PropertiesView.svelte:190 in (markup) -> src/lib/features/properties/PropertiesView.svelte:handleUpdate markup +1
call src/lib/features/properties/PropertiesView.svelte:214 in (markup) -> src/lib/features/properties/PropertiesView.svelte:handleRename markup
call src/lib/features/properties/PropertiesView.svelte:215 in (markup) -> src/lib/features/properties/PropertiesView.svelte:handleRemove markup
call src/lib/features/properties/PropertiesView.svelte:229 in (markup) -> src/lib/features/properties/PropertiesView.svelte:handleAddKeydown markup
call src/lib/features/properties/PropertiesView.svelte:252 in (markup) -> src/lib/features/properties/PropertiesView.svelte:addRelationshipLink markup
call src/lib/features/properties/PropertiesView.svelte:258 in (markup) -> src/lib/features/file-icons/icon-resolver.ts:resolveIconForPath markup
call src/lib/features/properties/PropertiesView.svelte:263 in (markup) -> src/lib/core/editor/editor.service.ts:openFileInEditor markup
call src/lib/features/properties/PropertiesView.svelte:268 in (markup) -> src/lib/features/file-icons/file-icons.logic.ts:iconColorStyle markup
call src/lib/features/properties/PropertiesView.svelte:280 in (markup) -> src/lib/features/properties/PropertiesView.svelte:removeRelationshipLink markup
## effects
fx src/lib/features/properties/PropertiesView.svelte:48 svelte.$effect in (script)
fx src/lib/features/properties/PropertiesView.svelte:105 svelte.$effect in (script)
fx src/lib/features/properties/PropertiesView.svelte:110 timer.setTimeout delay=300 in $effect@105

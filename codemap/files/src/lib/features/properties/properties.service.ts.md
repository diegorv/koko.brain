# file card src/lib/features/properties/properties.service.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/properties/properties.service.ts ' codemap/files
file src/lib/features/properties/properties.service.ts service L208 module src/lib/features/properties in2 t8
## imports
imp src/lib/features/properties/properties.service.ts:1 -> src/lib/core/editor/editor.store.svelte.ts editorStore
imp src/lib/features/properties/properties.service.ts:2 -> src/lib/core/editor/editor.service.ts syncExternalContentToEditor
imp src/lib/features/properties/properties.service.ts:3 -> src/lib/core/frontmatter/frontmatter-write.service.ts FrontmatterWriteError,toastFrontmatterWriteError
imp src/lib/features/properties/properties.service.ts:7 -> src/lib/core/frontmatter/properties.logic.ts parseFrontmatterProperties,extractBody,rebuildContent,detectLossyFrontmatter,addProperty,removeProperty,updatePropertyValue,renamePropertyKey
imp src/lib/features/properties/properties.service.ts:17 -> src/lib/core/frontmatter/properties.types.ts type:Property,type:PropertyType
imp src/lib/features/properties/properties.service.ts:18 -> src/lib/utils/frontmatter-aliases.ts canonicalizeKey
imp src/lib/features/properties/properties.service.ts:19 -> src/lib/utils/log.service.ts appendLog
imp src/lib/features/properties/properties.service.ts:20 -> src/lib/features/properties/properties.store.svelte.ts propertiesStore
## imported-by
imp src/lib/app/lifecycle/app-lifecycle.service.ts:42 -> src/lib/features/properties/properties.service.ts resetProperties
imp src/lib/features/properties/PropertiesView.svelte:29 -> src/lib/features/properties/properties.service.ts updateProperty,renameProperty,removePropertyByKey,addNewProperty,upsertProperty,parseAndSetProperties,consumeSkipNextParse,syncPropertiesFromActiveTab
## reach
in2 src/lib/features/properties/properties.service.ts 2 files in 2 modules: src/lib/app(1) src/routes(1)
out2 src/lib/features/properties/properties.service.ts 10 files in 6 modules: src/lib/core/editor(3) src/lib/utils(3) src/lib/contracts(1) src/lib/core/filesystem(1) src/lib/core/markdown-editor(1) +1 modules
## tests
test src/tests/lib/features/properties/properties.service.test.ts imports src/lib/features/properties/properties.service.ts mirror
test src/tests/lib/features/properties/NoteInfo.test.ts imports src/lib/features/properties/properties.service.ts
test src/tests/lib/features/properties/PropertiesView.test.ts imports src/lib/features/properties/properties.service.ts
test src/tests/lib/features/properties/frontmatter-number-spelling.test.ts imports src/lib/features/properties/properties.service.ts
test src/tests/lib/features/properties/panel-meta-bind-lossy-rewrite.test.ts imports src/lib/features/properties/properties.service.ts
test src/tests/lib/features/properties/properties-cross-note.test.ts imports src/lib/features/properties/properties.service.ts
test src/tests/lib/features/properties/properties-refusal-toast.test.ts imports src/lib/features/properties/properties.service.ts
test src/tests/lib/app/lifecycle/app-lifecycle.service.test.ts mocks src/lib/features/properties/properties.service.ts
## symbols
sym src/lib/features/properties/properties.service.ts:37 fn consumeSkipNextParse(path: string | null): boolean L5 | Checks and consumes the skip flag.
by src/lib/features/properties/properties.service.ts:consumeSkipNextParse <- src/lib/features/properties/PropertiesView.svelte:113 in $effect@105 call
sym src/lib/features/properties/properties.service.ts:52 fn syncPropertiesFromActiveTab(path: string | null, content: string): boolean L8 | Parses the active tab into the store at once when the store holds another note's properties (the active path changed), so the panel never shows the previous no…
by src/lib/features/properties/properties.service.ts:syncPropertiesFromActiveTab <- src/lib/features/properties/PropertiesView.svelte:108 in $effect@105 call
sym src/lib/features/properties/properties.service.ts:68 fn propertiesMatchActiveNote(): boolean L6 | Whether the store's properties were parsed from the active note.
sym src/lib/features/properties/properties.service.ts:124 fn updateProperty(key: string, value: string | number | boolean | string[], type?: PropertyType): boolean L10 | Updates a property's value (and optionally its type) in the active note.
by src/lib/features/properties/properties.service.ts:updateProperty <- src/lib/features/properties/PropertiesView.svelte:76 in addRelationshipLink call +2
sym src/lib/features/properties/properties.service.ts:136 fn upsertProperty(key: string, value: string | number | boolean | string[], type?: PropertyType): void L17 | Creates or updates a property in one commit
by src/lib/features/properties/properties.service.ts:upsertProperty <- src/lib/features/properties/PropertiesView.svelte:74 in addRelationshipLink call
sym src/lib/features/properties/properties.service.ts:159 fn renameProperty(oldKey: string, newKey: string): boolean L14 | Renames a property key in the active note.
by src/lib/features/properties/properties.service.ts:renameProperty <- src/lib/features/properties/PropertiesView.svelte:130 in handleRename call
sym src/lib/features/properties/properties.service.ts:175 fn removePropertyByKey(key: string): void L4 | Removes a property by key from the active note
by src/lib/features/properties/properties.service.ts:removePropertyByKey <- src/lib/features/properties/PropertiesView.svelte:85 in removeRelationshipLink call +1
sym src/lib/features/properties/properties.service.ts:184 fn addNewProperty(key: string): boolean L11 | Adds a new empty text property to the active note.
by src/lib/features/properties/properties.service.ts:addNewProperty <- src/lib/features/properties/PropertiesView.svelte:138 in handleAddProperty call
sym src/lib/features/properties/properties.service.ts:200 fn parseAndSetProperties(content: string, path: string | null): void L3 | Parses frontmatter properties from content and updates the store.
by src/lib/features/properties/properties.service.ts:parseAndSetProperties <- src/lib/features/properties/PropertiesView.svelte:114 in $effect@105 call
sym src/lib/features/properties/properties.service.ts:205 fn resetProperties(): void L4 | Resets the properties store to its initial state.
by src/lib/features/properties/properties.service.ts:resetProperties <- src/lib/app/lifecycle/app-lifecycle.service.ts:674 in teardownVault call
## locals
local src/lib/features/properties/properties.service.ts:83 fn commitChanges(updated: Property[]): boolean L27
local src/lib/features/properties/properties.service.ts:115 fn findCanonicalTwin(key: string): Property | undefined L4
## calls
call src/lib/features/properties/properties.service.ts:57 in syncPropertiesFromActiveTab -> src/lib/features/properties/properties.service.ts:parseAndSetProperties call
call src/lib/features/properties/properties.service.ts:71 in propertiesMatchActiveNote -> src/lib/features/properties/properties.service.ts:parseAndSetProperties call
call src/lib/features/properties/properties.service.ts:84 in commitChanges -> src/lib/features/properties/properties.service.ts:propertiesMatchActiveNote call
call src/lib/features/properties/properties.service.ts:87 in commitChanges -> src/lib/core/frontmatter/properties.logic.ts:detectLossyFrontmatter call
call src/lib/features/properties/properties.service.ts:89 in commitChanges -> src/lib/utils/log.service.ts:appendLog call
call src/lib/features/properties/properties.service.ts:92 in commitChanges -> src/lib/core/frontmatter/frontmatter-write.service.ts:FrontmatterWriteError new
call src/lib/features/properties/properties.service.ts:92 in commitChanges -> src/lib/core/frontmatter/frontmatter-write.service.ts:toastFrontmatterWriteError call
call src/lib/features/properties/properties.service.ts:97 in commitChanges -> src/lib/features/properties/properties.store.svelte.ts:propertiesStore.setProperties mcall
call src/lib/features/properties/properties.service.ts:98 in commitChanges -> src/lib/core/frontmatter/properties.logic.ts:extractBody call
call src/lib/features/properties/properties.service.ts:99 in commitChanges -> src/lib/core/frontmatter/properties.logic.ts:rebuildContent call
call src/lib/features/properties/properties.service.ts:106 in commitChanges -> src/lib/core/editor/editor.service.ts:syncExternalContentToEditor call
call src/lib/features/properties/properties.service.ts:116 in findCanonicalTwin -> src/lib/utils/frontmatter-aliases.ts:canonicalizeKey call +1
call src/lib/features/properties/properties.service.ts:130 in updateProperty -> src/lib/features/properties/properties.service.ts:findCanonicalTwin call
call src/lib/features/properties/properties.service.ts:131 in updateProperty -> src/lib/core/frontmatter/properties.logic.ts:updatePropertyValue call
call src/lib/features/properties/properties.service.ts:132 in updateProperty -> src/lib/features/properties/properties.service.ts:commitChanges call
call src/lib/features/properties/properties.service.ts:143 in upsertProperty -> src/lib/features/properties/properties.service.ts:findCanonicalTwin call
call src/lib/features/properties/properties.service.ts:145 in upsertProperty -> src/lib/core/frontmatter/properties.logic.ts:updatePropertyValue call
call src/lib/features/properties/properties.service.ts:146 in upsertProperty -> src/lib/features/properties/properties.service.ts:commitChanges call +1
call src/lib/features/properties/properties.service.ts:163 in renameProperty -> src/lib/utils/frontmatter-aliases.ts:canonicalizeKey call +1
call src/lib/features/properties/properties.service.ts:170 in renameProperty -> src/lib/core/frontmatter/properties.logic.ts:renamePropertyKey call
call src/lib/features/properties/properties.service.ts:171 in renameProperty -> src/lib/features/properties/properties.service.ts:commitChanges call
call src/lib/features/properties/properties.service.ts:176 in removePropertyByKey -> src/lib/core/frontmatter/properties.logic.ts:removeProperty call
call src/lib/features/properties/properties.service.ts:177 in removePropertyByKey -> src/lib/features/properties/properties.service.ts:commitChanges call
call src/lib/features/properties/properties.service.ts:190 in addNewProperty -> src/lib/utils/frontmatter-aliases.ts:canonicalizeKey call +1
call src/lib/features/properties/properties.service.ts:192 in addNewProperty -> src/lib/core/frontmatter/properties.logic.ts:addProperty call
call src/lib/features/properties/properties.service.ts:193 in addNewProperty -> src/lib/features/properties/properties.service.ts:commitChanges call
call src/lib/features/properties/properties.service.ts:201 in parseAndSetProperties -> src/lib/core/frontmatter/properties.logic.ts:parseFrontmatterProperties call
call src/lib/features/properties/properties.service.ts:201 in parseAndSetProperties -> src/lib/features/properties/properties.store.svelte.ts:propertiesStore.setProperties mcall
call src/lib/features/properties/properties.service.ts:207 in resetProperties -> src/lib/features/properties/properties.store.svelte.ts:propertiesStore.reset mcall

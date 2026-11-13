# file card src/lib/features/type-definitions/type-definitions.logic.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/type-definitions/type-definitions.logic.ts ' codemap/files
file src/lib/features/type-definitions/type-definitions.logic.ts logic L275 module src/lib/features/type-definitions in9 t21
## imports
imp src/lib/features/type-definitions/type-definitions.logic.ts:1 -> src/lib/types/vault-v2.types.ts type:NoteEntryV2,type:FrontmatterValue
imp src/lib/features/type-definitions/type-definitions.logic.ts:2 -> src/lib/core/filesystem/fs.logic.ts getFileNameError,isValidFileName
imp src/lib/features/type-definitions/type-definitions.logic.ts:3 -> src/lib/core/frontmatter/properties.logic.ts normalizeTypeCasing
## imported-by
imp src/lib/features/auto-organize/type-lifecycle-rules.ts:1 -> src/lib/features/type-definitions/type-definitions.logic.ts type:TypeMetadata
imp src/lib/features/event-calendar/EventCalendarSection.svelte:17 -> src/lib/features/type-definitions/type-definitions.logic.ts buildTypeNoteDir,typeNameTakenMessage,validateTypeName
imp src/lib/features/rail-shell/TypesNavigator.svelte:49 -> src/lib/features/type-definitions/type-definitions.logic.ts validateTypeName
imp src/lib/features/rail-shell/lens.logic.ts:19 -> src/lib/features/type-definitions/type-definitions.logic.ts getTypeMetadataFallback,type:TypeMetadata
imp src/lib/features/rail-shell/rail-shell.types.ts:6 -> src/lib/features/type-definitions/type-definitions.logic.ts type:TypeMetadata
imp src/lib/features/type-definitions/ViewDialog.svelte:18 -> src/lib/features/type-definitions/type-definitions.logic.ts validateViewName
imp src/lib/features/type-definitions/type-definitions.service.ts:19 -> src/lib/features/type-definitions/type-definitions.logic.ts buildTypeMetadataMap,sameTypeMetadata,buildTypeNoteDir,rewriteTypeInFrontmatter,typeNameTakenMessage
imp src/lib/features/type-definitions/type-definitions.store.svelte.ts:3 -> src/lib/features/type-definitions/type-definitions.logic.ts type:TypeMetadata
imp src/lib/features/type-definitions/type-sidebar.logic.ts:7 -> src/lib/features/type-definitions/type-definitions.logic.ts type:TypeMetadata
imp src/lib/features/type-definitions/type-sidebar.logic.ts:8 -> src/lib/features/type-definitions/type-definitions.logic.ts getTypeMetadataFallback
## reach
in2 src/lib/features/type-definitions/type-definitions.logic.ts 41 files in 13 modules: src/lib/features/rail-shell(16) src/lib/app(9) src/lib/plugins/calendar(3) src/lib/features/event-calendar(2) src/lib/features/note-list(2) +8 modules: q impact src/lib/features/type-definitions/type-definitions.logic.ts --depth 2
out2 src/lib/features/type-definitions/type-definitions.logic.ts 5 files in 4 modules: src/lib/utils(2) src/lib/contracts(1) src/lib/core/filesystem(1) src/lib/core/frontmatter(1)
## tests
test src/tests/lib/features/type-definitions/type-definitions.logic.test.ts imports src/lib/features/type-definitions/type-definitions.logic.ts mirror
test src/tests/help/type-definitions-views.test.ts imports src/lib/features/type-definitions/type-definitions.logic.ts
test src/tests/lib/app/AppShell.test.ts imports src/lib/features/type-definitions/type-definitions.logic.ts
test src/tests/lib/app/commands.test.ts imports src/lib/features/type-definitions/type-definitions.logic.ts
test src/tests/lib/app/meta-bind-open-view.test.ts imports src/lib/features/type-definitions/type-definitions.logic.ts
test src/tests/lib/features/collection/CollectionView.test.ts imports src/lib/features/type-definitions/type-definitions.logic.ts
test src/tests/lib/features/event-calendar/EventCalendarSection.test.ts imports src/lib/features/type-definitions/type-definitions.logic.ts
test src/tests/lib/features/note-action-bar/NoteActionBar.test.ts imports src/lib/features/type-definitions/type-definitions.logic.ts
test src/tests/lib/features/properties/PropertiesView.test.ts imports src/lib/features/type-definitions/type-definitions.logic.ts
test src/tests/lib/features/rail-shell/Rail.test.ts imports src/lib/features/type-definitions/type-definitions.logic.ts
test src/tests/lib/features/rail-shell/RailNoteList.properties.test.ts imports src/lib/features/type-definitions/type-definitions.logic.ts
test src/tests/lib/features/rail-shell/RailNoteList.search.test.ts imports src/lib/features/type-definitions/type-definitions.logic.ts
test src/tests/lib/features/rail-shell/RailNoteList.sort.test.ts imports src/lib/features/type-definitions/type-definitions.logic.ts
test src/tests/lib/features/rail-shell/RailNoteList.test.ts imports src/lib/features/type-definitions/type-definitions.logic.ts
test src/tests/lib/features/rail-shell/RailNoteList.toolbar.test.ts imports src/lib/features/type-definitions/type-definitions.logic.ts
test src/tests/lib/features/rail-shell/RailNoteList.view.test.ts imports src/lib/features/type-definitions/type-definitions.logic.ts
test src/tests/lib/features/rail-shell/TypesNavigator.test.ts imports src/lib/features/type-definitions/type-definitions.logic.ts
test src/tests/lib/features/rail-shell/lens.logic.test.ts imports src/lib/features/type-definitions/type-definitions.logic.ts
test src/tests/lib/features/rail-shell/new-note.service.test.ts imports src/lib/features/type-definitions/type-definitions.logic.ts
test src/tests/lib/features/rail-shell/view-lens.service.test.ts imports src/lib/features/type-definitions/type-definitions.logic.ts
test src/tests/lib/features/type-definitions/type-definitions.service.test.ts imports src/lib/features/type-definitions/type-definitions.logic.ts
test src/tests/lib/features/auto-organize/type-lifecycle-rules.test.ts imports-type src/lib/features/type-definitions/type-definitions.logic.ts
test src/tests/lib/features/type-definitions/type-definitions.store.test.ts imports-type src/lib/features/type-definitions/type-definitions.logic.ts
test src/tests/lib/features/type-definitions/type-sidebar.logic.test.ts imports-type src/lib/features/type-definitions/type-definitions.logic.ts
## symbols
sym src/lib/features/type-definitions/type-definitions.logic.ts:6 interface TypeMetadata L30 | Display metadata for a type definition.
by src/lib/features/type-definitions/type-definitions.logic.ts:TypeMetadata <- src/lib/features/auto-organize/type-lifecycle-rules.ts:1 in (module) import
by src/lib/features/type-definitions/type-definitions.logic.ts:TypeMetadata <- src/lib/features/rail-shell/lens.logic.ts:19 in (module) import
by src/lib/features/type-definitions/type-definitions.logic.ts:TypeMetadata <- src/lib/features/rail-shell/rail-shell.types.ts:6 in (module) import
by src/lib/features/type-definitions/type-definitions.logic.ts:TypeMetadata <- src/lib/features/type-definitions/type-definitions.store.svelte.ts:3 in (module) import
by src/lib/features/type-definitions/type-definitions.logic.ts:TypeMetadata <- src/lib/features/type-definitions/type-sidebar.logic.ts:7 in (module) import
sym src/lib/features/type-definitions/type-definitions.logic.ts:91 fn isTypeDefinition(entry: NoteEntryV2): boolean L3 | Returns true if the entry is a Type Definition (is_a === "Type").
sym src/lib/features/type-definitions/type-definitions.logic.ts:100 fn extractTypeMetadata(entry: NoteEntryV2): TypeMetadata L22 | Extracts TypeMetadata from a Type Definition entry.
sym src/lib/features/type-definitions/type-definitions.logic.ts:124 fn sameTypeMetadata(a: Map<string, TypeMetadata>, b: Map<string, TypeMetadata>): boolean L8 | True when both maps hold the same type names with field-for-field equal metadata.
by src/lib/features/type-definitions/type-definitions.logic.ts:sameTypeMetadata <- src/lib/features/type-definitions/type-definitions.service.ts:32 in refreshTypeDefinitions call
sym src/lib/features/type-definitions/type-definitions.logic.ts:141 fn buildTypeMetadataMap(entries: NoteEntryV2[]): Map<string, TypeMetadata> L10 | Builds a type metadata map from all vault entries.
by src/lib/features/type-definitions/type-definitions.logic.ts:buildTypeMetadataMap <- src/lib/features/type-definitions/type-definitions.service.ts:30 in refreshTypeDefinitions call
sym src/lib/features/type-definitions/type-definitions.logic.ts:157 fn typeNameTakenMessage(entryName: string, typeName: string): string L3 | Message for a vault-root entry that holds a type's definition file name but is not that type.
by src/lib/features/type-definitions/type-definitions.logic.ts:typeNameTakenMessage <- src/lib/features/event-calendar/EventCalendarSection.svelte:91 in openEventType call +1
by src/lib/features/type-definitions/type-definitions.logic.ts:typeNameTakenMessage <- src/lib/features/type-definitions/type-definitions.service.ts:187 in createTypeDefinition call
sym src/lib/features/type-definitions/type-definitions.logic.ts:168 fn validateTypeName(name: string, existingTypeNames: string[]): string | null L10 | Validates a candidate type name for creation/rename dialogs.
by src/lib/features/type-definitions/type-definitions.logic.ts:validateTypeName <- src/lib/features/event-calendar/EventCalendarSection.svelte:83 in openEventType call
by src/lib/features/type-definitions/type-definitions.logic.ts:validateTypeName <- src/lib/features/rail-shell/TypesNavigator.svelte:469 in (markup) markup +1
sym src/lib/features/type-definitions/type-definitions.logic.ts:187 fn validateViewName(name: string, existingLabels: string[], isFileName = true): string | null L10 | Validates a candidate view name for the view dialog.
by src/lib/features/type-definitions/type-definitions.logic.ts:validateViewName <- src/lib/features/type-definitions/ViewDialog.svelte:57 in nameError=$derived call
sym src/lib/features/type-definitions/type-definitions.logic.ts:210 fn rewriteTypeInFrontmatter(content: string, oldType: string, newType: string): string | null L32 | TS mirror of Rust's `rewrite_type_in_frontmatter` (parsing.rs): rewrites the value of a top-level `_type:` / `type:` frontmatter key when its (unquoted, casing…
by src/lib/features/type-definitions/type-definitions.logic.ts:rewriteTypeInFrontmatter <- src/lib/features/type-definitions/type-definitions.service.ts:231 in renameType call
sym src/lib/features/type-definitions/type-definitions.logic.ts:250 fn buildTypeNoteDir(vaultPath: string, baseFolder: string | null, typeFolder: string | null): string L13 | Builds the absolute directory a new typed note is created in: `vaultPath / baseFolder / typeFolder`, where `baseFolder` is the global setting and `typeFolder` …
by src/lib/features/type-definitions/type-definitions.logic.ts:buildTypeNoteDir <- src/lib/features/event-calendar/EventCalendarSection.svelte:55 in eventFolder=$derived call
by src/lib/features/type-definitions/type-definitions.logic.ts:buildTypeNoteDir <- src/lib/features/type-definitions/type-definitions.service.ts:59 in resolveTypedNoteTarget call
sym src/lib/features/type-definitions/type-definitions.logic.ts:265 fn getTypeMetadataFallback(name: string, map: Map<string, TypeMetadata>): TypeMetadata L11 | Returns metadata for a type name, falling back to builtins then defaults.
by src/lib/features/type-definitions/type-definitions.logic.ts:getTypeMetadataFallback <- src/lib/features/rail-shell/lens.logic.ts:365 in resolveTypeLens call
by src/lib/features/type-definitions/type-definitions.logic.ts:getTypeMetadataFallback <- src/lib/features/type-definitions/type-sidebar.logic.ts:207 in buildTypeSections call
## locals
local src/lib/features/type-definitions/type-definitions.logic.ts:66 fn fmString(fm: Record<string, FrontmatterValue>, key: string): string | null L4
local src/lib/features/type-definitions/type-definitions.logic.ts:72 fn fmNumber(fm: Record<string, FrontmatterValue>, key: string): number | null L4
local src/lib/features/type-definitions/type-definitions.logic.ts:78 fn fmBool(fm: Record<string, FrontmatterValue>, key: string): boolean | null L4
local src/lib/features/type-definitions/type-definitions.logic.ts:84 fn fmStringArray(fm: Record<string, FrontmatterValue>, key: string): string[] | null L5
## calls
call src/lib/features/type-definitions/type-definitions.logic.ts:102 in extractTypeMetadata -> src/lib/core/frontmatter/properties.logic.ts:normalizeTypeCasing call
call src/lib/features/type-definitions/type-definitions.logic.ts:108 in extractTypeMetadata -> src/lib/features/type-definitions/type-definitions.logic.ts:fmString call +7
call src/lib/features/type-definitions/type-definitions.logic.ts:110 in extractTypeMetadata -> src/lib/features/type-definitions/type-definitions.logic.ts:fmNumber call
call src/lib/features/type-definitions/type-definitions.logic.ts:116 in extractTypeMetadata -> src/lib/features/type-definitions/type-definitions.logic.ts:fmBool call +1
call src/lib/features/type-definitions/type-definitions.logic.ts:117 in extractTypeMetadata -> src/lib/features/type-definitions/type-definitions.logic.ts:fmStringArray call
call src/lib/features/type-definitions/type-definitions.logic.ts:144 in buildTypeMetadataMap -> src/lib/features/type-definitions/type-definitions.logic.ts:isTypeDefinition call
call src/lib/features/type-definitions/type-definitions.logic.ts:145 in buildTypeMetadataMap -> src/lib/features/type-definitions/type-definitions.logic.ts:extractTypeMetadata call
call src/lib/features/type-definitions/type-definitions.logic.ts:171 in validateTypeName -> src/lib/core/filesystem/fs.logic.ts:isValidFileName call
call src/lib/features/type-definitions/type-definitions.logic.ts:189 in validateViewName -> src/lib/core/filesystem/fs.logic.ts:getFileNameError call
call src/lib/features/type-definitions/type-definitions.logic.ts:214 in rewriteTypeInFrontmatter -> src/lib/core/frontmatter/properties.logic.ts:normalizeTypeCasing call +1

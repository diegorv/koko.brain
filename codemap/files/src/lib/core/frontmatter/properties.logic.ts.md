# file card src/lib/core/frontmatter/properties.logic.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/frontmatter/properties.logic.ts ' codemap/files
sections: imports, imported-by, reach, tests, symbols, locals, calls
file src/lib/core/frontmatter/properties.logic.ts logic L814 module src/lib/core/frontmatter in27 t26
## imports
imp src/lib/core/frontmatter/properties.logic.ts:16 -> src/lib/utils/frontmatter-aliases.ts canonicalizeKey
imp src/lib/core/frontmatter/properties.logic.ts:17 -> src/lib/core/frontmatter/properties.types.ts type:Property,type:PropertyType
## imported-by
imp src/lib/app/deep-link-actions.ts:10 -> src/lib/core/frontmatter/properties.logic.ts detectLossyFrontmatter
imp src/lib/core/frontmatter/frontmatter-write.service.ts:8 -> src/lib/core/frontmatter/properties.logic.ts detectLossyFrontmatter,extractBody,LOSSY_FRONTMATTER_MESSAGES,parseFrontmatterProperties,rebuildContent,type:LossyFrontmatterReason
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/meta-bind-input-plugin.ts:17 -> src/lib/core/frontmatter/properties.logic.ts parseFrontmatterProperties
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/table-field.ts:11 -> src/lib/core/frontmatter/properties.logic.ts parseFrontmatterProperties
imp src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:10 -> src/lib/core/frontmatter/properties.logic.ts parseFrontmatterProperties,setPropertyByBindTarget,typedOptionValue,extractBody,rebuildContent,detectLossyFrontmatter,LOSSY_FRONTMATTER_MESSAGES
imp src/lib/features/auto-organize/auto-organize.logic.ts:4 -> src/lib/core/frontmatter/properties.logic.ts detectLossyFrontmatter,extractRawFrontmatter,isEmptyPropertyValue,normalizeTypeCasing,parseFrontmatterProperties
imp src/lib/features/auto-organize/auto-organize.service.ts:9 -> src/lib/core/frontmatter/properties.logic.ts detectLossyFrontmatter,extractBody,parseFrontmatterProperties,rebuildContent
imp src/lib/features/collection/collection.logic.ts:13 -> src/lib/core/frontmatter/properties.logic.ts normalizeTypeCasing,parseFrontmatterProperties
imp src/lib/features/deep-link/deep-link.logic.ts:1 -> src/lib/core/frontmatter/properties.logic.ts parseFrontmatterProperties,extractBody,rebuildContent
imp src/lib/features/event-calendar/EventCalendarSection.svelte:14 -> src/lib/core/frontmatter/properties.logic.ts normalizeTypeCasing
imp src/lib/features/event-calendar/event-calendar-event.logic.ts:16 -> src/lib/core/frontmatter/properties.logic.ts extractBody,parseFrontmatterProperties,rebuildContent
imp src/lib/features/event-calendar/event-calendar.service.ts:30 -> src/lib/core/frontmatter/properties.logic.ts detectLossyFrontmatter,extractBody,parseFrontmatterProperties,rebuildContent
imp src/lib/features/file-icons/file-icons.logic.ts:4 -> src/lib/core/frontmatter/properties.logic.ts extractRawFrontmatter
imp src/lib/features/file-icons/frontmatter-icon.service.ts:8 -> src/lib/core/frontmatter/properties.logic.ts parseFrontmatterProperties,updatePropertyValue,addProperty,removeProperty
imp src/lib/features/note-action-bar/note-action-bar.logic.ts:2 -> src/lib/core/frontmatter/properties.logic.ts normalizeTypeCasing,parseFrontmatterProperties
imp src/lib/features/note-action-bar/note-action-bar.service.ts:9 -> src/lib/core/frontmatter/properties.logic.ts ensureFrontmatterLink
imp src/lib/features/properties/PropertiesView.svelte:16 -> src/lib/core/frontmatter/properties.logic.ts resolveRelationshipLinks,computeAddRelationshipValue,computeRemoveRelationshipValue,normalizeTypeCasing,type:ResolvedLink
imp src/lib/features/properties/lifecycle.service.ts:9 -> src/lib/core/frontmatter/properties.logic.ts removeProperty
imp src/lib/features/properties/properties.service.ts:7 -> src/lib/core/frontmatter/properties.logic.ts parseFrontmatterProperties,extractBody,rebuildContent,detectLossyFrontmatter,addProperty,removeProperty,updatePropertyValue,renamePropertyKey
imp src/lib/features/rail-shell/TypesNavigator.svelte:21 -> src/lib/core/frontmatter/properties.logic.ts normalizeTypeCasing
imp src/lib/features/rail-shell/list-prefs.service.ts:2 -> src/lib/core/frontmatter/properties.logic.ts removeProperty
imp src/lib/features/todoist-sync/sync-now.service.ts:17 -> src/lib/core/frontmatter/properties.logic.ts detectLossyFrontmatter,extractBody,parseFrontmatterProperties,rebuildContent
imp src/lib/features/type-definitions/type-definitions.logic.ts:3 -> src/lib/core/frontmatter/properties.logic.ts normalizeTypeCasing
imp src/lib/features/type-definitions/type-definitions.store.svelte.ts:2 -> src/lib/core/frontmatter/properties.logic.ts normalizeTypeCasing
imp src/lib/plugins/one-on-one/one-on-one.service.ts:8 -> src/lib/core/frontmatter/properties.logic.ts ensureFrontmatterLink
imp src/lib/plugins/quick-capture/note-composer.logic.ts:2 -> src/lib/core/frontmatter/properties.logic.ts yamlScalar
imp src/routes/(app)/+layout.svelte:13 -> src/lib/core/frontmatter/properties.logic.ts configurePropertiesDiagnostics
## reach
in2 src/lib/core/frontmatter/properties.logic.ts 67 files in 18 modules: src/lib/features/event-calendar(13) src/lib/app(9) src/lib/core/markdown-editor(7) src/lib/features/collection(6) src/lib/features/rail-shell(5) +13 modules: q impact src/lib/core/frontmatter/properties.logic.ts --depth 2
out2 src/lib/core/frontmatter/properties.logic.ts 0 files in 0 modules: -
## tests
test src/tests/lib/core/frontmatter/properties.logic.test.ts imports src/lib/core/frontmatter/properties.logic.ts mirror
test src/tests/fixtures/calendar-vault.fixture.ts imports src/lib/core/frontmatter/properties.logic.ts
test src/tests/help/auto-organize-doc-examples.test.ts imports src/lib/core/frontmatter/properties.logic.ts
test src/tests/help/auto-organize-switch-back.test.ts imports src/lib/core/frontmatter/properties.logic.ts
test src/tests/help/type-definitions-views.test.ts imports src/lib/core/frontmatter/properties.logic.ts
test src/tests/lib/app/deep-link-capture-frontmatter.test.ts imports src/lib/core/frontmatter/properties.logic.ts
test src/tests/lib/core/frontmatter/frontmatter-write.service.test.ts imports src/lib/core/frontmatter/properties.logic.ts
test src/tests/lib/core/markdown-editor/extensions/live-preview/core/frontmatter-slice.test.ts imports src/lib/core/frontmatter/properties.logic.ts
test src/tests/lib/core/markdown-editor/extensions/live-preview/meta-bind-value-types.test.ts imports src/lib/core/frontmatter/properties.logic.ts
test src/tests/lib/core/markdown-editor/extensions/live-preview/meta-bind-writers.test.ts imports src/lib/core/frontmatter/properties.logic.ts
test src/tests/lib/core/markdown-editor/extensions/live-preview/table-widget.test.ts imports src/lib/core/frontmatter/properties.logic.ts
test src/tests/lib/features/auto-organize/auto-organize.no-chain.test.ts imports src/lib/core/frontmatter/properties.logic.ts
test src/tests/lib/features/auto-organize/auto-organize.service.test.ts imports src/lib/core/frontmatter/properties.logic.ts
test src/tests/lib/features/collection/collection.service.test.ts imports src/lib/core/frontmatter/properties.logic.ts
test src/tests/lib/features/event-calendar/EventDialog.test.ts imports src/lib/core/frontmatter/properties.logic.ts
test src/tests/lib/features/event-calendar/event-calendar-event.logic.test.ts imports src/lib/core/frontmatter/properties.logic.ts
test src/tests/lib/features/note-action-bar/NoteActionBar.test.ts imports src/lib/core/frontmatter/properties.logic.ts
test src/tests/lib/features/properties/bookmark-migration.service.test.ts imports src/lib/core/frontmatter/properties.logic.ts
test src/tests/lib/features/properties/frontmatter-number-spelling.test.ts imports src/lib/core/frontmatter/properties.logic.ts
test src/tests/lib/features/properties/frontmatter-parity.test.ts imports src/lib/core/frontmatter/properties.logic.ts
test src/tests/lib/features/properties/lifecycle.logic.test.ts imports src/lib/core/frontmatter/properties.logic.ts
test src/tests/lib/features/properties/lifecycle.service.test.ts imports src/lib/core/frontmatter/properties.logic.ts
test src/tests/lib/features/rail-shell/RailNoteList.properties.test.ts imports src/lib/core/frontmatter/properties.logic.ts
test src/tests/lib/features/rail-shell/list-prefs.service.test.ts imports src/lib/core/frontmatter/properties.logic.ts
test src/tests/lib/plugins/one-on-one/one-on-one.create.test.ts imports src/lib/core/frontmatter/properties.logic.ts
test src/tests/lib/plugins/quick-capture/note-composer.logic.test.ts imports src/lib/core/frontmatter/properties.logic.ts
## symbols
sym src/lib/core/frontmatter/properties.logic.ts:20 interface PropertiesDiagnostics L4 | Where this module's diagnostics go; set by the app shell.
sym src/lib/core/frontmatter/properties.logic.ts:35 fn configurePropertiesDiagnostics(sink: PropertiesDiagnostics): void L3 | Sets the diagnostics sink.
by src/lib/core/frontmatter/properties.logic.ts:configurePropertiesDiagnostics <- src/routes/(app)/+layout.svelte:31 in (script) call
sym src/lib/core/frontmatter/properties.logic.ts:46 fn extractRawFrontmatter(content: string): string | null L4 | Extracts the raw YAML string from frontmatter delimiters.
by src/lib/core/frontmatter/properties.logic.ts:extractRawFrontmatter <- src/lib/features/auto-organize/auto-organize.logic.ts:865 in propertyWriteSkipReason call
by src/lib/core/frontmatter/properties.logic.ts:extractRawFrontmatter <- src/lib/features/file-icons/file-icons.logic.ts:84 in parseFrontmatterIconFields call
sym src/lib/core/frontmatter/properties.logic.ts:55 fn extractBody(content: string): string L5 | Returns the body content after the frontmatter block.
by src/lib/core/frontmatter/properties.logic.ts:extractBody <- src/lib/core/frontmatter/frontmatter-write.service.ts:128 in attempt call
by src/lib/core/frontmatter/properties.logic.ts:extractBody <- src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:913 in dispatchMetaBindUpdate call
by src/lib/core/frontmatter/properties.logic.ts:extractBody <- src/lib/features/auto-organize/auto-organize.service.ts:600 in withRuleProperties call
by src/lib/core/frontmatter/properties.logic.ts:extractBody <- src/lib/features/deep-link/deep-link.logic.ts:390 in injectTitleIntoContent call +1
by src/lib/core/frontmatter/properties.logic.ts:extractBody <- src/lib/features/event-calendar/event-calendar-event.logic.ts:358 in applyEventDraft call
by src/lib/core/frontmatter/properties.logic.ts:extractBody <- src/lib/features/event-calendar/event-calendar.service.ts:1004 in duplicateEvent call
by src/lib/core/frontmatter/properties.logic.ts:extractBody <- src/lib/features/properties/properties.service.ts:98 in commitChanges call
by src/lib/core/frontmatter/properties.logic.ts:extractBody <- src/lib/features/todoist-sync/sync-now.service.ts:899 in writeProjectId call
sym src/lib/core/frontmatter/properties.logic.ts:94 fn _lastAliasPassSteps(): number L3 | Test-only: the step count of the latest alias pass (see `aliasPassSteps`).
sym src/lib/core/frontmatter/properties.logic.ts:326 fn _resetParseFrontmatterCache(): void L3 | Test-only: clears the cache so module-level state doesn't leak between tests.
sym src/lib/core/frontmatter/properties.logic.ts:340 fn parseFrontmatterProperties(content: string): Property[] L5 | Parses frontmatter YAML into an array of Property objects.
by src/lib/core/frontmatter/properties.logic.ts:parseFrontmatterProperties <- src/lib/core/frontmatter/frontmatter-write.service.ts:128 in attempt call
by src/lib/core/frontmatter/properties.logic.ts:parseFrontmatterProperties <- src/lib/core/markdown-editor/extensions/live-preview/plugins/meta-bind-input-plugin.ts:59 in buildMetaBindInputDecorations call
by src/lib/core/frontmatter/properties.logic.ts:parseFrontmatterProperties <- src/lib/core/markdown-editor/extensions/live-preview/plugins/table-field.ts:18 in computeTables call
by src/lib/core/frontmatter/properties.logic.ts:parseFrontmatterProperties <- src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:912 in dispatchMetaBindUpdate call
by src/lib/core/frontmatter/properties.logic.ts:parseFrontmatterProperties <- src/lib/features/auto-organize/auto-organize.logic.ts:866 in propertyWriteSkipReason call
by src/lib/core/frontmatter/properties.logic.ts:parseFrontmatterProperties <- src/lib/features/auto-organize/auto-organize.service.ts:589 in withRuleProperties call +1
by src/lib/core/frontmatter/properties.logic.ts:parseFrontmatterProperties <- src/lib/features/collection/collection.logic.ts:36 in buildNoteRecord call
by src/lib/core/frontmatter/properties.logic.ts:parseFrontmatterProperties <- src/lib/features/deep-link/deep-link.logic.ts:389 in injectTitleIntoContent call +1
more by 6 not shown: src/lib/features/event-calendar(2) src/lib/features/file-icons(1) src/lib/features/note-action-bar(1) src/lib/features/properties(1) src/lib/features/todoist-sync(1): q importers src/lib/core/frontmatter/properties.logic.ts:parseFrontmatterProperties
sym src/lib/core/frontmatter/properties.logic.ts:357 type LossyFrontmatterReason L7 | Why a parse + re-serialize of a note's frontmatter would lose data: - `unparseable`: YAML errors or warnings (e.g. an unresolved custom tag), a root that is no…
by src/lib/core/frontmatter/properties.logic.ts:LossyFrontmatterReason <- src/lib/core/frontmatter/frontmatter-write.service.ts:14 in (module) import
sym src/lib/core/frontmatter/properties.logic.ts:380 const LOSSY_FRONTMATTER_MESSAGES: Readonly<Record<LossyFrontmatterReason, string>> L8 | Error text per `LossyFrontmatterReason`, shared by every writer that refuses a lossy rewrite, so the Properties panel, meta-bind and `updateNoteFrontmatter` te…
by src/lib/core/frontmatter/properties.logic.ts:LOSSY_FRONTMATTER_MESSAGES <- src/lib/core/frontmatter/frontmatter-write.service.ts:49 in WRITE_ERROR_MESSAGES ref
by src/lib/core/frontmatter/properties.logic.ts:LOSSY_FRONTMATTER_MESSAGES <- src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:908 in dispatchMetaBindUpdate ref
sym src/lib/core/frontmatter/properties.logic.ts:405 fn detectLossyFrontmatter(content: string): LossyFrontmatterReason | null L57 | Tells a caller, before it rewrites a note, whether the `parseFrontmatterProperties` -> `serializeProperties` round trip would lose data, and why.
by src/lib/core/frontmatter/properties.logic.ts:detectLossyFrontmatter <- src/lib/app/deep-link-actions.ts:205 in executeCaptureAction call
by src/lib/core/frontmatter/properties.logic.ts:detectLossyFrontmatter <- src/lib/core/frontmatter/frontmatter-write.service.ts:125 in attempt call
by src/lib/core/frontmatter/properties.logic.ts:detectLossyFrontmatter <- src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:905 in dispatchMetaBindUpdate call
by src/lib/core/frontmatter/properties.logic.ts:detectLossyFrontmatter <- src/lib/features/auto-organize/auto-organize.logic.ts:863 in propertyWriteSkipReason call
by src/lib/core/frontmatter/properties.logic.ts:detectLossyFrontmatter <- src/lib/features/auto-organize/auto-organize.service.ts:595 in withRuleProperties call +1
by src/lib/core/frontmatter/properties.logic.ts:detectLossyFrontmatter <- src/lib/features/event-calendar/event-calendar.service.ts:943 in createNow call +1
by src/lib/core/frontmatter/properties.logic.ts:detectLossyFrontmatter <- src/lib/features/properties/properties.service.ts:87 in commitChanges call
by src/lib/core/frontmatter/properties.logic.ts:detectLossyFrontmatter <- src/lib/features/todoist-sync/sync-now.service.ts:897 in writeProjectId call
sym src/lib/core/frontmatter/properties.logic.ts:464 fn isEmptyPropertyValue(value: Property['value']): boolean L5 | True when a property value carries no data (empty string, null, or empty list).
by src/lib/core/frontmatter/properties.logic.ts:isEmptyPropertyValue <- src/lib/features/auto-organize/auto-organize.logic.ts:263 in listAfterAdd call +2
sym src/lib/core/frontmatter/properties.logic.ts:519 fn ensureFrontmatterLink(content: string, key: string, target: string): string L30 | Returns `content` with frontmatter `key` linking `[[target]]`, for notes that must carry a relationship whatever their template writes.
by src/lib/core/frontmatter/properties.logic.ts:ensureFrontmatterLink <- src/lib/features/note-action-bar/note-action-bar.service.ts:79 in createLinkedNote call
by src/lib/core/frontmatter/properties.logic.ts:ensureFrontmatterLink <- src/lib/plugins/one-on-one/one-on-one.service.ts:96 in createOneOnOneNote call
sym src/lib/core/frontmatter/properties.logic.ts:603 fn serializeProperties(properties: Property[], originalRaw?: string): string L23 | Serializes an array of properties into a YAML frontmatter string (without delimiters).
sym src/lib/core/frontmatter/properties.logic.ts:634 fn yamlScalar(value: string): string L3 | The one-line YAML scalar for `value`, for pasting after `key: ` or `- ` in a frontmatter block: plain when a plain scalar reads back as the same string, quoted…
by src/lib/core/frontmatter/properties.logic.ts:yamlScalar <- src/lib/plugins/quick-capture/note-composer.logic.ts:129 in processCaptureTemplate call
sym src/lib/core/frontmatter/properties.logic.ts:651 fn setPropertyByBindTarget(properties: Property[], bindTarget: string, value: string | number | boolean): Property[] L15 | Sets a property value addressed by a (possibly aliased) meta-bind bind target, matching on the canonical key.
by src/lib/core/frontmatter/properties.logic.ts:setPropertyByBindTarget <- src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:914 in dispatchMetaBindUpdate call
sym src/lib/core/frontmatter/properties.logic.ts:674 fn typedOptionValue(option: string): string | number | boolean L7 | The value a meta-bind select writes for an option string.
by src/lib/core/frontmatter/properties.logic.ts:typedOptionValue <- src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:815 in createMetaBindSelect call
sym src/lib/core/frontmatter/properties.logic.ts:689 fn rebuildContent(properties: Property[], body: string, original?: string): string L9 | Rebuilds the full file content with updated frontmatter properties.
by src/lib/core/frontmatter/properties.logic.ts:rebuildContent <- src/lib/core/frontmatter/frontmatter-write.service.ts:128 in attempt call
by src/lib/core/frontmatter/properties.logic.ts:rebuildContent <- src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:915 in dispatchMetaBindUpdate call
by src/lib/core/frontmatter/properties.logic.ts:rebuildContent <- src/lib/features/auto-organize/auto-organize.service.ts:600 in withRuleProperties call
by src/lib/core/frontmatter/properties.logic.ts:rebuildContent <- src/lib/features/deep-link/deep-link.logic.ts:398 in injectTitleIntoContent call +4
by src/lib/core/frontmatter/properties.logic.ts:rebuildContent <- src/lib/features/event-calendar/event-calendar-event.logic.ts:362 in applyEventDraft call
by src/lib/core/frontmatter/properties.logic.ts:rebuildContent <- src/lib/features/event-calendar/event-calendar.service.ts:1004 in duplicateEvent call
by src/lib/core/frontmatter/properties.logic.ts:rebuildContent <- src/lib/features/properties/properties.service.ts:99 in commitChanges call
by src/lib/core/frontmatter/properties.logic.ts:rebuildContent <- src/lib/features/todoist-sync/sync-now.service.ts:899 in writeProjectId call
sym src/lib/core/frontmatter/properties.logic.ts:703 fn addProperty(properties: Property[], key: string): Property[] L3 | Adds a new empty text property with the given key.
by src/lib/core/frontmatter/properties.logic.ts:addProperty <- src/lib/features/file-icons/frontmatter-icon.service.ts:23 in upsertProperty call
by src/lib/core/frontmatter/properties.logic.ts:addProperty <- src/lib/features/properties/properties.service.ts:192 in addNewProperty call
sym src/lib/core/frontmatter/properties.logic.ts:711 fn removeProperty(properties: Property[], key: string): Property[] L3 | Removes a property by key.
by src/lib/core/frontmatter/properties.logic.ts:removeProperty <- src/lib/features/file-icons/frontmatter-icon.service.ts:27 in withIconColors call +1
by src/lib/core/frontmatter/properties.logic.ts:removeProperty <- src/lib/features/properties/lifecycle.service.ts:70 in setTypeRailPin call
by src/lib/core/frontmatter/properties.logic.ts:removeProperty <- src/lib/features/properties/properties.service.ts:176 in removePropertyByKey call
by src/lib/core/frontmatter/properties.logic.ts:removeProperty <- src/lib/features/rail-shell/list-prefs.service.ts:13 in withProperty call
sym src/lib/core/frontmatter/properties.logic.ts:719 fn updatePropertyValue(properties: Property[], key: string, value: string | number | boolean | string[], type?: PropertyType): Property[] L11 | Updates a property's value and optionally its type.
by src/lib/core/frontmatter/properties.logic.ts:updatePropertyValue <- src/lib/features/file-icons/frontmatter-icon.service.ts:22 in upsertProperty call +1
by src/lib/core/frontmatter/properties.logic.ts:updatePropertyValue <- src/lib/features/properties/properties.service.ts:131 in updateProperty call +1
sym src/lib/core/frontmatter/properties.logic.ts:735 fn renamePropertyKey(properties: Property[], oldKey: string, newKey: string): Property[] L11 | Renames a property key.
by src/lib/core/frontmatter/properties.logic.ts:renamePropertyKey <- src/lib/features/properties/properties.service.ts:170 in renameProperty call
sym src/lib/core/frontmatter/properties.logic.ts:750 fn extractWikilinks(value: unknown): string[] L7 | Extracts wikilink targets from a property value (string, array, or unknown)
sym src/lib/core/frontmatter/properties.logic.ts:758 interface ResolvedLink L5
by src/lib/core/frontmatter/properties.logic.ts:ResolvedLink <- src/lib/features/properties/PropertiesView.svelte:21 in (script) import
sym src/lib/core/frontmatter/properties.logic.ts:765 fn resolveRelationshipLinks(value: unknown, allPaths: string[], resolveWikilink: (target: string, paths: string[], vaultRoot?: string | null) => s… L12 | Resolves wikilink targets from a property value against a list of file paths; `vaultRoot` is handed to `resolveWikilink`.
by src/lib/core/frontmatter/properties.logic.ts:resolveRelationshipLinks <- src/lib/features/properties/PropertiesView.svelte:65 in relLinksMap=$derived call
sym src/lib/core/frontmatter/properties.logic.ts:779 fn computeAddRelationshipValue(currentValue: string | number | boolean | string[] | undefined, fileName: string): { value: string | string[]; isNew: … L17 | Computes the new property value after adding a wikilink to a relationship
by src/lib/core/frontmatter/properties.logic.ts:computeAddRelationshipValue <- src/lib/features/properties/PropertiesView.svelte:72 in addRelationshipLink call
sym src/lib/core/frontmatter/properties.logic.ts:798 fn computeRemoveRelationshipValue(currentValue: string | number | boolean | string[] | undefined, raw: string): { value: string[]; shouldDelete: boolean… L12 | Computes the new property value after removing a wikilink, or null if the property should be deleted
by src/lib/core/frontmatter/properties.logic.ts:computeRemoveRelationshipValue <- src/lib/features/properties/PropertiesView.svelte:83 in removeRelationshipLink call
sym src/lib/core/frontmatter/properties.logic.ts:812 fn normalizeTypeCasing(s: string): string L3 | First letter uppercase, rest preserved — the casing rule Rust applies to `_type` values when deriving `is_a` (entry.rs::extract_is_a).
by src/lib/core/frontmatter/properties.logic.ts:normalizeTypeCasing <- src/lib/features/auto-organize/auto-organize.logic.ts:867 in propertyWriteSkipReason call
by src/lib/core/frontmatter/properties.logic.ts:normalizeTypeCasing <- src/lib/features/collection/collection.logic.ts:58 in projectDerivedProperties call
by src/lib/core/frontmatter/properties.logic.ts:normalizeTypeCasing <- src/lib/features/event-calendar/EventCalendarSection.svelte:82 in openEventType call
by src/lib/core/frontmatter/properties.logic.ts:normalizeTypeCasing <- src/lib/features/note-action-bar/note-action-bar.logic.ts:31 in getActionBarState call
by src/lib/core/frontmatter/properties.logic.ts:normalizeTypeCasing <- src/lib/features/properties/PropertiesView.svelte:93 in typeName=$derived call
by src/lib/core/frontmatter/properties.logic.ts:normalizeTypeCasing <- src/lib/features/rail-shell/TypesNavigator.svelte:470 in (markup) markup +1
by src/lib/core/frontmatter/properties.logic.ts:normalizeTypeCasing <- src/lib/features/type-definitions/type-definitions.logic.ts:102 in extractTypeMetadata call +2
by src/lib/core/frontmatter/properties.logic.ts:normalizeTypeCasing <- src/lib/features/type-definitions/type-definitions.store.svelte.ts:121 in buildTypeDefinitionPaths call
## locals
local src/lib/core/frontmatter/properties.logic.ts:66 fn scalarChainSize(node: unknown): number L7
local src/lib/core/frontmatter/properties.logic.ts:113 fn foldUnquotedWikilinks(doc: Document): void L55
local src/lib/core/frontmatter/properties.logic.ts:173 fn convertToProperty(key: string, value: unknown): Property L32
local src/lib/core/frontmatter/properties.logic.ts:226 fn cloneProperty(p: Property): Property L5
local src/lib/core/frontmatter/properties.logic.ts:232 fn cachedParse(rawFrontmatter: string): Property[] L10
local src/lib/core/frontmatter/properties.logic.ts:248 fn toFrontmatterValue(doc: Document): unknown L5
local src/lib/core/frontmatter/properties.logic.ts:254 fn computeAndCache(rawFrontmatter: string): Property[] L60
local src/lib/core/frontmatter/properties.logic.ts:315 fn evictLru(): void L9
local src/lib/core/frontmatter/properties.logic.ts:390 fn isEmptyYamlNode(node: unknown): boolean L6
local src/lib/core/frontmatter/properties.logic.ts:481 fn dedupeCanonicalKeys(properties: Property[]): Property[] L23
local src/lib/core/frontmatter/properties.logic.ts:572 fn plainScalarsByKey(originalRaw: string): Map<string, Scalar> L13
## calls
call src/lib/core/frontmatter/properties.logic.ts:70 in scalarChainSize -> src/lib/core/frontmatter/properties.logic.ts:scalarChainSize call
call src/lib/core/frontmatter/properties.logic.ts:134 in foldUnquotedWikilinks -> src/lib/core/frontmatter/properties.logic.ts:scalarChainSize call
call src/lib/core/frontmatter/properties.logic.ts:238 in cachedParse -> src/lib/core/frontmatter/properties.logic.ts:cloneProperty ref
call src/lib/core/frontmatter/properties.logic.ts:240 in cachedParse -> src/lib/core/frontmatter/properties.logic.ts:computeAndCache call
call src/lib/core/frontmatter/properties.logic.ts:250 in toFrontmatterValue -> src/lib/core/frontmatter/properties.logic.ts:foldUnquotedWikilinks call
call src/lib/core/frontmatter/properties.logic.ts:262 in computeAndCache -> src/lib/core/frontmatter/properties.logic.ts:toFrontmatterValue call
call src/lib/core/frontmatter/properties.logic.ts:267 in computeAndCache -> src/lib/core/frontmatter/properties.logic.ts:evictLru call +4
call src/lib/core/frontmatter/properties.logic.ts:297 in computeAndCache -> src/lib/core/frontmatter/properties.logic.ts:convertToProperty call
call src/lib/core/frontmatter/properties.logic.ts:297 in computeAndCache -> src/lib/utils/frontmatter-aliases.ts:canonicalizeKey call
call src/lib/core/frontmatter/properties.logic.ts:309 in computeAndCache -> src/lib/core/frontmatter/properties.logic.ts:dedupeCanonicalKeys call
call src/lib/core/frontmatter/properties.logic.ts:310 in computeAndCache -> src/lib/core/frontmatter/properties.logic.ts:cloneProperty ref
call src/lib/core/frontmatter/properties.logic.ts:341 in parseFrontmatterProperties -> src/lib/core/frontmatter/properties.logic.ts:extractRawFrontmatter call
call src/lib/core/frontmatter/properties.logic.ts:343 in parseFrontmatterProperties -> src/lib/core/frontmatter/properties.logic.ts:cachedParse call
call src/lib/core/frontmatter/properties.logic.ts:406 in detectLossyFrontmatter -> src/lib/core/frontmatter/properties.logic.ts:extractRawFrontmatter call
call src/lib/core/frontmatter/properties.logic.ts:453 in detectLossyFrontmatter -> src/lib/core/frontmatter/properties.logic.ts:isEmptyYamlNode call
call src/lib/core/frontmatter/properties.logic.ts:454 in detectLossyFrontmatter -> src/lib/utils/frontmatter-aliases.ts:canonicalizeKey call
call src/lib/core/frontmatter/properties.logic.ts:484 in dedupeCanonicalKeys -> src/lib/utils/frontmatter-aliases.ts:canonicalizeKey call
call src/lib/core/frontmatter/properties.logic.ts:490 in dedupeCanonicalKeys -> src/lib/core/frontmatter/properties.logic.ts:isEmptyPropertyValue call +3
call src/lib/core/frontmatter/properties.logic.ts:523 in ensureFrontmatterLink -> src/lib/core/frontmatter/properties.logic.ts:serializeProperties call
call src/lib/core/frontmatter/properties.logic.ts:526 in ensureFrontmatterLink -> src/lib/core/frontmatter/properties.logic.ts:extractRawFrontmatter call
call src/lib/core/frontmatter/properties.logic.ts:526 in ensureFrontmatterLink -> src/lib/core/frontmatter/properties.logic.ts:rebuildContent call +1
call src/lib/core/frontmatter/properties.logic.ts:528 in ensureFrontmatterLink -> src/lib/core/frontmatter/properties.logic.ts:detectLossyFrontmatter call
call src/lib/core/frontmatter/properties.logic.ts:531 in ensureFrontmatterLink -> src/lib/core/frontmatter/properties.logic.ts:parseFrontmatterProperties call
call src/lib/core/frontmatter/properties.logic.ts:537 in ensureFrontmatterLink -> src/lib/core/frontmatter/properties.logic.ts:extractWikilinks call
call src/lib/core/frontmatter/properties.logic.ts:543 in ensureFrontmatterLink -> src/lib/core/frontmatter/properties.logic.ts:computeAddRelationshipValue call
call src/lib/core/frontmatter/properties.logic.ts:547 in ensureFrontmatterLink -> src/lib/core/frontmatter/properties.logic.ts:extractBody call
call src/lib/core/frontmatter/properties.logic.ts:581 in plainScalarsByKey -> src/lib/utils/frontmatter-aliases.ts:canonicalizeKey call
call src/lib/core/frontmatter/properties.logic.ts:607 in serializeProperties -> src/lib/core/frontmatter/properties.logic.ts:plainScalarsByKey call
call src/lib/core/frontmatter/properties.logic.ts:609 in serializeProperties -> src/lib/core/frontmatter/properties.logic.ts:dedupeCanonicalKeys call
call src/lib/core/frontmatter/properties.logic.ts:656 in setPropertyByBindTarget -> src/lib/utils/frontmatter-aliases.ts:canonicalizeKey call +2
call src/lib/core/frontmatter/properties.logic.ts:694 in rebuildContent -> src/lib/core/frontmatter/properties.logic.ts:extractRawFrontmatter call
call src/lib/core/frontmatter/properties.logic.ts:695 in rebuildContent -> src/lib/core/frontmatter/properties.logic.ts:serializeProperties call
call src/lib/core/frontmatter/properties.logic.ts:771 in resolveRelationshipLinks -> src/lib/core/frontmatter/properties.logic.ts:extractWikilinks call

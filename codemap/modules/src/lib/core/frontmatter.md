# module card src/lib/core/frontmatter
cols: module <path> <layer> files <n> in-modules <n> out-modules <n> pub <public>/<exports> ipc <called>/<served> card ~<k>k · dep <from> -> <to> <file pairs> · in2/out2 <module> <n> modules: <module>(<via>) · entry <file> ext-in<n> <importers> · file … · sym … · grep: grep -rF -- '-> src/lib/core/frontmatter ' codemap/modules
module src/lib/core/frontmatter core files 4 in-modules 16 out-modules 3 pub 28/40 ipc 0/0 card ~3.5k
## neighbors
dep src/lib/app -> src/lib/core/frontmatter 2
dep src/lib/core/markdown-editor -> src/lib/core/frontmatter 5
dep src/lib/features/auto-organize -> src/lib/core/frontmatter 4
dep src/lib/features/collection -> src/lib/core/frontmatter 3
dep src/lib/features/deep-link -> src/lib/core/frontmatter 2
dep src/lib/features/event-calendar -> src/lib/core/frontmatter 5
dep src/lib/features/file-icons -> src/lib/core/frontmatter 4
dep src/lib/features/note-action-bar -> src/lib/core/frontmatter 2
dep src/lib/features/properties -> src/lib/core/frontmatter 12
dep src/lib/features/rail-shell -> src/lib/core/frontmatter 5
dep src/lib/features/todoist-sync -> src/lib/core/frontmatter 4
dep src/lib/features/type-definitions -> src/lib/core/frontmatter 2
dep src/lib/plugins/mods -> src/lib/core/frontmatter 2
dep src/lib/plugins/one-on-one -> src/lib/core/frontmatter 1
dep src/lib/plugins/quick-capture -> src/lib/core/frontmatter 1
dep src/routes -> src/lib/core/frontmatter 1
dep src/lib/core/frontmatter -> src/lib/core/editor 3
dep src/lib/core/frontmatter -> src/lib/core/vault 1
dep src/lib/core/frontmatter -> src/lib/utils 2
in2 src/lib/core/frontmatter 3 modules: src/lib/features/note-list(3) src/lib/plugins/calendar(2) src/lib/features/tasks(1)
out2 src/lib/core/frontmatter 2 modules: src/lib/core/filesystem(2) src/lib/core/markdown-editor(1)
## entry files
entry src/lib/core/frontmatter/properties.logic.ts ext-in26 src/lib/app/deep-link-actions.ts src/lib/core/markdown-editor/extensions/live-preview/plugins/meta-bind-input-plugin.ts src/lib/core/markdown-editor/extensions/live-preview/plugins/table-field.ts src/lib/core/markdown-editor/extensions/live-preview/widgets.ts src/lib/features/auto-organize/auto-organize.logic.ts more importers 21 not shown: src/lib/features/event-calendar(3) src/lib/features/properties(3) src/lib/features/file-icons(2) +10 modules: q importers src/lib/core/frontmatter/properties.logic.ts
entry src/lib/core/frontmatter/properties.types.ts ext-in16 src/lib/core/markdown-editor/extensions/live-preview/plugins/table-field.ts src/lib/core/markdown-editor/extensions/live-preview/widgets.ts src/lib/features/auto-organize/auto-organize.logic.ts src/lib/features/collection/toolbar/filter.logic.ts src/lib/features/collection/toolbar/sort.logic.ts more importers 11 not shown: src/lib/features/properties(6) src/lib/features/deep-link(1) src/lib/features/event-calendar(1) +3 modules: q importers src/lib/core/frontmatter/properties.types.ts
entry src/lib/core/frontmatter/frontmatter-write.service.ts ext-in12 src/lib/app/deep-link-actions.ts src/lib/features/auto-organize/auto-organize.service.ts src/lib/features/event-calendar/event-calendar.service.ts src/lib/features/file-icons/frontmatter-icon.service.ts src/lib/features/properties/bookmark-migration.service.ts more importers 7 not shown: src/lib/features/properties(2) src/lib/features/rail-shell(2) src/lib/plugins/mods(2) +1 modules: q importers src/lib/core/frontmatter/frontmatter-write.service.ts
entry src/lib/core/frontmatter/yaml-quoting.logic.ts ext-in1 src/lib/features/todoist-sync/pull.logic.ts
## files
file src/lib/core/frontmatter/frontmatter-write.service.ts service L163 module src/lib/core/frontmatter in12 t3
file src/lib/core/frontmatter/properties.logic.ts logic L814 module src/lib/core/frontmatter in27 t26
file src/lib/core/frontmatter/properties.types.ts types L12 module src/lib/core/frontmatter in18 t0
file src/lib/core/frontmatter/yaml-quoting.logic.ts logic L178 module src/lib/core/frontmatter in1 t1 | YAML scalar quoting predicate matching yaml@2.9.1 behavior for the options Kokobrain uses ({ lineWidth: 0, flowCollectionPadding: false }).
## public
sym src/lib/core/frontmatter/frontmatter-write.service.ts:30 type FrontmatterWriteReason L1 | Why `updateNoteFrontmatter` refused or failed: - a `LossyFrontmatterReason`: the rewrite would lose data; nothing was written. - `save-failed`: saving the open…
sym src/lib/core/frontmatter/frontmatter-write.service.ts:33 class FrontmatterWriteError extends Error L13 | Typed failure of `updateNoteFrontmatter`, so callers can roll back by reason.
sym src/lib/core/frontmatter/frontmatter-write.service.ts:64 fn toastFrontmatterWriteError(err: FrontmatterWriteError, options: { id?: string; suffix?: string } = {}): void L9 | Reports a failed `updateNoteFrontmatter` call in an error toast prefixed with the note's file name, since the target can differ from what the user clicked (a f…
sym src/lib/core/frontmatter/frontmatter-write.service.ts:99 fn updateNoteFrontmatter(path: string, mutate: (props: Property[]) => Property[]): Promise<string> L7 | Rewrites one note's frontmatter by path without losing data, and returns the written content (the unchanged base when `mutate` changes nothing).
sym src/lib/core/frontmatter/properties.logic.ts:35 fn configurePropertiesDiagnostics(sink: PropertiesDiagnostics): void L3 | Sets the diagnostics sink.
sym src/lib/core/frontmatter/properties.logic.ts:46 fn extractRawFrontmatter(content: string): string | null L4 | Extracts the raw YAML string from frontmatter delimiters.
sym src/lib/core/frontmatter/properties.logic.ts:55 fn extractBody(content: string): string L5 | Returns the body content after the frontmatter block.
sym src/lib/core/frontmatter/properties.logic.ts:340 fn parseFrontmatterProperties(content: string): Property[] L5 | Parses frontmatter YAML into an array of Property objects.
sym src/lib/core/frontmatter/properties.logic.ts:380 const LOSSY_FRONTMATTER_MESSAGES: Readonly<Record<LossyFrontmatterReason, string>> L8 | Error text per `LossyFrontmatterReason`, shared by every writer that refuses a lossy rewrite, so the Properties panel, meta-bind and `updateNoteFrontmatter` te…
sym src/lib/core/frontmatter/properties.logic.ts:405 fn detectLossyFrontmatter(content: string): LossyFrontmatterReason | null L57 | Tells a caller, before it rewrites a note, whether the `parseFrontmatterProperties` -> `serializeProperties` round trip would lose data, and why.
sym src/lib/core/frontmatter/properties.logic.ts:464 fn isEmptyPropertyValue(value: Property['value']): boolean L5 | True when a property value carries no data (empty string, null, or empty list).
sym src/lib/core/frontmatter/properties.logic.ts:519 fn ensureFrontmatterLink(content: string, key: string, target: string): string L30 | Returns `content` with frontmatter `key` linking `[[target]]`, for notes that must carry a relationship whatever their template writes.
sym src/lib/core/frontmatter/properties.logic.ts:634 fn yamlScalar(value: string): string L3 | The one-line YAML scalar for `value`, for pasting after `key: ` or `- ` in a frontmatter block: plain when a plain scalar reads back as the same string, quoted…
sym src/lib/core/frontmatter/properties.logic.ts:651 fn setPropertyByBindTarget(properties: Property[], bindTarget: string, value: string | number | boolean): Property[] L15 | Sets a property value addressed by a (possibly aliased) meta-bind bind target, matching on the canonical key.
sym src/lib/core/frontmatter/properties.logic.ts:674 fn typedOptionValue(option: string): string | number | boolean L7 | The value a meta-bind select writes for an option string.
sym src/lib/core/frontmatter/properties.logic.ts:689 fn rebuildContent(properties: Property[], body: string, original?: string): string L9 | Rebuilds the full file content with updated frontmatter properties.
sym src/lib/core/frontmatter/properties.logic.ts:703 fn addProperty(properties: Property[], key: string): Property[] L3 | Adds a new empty text property with the given key.
sym src/lib/core/frontmatter/properties.logic.ts:711 fn removeProperty(properties: Property[], key: string): Property[] L3 | Removes a property by key.
sym src/lib/core/frontmatter/properties.logic.ts:719 fn updatePropertyValue(properties: Property[], key: string, value: string | number | boolean | string[], type?: PropertyType): Property[] L11 | Updates a property's value and optionally its type.
sym src/lib/core/frontmatter/properties.logic.ts:735 fn renamePropertyKey(properties: Property[], oldKey: string, newKey: string): Property[] L11 | Renames a property key.
sym src/lib/core/frontmatter/properties.logic.ts:758 interface ResolvedLink L5
sym src/lib/core/frontmatter/properties.logic.ts:765 fn resolveRelationshipLinks(value: unknown, allPaths: string[], resolveWikilink: (target: string, paths: string[], vaultRoot?: string | null) => s… L12 | Resolves wikilink targets from a property value against a list of file paths; `vaultRoot` is handed to `resolveWikilink`.
sym src/lib/core/frontmatter/properties.logic.ts:779 fn computeAddRelationshipValue(currentValue: string | number | boolean | string[] | undefined, fileName: string): { value: string | string[]; isNew: … L17 | Computes the new property value after adding a wikilink to a relationship
sym src/lib/core/frontmatter/properties.logic.ts:798 fn computeRemoveRelationshipValue(currentValue: string | number | boolean | string[] | undefined, raw: string): { value: string[]; shouldDelete: boolean… L12 | Computes the new property value after removing a wikilink, or null if the property should be deleted
sym src/lib/core/frontmatter/properties.logic.ts:812 fn normalizeTypeCasing(s: string): string L3 | First letter uppercase, rest preserved — the casing rule Rust applies to `_type` values when deriving `is_a` (entry.rs::extract_is_a).
sym src/lib/core/frontmatter/properties.types.ts:2 type PropertyType L1 | Supported property value types for auto-detection
sym src/lib/core/frontmatter/properties.types.ts:5 interface Property L8 | A single frontmatter property with its detected type
sym src/lib/core/frontmatter/yaml-quoting.logic.ts:174 fn canonicalizeScalar(value: string, context: ScalarContext = 'mapping-value'): string L5 | Returns the canonical emission for a string scalar — either the bare value or its double-quoted form.
## effects
fx-count tauri-fs.exists 2
fx-count tauri-fs.readTextFile 1
fx-count tauri-fs.writeTextFile 1
## debt
-

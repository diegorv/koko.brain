# file card src/lib/features/rail-shell/list-prefs.service.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/rail-shell/list-prefs.service.ts ' codemap/files
file src/lib/features/rail-shell/list-prefs.service.ts service L69 module src/lib/features/rail-shell in1 t1
## imports
imp src/lib/features/rail-shell/list-prefs.service.ts:1 -> src/lib/core/frontmatter/frontmatter-write.service.ts updateNoteFrontmatter
imp src/lib/features/rail-shell/list-prefs.service.ts:2 -> src/lib/core/frontmatter/properties.logic.ts removeProperty
imp src/lib/features/rail-shell/list-prefs.service.ts:3 -> src/lib/core/frontmatter/properties.types.ts type:Property
imp src/lib/features/rail-shell/list-prefs.service.ts:4 -> src/lib/core/vault/vault.store.svelte.ts vaultStore
imp src/lib/features/rail-shell/list-prefs.service.ts:5 -> src/lib/features/rail-shell/list-toolbar.types.ts type:ListSortConfig
imp src/lib/features/rail-shell/list-prefs.service.ts:6 -> src/lib/features/rail-shell/list-sort.logic.ts formatListSort
## imported-by
imp src/lib/features/rail-shell/RailNoteList.svelte:81 -> src/lib/features/rail-shell/list-prefs.service.ts saveTypeListProperties,saveTypeListSort,serializeListWrite
## reach
in2 src/lib/features/rail-shell/list-prefs.service.ts 1 files in 1 modules: src/lib/app(1)
out2 src/lib/features/rail-shell/list-prefs.service.ts 6 files in 3 modules: src/lib/core/editor(3) src/lib/utils(2) src/lib/core/vault(1)
## tests
test src/tests/lib/features/rail-shell/list-prefs.service.test.ts imports src/lib/features/rail-shell/list-prefs.service.ts mirror
## symbols
sym src/lib/features/rail-shell/list-prefs.service.ts:28 fn serializeListWrite<T>(path: string, write: () => Promise<T>): Promise<T> L10 | Runs `write` after the writes already queued for `path`, whether they failed or not.
by src/lib/features/rail-shell/list-prefs.service.ts:serializeListWrite <- src/lib/features/rail-shell/RailNoteList.svelte:325 in persistViewState call +1
sym src/lib/features/rail-shell/list-prefs.service.ts:54 fn saveTypeListProperties(definitionPath: string, properties: readonly string[]): Promise<void> L4 | Saves the pill keys a type's list shows, as `_list_properties_display` on its definition note.
by src/lib/features/rail-shell/list-prefs.service.ts:saveTypeListProperties <- src/lib/features/rail-shell/RailNoteList.svelte:488 in handlePropertiesChange call
sym src/lib/features/rail-shell/list-prefs.service.ts:66 fn saveTypeListSort(definitionPath: string, config: ListSortConfig | null): Promise<void> L4 | Saves a type's list order as `_list_sort` (`<option>:<direction>`) on its definition note; null removes the key, back to the lens's own order.
by src/lib/features/rail-shell/list-prefs.service.ts:saveTypeListSort <- src/lib/features/rail-shell/RailNoteList.svelte:458 in saveListSort call
## locals
local src/lib/features/rail-shell/list-prefs.service.ts:12 fn withProperty(props: Property[], property: Property | null, key: string): Property[] L5
local src/lib/features/rail-shell/list-prefs.service.ts:40 fn saveDefinitionProperty(definitionPath: string, key: string, property: Property | null): Promise<void> L7
## calls
call src/lib/features/rail-shell/list-prefs.service.ts:13 in withProperty -> src/lib/core/frontmatter/properties.logic.ts:removeProperty call
call src/lib/features/rail-shell/list-prefs.service.ts:41 in saveDefinitionProperty -> src/lib/features/rail-shell/list-prefs.service.ts:serializeListWrite call
call src/lib/features/rail-shell/list-prefs.service.ts:43 in saveDefinitionProperty -> src/lib/core/vault/vault.store.svelte.ts:vaultStore.requestPromptIndexRefresh mcall
call src/lib/features/rail-shell/list-prefs.service.ts:44 in saveDefinitionProperty -> src/lib/core/frontmatter/frontmatter-write.service.ts:updateNoteFrontmatter call
call src/lib/features/rail-shell/list-prefs.service.ts:44 in saveDefinitionProperty -> src/lib/features/rail-shell/list-prefs.service.ts:withProperty call
call src/lib/features/rail-shell/list-prefs.service.ts:56 in saveTypeListProperties -> src/lib/features/rail-shell/list-prefs.service.ts:saveDefinitionProperty call
call src/lib/features/rail-shell/list-prefs.service.ts:68 in saveTypeListSort -> src/lib/features/rail-shell/list-prefs.service.ts:saveDefinitionProperty call
call src/lib/features/rail-shell/list-prefs.service.ts:68 in saveTypeListSort -> src/lib/features/rail-shell/list-sort.logic.ts:formatListSort call

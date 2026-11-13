# file card src/lib/features/collection/key-edit.logic.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/collection/key-edit.logic.ts ' codemap/files
file src/lib/features/collection/key-edit.logic.ts logic L100 module src/lib/features/collection in2 t1
## imports
imp src/lib/features/collection/key-edit.logic.ts:1 -> src/lib/features/collection/collection.types.ts type:CollectionDefinition,type:CollectionViewDef
imp src/lib/features/collection/key-edit.logic.ts:2 -> src/lib/features/collection/yaml-parser.ts parseCollectionYaml,updateCollectionYaml,type:CollectionYamlUpdates
## imported-by
imp src/lib/features/collection/CollectionView.svelte:5 -> src/lib/features/collection/key-edit.logic.ts applyEditorKeyEdit,CollectionEditConflict,EDITOR_KEYS,editorKeyBaseAfter,editorKeyBases,isViewAt,type:EditorKey
imp src/lib/features/type-definitions/type-note-list.logic.ts:5 -> src/lib/features/collection/key-edit.logic.ts sortedJson
## reach
in2 src/lib/features/collection/key-edit.logic.ts 5 files in 4 modules: src/lib/features/rail-shell(2) src/lib/app(1) src/lib/features/note-list(1) src/lib/features/type-definitions(1)
out2 src/lib/features/collection/key-edit.logic.ts 0 files in 0 modules: -
## tests
test src/tests/lib/features/collection/key-edit.logic.test.ts imports src/lib/features/collection/key-edit.logic.ts mirror
## symbols
sym src/lib/features/collection/key-edit.logic.ts:9 type EditorKey L1 | One key the collection editor writes on its own: a root key (`filters`, `formulas`) or a key of the view at an index (the `view*` keys), named as in `Collectio…
by src/lib/features/collection/key-edit.logic.ts:EditorKey <- src/lib/features/collection/CollectionView.svelte:12 in (script) import
sym src/lib/features/collection/key-edit.logic.ts:23 const EDITOR_KEYS: readonly EditorKey[] L1 | Every key the collection editor writes.
by src/lib/features/collection/key-edit.logic.ts:EDITOR_KEYS <- src/lib/features/collection/CollectionView.svelte:338 in writeYaml mcall
sym src/lib/features/collection/key-edit.logic.ts:26 class CollectionEditConflict extends Error L6 | A toolbar edit refused because the key it writes changed since the toolbar read it.
by src/lib/features/collection/key-edit.logic.ts:CollectionEditConflict <- src/lib/features/collection/CollectionView.svelte:287 in reportWriteError ref +2
sym src/lib/features/collection/key-edit.logic.ts:34 fn sortedJson(value: unknown): string L7 | JSON with the keys of every object sorted, so key order never makes two values differ.
by src/lib/features/collection/key-edit.logic.ts:sortedJson <- src/lib/features/type-definitions/type-note-list.logic.ts:163 in canonicalToolbarValue call +1
sym src/lib/features/collection/key-edit.logic.ts:54 fn editorKeyBases(definition: CollectionDefinition, viewIndex: number): Record<EditorKey, string> L3 | The base of every key in `definition`, for the view at `viewIndex`.
by src/lib/features/collection/key-edit.logic.ts:editorKeyBases <- src/lib/features/collection/CollectionView.svelte:165 in seedFromDefinition call +1
sym src/lib/features/collection/key-edit.logic.ts:59 type EditorKeyEditResult L6 | The YAML an editor key edit gives, or why it was refused.
sym src/lib/features/collection/key-edit.logic.ts:72 fn applyEditorKeyEdit<K extends EditorKey>(yaml: string, key: K, value: CollectionYamlUpdates[K], base: string, viewIndex: number): EditorKe… L12 | Writes `value` as `key` of the YAML `yaml` (for a view key, of the view at `viewIndex`), and nothing else.
by src/lib/features/collection/key-edit.logic.ts:applyEditorKeyEdit <- src/lib/features/collection/CollectionView.svelte:353 in persistKey call
sym src/lib/features/collection/key-edit.logic.ts:91 fn editorKeyBaseAfter<K extends EditorKey>(yaml: string, key: K, value: CollectionYamlUpdates[K], viewIndex: number): string L4 | The base of `key` once `value` is written into `yaml`: the one the next edit of that key is checked against.
by src/lib/features/collection/key-edit.logic.ts:editorKeyBaseAfter <- src/lib/features/collection/CollectionView.svelte:351 in persistKey call
sym src/lib/features/collection/key-edit.logic.ts:97 fn isViewAt(yaml: string, index: number, name: string): boolean L4 | Whether the view at `index` of `yaml` is named `name`, so a tab edit made on an older read lands on the view it was made on.
by src/lib/features/collection/key-edit.logic.ts:isViewAt <- src/lib/features/collection/CollectionView.svelte:361 in onView call
## locals
local src/lib/features/collection/key-edit.logic.ts:47 fn editorKeyBase(definition: CollectionDefinition, key: EditorKey, viewIndex: number): string L5
## calls
call src/lib/features/collection/key-edit.logic.ts:48 in editorKeyBase -> src/lib/features/collection/key-edit.logic.ts:sortedJson call +1
call src/lib/features/collection/key-edit.logic.ts:55 in editorKeyBases -> src/lib/features/collection/key-edit.logic.ts:editorKeyBase call
call src/lib/features/collection/key-edit.logic.ts:79 in applyEditorKeyEdit -> src/lib/features/collection/yaml-parser.ts:parseCollectionYaml call
call src/lib/features/collection/key-edit.logic.ts:81 in applyEditorKeyEdit -> src/lib/features/collection/key-edit.logic.ts:editorKeyBase call
call src/lib/features/collection/key-edit.logic.ts:82 in applyEditorKeyEdit -> src/lib/features/collection/yaml-parser.ts:updateCollectionYaml call
call src/lib/features/collection/key-edit.logic.ts:92 in editorKeyBaseAfter -> src/lib/features/collection/yaml-parser.ts:parseCollectionYaml call
call src/lib/features/collection/key-edit.logic.ts:92 in editorKeyBaseAfter -> src/lib/features/collection/yaml-parser.ts:updateCollectionYaml call
call src/lib/features/collection/key-edit.logic.ts:93 in editorKeyBaseAfter -> src/lib/features/collection/key-edit.logic.ts:editorKeyBase call
call src/lib/features/collection/key-edit.logic.ts:98 in isViewAt -> src/lib/features/collection/yaml-parser.ts:parseCollectionYaml call

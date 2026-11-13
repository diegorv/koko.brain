# file card src/lib/core/editor/editor.types.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/editor/editor.types.ts ' codemap/files
file src/lib/core/editor/editor.types.ts types L15 module src/lib/core/editor in6 t0
## imported-by
imp src/lib/app/EditorView.svelte:28 -> src/lib/core/editor/editor.types.ts type:EditorTab
imp src/lib/core/editor/editor.logic.ts:3 -> src/lib/core/editor/editor.types.ts type:EditorTab
imp src/lib/core/editor/editor.service.ts:8 -> src/lib/core/editor/editor.types.ts type:EditorTab
imp src/lib/core/editor/editor.store.svelte.ts:2 -> src/lib/core/editor/editor.types.ts type:EditorTab
imp src/lib/core/filesystem/path-change.service.ts:10 -> src/lib/core/editor/editor.types.ts type:EditorTab
imp src/lib/core/markdown-editor/EditorTabs.svelte:15 -> src/lib/core/editor/editor.types.ts type:EditorTab
## reach
in2 src/lib/core/editor/editor.types.ts 81 files in 37 modules: src/lib/app(8) src/lib/features/rail-shell(8) src/lib/features/event-calendar(5) src/lib/features/properties(4) src/lib/features/todoist-sync(4) +32 modules: q impact src/lib/core/editor/editor.types.ts --depth 2
out2 src/lib/core/editor/editor.types.ts 0 files in 0 modules: -
## tests
test src/tests/lib/core/editor/editor.logic.test.ts imports-type src/lib/core/editor/editor.types.ts
## symbols
sym src/lib/core/editor/editor.types.ts:2 interface EditorTab L14 | Represents a single open file tab in the editor
by src/lib/core/editor/editor.types.ts:EditorTab <- src/lib/app/EditorView.svelte:28 in (script) import
by src/lib/core/editor/editor.types.ts:EditorTab <- src/lib/core/editor/editor.logic.ts:3 in (module) import
by src/lib/core/editor/editor.types.ts:EditorTab <- src/lib/core/editor/editor.service.ts:8 in (module) import
by src/lib/core/editor/editor.types.ts:EditorTab <- src/lib/core/editor/editor.store.svelte.ts:2 in (module) import
by src/lib/core/editor/editor.types.ts:EditorTab <- src/lib/core/filesystem/path-change.service.ts:10 in (module) import
by src/lib/core/editor/editor.types.ts:EditorTab <- src/lib/core/markdown-editor/EditorTabs.svelte:15 in (script) import

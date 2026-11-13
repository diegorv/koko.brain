# file card src/lib/core/markdown-editor/EditorTabs.svelte
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/markdown-editor/EditorTabs.svelte ' codemap/files
file src/lib/core/markdown-editor/EditorTabs.svelte component L119 module src/lib/core/markdown-editor in1 t1
## imports
imp src/lib/core/markdown-editor/EditorTabs.svelte:10 -> src/lib/core/editor/editor.store.svelte.ts editorStore
imp src/lib/core/markdown-editor/EditorTabs.svelte:11 -> src/lib/core/editor/editor.service.ts switchTab,closeTab,togglePinTab
imp src/lib/core/markdown-editor/EditorTabs.svelte:12 -> src/lib/core/editor/editor.logic.ts isTabDirty,isTabPinned,isVirtualTab
imp src/lib/core/markdown-editor/EditorTabs.svelte:13 -> src/lib/components/ui/context-menu/index.ts *
imp src/lib/core/markdown-editor/EditorTabs.svelte:15 -> src/lib/core/editor/editor.types.ts type:EditorTab
## imported-by
imp src/lib/app/EditorView.svelte:11 -> src/lib/core/markdown-editor/EditorTabs.svelte default
## reach
in2 src/lib/core/markdown-editor/EditorTabs.svelte 1 files in 1 modules: src/lib/app(1)
out2 src/lib/core/markdown-editor/EditorTabs.svelte 23 files in 5 modules: src/lib/components(16) src/lib/utils(4) src/lib/core/editor(1) src/lib/core/filesystem(1) src/lib/core/markdown-editor(1)
## tests
test src/tests/lib/core/markdown-editor/EditorTabs.test.ts imports src/lib/core/markdown-editor/EditorTabs.svelte mirror
## symbols
sym src/lib/core/markdown-editor/EditorTabs.svelte:1 component EditorTabs props:tabIcon,tabTitleColor L119
by src/lib/core/markdown-editor/EditorTabs.svelte:default <- src/lib/app/EditorView.svelte:67 in (markup) mount
## mounted-at
mount src/lib/app/EditorView.svelte:67 EditorTabs -> src/lib/core/markdown-editor/EditorTabs.svelte
## calls
call src/lib/core/markdown-editor/EditorTabs.svelte:47 in (markup) -> src/lib/core/editor/editor.logic.ts:isTabPinned markup
call src/lib/core/markdown-editor/EditorTabs.svelte:60 in (markup) -> src/lib/core/editor/editor.service.ts:switchTab markup +1
call src/lib/core/markdown-editor/EditorTabs.svelte:63 in (markup) -> src/lib/core/editor/editor.logic.ts:isTabDirty markup
call src/lib/core/markdown-editor/EditorTabs.svelte:63 in (markup) -> src/lib/core/editor/editor.logic.ts:isVirtualTab markup
call src/lib/core/markdown-editor/EditorTabs.svelte:89 in (markup) -> src/lib/core/editor/editor.service.ts:closeTab markup +1
call src/lib/core/markdown-editor/EditorTabs.svelte:99 in (markup) -> src/lib/core/editor/editor.service.ts:togglePinTab markup
## effects
fx src/lib/core/markdown-editor/EditorTabs.svelte:37 svelte.$effect in (script)

# file card src/lib/core/status-bar/SaveStatus.svelte
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/status-bar/SaveStatus.svelte ' codemap/files
file src/lib/core/status-bar/SaveStatus.svelte component L24 module src/lib/core/status-bar in1 t0
## imports
imp src/lib/core/status-bar/SaveStatus.svelte:4 -> src/lib/core/editor/editor.store.svelte.ts editorStore
imp src/lib/core/status-bar/SaveStatus.svelte:5 -> src/lib/core/editor/editor.logic.ts isTabDirty,isVirtualTab
## imported-by
imp src/lib/app/AppShell.svelte:51 -> src/lib/core/status-bar/SaveStatus.svelte default
## reach
in2 src/lib/core/status-bar/SaveStatus.svelte 1 files in 1 modules: src/routes(1)
out2 src/lib/core/status-bar/SaveStatus.svelte 2 files in 2 modules: src/lib/core/editor(1) src/lib/utils(1)
## symbols
sym src/lib/core/status-bar/SaveStatus.svelte:1 component SaveStatus L24
by src/lib/core/status-bar/SaveStatus.svelte:default <- src/lib/app/AppShell.svelte:309 in (markup) mount
## mounted-at
mount src/lib/app/AppShell.svelte:309 SaveStatus -> src/lib/core/status-bar/SaveStatus.svelte
## calls
call src/lib/core/status-bar/SaveStatus.svelte:9 in status=$derived -> src/lib/core/editor/editor.logic.ts:isVirtualTab call
call src/lib/core/status-bar/SaveStatus.svelte:10 in status=$derived -> src/lib/core/editor/editor.logic.ts:isTabDirty call

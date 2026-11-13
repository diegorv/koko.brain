# file card src/lib/plugins/word-count/WordCount.svelte
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/plugins/word-count/WordCount.svelte ' codemap/files
file src/lib/plugins/word-count/WordCount.svelte component L46 module src/lib/plugins/word-count in1 t0
## imports
imp src/lib/plugins/word-count/WordCount.svelte:3 -> src/lib/core/editor/editor.store.svelte.ts editorStore
imp src/lib/plugins/word-count/WordCount.svelte:4 -> src/lib/core/editor/editor.logic.ts isVirtualTab
imp src/lib/plugins/word-count/WordCount.svelte:5 -> src/lib/plugins/word-count/word-count.logic.ts countWords,countCharacters,estimateReadingTime
## imported-by
imp src/lib/app/AppShell.svelte:49 -> src/lib/plugins/word-count/WordCount.svelte default
## reach
in2 src/lib/plugins/word-count/WordCount.svelte 1 files in 1 modules: src/routes(1)
out2 src/lib/plugins/word-count/WordCount.svelte 2 files in 2 modules: src/lib/core/editor(1) src/lib/utils(1)
## symbols
sym src/lib/plugins/word-count/WordCount.svelte:1 component WordCount L46
by src/lib/plugins/word-count/WordCount.svelte:default <- src/lib/app/AppShell.svelte:310 in (markup) mount
## mounted-at
mount src/lib/app/AppShell.svelte:310 WordCount -> src/lib/plugins/word-count/WordCount.svelte
## calls
call src/lib/plugins/word-count/WordCount.svelte:13 in isMarkdown=$derived -> src/lib/core/editor/editor.logic.ts:isVirtualTab call
call src/lib/plugins/word-count/WordCount.svelte:22 in $effect@17 -> src/lib/plugins/word-count/word-count.logic.ts:countWords call
call src/lib/plugins/word-count/WordCount.svelte:23 in $effect@17 -> src/lib/plugins/word-count/word-count.logic.ts:countCharacters call
call src/lib/plugins/word-count/WordCount.svelte:24 in $effect@17 -> src/lib/plugins/word-count/word-count.logic.ts:estimateReadingTime call
## effects
fx src/lib/plugins/word-count/WordCount.svelte:17 svelte.$effect in (script)
fx src/lib/plugins/word-count/WordCount.svelte:20 timer.setTimeout delay=500 in $effect@17

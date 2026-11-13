# file card src/lib/core/markdown-editor/extensions/live-preview/core/scroll-debounce-plugin.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/markdown-editor/extensions/live-preview/core/scroll-debounce-plugin.ts ' codemap/files
file src/lib/core/markdown-editor/extensions/live-preview/core/scroll-debounce-plugin.ts other L48 module src/lib/core/markdown-editor in1 t0
## imports
imp src/lib/core/markdown-editor/extensions/live-preview/core/scroll-debounce-plugin.ts:2 -> src/lib/core/markdown-editor/extensions/live-preview/core/effects.ts forceDecorationRebuild
imp src/lib/core/markdown-editor/extensions/live-preview/core/scroll-debounce-plugin.ts:3 -> src/lib/core/markdown-editor/extensions/live-preview/core/profiling.ts profileStart,profileEnd
## imported-by
imp src/lib/core/markdown-editor/extensions/live-preview/live-preview.ts:23 -> src/lib/core/markdown-editor/extensions/live-preview/core/scroll-debounce-plugin.ts scrollDebouncePlugin
## reach
in2 src/lib/core/markdown-editor/extensions/live-preview/core/scroll-debounce-plugin.ts 1 files in 1 modules: src/lib/core/markdown-editor(1)
out2 src/lib/core/markdown-editor/extensions/live-preview/core/scroll-debounce-plugin.ts 0 files in 0 modules: -
## symbols
sym src/lib/core/markdown-editor/extensions/live-preview/core/scroll-debounce-plugin.ts:19 const scrollDebouncePlugin = ViewPlugin.fromClass(…) L30 | Debounces decoration rebuilds during scroll.
by src/lib/core/markdown-editor/extensions/live-preview/core/scroll-debounce-plugin.ts:scrollDebouncePlugin <- src/lib/core/markdown-editor/extensions/live-preview/live-preview.ts:101 in livePreviewExtensions ref
## calls
call src/lib/core/markdown-editor/extensions/live-preview/core/scroll-debounce-plugin.ts:27 in scrollDebouncePlugin -> src/lib/core/markdown-editor/extensions/live-preview/core/profiling.ts:profileEnd call
call src/lib/core/markdown-editor/extensions/live-preview/core/scroll-debounce-plugin.ts:36 in scrollDebouncePlugin -> src/lib/core/markdown-editor/extensions/live-preview/core/profiling.ts:profileStart call
call src/lib/core/markdown-editor/extensions/live-preview/core/scroll-debounce-plugin.ts:38 in scrollDebouncePlugin -> src/lib/core/markdown-editor/extensions/live-preview/core/effects.ts:forceDecorationRebuild mcall
## effects
fx src/lib/core/markdown-editor/extensions/live-preview/core/scroll-debounce-plugin.ts:34 timer.setTimeout delay=150 in scrollDebouncePlugin

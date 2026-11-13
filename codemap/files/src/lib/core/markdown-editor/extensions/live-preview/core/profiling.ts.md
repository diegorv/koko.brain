# file card src/lib/core/markdown-editor/extensions/live-preview/core/profiling.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/markdown-editor/extensions/live-preview/core/profiling.ts ' codemap/files
file src/lib/core/markdown-editor/extensions/live-preview/core/profiling.ts other L73 module src/lib/core/markdown-editor in15 t3
## imported-by
imp src/lib/app/boot.ts:3 -> src/lib/core/markdown-editor/extensions/live-preview/core/profiling.ts configureProfiling
imp src/lib/core/markdown-editor/extensions/live-preview/click-handler.ts:7 -> src/lib/core/markdown-editor/extensions/live-preview/core/profiling.ts reportError
imp src/lib/core/markdown-editor/extensions/live-preview/core/block-decorator.ts:11 -> src/lib/core/markdown-editor/extensions/live-preview/core/profiling.ts profileStart,profileEnd
imp src/lib/core/markdown-editor/extensions/live-preview/core/scroll-debounce-plugin.ts:3 -> src/lib/core/markdown-editor/extensions/live-preview/core/profiling.ts profileStart,profileEnd
imp src/lib/core/markdown-editor/extensions/live-preview/inline/inline-formatting-plugin.ts:9 -> src/lib/core/markdown-editor/extensions/live-preview/core/profiling.ts editorLog,profileStart,profileEnd
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/footnote-plugin.ts:20 -> src/lib/core/markdown-editor/extensions/live-preview/core/profiling.ts profileStart,profileEnd
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/frontmatter-field.ts:9 -> src/lib/core/markdown-editor/extensions/live-preview/core/profiling.ts profileStart,profileEnd
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/image-plugin.ts:15 -> src/lib/core/markdown-editor/extensions/live-preview/core/profiling.ts profileStart,profileEnd
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/meta-bind-input-plugin.ts:18 -> src/lib/core/markdown-editor/extensions/live-preview/core/profiling.ts profileStart,profileEnd
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/wikilink-embed-plugin.ts:16 -> src/lib/core/markdown-editor/extensions/live-preview/core/profiling.ts profileStart,profileEnd
imp src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:23 -> src/lib/core/markdown-editor/extensions/live-preview/core/profiling.ts editorLog,reportError
imp src/lib/core/markdown-editor/extensions/live-preview/wikilink-navigation.ts:7 -> src/lib/core/markdown-editor/extensions/live-preview/core/profiling.ts reportError
imp src/lib/core/markdown-editor/extensions/tag/completion.ts:3 -> src/lib/core/markdown-editor/extensions/live-preview/core/profiling.ts reportError
imp src/lib/core/markdown-editor/extensions/wikilink/completion.ts:6 -> src/lib/core/markdown-editor/extensions/live-preview/core/profiling.ts reportError
imp src/lib/plugins/queryjs/queryjs-block-widget.ts:4 -> src/lib/core/markdown-editor/extensions/live-preview/core/profiling.ts profileStart,profileEnd
## reach
in2 src/lib/core/markdown-editor/extensions/live-preview/core/profiling.ts 32 files in 5 modules: src/lib/core/markdown-editor(28) src/lib/app(1) src/lib/plugins/queryjs(1) src/lib/plugins/quick-capture(1) src/routes(1)
out2 src/lib/core/markdown-editor/extensions/live-preview/core/profiling.ts 0 files in 0 modules: -
## tests
test src/tests/lib/core/markdown-editor/extensions/live-preview/core/profiling.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/core/profiling.ts mirror
test src/tests/lib/app/boot.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/core/profiling.ts
test src/tests/lib/core/markdown-editor/extensions/live-preview/inline/inline-formatting-plugin.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/core/profiling.ts
## symbols
sym src/lib/core/markdown-editor/extensions/live-preview/core/profiling.ts:2 interface ProfilingPort L6 | What the editor needs from the app to profile and log: the toggle and the log writer.
sym src/lib/core/markdown-editor/extensions/live-preview/core/profiling.ts:20 fn configureProfiling(next: ProfilingPort): () => void L6 | Installs the app's profiling toggle and log writer.
by src/lib/core/markdown-editor/extensions/live-preview/core/profiling.ts:configureProfiling <- src/lib/app/boot.ts:38 in registerAppPorts call
sym src/lib/core/markdown-editor/extensions/live-preview/core/profiling.ts:28 fn editorLog(tag: string, message: string): void L3 | Writes one tagged line through the configured log port.
by src/lib/core/markdown-editor/extensions/live-preview/core/profiling.ts:editorLog <- src/lib/core/markdown-editor/extensions/live-preview/inline/inline-formatting-plugin.ts:89 in runIsolated call
by src/lib/core/markdown-editor/extensions/live-preview/core/profiling.ts:editorLog <- src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:907 in dispatchMetaBindUpdate call
sym src/lib/core/markdown-editor/extensions/live-preview/core/profiling.ts:36 fn reportError(tag: string, message: string, err: unknown): void L4 | Reports an editor error the user cannot act on: the devtools console plus the configured log port.
by src/lib/core/markdown-editor/extensions/live-preview/core/profiling.ts:reportError <- src/lib/core/markdown-editor/extensions/live-preview/click-handler.ts:38 in handleLivePreviewLinkMousedown call
by src/lib/core/markdown-editor/extensions/live-preview/core/profiling.ts:reportError <- src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:295 in renderInlineSegments call
by src/lib/core/markdown-editor/extensions/live-preview/core/profiling.ts:reportError <- src/lib/core/markdown-editor/extensions/live-preview/wikilink-navigation.ts:34 in followWikilinkClick call +1
by src/lib/core/markdown-editor/extensions/live-preview/core/profiling.ts:reportError <- src/lib/core/markdown-editor/extensions/tag/completion.ts:28 in tagCompletionSource call
by src/lib/core/markdown-editor/extensions/live-preview/core/profiling.ts:reportError <- src/lib/core/markdown-editor/extensions/wikilink/completion.ts:21 in resolveTargetContent call
sym src/lib/core/markdown-editor/extensions/live-preview/core/profiling.ts:51 fn profileStart(label?: string): number L5 | Starts a profiling measurement for a live preview decoration plugin.
by src/lib/core/markdown-editor/extensions/live-preview/core/profiling.ts:profileStart <- src/lib/core/markdown-editor/extensions/live-preview/core/block-decorator.ts:83 in blockDecorator call
by src/lib/core/markdown-editor/extensions/live-preview/core/profiling.ts:profileStart <- src/lib/core/markdown-editor/extensions/live-preview/core/scroll-debounce-plugin.ts:36 in scrollDebouncePlugin call
by src/lib/core/markdown-editor/extensions/live-preview/core/profiling.ts:profileStart <- src/lib/core/markdown-editor/extensions/live-preview/inline/inline-formatting-plugin.ts:197 in makeInlineFormattingPlugin call
by src/lib/core/markdown-editor/extensions/live-preview/core/profiling.ts:profileStart <- src/lib/core/markdown-editor/extensions/live-preview/plugins/footnote-plugin.ts:43 in footnotePlugin call
by src/lib/core/markdown-editor/extensions/live-preview/core/profiling.ts:profileStart <- src/lib/core/markdown-editor/extensions/live-preview/plugins/frontmatter-field.ts:38 in frontmatterField call
by src/lib/core/markdown-editor/extensions/live-preview/core/profiling.ts:profileStart <- src/lib/core/markdown-editor/extensions/live-preview/plugins/image-plugin.ts:64 in imagePlugin call
by src/lib/core/markdown-editor/extensions/live-preview/core/profiling.ts:profileStart <- src/lib/core/markdown-editor/extensions/live-preview/plugins/meta-bind-input-plugin.ts:40 in metaBindInputPlugin call
by src/lib/core/markdown-editor/extensions/live-preview/core/profiling.ts:profileStart <- src/lib/core/markdown-editor/extensions/live-preview/plugins/wikilink-embed-plugin.ts:45 in wikilinkEmbedPlugin call
more by 1 not shown: src/lib/plugins/queryjs(1): q importers src/lib/core/markdown-editor/extensions/live-preview/core/profiling.ts:profileStart
sym src/lib/core/markdown-editor/extensions/live-preview/core/profiling.ts:66 fn profileEnd(label: string, start: number, threshold: number = 0.5): void L8 | Ends a profiling measurement and logs the result if it exceeds the threshold.
by src/lib/core/markdown-editor/extensions/live-preview/core/profiling.ts:profileEnd <- src/lib/core/markdown-editor/extensions/live-preview/core/block-decorator.ts:85 in blockDecorator call
by src/lib/core/markdown-editor/extensions/live-preview/core/profiling.ts:profileEnd <- src/lib/core/markdown-editor/extensions/live-preview/core/scroll-debounce-plugin.ts:27 in scrollDebouncePlugin call
by src/lib/core/markdown-editor/extensions/live-preview/core/profiling.ts:profileEnd <- src/lib/core/markdown-editor/extensions/live-preview/inline/inline-formatting-plugin.ts:203 in makeInlineFormattingPlugin call
by src/lib/core/markdown-editor/extensions/live-preview/core/profiling.ts:profileEnd <- src/lib/core/markdown-editor/extensions/live-preview/plugins/footnote-plugin.ts:48 in footnotePlugin call
by src/lib/core/markdown-editor/extensions/live-preview/core/profiling.ts:profileEnd <- src/lib/core/markdown-editor/extensions/live-preview/plugins/frontmatter-field.ts:40 in frontmatterField call
by src/lib/core/markdown-editor/extensions/live-preview/core/profiling.ts:profileEnd <- src/lib/core/markdown-editor/extensions/live-preview/plugins/image-plugin.ts:69 in imagePlugin call
by src/lib/core/markdown-editor/extensions/live-preview/core/profiling.ts:profileEnd <- src/lib/core/markdown-editor/extensions/live-preview/plugins/meta-bind-input-plugin.ts:45 in metaBindInputPlugin call
by src/lib/core/markdown-editor/extensions/live-preview/core/profiling.ts:profileEnd <- src/lib/core/markdown-editor/extensions/live-preview/plugins/wikilink-embed-plugin.ts:50 in wikilinkEmbedPlugin call
more by 1 not shown: src/lib/plugins/queryjs(1): q importers src/lib/core/markdown-editor/extensions/live-preview/core/profiling.ts:profileEnd

# file card src/lib/plugins/queryjs/queryjs-block-widget.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/plugins/queryjs/queryjs-block-widget.ts ' codemap/files
file src/lib/plugins/queryjs/queryjs-block-widget.ts other L348 module src/lib/plugins/queryjs in2 t6
## imports
imp src/lib/plugins/queryjs/queryjs-block-widget.ts:2 -> src/lib/core/editor/editor.store.svelte.ts editorStore
imp src/lib/plugins/queryjs/queryjs-block-widget.ts:3 -> src/lib/core/markdown-editor/extensions/live-preview/core/fenced-block-renderers.ts type:FencedBlockRenderer
imp src/lib/plugins/queryjs/queryjs-block-widget.ts:4 -> src/lib/core/markdown-editor/extensions/live-preview/core/profiling.ts profileStart,profileEnd
imp src/lib/plugins/queryjs/queryjs-block-widget.ts:5 -> src/lib/core/settings/settings.store.svelte.ts settingsStore
imp src/lib/plugins/queryjs/queryjs-block-widget.ts:6 -> src/lib/core/vault/vault-entries.service.ts getVaultEntries
imp src/lib/plugins/queryjs/queryjs-block-widget.ts:7 -> src/lib/core/vault/vault.store.svelte.ts vaultStore
imp src/lib/plugins/queryjs/queryjs-block-widget.ts:8 -> src/lib/utils/log.service.ts appendLog
imp src/lib/plugins/queryjs/queryjs-block-widget.ts:9 -> src/lib/features/collection/collection.store.svelte.ts collectionStore
imp src/lib/plugins/queryjs/queryjs-block-widget.ts:10 -> src/lib/plugins/queryjs/kb-api.ts KBAPI,runQueryjsBlock
imp src/lib/plugins/queryjs/queryjs-block-widget.ts:11 -> src/lib/plugins/queryjs/queryjs-charts.ts destroyChartsIn
imp src/lib/plugins/queryjs/queryjs-block-widget.ts:12 -> src/lib/plugins/queryjs/queryjs.service.ts loadExternalScript
imp src/lib/plugins/queryjs/queryjs-block-widget.ts:13 -> src/lib/plugins/queryjs/queryjs-session.store.svelte.ts queryjsSessionStore
## imported-by
imp src/lib/app/editor-host.ts:35 -> src/lib/plugins/queryjs/queryjs-block-widget.ts queryjsBlockRenderer
imp src/lib/plugins/queryjs/queryjs-ports.ts:3 -> src/lib/plugins/queryjs/queryjs-block-widget.ts invalidateQueryjsCache
## reach
in2 src/lib/plugins/queryjs/queryjs-block-widget.ts 2 files in 1 modules: src/lib/app(2)
out2 src/lib/plugins/queryjs/queryjs-block-widget.ts 23 files in 10 modules: src/lib/plugins/queryjs(6) src/lib/core/editor(3) src/lib/core/settings(3) src/lib/utils(3) src/lib/core/filesystem(2) +5 modules
## tests
test src/tests/lib/plugins/queryjs/queryjs-block-widget.test.ts imports src/lib/plugins/queryjs/queryjs-block-widget.ts mirror
test src/tests/lib/core/markdown-editor/extensions/live-preview/core/fenced-block-renderers.test.ts imports src/lib/plugins/queryjs/queryjs-block-widget.ts
test src/tests/lib/core/markdown-editor/extensions/live-preview/plugins/block-reveal.test.ts imports src/lib/plugins/queryjs/queryjs-block-widget.ts
test src/tests/lib/core/markdown-editor/extensions/live-preview/plugins/queryjs-block-field.test.ts imports src/lib/plugins/queryjs/queryjs-block-widget.ts
test src/tests/lib/core/markdown-editor/extensions/live-preview/plugins/special-fence-detection.test.ts imports src/lib/plugins/queryjs/queryjs-block-widget.ts
test src/tests/lib/plugins/queryjs/queryjs-table-pager-click.test.ts imports src/lib/plugins/queryjs/queryjs-block-widget.ts
## symbols
sym src/lib/plugins/queryjs/queryjs-block-widget.ts:33 fn invalidateQueryjsCache(): void L3 | Module-level shim for the legacy `invalidateQueryjsCache()` API.
by src/lib/plugins/queryjs/queryjs-block-widget.ts:invalidateQueryjsCache <- src/lib/plugins/queryjs/queryjs-ports.ts:15 in registerQueryjsBlockPorts ref
sym src/lib/plugins/queryjs/queryjs-block-widget.ts:97 class QueryjsBlockWidget extends WidgetType L244 | Renders a `` ```queryjs `` fenced block.
sym src/lib/plugins/queryjs/queryjs-block-widget.ts:343 const queryjsBlockRenderer: FencedBlockRenderer L6 | Renders `` ```queryjs `` blocks; the app installs it in the editor's `fencedBlockRenderers`.
by src/lib/plugins/queryjs/queryjs-block-widget.ts:queryjsBlockRenderer <- src/lib/app/editor-host.ts:210 in appFencedBlockRenderers ref
## locals
local src/lib/plugins/queryjs/queryjs-block-widget.ts:50 fn markAutoRunAfterRenderPass(filePath: string): void L11
## calls
call src/lib/plugins/queryjs/queryjs-block-widget.ts:34 in invalidateQueryjsCache -> src/lib/plugins/queryjs/queryjs-session.store.svelte.ts:queryjsSessionStore.clearResults mcall
call src/lib/plugins/queryjs/queryjs-block-widget.ts:56 in markAutoRunAfterRenderPass -> src/lib/plugins/queryjs/queryjs-session.store.svelte.ts:queryjsSessionStore.markAutoRun mcall
call src/lib/plugins/queryjs/queryjs-block-widget.ts:135 in QueryjsBlockWidget.toDOM -> src/lib/plugins/queryjs/queryjs-session.store.svelte.ts:queryjsSessionStore.getResult mcall
call src/lib/plugins/queryjs/queryjs-block-widget.ts:137 in QueryjsBlockWidget.toDOM -> src/lib/utils/log.service.ts:appendLog call +1
call src/lib/plugins/queryjs/queryjs-block-widget.ts:147 in QueryjsBlockWidget.toDOM -> src/lib/plugins/queryjs/queryjs-session.store.svelte.ts:queryjsSessionStore.hasAutoRun mcall
call src/lib/plugins/queryjs/queryjs-block-widget.ts:147 in QueryjsBlockWidget.toDOM -> src/lib/plugins/queryjs/queryjs-session.store.svelte.ts:queryjsSessionStore.isStale mcall
call src/lib/plugins/queryjs/queryjs-block-widget.ts:155 in QueryjsBlockWidget.toDOM -> src/lib/plugins/queryjs/queryjs-block-widget.ts:markAutoRunAfterRenderPass call
call src/lib/plugins/queryjs/queryjs-block-widget.ts:156 in QueryjsBlockWidget.toDOM -> src/lib/plugins/queryjs/queryjs-block-widget.ts:QueryjsBlockWidget.execute call
call src/lib/plugins/queryjs/queryjs-block-widget.ts:163 in QueryjsBlockWidget.toDOM -> src/lib/plugins/queryjs/queryjs-block-widget.ts:QueryjsBlockWidget.renderRunPrompt call
call src/lib/plugins/queryjs/queryjs-block-widget.ts:193 in QueryjsBlockWidget.destroy -> src/lib/plugins/queryjs/queryjs-session.store.svelte.ts:queryjsSessionStore.holdsResult mcall +1
call src/lib/plugins/queryjs/queryjs-block-widget.ts:195 in QueryjsBlockWidget.destroy -> src/lib/plugins/queryjs/queryjs-charts.ts:destroyChartsIn call
call src/lib/plugins/queryjs/queryjs-block-widget.ts:201 in QueryjsBlockWidget.renderRunPrompt -> src/lib/utils/log.service.ts:appendLog call
call src/lib/plugins/queryjs/queryjs-block-widget.ts:223 in QueryjsBlockWidget.renderRunPrompt -> src/lib/plugins/queryjs/queryjs-charts.ts:destroyChartsIn call
call src/lib/plugins/queryjs/queryjs-block-widget.ts:225 in QueryjsBlockWidget.renderRunPrompt -> src/lib/plugins/queryjs/queryjs-block-widget.ts:QueryjsBlockWidget.execute call
call src/lib/plugins/queryjs/queryjs-block-widget.ts:236 in QueryjsBlockWidget.execute -> src/lib/core/markdown-editor/extensions/live-preview/core/profiling.ts:profileStart call
call src/lib/plugins/queryjs/queryjs-block-widget.ts:252 in QueryjsBlockWidget.execute -> src/lib/core/vault/vault-entries.service.ts:getVaultEntries call
call src/lib/plugins/queryjs/queryjs-block-widget.ts:254 in QueryjsBlockWidget.execute -> src/lib/plugins/queryjs/kb-api.ts:KBAPI new
call src/lib/plugins/queryjs/queryjs-block-widget.ts:262 in QueryjsBlockWidget.execute -> src/lib/plugins/queryjs/queryjs.service.ts:loadExternalScript ref
call src/lib/plugins/queryjs/queryjs-block-widget.ts:265 in QueryjsBlockWidget.execute -> src/lib/plugins/queryjs/kb-api.ts:runQueryjsBlock call
call src/lib/plugins/queryjs/queryjs-block-widget.ts:266 in QueryjsBlockWidget.execute -> src/lib/core/markdown-editor/extensions/live-preview/core/profiling.ts:profileEnd call
call src/lib/plugins/queryjs/queryjs-block-widget.ts:267 in QueryjsBlockWidget.execute -> src/lib/utils/log.service.ts:appendLog call
call src/lib/plugins/queryjs/queryjs-block-widget.ts:279 in QueryjsBlockWidget.execute -> src/lib/plugins/queryjs/queryjs-session.store.svelte.ts:queryjsSessionStore.setResult mcall
call src/lib/plugins/queryjs/queryjs-block-widget.ts:284 in QueryjsBlockWidget.execute -> src/lib/plugins/queryjs/queryjs-charts.ts:destroyChartsIn call
call src/lib/plugins/queryjs/queryjs-block-widget.ts:286 in QueryjsBlockWidget.execute -> src/lib/plugins/queryjs/queryjs-session.store.svelte.ts:queryjsSessionStore.clearStale mcall
call src/lib/plugins/queryjs/queryjs-block-widget.ts:287 in QueryjsBlockWidget.execute -> src/lib/plugins/queryjs/queryjs-block-widget.ts:QueryjsBlockWidget.renderStructuredError call
call src/lib/plugins/queryjs/queryjs-block-widget.ts:332 in QueryjsBlockWidget.renderStructuredError -> src/lib/plugins/queryjs/queryjs-charts.ts:destroyChartsIn call
call src/lib/plugins/queryjs/queryjs-block-widget.ts:334 in QueryjsBlockWidget.renderStructuredError -> src/lib/plugins/queryjs/queryjs-block-widget.ts:QueryjsBlockWidget.execute call
call src/lib/plugins/queryjs/queryjs-block-widget.ts:345 in queryjsBlockRenderer.widget -> src/lib/plugins/queryjs/queryjs-block-widget.ts:QueryjsBlockWidget new
## effects
fx src/lib/plugins/queryjs/queryjs-block-widget.ts:54 timer.setTimeout delay=0 in markAutoRunAfterRenderPass
fx src/lib/plugins/queryjs/queryjs-block-widget.ts:58 timer.requestAnimationFrame in markAutoRunAfterRenderPass
fx src/lib/plugins/queryjs/queryjs-block-widget.ts:217 dom.mousedown button in QueryjsBlockWidget.renderRunPrompt
fx src/lib/plugins/queryjs/queryjs-block-widget.ts:329 dom.mousedown retry in QueryjsBlockWidget.renderStructuredError

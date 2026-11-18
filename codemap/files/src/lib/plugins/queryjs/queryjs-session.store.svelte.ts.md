# file card src/lib/plugins/queryjs/queryjs-session.store.svelte.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/plugins/queryjs/queryjs-session.store.svelte.ts ' codemap/files
file src/lib/plugins/queryjs/queryjs-session.store.svelte.ts store L198 module src/lib/plugins/queryjs in4 t5 | Session-scoped state for the QueryJS execution model (Phase 12 of the Híbrido D refactor).
## imports
imp src/lib/plugins/queryjs/queryjs-session.store.svelte.ts:52 -> src/lib/plugins/queryjs/queryjs-charts.ts destroyChartsIn
## imported-by
imp src/lib/app/lifecycle/app-lifecycle.service.ts:5 -> src/lib/plugins/queryjs/queryjs-session.store.svelte.ts queryjsSessionStore
imp src/lib/plugins/queryjs/QueryjsSection.svelte:5 -> src/lib/plugins/queryjs/queryjs-session.store.svelte.ts queryjsSessionStore
imp src/lib/plugins/queryjs/queryjs-block-widget.ts:13 -> src/lib/plugins/queryjs/queryjs-session.store.svelte.ts queryjsSessionStore
imp src/lib/plugins/queryjs/queryjs-ports.ts:4 -> src/lib/plugins/queryjs/queryjs-session.store.svelte.ts queryjsSessionStore
## reach
in2 src/lib/plugins/queryjs/queryjs-session.store.svelte.ts 4 files in 2 modules: src/lib/app(3) src/routes(1)
out2 src/lib/plugins/queryjs/queryjs-session.store.svelte.ts 0 files in 0 modules: -
## tests
test src/tests/lib/plugins/queryjs/queryjs-session.store.test.ts imports src/lib/plugins/queryjs/queryjs-session.store.svelte.ts mirror
test src/tests/lib/app/boot.test.ts imports src/lib/plugins/queryjs/queryjs-session.store.svelte.ts
test src/tests/lib/core/trash/trash.service.test.ts imports src/lib/plugins/queryjs/queryjs-session.store.svelte.ts
test src/tests/lib/plugins/queryjs/queryjs-block-widget.test.ts imports src/lib/plugins/queryjs/queryjs-session.store.svelte.ts
test src/tests/lib/plugins/queryjs/queryjs-table-pager-click.test.ts imports src/lib/plugins/queryjs/queryjs-session.store.svelte.ts
## symbols
sym src/lib/plugins/queryjs/queryjs-session.store.svelte.ts:72 store queryjsSessionStore L127
by src/lib/plugins/queryjs/queryjs-session.store.svelte.ts:queryjsSessionStore <- src/lib/app/lifecycle/app-lifecycle.service.ts:652 in teardownVault mcall
by src/lib/plugins/queryjs/queryjs-session.store.svelte.ts:queryjsSessionStore <- src/lib/plugins/queryjs/QueryjsSection.svelte:40 in clearCache mcall
by src/lib/plugins/queryjs/queryjs-session.store.svelte.ts:queryjsSessionStore <- src/lib/plugins/queryjs/queryjs-block-widget.ts:34 in invalidateQueryjsCache mcall +8
by src/lib/plugins/queryjs/queryjs-session.store.svelte.ts:queryjsSessionStore <- src/lib/plugins/queryjs/queryjs-ports.ts:16 in registerQueryjsBlockPorts mcall
## store
store src/lib/plugins/queryjs/queryjs-session.store.svelte.ts:72 queryjsSessionStore esc:0
mem src/lib/plugins/queryjs/queryjs-session.store.svelte.ts:74 get queryjsSessionStore.resultCache r:- w-via:setResult,invalidate,clearResults,reset | All cached rendered results — for inspection and tests.
mem src/lib/plugins/queryjs/queryjs-session.store.svelte.ts:78 get queryjsSessionStore.autoRunOnFirstOpen r:- w-via:markAutoRun,invalidatePath,reset | All file paths that have had at least one auto-execute this session.
mem src/lib/plugins/queryjs/queryjs-session.store.svelte.ts:82 get queryjsSessionStore.staleResults r:- w-via:setResult,clearResults,clearStale,invalidatePath,reset | Cache keys whose result a content invalidation dropped — for inspection and tests.
mem src/lib/plugins/queryjs/queryjs-session.store.svelte.ts:87 do queryjsSessionStore.hasResult w:- | True if this script already has a cached result in this file.
mem src/lib/plugins/queryjs/queryjs-session.store.svelte.ts:92 do queryjsSessionStore.getResult w:src/lib/plugins/queryjs/queryjs-block-widget.ts:135 | Returns the cached rendered DOM of this script in this file, or undefined if absent.
mem src/lib/plugins/queryjs/queryjs-session.store.svelte.ts:100 do queryjsSessionStore.setResult w:src/lib/plugins/queryjs/queryjs-block-widget.ts:279 | Stores a rendered result.
mem src/lib/plugins/queryjs/queryjs-session.store.svelte.ts:111 do queryjsSessionStore.invalidate w:- | Drops one cached result (called when its source content changes).
mem src/lib/plugins/queryjs/queryjs-session.store.svelte.ts:122 do queryjsSessionStore.holdsResult w:src/lib/plugins/queryjs/queryjs-block-widget.ts:193,src/lib/plugins/queryjs/queryjs-block-widget.ts:194 | True if `element` is a cached result, under any key.
mem src/lib/plugins/queryjs/queryjs-session.store.svelte.ts:135 do queryjsSessionStore.clearResults w:src/lib/plugins/queryjs/queryjs-block-widget.ts:34 | Drops every cached result and marks each one stale, keeping the autoRunOnFirstOpen markers intact.
mem src/lib/plugins/queryjs/queryjs-session.store.svelte.ts:144 do queryjsSessionStore.isStale w:src/lib/plugins/queryjs/queryjs-block-widget.ts:147 | True if a content invalidation dropped this script's result in this file and it has not run since.
mem src/lib/plugins/queryjs/queryjs-session.store.svelte.ts:153 do queryjsSessionStore.clearStale w:src/lib/plugins/queryjs/queryjs-block-widget.ts:286 | Drops the stale mark of one block without caching a result.
mem src/lib/plugins/queryjs/queryjs-session.store.svelte.ts:158 do queryjsSessionStore.hasAutoRun w:src/lib/plugins/queryjs/queryjs-block-widget.ts:147 | True if this file path has already auto-run at least once this session.
mem src/lib/plugins/queryjs/queryjs-session.store.svelte.ts:163 do queryjsSessionStore.markAutoRun w:src/lib/plugins/queryjs/queryjs-block-widget.ts:56 | Marks the file as having auto-executed at least once.
mem src/lib/plugins/queryjs/queryjs-session.store.svelte.ts:175 do queryjsSessionStore.invalidatePath w:src/lib/plugins/queryjs/queryjs-ports.ts:16 | Drops the auto-run and stale markers for a path.
mem src/lib/plugins/queryjs/queryjs-session.store.svelte.ts:191 do queryjsSessionStore.reset w:src/lib/app/lifecycle/app-lifecycle.service.ts:652,src/lib/plugins/queryjs/QueryjsSection.svelte:40 | Wipes the entire session — called by vault teardown.
## locals
local src/lib/plugins/queryjs/queryjs-session.store.svelte.ts:63 fn dropResult(element: HTMLElement): void L3
local src/lib/plugins/queryjs/queryjs-session.store.svelte.ts:68 fn resultKey(filePath: string, jsContent: string): string L3
## calls
call src/lib/plugins/queryjs/queryjs-session.store.svelte.ts:64 in dropResult -> src/lib/plugins/queryjs/queryjs-charts.ts:destroyChartsIn call
call src/lib/plugins/queryjs/queryjs-session.store.svelte.ts:88 in queryjsSessionStore.hasResult -> src/lib/plugins/queryjs/queryjs-session.store.svelte.ts:resultKey call
call src/lib/plugins/queryjs/queryjs-session.store.svelte.ts:93 in queryjsSessionStore.getResult -> src/lib/plugins/queryjs/queryjs-session.store.svelte.ts:resultKey call
call src/lib/plugins/queryjs/queryjs-session.store.svelte.ts:101 in queryjsSessionStore.setResult -> src/lib/plugins/queryjs/queryjs-session.store.svelte.ts:resultKey call
call src/lib/plugins/queryjs/queryjs-session.store.svelte.ts:103 in queryjsSessionStore.setResult -> src/lib/plugins/queryjs/queryjs-session.store.svelte.ts:dropResult call
call src/lib/plugins/queryjs/queryjs-session.store.svelte.ts:112 in queryjsSessionStore.invalidate -> src/lib/plugins/queryjs/queryjs-session.store.svelte.ts:resultKey call
call src/lib/plugins/queryjs/queryjs-session.store.svelte.ts:116 in queryjsSessionStore.invalidate -> src/lib/plugins/queryjs/queryjs-session.store.svelte.ts:dropResult call
call src/lib/plugins/queryjs/queryjs-session.store.svelte.ts:140 in queryjsSessionStore.clearResults -> src/lib/plugins/queryjs/queryjs-session.store.svelte.ts:dropResult call
call src/lib/plugins/queryjs/queryjs-session.store.svelte.ts:145 in queryjsSessionStore.isStale -> src/lib/plugins/queryjs/queryjs-session.store.svelte.ts:resultKey call
call src/lib/plugins/queryjs/queryjs-session.store.svelte.ts:154 in queryjsSessionStore.clearStale -> src/lib/plugins/queryjs/queryjs-session.store.svelte.ts:resultKey call
call src/lib/plugins/queryjs/queryjs-session.store.svelte.ts:179 in queryjsSessionStore.invalidatePath -> src/lib/plugins/queryjs/queryjs-session.store.svelte.ts:resultKey call
call src/lib/plugins/queryjs/queryjs-session.store.svelte.ts:196 in queryjsSessionStore.reset -> src/lib/plugins/queryjs/queryjs-session.store.svelte.ts:dropResult call

# file card src/lib/plugins/queryjs/queryjs-session.store.svelte.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/plugins/queryjs/queryjs-session.store.svelte.ts ' codemap/files
file src/lib/plugins/queryjs/queryjs-session.store.svelte.ts store L157 module src/lib/plugins/queryjs in4 t4 | Session-scoped state for the QueryJS execution model (Phase 12 of the Híbrido D refactor).
## imports
imp src/lib/plugins/queryjs/queryjs-session.store.svelte.ts:44 -> src/lib/plugins/queryjs/queryjs-charts.ts destroyChartsIn
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
## symbols
sym src/lib/plugins/queryjs/queryjs-session.store.svelte.ts:63 store queryjsSessionStore L95
by src/lib/plugins/queryjs/queryjs-session.store.svelte.ts:queryjsSessionStore <- src/lib/app/lifecycle/app-lifecycle.service.ts:652 in teardownVault mcall
by src/lib/plugins/queryjs/queryjs-session.store.svelte.ts:queryjsSessionStore <- src/lib/plugins/queryjs/QueryjsSection.svelte:40 in clearCache mcall
by src/lib/plugins/queryjs/queryjs-session.store.svelte.ts:queryjsSessionStore <- src/lib/plugins/queryjs/queryjs-block-widget.ts:33 in invalidateQueryjsCache mcall +6
by src/lib/plugins/queryjs/queryjs-session.store.svelte.ts:queryjsSessionStore <- src/lib/plugins/queryjs/queryjs-ports.ts:16 in registerQueryjsBlockPorts mcall
## store
store src/lib/plugins/queryjs/queryjs-session.store.svelte.ts:63 queryjsSessionStore esc:0
mem src/lib/plugins/queryjs/queryjs-session.store.svelte.ts:65 get queryjsSessionStore.resultCache r:- w-via:setResult,invalidate,clearResults,reset | All cached rendered results — for inspection and tests.
mem src/lib/plugins/queryjs/queryjs-session.store.svelte.ts:69 get queryjsSessionStore.autoRunOnFirstOpen r:- w-via:markAutoRun,invalidatePath,reset | All file paths that have had at least one auto-execute this session.
mem src/lib/plugins/queryjs/queryjs-session.store.svelte.ts:74 do queryjsSessionStore.hasResult w:- | True if this script already has a cached result in this file.
mem src/lib/plugins/queryjs/queryjs-session.store.svelte.ts:79 do queryjsSessionStore.getResult w:src/lib/plugins/queryjs/queryjs-block-widget.ts:128 | Returns the cached rendered DOM of this script in this file, or undefined if absent.
mem src/lib/plugins/queryjs/queryjs-session.store.svelte.ts:87 do queryjsSessionStore.setResult w:src/lib/plugins/queryjs/queryjs-block-widget.ts:270 | Stores a rendered result.
mem src/lib/plugins/queryjs/queryjs-session.store.svelte.ts:97 do queryjsSessionStore.invalidate w:- | Drops one cached result (called when its source content changes).
mem src/lib/plugins/queryjs/queryjs-session.store.svelte.ts:108 do queryjsSessionStore.holdsResult w:src/lib/plugins/queryjs/queryjs-block-widget.ts:184,src/lib/plugins/queryjs/queryjs-block-widget.ts:185 | True if `element` is a cached result, under any key.
mem src/lib/plugins/queryjs/queryjs-session.store.svelte.ts:121 do queryjsSessionStore.clearResults w:src/lib/plugins/queryjs/queryjs-block-widget.ts:33 | Drops every cached result while keeping the autoRunOnFirstOpen markers intact.
mem src/lib/plugins/queryjs/queryjs-session.store.svelte.ts:128 do queryjsSessionStore.hasAutoRun w:src/lib/plugins/queryjs/queryjs-block-widget.ts:139 | True if this file path has already auto-run at least once this session.
mem src/lib/plugins/queryjs/queryjs-session.store.svelte.ts:133 do queryjsSessionStore.markAutoRun w:src/lib/plugins/queryjs/queryjs-block-widget.ts:55 | Marks the file as having auto-executed at least once.
mem src/lib/plugins/queryjs/queryjs-session.store.svelte.ts:144 do queryjsSessionStore.invalidatePath w:src/lib/plugins/queryjs/queryjs-ports.ts:16 | Drops the auto-run marker for a path.
mem src/lib/plugins/queryjs/queryjs-session.store.svelte.ts:151 do queryjsSessionStore.reset w:src/lib/app/lifecycle/app-lifecycle.service.ts:652,src/lib/plugins/queryjs/QueryjsSection.svelte:40 | Wipes the entire session — called by vault teardown.
## locals
local src/lib/plugins/queryjs/queryjs-session.store.svelte.ts:54 fn dropResult(element: HTMLElement): void L3
local src/lib/plugins/queryjs/queryjs-session.store.svelte.ts:59 fn resultKey(filePath: string, jsContent: string): string L3
## calls
call src/lib/plugins/queryjs/queryjs-session.store.svelte.ts:55 in dropResult -> src/lib/plugins/queryjs/queryjs-charts.ts:destroyChartsIn call
call src/lib/plugins/queryjs/queryjs-session.store.svelte.ts:75 in queryjsSessionStore.hasResult -> src/lib/plugins/queryjs/queryjs-session.store.svelte.ts:resultKey call
call src/lib/plugins/queryjs/queryjs-session.store.svelte.ts:80 in queryjsSessionStore.getResult -> src/lib/plugins/queryjs/queryjs-session.store.svelte.ts:resultKey call
call src/lib/plugins/queryjs/queryjs-session.store.svelte.ts:88 in queryjsSessionStore.setResult -> src/lib/plugins/queryjs/queryjs-session.store.svelte.ts:resultKey call
call src/lib/plugins/queryjs/queryjs-session.store.svelte.ts:90 in queryjsSessionStore.setResult -> src/lib/plugins/queryjs/queryjs-session.store.svelte.ts:dropResult call
call src/lib/plugins/queryjs/queryjs-session.store.svelte.ts:98 in queryjsSessionStore.invalidate -> src/lib/plugins/queryjs/queryjs-session.store.svelte.ts:resultKey call
call src/lib/plugins/queryjs/queryjs-session.store.svelte.ts:102 in queryjsSessionStore.invalidate -> src/lib/plugins/queryjs/queryjs-session.store.svelte.ts:dropResult call
call src/lib/plugins/queryjs/queryjs-session.store.svelte.ts:124 in queryjsSessionStore.clearResults -> src/lib/plugins/queryjs/queryjs-session.store.svelte.ts:dropResult call
call src/lib/plugins/queryjs/queryjs-session.store.svelte.ts:155 in queryjsSessionStore.reset -> src/lib/plugins/queryjs/queryjs-session.store.svelte.ts:dropResult call

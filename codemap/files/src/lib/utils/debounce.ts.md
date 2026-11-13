# file card src/lib/utils/debounce.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/utils/debounce.ts ' codemap/files
file src/lib/utils/debounce.ts other L55 module src/lib/utils in4 t4
## imported-by
imp src/lib/app/lifecycle/app-lifecycle.service.ts:7 -> src/lib/utils/debounce.ts debounce
imp src/lib/core/editor/editor.service.ts:9 -> src/lib/utils/debounce.ts debounce
imp src/lib/features/rail-shell/TypesNavigator.svelte:25 -> src/lib/utils/debounce.ts debounce
imp src/lib/features/tags/tags.service.ts:3 -> src/lib/utils/debounce.ts debounce
## reach
in2 src/lib/utils/debounce.ts 56 files in 30 modules: src/lib/app(7) src/lib/features/event-calendar(5) src/lib/core/filesystem(3) src/lib/features/rail-shell(3) src/lib/core/markdown-editor(2) +25 modules: q impact src/lib/utils/debounce.ts --depth 2
out2 src/lib/utils/debounce.ts 0 files in 0 modules: -
## tests
test src/tests/lib/utils/debounce.test.ts imports src/lib/utils/debounce.ts mirror
test src/tests/lib/utils/inflight.test.ts imports src/lib/utils/debounce.ts
test src/tests/lib/app/lifecycle/app-lifecycle.service.test.ts mocks src/lib/utils/debounce.ts
test src/tests/lib/core/editor/editor.service.test.ts mocks src/lib/utils/debounce.ts
## symbols
sym src/lib/utils/debounce.ts:2 interface DebounceOptions L8 | Options for `debounce`.
sym src/lib/utils/debounce.ts:12 fn debounce<T extends (...args: any[]) => void>(fn: T, delay: number, options: DebounceOptions = {}): ((...args: Parameters<T>) =>… L44 | Creates a debounced version of a function that delays execution until after the given delay in ms.
by src/lib/utils/debounce.ts:debounce <- src/lib/app/lifecycle/app-lifecycle.service.ts:514 in initializeVault call
by src/lib/utils/debounce.ts:debounce <- src/lib/core/editor/editor.service.ts:276 in debouncedSave call +1
by src/lib/utils/debounce.ts:debounce <- src/lib/features/rail-shell/TypesNavigator.svelte:88 in recountViews call
by src/lib/utils/debounce.ts:debounce <- src/lib/features/tags/tags.service.ts:90 in debouncedTrigger call
## effects
fx src/lib/utils/debounce.ts:38 timer.setTimeout delay=delay in debounce
fx src/lib/utils/debounce.ts:40 timer.setTimeout delay=options.maxWait in debounce

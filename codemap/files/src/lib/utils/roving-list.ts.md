# file card src/lib/utils/roving-list.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/utils/roving-list.ts ' codemap/files
file src/lib/utils/roving-list.ts other L93 module src/lib/utils in2 t1 | The generic keyboard model of a roving-tabindex list: which row a key focuses, which row stays current when the list changes, and which row holds the list's on…
## imported-by
imp src/lib/features/search/SearchPanel.svelte:9 -> src/lib/utils/roving-list.ts resolveRovingFocus,tabStopRow
imp src/lib/features/tasks/tasks-keys.logic.ts:9 -> src/lib/utils/roving-list.ts resolveRovingFocus
imp src/lib/features/tasks/tasks-keys.logic.ts:11 -> src/lib/utils/roving-list.ts nextCurrentRow,tabStopRow
## reach
in2 src/lib/utils/roving-list.ts 4 files in 2 modules: src/lib/features/tasks(3) src/lib/app(1)
out2 src/lib/utils/roving-list.ts 0 files in 0 modules: -
## tests
test src/tests/lib/utils/roving-list.test.ts imports src/lib/utils/roving-list.ts mirror
## symbols
sym src/lib/utils/roving-list.ts:9 interface RovingKeyInput L18 | A keydown on a list, as `resolveRovingFocus` reads it.
sym src/lib/utils/roving-list.ts:34 fn resolveRovingFocus(input: RovingKeyInput): number | null L16 | The index of the row that ArrowUp, ArrowDown, Home or End focuses, or null when the list leaves the key alone: a key on a control inside the row, any modifier …
by src/lib/utils/roving-list.ts:resolveRovingFocus <- src/lib/features/search/SearchPanel.svelte:107 in handleListKeydown call
by src/lib/utils/roving-list.ts:resolveRovingFocus <- src/lib/features/tasks/tasks-keys.logic.ts:57 in resolveTaskKey call
sym src/lib/utils/roving-list.ts:57 fn nextCurrentRow(order: string[], prevOrder: string[], current: string | null): string | null L14 | The current row after the list changed from `prevOrder` to `order`: `current` when it is still listed, else the first row after it in `prevOrder` that is still…
by src/lib/utils/roving-list.ts:nextCurrentRow <- src/lib/features/tasks/TasksView.svelte:458 in $effect@448 call +1
sym src/lib/utils/roving-list.ts:82 fn tabStopRow(rendered: string[], order: string[], current: string | null): string | null L12 | The row that holds the list's tab stop: `current` when it is rendered.
by src/lib/utils/roving-list.ts:tabStopRow <- src/lib/features/search/SearchPanel.svelte:84 in tabStopKey=$derived call
by src/lib/utils/roving-list.ts:tabStopRow <- src/lib/features/tasks/TasksView.svelte:333 in tabStopKey=$derived call +2

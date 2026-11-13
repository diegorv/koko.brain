# file card src/lib/features/rail-shell/RailListSearch.svelte
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/rail-shell/RailListSearch.svelte ' codemap/files
file src/lib/features/rail-shell/RailListSearch.svelte component L119 module src/lib/features/rail-shell in1 t1
## imports
imp src/lib/features/rail-shell/RailListSearch.svelte:5 -> src/lib/components/ui/input/index.ts Input
## imported-by
imp src/lib/features/rail-shell/RailNoteList.svelte:90 -> src/lib/features/rail-shell/RailListSearch.svelte default
## reach
in2 src/lib/features/rail-shell/RailListSearch.svelte 1 files in 1 modules: src/lib/app(1)
out2 src/lib/features/rail-shell/RailListSearch.svelte 1 files in 1 modules: src/lib/components(1)
## tests
test src/tests/lib/features/rail-shell/RailListSearch.test.ts imports src/lib/features/rail-shell/RailListSearch.svelte mirror
## symbols
sym src/lib/features/rail-shell/RailListSearch.svelte:1 component RailListSearch props:value,loading,onChange,onClose L119
by src/lib/features/rail-shell/RailListSearch.svelte:default <- src/lib/features/rail-shell/RailNoteList.svelte:823 in (markup) mount
## locals
local src/lib/features/rail-shell/RailListSearch.svelte:48 fn clearTimer() L5
local src/lib/features/rail-shell/RailListSearch.svelte:54 fn emit(next: string) L4
local src/lib/features/rail-shell/RailListSearch.svelte:59 fn handleInput(next: string) L14
local src/lib/features/rail-shell/RailListSearch.svelte:74 fn handleClear() L4
local src/lib/features/rail-shell/RailListSearch.svelte:79 fn handleKeydown(event: KeyboardEvent) L3
## mounts
mount src/lib/features/rail-shell/RailListSearch.svelte:86 Input -> src/lib/components/ui/input/input.svelte
## mounted-at
mount src/lib/features/rail-shell/RailNoteList.svelte:823 RailListSearch -> src/lib/features/rail-shell/RailListSearch.svelte
## calls
call src/lib/features/rail-shell/RailListSearch.svelte:36 in $effect@31 -> src/lib/features/rail-shell/RailListSearch.svelte:clearTimer call
call src/lib/features/rail-shell/RailListSearch.svelte:61 in handleInput -> src/lib/features/rail-shell/RailListSearch.svelte:clearTimer call
call src/lib/features/rail-shell/RailListSearch.svelte:63 in handleInput -> src/lib/features/rail-shell/RailListSearch.svelte:emit call +1
call src/lib/features/rail-shell/RailListSearch.svelte:75 in handleClear -> src/lib/features/rail-shell/RailListSearch.svelte:handleInput call
call src/lib/features/rail-shell/RailListSearch.svelte:94 in (markup) -> src/lib/features/rail-shell/RailListSearch.svelte:handleInput markup
call src/lib/features/rail-shell/RailListSearch.svelte:95 in (markup) -> src/lib/features/rail-shell/RailListSearch.svelte:handleKeydown markup
call src/lib/features/rail-shell/RailListSearch.svelte:113 in (markup) -> src/lib/features/rail-shell/RailListSearch.svelte:handleClear markup
## effects
fx src/lib/features/rail-shell/RailListSearch.svelte:31 svelte.$effect in (script)
fx src/lib/features/rail-shell/RailListSearch.svelte:41 svelte.$effect in (script)
fx src/lib/features/rail-shell/RailListSearch.svelte:46 svelte.$effect in (script)
fx src/lib/features/rail-shell/RailListSearch.svelte:67 timer.setTimeout delay=DEBOUNCE_MS in handleInput

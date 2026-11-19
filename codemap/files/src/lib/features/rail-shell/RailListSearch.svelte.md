# file card src/lib/features/rail-shell/RailListSearch.svelte
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/rail-shell/RailListSearch.svelte ' codemap/files
file src/lib/features/rail-shell/RailListSearch.svelte component L122 module src/lib/features/rail-shell in1 t1
## imports
imp src/lib/features/rail-shell/RailListSearch.svelte:5 -> src/lib/components/ui/input/index.ts Input
## imported-by
imp src/lib/features/rail-shell/RailNoteList.svelte:102 -> src/lib/features/rail-shell/RailListSearch.svelte default
## reach
in2 src/lib/features/rail-shell/RailListSearch.svelte 1 files in 1 modules: src/lib/app(1)
out2 src/lib/features/rail-shell/RailListSearch.svelte 1 files in 1 modules: src/lib/components(1)
## tests
test src/tests/lib/features/rail-shell/RailListSearch.test.ts imports src/lib/features/rail-shell/RailListSearch.svelte mirror
## symbols
sym src/lib/features/rail-shell/RailListSearch.svelte:1 component RailListSearch props:value,loading,onChange,onClose,onArrowDown L122
by src/lib/features/rail-shell/RailListSearch.svelte:default <- src/lib/features/rail-shell/RailNoteList.svelte:1023 in (markup) mount
## locals
local src/lib/features/rail-shell/RailListSearch.svelte:50 fn clearTimer() L5
local src/lib/features/rail-shell/RailListSearch.svelte:56 fn emit(next: string) L4
local src/lib/features/rail-shell/RailListSearch.svelte:61 fn handleInput(next: string) L14
local src/lib/features/rail-shell/RailListSearch.svelte:76 fn handleClear() L4
local src/lib/features/rail-shell/RailListSearch.svelte:81 fn handleKeydown(event: KeyboardEvent) L4
## mounts
mount src/lib/features/rail-shell/RailListSearch.svelte:89 Input -> src/lib/components/ui/input/input.svelte
## mounted-at
mount src/lib/features/rail-shell/RailNoteList.svelte:1023 RailListSearch -> src/lib/features/rail-shell/RailListSearch.svelte
## calls
call src/lib/features/rail-shell/RailListSearch.svelte:38 in $effect@33 -> src/lib/features/rail-shell/RailListSearch.svelte:clearTimer call
call src/lib/features/rail-shell/RailListSearch.svelte:63 in handleInput -> src/lib/features/rail-shell/RailListSearch.svelte:clearTimer call
call src/lib/features/rail-shell/RailListSearch.svelte:65 in handleInput -> src/lib/features/rail-shell/RailListSearch.svelte:emit call +1
call src/lib/features/rail-shell/RailListSearch.svelte:77 in handleClear -> src/lib/features/rail-shell/RailListSearch.svelte:handleInput call
call src/lib/features/rail-shell/RailListSearch.svelte:97 in (markup) -> src/lib/features/rail-shell/RailListSearch.svelte:handleInput markup
call src/lib/features/rail-shell/RailListSearch.svelte:98 in (markup) -> src/lib/features/rail-shell/RailListSearch.svelte:handleKeydown markup
call src/lib/features/rail-shell/RailListSearch.svelte:116 in (markup) -> src/lib/features/rail-shell/RailListSearch.svelte:handleClear markup
## effects
fx src/lib/features/rail-shell/RailListSearch.svelte:33 svelte.$effect in (script)
fx src/lib/features/rail-shell/RailListSearch.svelte:43 svelte.$effect in (script)
fx src/lib/features/rail-shell/RailListSearch.svelte:48 svelte.$effect in (script)
fx src/lib/features/rail-shell/RailListSearch.svelte:69 timer.setTimeout delay=DEBOUNCE_MS in handleInput

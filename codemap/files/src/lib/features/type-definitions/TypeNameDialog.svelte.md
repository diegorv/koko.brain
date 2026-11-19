# file card src/lib/features/type-definitions/TypeNameDialog.svelte
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/type-definitions/TypeNameDialog.svelte ' codemap/files
file src/lib/features/type-definitions/TypeNameDialog.svelte component L100 module src/lib/features/type-definitions in1 t1
## imports
imp src/lib/features/type-definitions/TypeNameDialog.svelte:2 -> src/lib/components/ui/dialog/index.ts *
imp src/lib/features/type-definitions/TypeNameDialog.svelte:3 -> src/lib/components/ui/input/index.ts Input
imp src/lib/features/type-definitions/TypeNameDialog.svelte:4 -> src/lib/components/ui/button/index.ts Button
## imported-by
imp src/lib/features/rail-shell/TypesNavigator.svelte:52 -> src/lib/features/type-definitions/TypeNameDialog.svelte default
## reach
in2 src/lib/features/type-definitions/TypeNameDialog.svelte 1 files in 1 modules: src/lib/app(1)
out2 src/lib/features/type-definitions/TypeNameDialog.svelte 12 files in 1 modules: src/lib/components(12)
## tests
test src/tests/lib/features/type-definitions/TypeNameDialog.svelte.test.ts imports src/lib/features/type-definitions/TypeNameDialog.svelte mirror
## symbols
sym src/lib/features/type-definitions/TypeNameDialog.svelte:1 component TypeNameDialog props:open=$bindable,title,confirmLabel,busyLabel,initialValue=,description=,validate,normalize,onConfirm L100
by src/lib/features/type-definitions/TypeNameDialog.svelte:default <- src/lib/features/rail-shell/TypesNavigator.svelte:471 in (markup) mount +1
## locals
local src/lib/features/type-definitions/TypeNameDialog.svelte:53 fn setOpen(next: boolean) L4
local src/lib/features/type-definitions/TypeNameDialog.svelte:58 fn confirm() L12
local src/lib/features/type-definitions/TypeNameDialog.svelte:71 fn handleKeydown(e: KeyboardEvent) L6
## mounts
mount src/lib/features/type-definitions/TypeNameDialog.svelte:88 Input -> src/lib/components/ui/input/input.svelte
mount src/lib/features/type-definitions/TypeNameDialog.svelte:96 Button -> src/lib/components/ui/button/button.svelte
mount src/lib/features/type-definitions/TypeNameDialog.svelte:97 Button -> src/lib/components/ui/button/button.svelte
## mounted-at
mount src/lib/features/rail-shell/TypesNavigator.svelte:471 TypeNameDialog -> src/lib/features/type-definitions/TypeNameDialog.svelte
mount src/lib/features/rail-shell/TypesNavigator.svelte:493 TypeNameDialog -> src/lib/features/type-definitions/TypeNameDialog.svelte
## calls
call src/lib/features/type-definitions/TypeNameDialog.svelte:74 in handleKeydown -> src/lib/features/type-definitions/TypeNameDialog.svelte:confirm call
call src/lib/features/type-definitions/TypeNameDialog.svelte:79 in (markup) -> src/lib/features/type-definitions/TypeNameDialog.svelte:setOpen markup +1
call src/lib/features/type-definitions/TypeNameDialog.svelte:88 in (markup) -> src/lib/features/type-definitions/TypeNameDialog.svelte:handleKeydown markup
call src/lib/features/type-definitions/TypeNameDialog.svelte:97 in (markup) -> src/lib/features/type-definitions/TypeNameDialog.svelte:confirm markup
## effects
fx src/lib/features/type-definitions/TypeNameDialog.svelte:45 svelte.$effect in (script)

# file card src/lib/features/canvas/LinkNode.svelte
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/canvas/LinkNode.svelte ' codemap/files
file src/lib/features/canvas/LinkNode.svelte component L216 module src/lib/features/canvas in1 t0
## imports
imp src/lib/features/canvas/LinkNode.svelte:5 -> src/lib/features/canvas/canvas.logic.ts resolveColor
imp src/lib/features/canvas/LinkNode.svelte:6 -> pkg:@tauri-apps/plugin-opener openUrl
imp src/lib/features/canvas/LinkNode.svelte:7 -> src/lib/utils/sanitize-url.ts isSafeUrl
imp src/lib/features/canvas/LinkNode.svelte:8 -> src/lib/features/canvas/canvas.types.ts type:CanvasColor
## imported-by
imp src/lib/features/canvas/CanvasInner.svelte:19 -> src/lib/features/canvas/LinkNode.svelte default
## reach
in2 src/lib/features/canvas/LinkNode.svelte 1 files in 1 modules: src/lib/features/canvas(1)
out2 src/lib/features/canvas/LinkNode.svelte 0 files in 0 modules: -
## symbols
sym src/lib/features/canvas/LinkNode.svelte:1 component LinkNode props:id,data,selected L216
by src/lib/features/canvas/LinkNode.svelte:default <- src/lib/features/canvas/CanvasInner.svelte:72 in nodeTypes ref
## locals
local src/lib/features/canvas/LinkNode.svelte:44 fn startEditing() L6
local src/lib/features/canvas/LinkNode.svelte:52 fn stopEditing() L8
local src/lib/features/canvas/LinkNode.svelte:61 fn handleKeydown(e: KeyboardEvent) L10
local src/lib/features/canvas/LinkNode.svelte:73 fn handleBlur(e: FocusEvent) L5
local src/lib/features/canvas/LinkNode.svelte:80 fn handleClick() L9
## calls
call src/lib/features/canvas/LinkNode.svelte:19 in bgColor=$derived -> src/lib/features/canvas/canvas.logic.ts:resolveColor call
call src/lib/features/canvas/LinkNode.svelte:38 in $effect@36 -> src/lib/features/canvas/LinkNode.svelte:startEditing call
call src/lib/features/canvas/LinkNode.svelte:67 in handleKeydown -> src/lib/features/canvas/LinkNode.svelte:stopEditing call
call src/lib/features/canvas/LinkNode.svelte:76 in handleBlur -> src/lib/features/canvas/LinkNode.svelte:stopEditing call
call src/lib/features/canvas/LinkNode.svelte:81 in handleClick -> src/lib/utils/sanitize-url.ts:isSafeUrl call
call src/lib/features/canvas/LinkNode.svelte:97 in (markup) -> src/lib/features/canvas/LinkNode.svelte:startEditing markup
call src/lib/features/canvas/LinkNode.svelte:104 in (markup) -> src/lib/features/canvas/LinkNode.svelte:handleKeydown markup +1
call src/lib/features/canvas/LinkNode.svelte:105 in (markup) -> src/lib/features/canvas/LinkNode.svelte:handleBlur markup +1
call src/lib/features/canvas/LinkNode.svelte:118 in (markup) -> src/lib/features/canvas/LinkNode.svelte:handleClick markup
## effects
fx src/lib/features/canvas/LinkNode.svelte:36 svelte.$effect in (script)
fx src/lib/features/canvas/LinkNode.svelte:48 timer.requestAnimationFrame in startEditing
fx src/lib/features/canvas/LinkNode.svelte:83 tauri-opener.openUrl in handleClick

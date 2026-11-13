# file card src/lib/features/canvas/CanvasContextMenu.svelte
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/canvas/CanvasContextMenu.svelte ' codemap/files
file src/lib/features/canvas/CanvasContextMenu.svelte component L234 module src/lib/features/canvas in1 t0
## imports
imp src/lib/features/canvas/CanvasContextMenu.svelte:16 -> src/lib/features/canvas/ColorPicker.svelte default
imp src/lib/features/canvas/CanvasContextMenu.svelte:17 -> src/lib/features/canvas/canvas.types.ts type:CanvasColor
## imported-by
imp src/lib/features/canvas/CanvasInner.svelte:23 -> src/lib/features/canvas/CanvasContextMenu.svelte default
## reach
in2 src/lib/features/canvas/CanvasContextMenu.svelte 1 files in 1 modules: src/lib/features/canvas(1)
out2 src/lib/features/canvas/CanvasContextMenu.svelte 0 files in 0 modules: -
## symbols
sym src/lib/features/canvas/CanvasContextMenu.svelte:1 component CanvasContextMenu props:type,targetId,nodeType,top,left,right,bottom,onaddtext,onaddfile,onaddlink,onaddimage,onaddgroup,onselectall,onzoomtofit,onedit,onduplicate,ondelete,onopenfile,onopenurl,oneditlabel,ongotosource,ongototarget,onsetcolor,currentColor,onclose L234
by src/lib/features/canvas/CanvasContextMenu.svelte:default <- src/lib/features/canvas/CanvasInner.svelte:635 in (markup) mount
## locals
local src/lib/features/canvas/CanvasContextMenu.svelte:81 fn handle(action: () => void) L4
## mounts
mount src/lib/features/canvas/CanvasContextMenu.svelte:140 ColorPicker -> src/lib/features/canvas/ColorPicker.svelte
mount src/lib/features/canvas/CanvasContextMenu.svelte:158 ColorPicker -> src/lib/features/canvas/ColorPicker.svelte
## mounted-at
mount src/lib/features/canvas/CanvasInner.svelte:635 CanvasContextMenu -> src/lib/features/canvas/CanvasContextMenu.svelte
## calls
call src/lib/features/canvas/CanvasContextMenu.svelte:97 in (markup) -> src/lib/features/canvas/CanvasContextMenu.svelte:handle markup +15

# file card src/lib/features/canvas/canvas-history.logic.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/canvas/canvas-history.logic.ts ' codemap/files
file src/lib/features/canvas/canvas-history.logic.ts logic L84 module src/lib/features/canvas in1 t1
## imported-by
imp src/lib/features/canvas/CanvasInner.svelte:44 -> src/lib/features/canvas/canvas-history.logic.ts createHistory,pushSnapshot,undo,redo,type:CanvasHistory
## reach
in2 src/lib/features/canvas/canvas-history.logic.ts 1 files in 1 modules: src/lib/features/canvas(1)
out2 src/lib/features/canvas/canvas-history.logic.ts 0 files in 0 modules: -
## tests
test src/tests/lib/features/canvas/canvas-history.logic.test.ts imports src/lib/features/canvas/canvas-history.logic.ts mirror
## symbols
sym src/lib/features/canvas/canvas-history.logic.ts:4 interface CanvasSnapshot L4 | A snapshot of the canvas state at a point in time
sym src/lib/features/canvas/canvas-history.logic.ts:10 interface CanvasHistory L8 | Manages an undo/redo history stack
by src/lib/features/canvas/canvas-history.logic.ts:CanvasHistory <- src/lib/features/canvas/CanvasInner.svelte:44 in (script) import
sym src/lib/features/canvas/canvas-history.logic.ts:20 fn createHistory(maxSize = 50): CanvasHistory L3 | Creates a new empty history
by src/lib/features/canvas/canvas-history.logic.ts:createHistory <- src/lib/features/canvas/CanvasInner.svelte:117 in history call
sym src/lib/features/canvas/canvas-history.logic.ts:25 fn snapshotsEqual(a: CanvasSnapshot, b: CanvasSnapshot): boolean L10 | Checks if two snapshots are structurally identical (same node/edge references)
sym src/lib/features/canvas/canvas-history.logic.ts:37 fn pushSnapshot(history: CanvasHistory, snapshot: CanvasSnapshot): CanvasHistory L14 | Pushes a new snapshot, discarding any redo entries beyond current index.
by src/lib/features/canvas/canvas-history.logic.ts:pushSnapshot <- src/lib/features/canvas/CanvasInner.svelte:110 in $effect@99 call +1
sym src/lib/features/canvas/canvas-history.logic.ts:53 fn canUndo(history: CanvasHistory): boolean L3 | Returns true if undo is possible
sym src/lib/features/canvas/canvas-history.logic.ts:58 fn canRedo(history: CanvasHistory): boolean L3 | Returns true if redo is possible
sym src/lib/features/canvas/canvas-history.logic.ts:63 fn undo(history: CanvasHistory): { history: CanvasHistory; snapshot: CanvasSnapshot } | null L10 | Returns the previous snapshot (for undo) without mutating
by src/lib/features/canvas/canvas-history.logic.ts:undo <- src/lib/features/canvas/CanvasInner.svelte:295 in handleKeydown call
sym src/lib/features/canvas/canvas-history.logic.ts:75 fn redo(history: CanvasHistory): { history: CanvasHistory; snapshot: CanvasSnapshot } | null L10 | Returns the next snapshot (for redo) without mutating
by src/lib/features/canvas/canvas-history.logic.ts:redo <- src/lib/features/canvas/CanvasInner.svelte:309 in handleKeydown call
## calls
call src/lib/features/canvas/canvas-history.logic.ts:42 in pushSnapshot -> src/lib/features/canvas/canvas-history.logic.ts:snapshotsEqual call
call src/lib/features/canvas/canvas-history.logic.ts:66 in undo -> src/lib/features/canvas/canvas-history.logic.ts:canUndo call
call src/lib/features/canvas/canvas-history.logic.ts:78 in redo -> src/lib/features/canvas/canvas-history.logic.ts:canRedo call

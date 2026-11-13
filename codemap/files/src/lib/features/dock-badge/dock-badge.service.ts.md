# file card src/lib/features/dock-badge/dock-badge.service.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/dock-badge/dock-badge.service.ts ' codemap/files
file src/lib/features/dock-badge/dock-badge.service.ts service L21 module src/lib/features/dock-badge in1 t1
## imports
imp src/lib/features/dock-badge/dock-badge.service.ts:1 -> pkg:@tauri-apps/api/window getCurrentWindow
imp src/lib/features/dock-badge/dock-badge.service.ts:2 -> src/lib/utils/debug.ts error
## imported-by
imp src/lib/app/AppShell.svelte:11 -> src/lib/features/dock-badge/dock-badge.service.ts applyDockBadge
## reach
in2 src/lib/features/dock-badge/dock-badge.service.ts 1 files in 1 modules: src/routes(1)
out2 src/lib/features/dock-badge/dock-badge.service.ts 5 files in 3 modules: src/lib/contracts(2) src/lib/core/settings(2) src/lib/utils(1)
## tests
test src/tests/lib/features/dock-badge/dock-badge.service.test.ts imports src/lib/features/dock-badge/dock-badge.service.ts mirror
## symbols
sym src/lib/features/dock-badge/dock-badge.service.ts:14 fn applyDockBadge(value: number | null): Promise<void> L8 | Applies a value to the macOS dock badge (the red count bubble on the app icon).
by src/lib/features/dock-badge/dock-badge.service.ts:applyDockBadge <- src/lib/app/AppShell.svelte:76 in $effect@66 call
## calls
call src/lib/features/dock-badge/dock-badge.service.ts:19 in applyDockBadge -> src/lib/utils/debug.ts:error call
## effects
fx src/lib/features/dock-badge/dock-badge.service.ts:17 tauri-api-window.getCurrentWindow in applyDockBadge

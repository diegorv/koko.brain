# module card src/lib/features/dock-badge
cols: module <path> <layer> files <n> in-modules <n> out-modules <n> pub <public>/<exports> ipc <called>/<served> card ~<k>k · dep <from> -> <to> <file pairs> · in2/out2 <module> <n> modules: <module>(<via>) · entry <file> ext-in<n> <importers> · file … · sym … · grep: grep -rF -- '-> src/lib/features/dock-badge ' codemap/modules
module src/lib/features/dock-badge features files 2 in-modules 1 out-modules 3 pub 2/2 ipc 0/0 card ~0.6k
## neighbors
dep src/lib/app -> src/lib/features/dock-badge 2
dep src/lib/features/dock-badge -> src/lib/features/type-definitions 1
dep src/lib/features/dock-badge -> src/lib/types 1
dep src/lib/features/dock-badge -> src/lib/utils 1
in2 src/lib/features/dock-badge 1 modules: src/routes(1)
out2 src/lib/features/dock-badge 2 modules: src/lib/contracts(3) src/lib/core/settings(2)
## entry files
entry src/lib/features/dock-badge/dock-badge.logic.ts ext-in1 src/lib/app/AppShell.svelte
entry src/lib/features/dock-badge/dock-badge.service.ts ext-in1 src/lib/app/AppShell.svelte
## files
file src/lib/features/dock-badge/dock-badge.logic.ts logic L17 module src/lib/features/dock-badge in1 t3
file src/lib/features/dock-badge/dock-badge.service.ts service L21 module src/lib/features/dock-badge in1 t1
## public
sym src/lib/features/dock-badge/dock-badge.logic.ts:14 fn dockBadgeCount(enabled: boolean, entries: NoteEntryV2[]): number | null L4 | Computes the value to display on the macOS dock badge.
sym src/lib/features/dock-badge/dock-badge.service.ts:14 fn applyDockBadge(value: number | null): Promise<void> L8 | Applies a value to the macOS dock badge (the red count bubble on the app icon).
## effects
fx-count tauri-api-window.getCurrentWindow 1
## debt
-

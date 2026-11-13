# module card src/lib/features/command-palette
cols: module <path> <layer> files <n> in-modules <n> out-modules <n> pub <public>/<exports> ipc <called>/<served> card ~<k>k · dep <from> -> <to> <file pairs> · in2/out2 <module> <n> modules: <module>(<via>) · entry <file> ext-in<n> <importers> · file … · sym … · grep: grep -rF -- '-> src/lib/features/command-palette ' codemap/modules
module src/lib/features/command-palette features files 5 in-modules 1 out-modules 2 pub 4/6 ipc 0/0 card ~0.8k
## neighbors
dep src/lib/app -> src/lib/features/command-palette 4
dep src/lib/features/command-palette -> src/lib/components 1
dep src/lib/features/command-palette -> src/lib/utils 2
in2 src/lib/features/command-palette 1 modules: src/routes(3)
out2 src/lib/features/command-palette 0 modules: -
## entry files
entry src/lib/features/command-palette/CommandPalette.svelte ext-in1 src/lib/app/AppOverlays.svelte
entry src/lib/features/command-palette/command-palette.service.ts ext-in1 src/lib/app/lifecycle/app-lifecycle.service.ts
entry src/lib/features/command-palette/command-palette.store.svelte.ts ext-in1 src/lib/app/global-keybindings.ts
entry src/lib/features/command-palette/command-palette.types.ts ext-in1 src/lib/app/commands.ts
## files
file src/lib/features/command-palette/CommandPalette.svelte component L72 module src/lib/features/command-palette in1 t1
file src/lib/features/command-palette/command-palette.logic.ts logic L44 module src/lib/features/command-palette in1 t1
file src/lib/features/command-palette/command-palette.service.ts service L6 module src/lib/features/command-palette in1 t1
file src/lib/features/command-palette/command-palette.store.svelte.ts store L57 module src/lib/features/command-palette in3 t4
file src/lib/features/command-palette/command-palette.types.ts types L17 module src/lib/features/command-palette in3 t0
## public
sym src/lib/features/command-palette/CommandPalette.svelte:1 component CommandPalette props:commands L72
sym src/lib/features/command-palette/command-palette.service.ts:4 fn resetCommandPalette(): void L3 | Resets the command palette store to its initial state.
sym src/lib/features/command-palette/command-palette.store.svelte.ts:24 store commandPaletteStore L34
sym src/lib/features/command-palette/command-palette.types.ts:1 interface AppCommand L7
## stores
store src/lib/features/command-palette/command-palette.store.svelte.ts:24 commandPaletteStore esc:0
## effects
fx-count storage.getItem 1
fx-count storage.removeItem 1
fx-count storage.setItem 1
## debt
-

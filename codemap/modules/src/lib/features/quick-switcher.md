# module card src/lib/features/quick-switcher
cols: module <path> <layer> files <n> in-modules <n> out-modules <n> pub <public>/<exports> ipc <called>/<served> card ~<k>k · dep <from> -> <to> <file pairs> · in2/out2 <module> <n> modules: <module>(<via>) · entry <file> ext-in<n> <importers> · file … · sym … · grep: grep -rF -- '-> src/lib/features/quick-switcher ' codemap/modules
module src/lib/features/quick-switcher features files 4 in-modules 1 out-modules 11 pub 3/8 ipc 1/0 card ~1k
## neighbors
dep src/lib/app -> src/lib/features/quick-switcher 5
dep src/lib/features/quick-switcher -> src/lib/components 1
dep src/lib/features/quick-switcher -> src/lib/contracts 1
dep src/lib/features/quick-switcher -> src/lib/core/editor 2
dep src/lib/features/quick-switcher -> src/lib/core/filesystem 3
dep src/lib/features/quick-switcher -> src/lib/core/note-creator 1
dep src/lib/features/quick-switcher -> src/lib/core/settings 3
dep src/lib/features/quick-switcher -> src/lib/core/vault 1
dep src/lib/features/quick-switcher -> src/lib/features/file-icons 3
dep src/lib/features/quick-switcher -> src/lib/features/properties 1
dep src/lib/features/quick-switcher -> src/lib/features/rail-shell 2
dep src/lib/features/quick-switcher -> src/lib/utils 1
in2 src/lib/features/quick-switcher 1 modules: src/routes(4)
out2 src/lib/features/quick-switcher 6 modules: src/lib/features/collection(5) src/lib/features/type-definitions(4) src/lib/types(2) src/lib/core/frontmatter(1) src/lib/core/markdown-editor(1) +1 modules
## entry files
entry src/lib/features/quick-switcher/quick-switcher.store.svelte.ts ext-in3 src/lib/app/boot.ts src/lib/app/commands.ts src/lib/app/global-keybindings.ts
entry src/lib/features/quick-switcher/QuickSwitcher.svelte ext-in1 src/lib/app/AppOverlays.svelte
entry src/lib/features/quick-switcher/quick-switcher.service.ts ext-in1 src/lib/app/lifecycle/app-lifecycle.service.ts
## files
file src/lib/features/quick-switcher/QuickSwitcher.svelte component L208 module src/lib/features/quick-switcher in1 t1
file src/lib/features/quick-switcher/quick-switcher.logic.ts logic L67 module src/lib/features/quick-switcher in1 t1
file src/lib/features/quick-switcher/quick-switcher.service.ts service L6 module src/lib/features/quick-switcher in1 t2
file src/lib/features/quick-switcher/quick-switcher.store.svelte.ts store L56 module src/lib/features/quick-switcher in5 t7
## public
sym src/lib/features/quick-switcher/QuickSwitcher.svelte:1 component QuickSwitcher L208
sym src/lib/features/quick-switcher/quick-switcher.service.ts:4 fn resetQuickSwitcher(): void L3 | Resets the quick switcher store to its initial state.
sym src/lib/features/quick-switcher/quick-switcher.store.svelte.ts:24 store quickSwitcherStore L33
## stores
store src/lib/features/quick-switcher/quick-switcher.store.svelte.ts:24 quickSwitcherStore esc:0
## effects
fx-count storage.getItem 1
fx-count storage.removeItem 1
fx-count storage.setItem 1
ipc-count ipc:create_folder 1
## debt
-

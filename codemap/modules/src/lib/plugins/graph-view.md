# module card src/lib/plugins/graph-view
cols: module <path> <layer> files <n> in-modules <n> out-modules <n> pub <public>/<exports> ipc <called>/<served> card ~<k>k · dep <from> -> <to> <file pairs> · in2/out2 <module> <n> modules: <module>(<via>) · entry <file> ext-in<n> <importers> · file … · sym … · grep: grep -rF -- '-> src/lib/plugins/graph-view ' codemap/modules
module src/lib/plugins/graph-view plugins files 6 in-modules 1 out-modules 7 pub 3/25 ipc 1/0 card ~0.9k
## neighbors
dep src/lib/app -> src/lib/plugins/graph-view 4
dep src/lib/plugins/graph-view -> src/lib/contracts 1
dep src/lib/plugins/graph-view -> src/lib/core/editor 3
dep src/lib/plugins/graph-view -> src/lib/core/filesystem 2
dep src/lib/plugins/graph-view -> src/lib/core/settings 1
dep src/lib/plugins/graph-view -> src/lib/core/vault 2
dep src/lib/plugins/graph-view -> src/lib/types 1
dep src/lib/plugins/graph-view -> src/lib/utils 2
in2 src/lib/plugins/graph-view 1 modules: src/routes(2)
out2 src/lib/plugins/graph-view 1 modules: src/lib/core/markdown-editor(1)
## entry files
entry src/lib/plugins/graph-view/graph-view.service.ts ext-in3 src/lib/app/commands.ts src/lib/app/global-keybindings.ts src/lib/app/lifecycle/app-lifecycle.service.ts
entry src/lib/plugins/graph-view/GraphView.svelte ext-in1 src/lib/app/EditorView.svelte
## files
file src/lib/plugins/graph-view/GraphControls.svelte component L142 module src/lib/plugins/graph-view in1 t0
file src/lib/plugins/graph-view/GraphView.svelte component L464 module src/lib/plugins/graph-view in1 t1
file src/lib/plugins/graph-view/graph-view.logic.ts logic L226 module src/lib/plugins/graph-view in3 t1
file src/lib/plugins/graph-view/graph-view.service.ts service L76 module src/lib/plugins/graph-view in5 t6
file src/lib/plugins/graph-view/graph-view.store.svelte.ts store L37 module src/lib/plugins/graph-view in3 t3
file src/lib/plugins/graph-view/graph-view.types.ts types L37 module src/lib/plugins/graph-view in5 t0
## public
sym src/lib/plugins/graph-view/GraphView.svelte:1 component GraphView L464
sym src/lib/plugins/graph-view/graph-view.service.ts:60 fn toggleGraphTab(): void L11 | Toggles the Graph View tab: opens if closed, closes if active, focuses if open but not active.
sym src/lib/plugins/graph-view/graph-view.service.ts:73 fn resetGraphView() L4 | Resets all graph view state
## stores
store src/lib/plugins/graph-view/graph-view.store.svelte.ts:15 graphViewStore esc:0
## effects
fx-count dom.click 1
fx-count dom.mousemove 1
fx-count svelte.$effect 3
ipc-count ipc:get_all_vault_entries_v2 1
## debt
-

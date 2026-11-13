# modules: one line per module, layer totals, layer rules, layer debt
cols: module <path> <layer> files <n> in-modules <n> out-modules <n> pub <public>/<exports> ipc <called>/<served> card ~<k>k · layer <from layer> -> <to layer> <file pairs> · rule <layer> may: <layers> · debt <baseline entry> · grep: grep -F 'module src/lib/features/' codemap/modules.md
module src-tauri/src rust files 3 in-modules 1 out-modules 1 pub 3/4 ipc 0/0 card ~0.4k
module src-tauri/src/commands rust files 2 in-modules 1 out-modules 2 pub 2/3 ipc 0/2 card ~0.4k
module src-tauri/src/utils rust files 2 in-modules 1 out-modules 0 pub 1/1 ipc 0/0 card ~0.4k
module src/lib/app app files 1 in-modules 1 out-modules 2 pub 1/1 ipc 0/0 card ~0.3k
module src/lib/contracts contracts files 5 in-modules 2 out-modules 0 pub 3/6 ipc 0/0 card ~0.5k
module src/lib/core/notes core files 3 in-modules 2 out-modules 2 pub 4/7 ipc 2/0 card ~0.7k
module src/lib/features/tags features files 3 in-modules 2 out-modules 1 pub 2/3 ipc 0/0 card ~0.5k
module src/lib/plugins/cal plugins files 1 in-modules 1 out-modules 2 pub 1/1 ipc 0/0 card ~0.3k
module src/lib/utils utils files 1 in-modules 1 out-modules 0 pub 1/1 ipc 0/0 card ~0.3k
module src/routes routes files 1 in-modules 0 out-modules 2 pub 0/1 ipc 0/0 card ~0.2k
## layers (distinct file pairs)
layer app -> features 1
layer app -> plugins 1
layer contracts -> contracts 3
layer core -> contracts 1
layer core -> core 2
layer core -> utils 1
layer features -> core 4
layer features -> features 1
layer plugins -> contracts 2
layer plugins -> core 1
layer routes -> app 1
layer routes -> features 1
layer rust -> rust 4
## layer rules (scripts/import-graph.mjs ruleFor)
rule app may: app contracts core features plugins utils
rule contracts may: contracts core features plugins utils
rule core may: contracts core utils
rule features may: contracts core features utils
rule plugins may: contracts core features utils
rule utils may: contracts utils
rule plugin->plugin allowed: plugins/calendar -> plugins/periodic-notes
rule plugin->plugin allowed: plugins/mods -> plugins/queryjs
rule plugin->plugin allowed: plugins/mods -> plugins/one-on-one
rule plugin->plugin allowed: plugins/mods -> plugins/periodic-notes
rule plugin->plugin allowed: plugins/one-on-one -> plugins/periodic-notes
rule plugin->plugin allowed: plugins/quick-capture -> plugins/periodic-notes
## debt (src/tests/lib/architecture/layer-baseline.json)
debt src/lib/utils/debounce.ts -> src/lib/core/notes/notes.store.svelte.ts

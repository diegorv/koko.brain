# modules: one line per module, layer totals, layer rules, layer debt
cols: module <path> <layer> files <n> in-modules <n> out-modules <n> pub <public>/<exports> ipc <called>/<served> card ~<k>k · layer <from layer> -> <to layer> <file pairs> · rule <layer> may: <layers> · debt <baseline entry> · grep: grep -F 'module src/lib/features/' codemap/modules.md
sections: layers (distinct file pairs), layer rules (scripts/import-graph.mjs ruleFor), debt (src/tests/lib/architecture/layer-baseline.json)
module src-tauri/src rust files 4 in-modules 2 out-modules 5 pub 8/13 ipc 0/0 card ~0.9k
module src-tauri/src/commands rust files 14 in-modules 1 out-modules 6 pub 71/113 ipc 0/66 card ~6.5k
module src-tauri/src/db rust files 6 in-modules 3 out-modules 1 pub 57/59 ipc 0/0 card ~4.3k
module src-tauri/src/quick_capture rust files 6 in-modules 1 out-modules 2 pub 19/38 ipc 0/6 card ~1.9k
module src-tauri/src/search rust files 6 in-modules 1 out-modules 2 pub 12/28 ipc 0/0 card ~1.3k
module src-tauri/src/semantic rust files 12 in-modules 2 out-modules 1 pub 39/69 ipc 0/0 card ~3.3k
module src-tauri/src/utils rust files 5 in-modules 6 out-modules 0 pub 17/33 ipc 0/0 card ~1.8k
module src-tauri/src/vault rust files 9 in-modules 2 out-modules 1 pub 46/105 ipc 0/0 card ~3.9k
module src/lib/app app files 15 in-modules 1 out-modules 46 pub 12/27 ipc 11/0 card ~2.4k
module src/lib/components components files 96 in-modules 30 out-modules 1 pub 0/0 ipc 0/0 card ~6k
module src/lib/contracts contracts files 56 in-modules 25 out-modules 0 pub 45/65 ipc 0/0 card ~4.4k
module src/lib/core/editor core files 6 in-modules 37 out-modules 3 pub 44/52 ipc 0/0 card ~4.3k
module src/lib/core/filesystem core files 14 in-modules 29 out-modules 7 pub 57/88 ipc 14/0 card ~6.8k
module src/lib/core/frontmatter core files 4 in-modules 16 out-modules 3 pub 28/40 ipc 0/0 card ~3.5k
module src/lib/core/layout core files 3 in-modules 5 out-modules 4 pub 7/7 ipc 0/0 card ~1k
module src/lib/core/markdown-editor core files 108 in-modules 11 out-modules 7 pub 35/353 ipc 0/0 card ~8.9k
module src/lib/core/note-creator core files 2 in-modules 12 out-modules 5 pub 4/6 ipc 2/0 card ~1.4k
module src/lib/core/rule-actions core files 1 in-modules 2 out-modules 0 pub 1/3 ipc 0/0 card ~0.5k
module src/lib/core/settings core files 38 in-modules 29 out-modules 6 pub 53/175 ipc 3/0 card ~6.7k
module src/lib/core/status-bar core files 2 in-modules 1 out-modules 1 pub 2/2 ipc 0/0 card ~0.4k
module src/lib/core/trash core files 4 in-modules 4 out-modules 3 pub 9/17 ipc 0/0 card ~1.3k
module src/lib/core/vault core files 7 in-modules 33 out-modules 5 pub 9/17 ipc 1/0 card ~2.2k
module src/lib/core/zoom core files 1 in-modules 1 out-modules 0 pub 3/3 ipc 0/0 card ~0.4k
module src/lib/features/auto-organize features files 8 in-modules 1 out-modules 12 pub 4/61 ipc 0/0 card ~1.2k
module src/lib/features/backlinks features files 6 in-modules 2 out-modules 8 pub 6/13 ipc 4/0 card ~1.1k
module src/lib/features/canvas features files 19 in-modules 2 out-modules 4 pub 2/62 ipc 0/0 card ~1.2k
module src/lib/features/collection features files 32 in-modules 6 out-modules 9 pub 49/157 ipc 1/0 card ~6.4k
module src/lib/features/command-palette features files 5 in-modules 1 out-modules 2 pub 4/6 ipc 0/0 card ~0.8k
module src/lib/features/copy-block-link features files 1 in-modules 1 out-modules 3 pub 2/3 ipc 0/0 card ~0.5k
module src/lib/features/deep-link features files 4 in-modules 4 out-modules 8 pub 14/33 ipc 0/0 card ~1.8k
module src/lib/features/dock-badge features files 2 in-modules 1 out-modules 3 pub 2/2 ipc 0/0 card ~0.6k
module src/lib/features/event-calendar features files 36 in-modules 7 out-modules 12 pub 16/229 ipc 1/0 card ~4.5k
module src/lib/features/file-history features files 7 in-modules 2 out-modules 7 pub 5/24 ipc 4/0 card ~1.2k
module src/lib/features/file-icons features files 9 in-modules 8 out-modules 8 pub 22/42 ipc 1/0 card ~3.7k
module src/lib/features/note-action-bar features files 4 in-modules 2 out-modules 12 pub 2/19 ipc 0/0 card ~1k
module src/lib/features/note-list features files 4 in-modules 1 out-modules 9 pub 3/8 ipc 0/0 card ~0.9k
module src/lib/features/outgoing-links features files 5 in-modules 2 out-modules 7 pub 3/6 ipc 2/0 card ~0.9k
module src/lib/features/properties features files 13 in-modules 5 out-modules 13 pub 14/34 ipc 1/0 card ~2.3k
module src/lib/features/quick-switcher features files 3 in-modules 1 out-modules 8 pub 3/3 ipc 0/0 card ~0.9k
module src/lib/features/rail-shell features files 29 in-modules 7 out-modules 17 pub 49/161 ipc 2/0 card ~6.2k
module src/lib/features/search features files 12 in-modules 4 out-modules 9 pub 14/44 ipc 16/0 card ~2.1k
module src/lib/features/tags features files 8 in-modules 1 out-modules 7 pub 4/21 ipc 1/0 card ~0.9k
module src/lib/features/tasks features files 14 in-modules 2 out-modules 10 pub 7/135 ipc 2/0 card ~1.5k
module src/lib/features/todoist-sync features files 27 in-modules 1 out-modules 9 pub 9/204 ipc 11/0 card ~3k
module src/lib/features/type-definitions features files 9 in-modules 13 out-modules 12 pub 63/100 ipc 3/0 card ~7.1k
module src/lib/plugins/calendar plugins files 7 in-modules 1 out-modules 7 pub 2/21 ipc 0/0 card ~0.9k
module src/lib/plugins/graph-view plugins files 6 in-modules 1 out-modules 7 pub 3/25 ipc 1/0 card ~0.9k
module src/lib/plugins/kanban plugins files 12 in-modules 1 out-modules 6 pub 5/74 ipc 0/0 card ~1.2k
module src/lib/plugins/mods plugins files 18 in-modules 1 out-modules 17 pub 9/65 ipc 4/0 card ~2.2k
module src/lib/plugins/one-on-one plugins files 6 in-modules 2 out-modules 14 pub 5/21 ipc 0/0 card ~1.3k
module src/lib/plugins/periodic-notes plugins files 3 in-modules 5 out-modules 7 pub 10/20 ipc 0/0 card ~1.5k
module src/lib/plugins/queryjs plugins files 14 in-modules 2 out-modules 10 pub 6/78 ipc 0/0 card ~1.6k
module src/lib/plugins/quick-capture plugins files 5 in-modules 2 out-modules 10 pub 10/15 ipc 3/0 card ~1.6k
module src/lib/plugins/table-of-contents plugins files 5 in-modules 1 out-modules 5 pub 2/7 ipc 0/0 card ~0.8k
module src/lib/plugins/templates plugins files 4 in-modules 1 out-modules 7 pub 4/11 ipc 1/0 card ~0.8k
module src/lib/plugins/word-count plugins files 2 in-modules 1 out-modules 1 pub 1/4 ipc 0/0 card ~0.4k
module src/lib/types types files 1 in-modules 17 out-modules 1 pub 8/17 ipc 0/0 card ~1k
module src/lib/utils utils files 29 in-modules 42 out-modules 2 pub 84/103 ipc 3/0 card ~9.2k
module src/lib/utils.ts lib-root files 1 in-modules 1 out-modules 1 pub 4/4 ipc 0/0 card ~0.4k
module src/routes routes files 5 in-modules 0 out-modules 13 pub 0/5 ipc 2/0 card ~0.6k
## layers (distinct file pairs)
layer app -> app 11
layer app -> components 5
layer app -> contracts 7
layer app -> core 109
layer app -> features 121
layer app -> plugins 44
layer app -> utils 17
layer components -> components 94
layer components -> lib-root 54
layer contracts -> contracts 85
layer core -> components 33
layer core -> contracts 15
layer core -> core 467
layer core -> types 5
layer core -> utils 67
layer features -> components 96
layer features -> contracts 42
layer features -> core 339
layer features -> features 718
layer features -> types 23
layer features -> utils 97
layer lib-root -> utils 1
layer plugins -> components 17
layer plugins -> contracts 7
layer plugins -> core 106
layer plugins -> features 35
layer plugins -> plugins 142
layer plugins -> types 4
layer plugins -> utils 43
layer routes -> app 7
layer routes -> components 1
layer routes -> contracts 2
layer routes -> core 9
layer routes -> features 6
layer routes -> plugins 3
layer routes -> utils 2
layer rust -> rust 115
layer types -> contracts 1
layer utils -> contracts 3
layer utils -> core 3
layer utils -> utils 2
## layer rules (scripts/import-graph.mjs ruleFor)
rule app may: app components contracts core features lib-root plugins types utils
rule components may: components contracts lib-root types utils
rule contracts may: components contracts core features lib-root plugins types utils
rule core may: components contracts core lib-root types utils
rule features may: components contracts core features lib-root types utils
rule lib-root may: components contracts core features lib-root plugins types utils
rule plugins may: components contracts core features lib-root types utils
rule types may: contracts types
rule utils may: contracts utils
rule plugin->plugin allowed: plugins/calendar -> plugins/periodic-notes
rule plugin->plugin allowed: plugins/mods -> plugins/queryjs
rule plugin->plugin allowed: plugins/mods -> plugins/one-on-one
rule plugin->plugin allowed: plugins/mods -> plugins/periodic-notes
rule plugin->plugin allowed: plugins/one-on-one -> plugins/periodic-notes
rule plugin->plugin allowed: plugins/quick-capture -> plugins/periodic-notes
## debt (src/tests/lib/architecture/layer-baseline.json)
debt src/lib/utils/app-channel.ts -> src/lib/core/settings/settings.types.ts
debt src/lib/utils/debug.ts -> src/lib/core/settings/sentry.service.ts
debt src/lib/utils/debug.ts -> src/lib/core/settings/settings.store.svelte.ts

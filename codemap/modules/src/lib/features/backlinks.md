# module card src/lib/features/backlinks
cols: module <path> <layer> files <n> in-modules <n> out-modules <n> pub <public>/<exports> ipc <called>/<served> card ~<k>k · dep <from> -> <to> <file pairs> · in2/out2 <module> <n> modules: <module>(<via>) · entry <file> ext-in<n> <importers> · file … · sym … · grep: grep -rF -- '-> src/lib/features/backlinks ' codemap/modules
module src/lib/features/backlinks features files 6 in-modules 2 out-modules 8 pub 6/13 ipc 4/0 card ~1.1k
## neighbors
dep src/lib/app -> src/lib/features/backlinks 4
dep src/routes -> src/lib/features/backlinks 2
dep src/lib/features/backlinks -> src/lib/components 2
dep src/lib/features/backlinks -> src/lib/contracts 2
dep src/lib/features/backlinks -> src/lib/core/editor 4
dep src/lib/features/backlinks -> src/lib/core/layout 1
dep src/lib/features/backlinks -> src/lib/core/vault 2
dep src/lib/features/backlinks -> src/lib/features/event-calendar 1
dep src/lib/features/backlinks -> src/lib/types 2
dep src/lib/features/backlinks -> src/lib/utils 2
in2 src/lib/features/backlinks 0 modules: -
out2 src/lib/features/backlinks 3 modules: src/lib/core/settings(3) src/lib/core/filesystem(1) src/lib/core/markdown-editor(1)
## entry files
entry src/lib/features/backlinks/backlinks.service.ts ext-in3 src/lib/app/lifecycle/app-lifecycle.service.ts src/lib/app/lifecycle/watcher-handler.service.ts src/routes/(app)/+layout.svelte
entry src/lib/features/backlinks/backlinks.store.svelte.ts ext-in2 src/lib/app/boot.ts src/routes/(app)/+layout.svelte
entry src/lib/features/backlinks/BacklinksPanel.svelte ext-in1 src/lib/app/AppShell.svelte
## files
file src/lib/features/backlinks/BacklinksPanel.svelte component L106 module src/lib/features/backlinks in1 t1
file src/lib/features/backlinks/LinkItem.svelte component L35 module src/lib/features/backlinks in1 t1
file src/lib/features/backlinks/backlinks.logic.ts logic L23 module src/lib/features/backlinks in1 t2
file src/lib/features/backlinks/backlinks.service.ts service L263 module src/lib/features/backlinks in4 t5
file src/lib/features/backlinks/backlinks.store.svelte.ts store L31 module src/lib/features/backlinks in4 t7
file src/lib/features/backlinks/backlinks.types.ts types L13 module src/lib/features/backlinks in3 t0
## public
sym src/lib/features/backlinks/BacklinksPanel.svelte:1 component BacklinksPanel L106
sym src/lib/features/backlinks/backlinks.service.ts:56 fn buildIndex(path: string): Promise<boolean> L12 | Bootstraps the Rust `VaultIndex` for the given vault path.
sym src/lib/features/backlinks/backlinks.service.ts:112 fn rebuildIndex() L6
sym src/lib/features/backlinks/backlinks.service.ts:170 const fetchBacklinksV2 = dedupeInflight(…) L1
sym src/lib/features/backlinks/backlinks.service.ts:257 fn resetBacklinks() L7 | Clears the per-vault path, the queued-rebuild flag, the per-path version caches and the store.
sym src/lib/features/backlinks/backlinks.store.svelte.ts:10 store backlinksStore L22
## stores
store src/lib/features/backlinks/backlinks.store.svelte.ts:10 backlinksStore esc:0
## effects
fx-count svelte.$effect 2
ipc-count ipc:get_backlinks_v2 1
ipc-count ipc:get_relationship_backlinks_v2 1
ipc-count ipc:get_unlinked_mentions_v2 1
ipc-count ipc:scan_vault_v2_cached 1
## debt
-

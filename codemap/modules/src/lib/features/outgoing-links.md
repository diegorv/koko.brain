# module card src/lib/features/outgoing-links
cols: module <path> <layer> files <n> in-modules <n> out-modules <n> pub <public>/<exports> ipc <called>/<served> card ~<k>k · dep <from> -> <to> <file pairs> · in2/out2 <module> <n> modules: <module>(<via>) · entry <file> ext-in<n> <importers> · file … · sym … · grep: grep -rF -- '-> src/lib/features/outgoing-links ' codemap/modules
module src/lib/features/outgoing-links features files 5 in-modules 2 out-modules 7 pub 3/6 ipc 2/0 card ~0.9k
## neighbors
dep src/lib/app -> src/lib/features/outgoing-links 2
dep src/routes -> src/lib/features/outgoing-links 1
dep src/lib/features/outgoing-links -> src/lib/components 1
dep src/lib/features/outgoing-links -> src/lib/contracts 2
dep src/lib/features/outgoing-links -> src/lib/core/editor 3
dep src/lib/features/outgoing-links -> src/lib/core/layout 1
dep src/lib/features/outgoing-links -> src/lib/core/vault 2
dep src/lib/features/outgoing-links -> src/lib/types 1
dep src/lib/features/outgoing-links -> src/lib/utils 2
in2 src/lib/features/outgoing-links 0 modules: -
out2 src/lib/features/outgoing-links 3 modules: src/lib/core/settings(2) src/lib/core/filesystem(1) src/lib/core/markdown-editor(1)
## entry files
entry src/lib/features/outgoing-links/OutgoingLinksPanel.svelte ext-in1 src/lib/app/AppShell.svelte
entry src/lib/features/outgoing-links/outgoing-links.service.ts ext-in1 src/lib/app/lifecycle/app-lifecycle.service.ts
entry src/lib/features/outgoing-links/outgoing-links.store.svelte.ts ext-in1 src/routes/(app)/+layout.svelte
## files
file src/lib/features/outgoing-links/OutgoingLinksPanel.svelte component L87 module src/lib/features/outgoing-links in1 t1
file src/lib/features/outgoing-links/outgoing-links.logic.ts logic L13 module src/lib/features/outgoing-links in0 t1
file src/lib/features/outgoing-links/outgoing-links.service.ts service L99 module src/lib/features/outgoing-links in2 t3
file src/lib/features/outgoing-links/outgoing-links.store.svelte.ts store L17 module src/lib/features/outgoing-links in3 t3
file src/lib/features/outgoing-links/outgoing-links.types.ts types L1 module src/lib/features/outgoing-links in2 t0
## public
sym src/lib/features/outgoing-links/OutgoingLinksPanel.svelte:1 component OutgoingLinksPanel L87
sym src/lib/features/outgoing-links/outgoing-links.service.ts:96 fn resetOutgoingLinks() L4
sym src/lib/features/outgoing-links/outgoing-links.store.svelte.ts:6 store outgoingLinksStore L12
## stores
store src/lib/features/outgoing-links/outgoing-links.store.svelte.ts:6 outgoingLinksStore esc:0
## effects
fx-count svelte.$effect 2
ipc-count ipc:get_outgoing_links_v2 1
ipc-count ipc:get_outgoing_unlinked_mentions_v2 1
## debt
-

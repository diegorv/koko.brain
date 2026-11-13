# file card src/lib/features/outgoing-links/OutgoingLinksPanel.svelte
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/outgoing-links/OutgoingLinksPanel.svelte ' codemap/files
file src/lib/features/outgoing-links/OutgoingLinksPanel.svelte component L87 module src/lib/features/outgoing-links in1 t1
## imports
imp src/lib/features/outgoing-links/OutgoingLinksPanel.svelte:6 -> src/lib/components/ui/separator/index.ts Separator
imp src/lib/features/outgoing-links/OutgoingLinksPanel.svelte:7 -> src/lib/core/editor/editor.store.svelte.ts editorStore
imp src/lib/features/outgoing-links/OutgoingLinksPanel.svelte:8 -> src/lib/core/layout/SidebarSection.svelte default
imp src/lib/features/outgoing-links/OutgoingLinksPanel.svelte:9 -> src/lib/core/vault/vault.store.svelte.ts vaultStore
imp src/lib/features/outgoing-links/OutgoingLinksPanel.svelte:10 -> src/lib/core/editor/editor.service.ts openFileInEditor
imp src/lib/features/outgoing-links/OutgoingLinksPanel.svelte:11 -> src/lib/features/outgoing-links/outgoing-links.store.svelte.ts outgoingLinksStore
imp src/lib/features/outgoing-links/OutgoingLinksPanel.svelte:12 -> src/lib/features/outgoing-links/outgoing-links.service.ts fetchOutgoingLinksV2
## imported-by
imp src/lib/app/AppShell.svelte:43 -> src/lib/features/outgoing-links/OutgoingLinksPanel.svelte default
## reach
in2 src/lib/features/outgoing-links/OutgoingLinksPanel.svelte 1 files in 1 modules: src/routes(1)
out2 src/lib/features/outgoing-links/OutgoingLinksPanel.svelte 15 files in 9 modules: src/lib/utils(4) src/lib/core/editor(3) src/lib/components(2) src/lib/contracts(1) src/lib/core/filesystem(1) +4 modules
## tests
test src/tests/lib/features/outgoing-links/OutgoingLinksPanel.test.ts imports src/lib/features/outgoing-links/OutgoingLinksPanel.svelte mirror
## symbols
sym src/lib/features/outgoing-links/OutgoingLinksPanel.svelte:1 component OutgoingLinksPanel L87
by src/lib/features/outgoing-links/OutgoingLinksPanel.svelte:default <- src/lib/app/AppShell.svelte:288 in (markup) mount
## locals
local src/lib/features/outgoing-links/OutgoingLinksPanel.svelte:17 fn handleOpenChange(open: boolean) L3
local src/lib/features/outgoing-links/OutgoingLinksPanel.svelte:21 fn fetchData() L7
## mounts
mount src/lib/features/outgoing-links/OutgoingLinksPanel.svelte:51 SidebarSection -> src/lib/core/layout/SidebarSection.svelte
## mounted-at
mount src/lib/app/AppShell.svelte:288 OutgoingLinksPanel -> src/lib/features/outgoing-links/OutgoingLinksPanel.svelte
## calls
call src/lib/features/outgoing-links/OutgoingLinksPanel.svelte:18 in handleOpenChange -> src/lib/features/outgoing-links/OutgoingLinksPanel.svelte:fetchData call
call src/lib/features/outgoing-links/OutgoingLinksPanel.svelte:26 in fetchData -> src/lib/features/outgoing-links/outgoing-links.service.ts:fetchOutgoingLinksV2 call
call src/lib/features/outgoing-links/OutgoingLinksPanel.svelte:33 in $effect@29 -> src/lib/features/outgoing-links/outgoing-links.store.svelte.ts:outgoingLinksStore.reset mcall
call src/lib/features/outgoing-links/OutgoingLinksPanel.svelte:45 in $effect@42 -> src/lib/features/outgoing-links/OutgoingLinksPanel.svelte:fetchData call
call src/lib/features/outgoing-links/OutgoingLinksPanel.svelte:51 in (markup) -> src/lib/features/outgoing-links/OutgoingLinksPanel.svelte:handleOpenChange markup
call src/lib/features/outgoing-links/OutgoingLinksPanel.svelte:63 in (markup) -> src/lib/core/editor/editor.service.ts:openFileInEditor markup
## effects
fx src/lib/features/outgoing-links/OutgoingLinksPanel.svelte:29 svelte.$effect in (script)
fx src/lib/features/outgoing-links/OutgoingLinksPanel.svelte:42 svelte.$effect in (script)

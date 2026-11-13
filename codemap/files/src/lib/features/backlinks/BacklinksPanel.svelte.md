# file card src/lib/features/backlinks/BacklinksPanel.svelte
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/backlinks/BacklinksPanel.svelte ' codemap/files
file src/lib/features/backlinks/BacklinksPanel.svelte component L106 module src/lib/features/backlinks in1 t1
## imports
imp src/lib/features/backlinks/BacklinksPanel.svelte:6 -> src/lib/components/ui/separator/index.ts Separator
imp src/lib/features/backlinks/BacklinksPanel.svelte:7 -> src/lib/components/ui/collapsible/index.ts *
imp src/lib/features/backlinks/BacklinksPanel.svelte:8 -> src/lib/core/editor/editor.store.svelte.ts editorStore
imp src/lib/features/backlinks/BacklinksPanel.svelte:9 -> src/lib/core/layout/SidebarSection.svelte default
imp src/lib/features/backlinks/BacklinksPanel.svelte:10 -> src/lib/core/vault/vault.store.svelte.ts vaultStore
imp src/lib/features/backlinks/BacklinksPanel.svelte:11 -> src/lib/features/backlinks/backlinks.store.svelte.ts backlinksStore
imp src/lib/features/backlinks/BacklinksPanel.svelte:12 -> src/lib/features/backlinks/backlinks.service.ts fetchBacklinksV2,fetchRelationshipBacklinks
imp src/lib/features/backlinks/BacklinksPanel.svelte:13 -> src/lib/core/editor/editor.service.ts openFileInEditor
imp src/lib/features/backlinks/BacklinksPanel.svelte:14 -> src/lib/features/backlinks/LinkItem.svelte default
## imported-by
imp src/lib/app/AppShell.svelte:42 -> src/lib/features/backlinks/BacklinksPanel.svelte default
## reach
in2 src/lib/features/backlinks/BacklinksPanel.svelte 1 files in 1 modules: src/routes(1)
out2 src/lib/features/backlinks/BacklinksPanel.svelte 19 files in 10 modules: src/lib/components(4) src/lib/utils(4) src/lib/core/editor(3) src/lib/features/backlinks(2) src/lib/contracts(1) +5 modules
## tests
test src/tests/lib/features/backlinks/BacklinksPanel.test.ts imports src/lib/features/backlinks/BacklinksPanel.svelte mirror
## symbols
sym src/lib/features/backlinks/BacklinksPanel.svelte:1 component BacklinksPanel L106
by src/lib/features/backlinks/BacklinksPanel.svelte:default <- src/lib/app/AppShell.svelte:285 in (markup) mount
## locals
local src/lib/features/backlinks/BacklinksPanel.svelte:21 fn handleOpenChange(open: boolean) L3
local src/lib/features/backlinks/BacklinksPanel.svelte:25 fn fetchData() L7
## mounts
mount src/lib/features/backlinks/BacklinksPanel.svelte:55 SidebarSection -> src/lib/core/layout/SidebarSection.svelte
mount src/lib/features/backlinks/BacklinksPanel.svelte:74 LinkItem -> src/lib/features/backlinks/LinkItem.svelte
## mounted-at
mount src/lib/app/AppShell.svelte:285 BacklinksPanel -> src/lib/features/backlinks/BacklinksPanel.svelte
## calls
call src/lib/features/backlinks/BacklinksPanel.svelte:22 in handleOpenChange -> src/lib/features/backlinks/BacklinksPanel.svelte:fetchData call
call src/lib/features/backlinks/BacklinksPanel.svelte:29 in fetchData -> src/lib/features/backlinks/backlinks.service.ts:fetchBacklinksV2 call
call src/lib/features/backlinks/BacklinksPanel.svelte:30 in fetchData -> src/lib/features/backlinks/backlinks.service.ts:fetchRelationshipBacklinks call
call src/lib/features/backlinks/BacklinksPanel.svelte:37 in $effect@33 -> src/lib/features/backlinks/backlinks.store.svelte.ts:backlinksStore.reset mcall
call src/lib/features/backlinks/BacklinksPanel.svelte:49 in $effect@46 -> src/lib/features/backlinks/BacklinksPanel.svelte:fetchData call
call src/lib/features/backlinks/BacklinksPanel.svelte:55 in (markup) -> src/lib/features/backlinks/BacklinksPanel.svelte:handleOpenChange markup
call src/lib/features/backlinks/BacklinksPanel.svelte:93 in (markup) -> src/lib/core/editor/editor.service.ts:openFileInEditor markup
## effects
fx src/lib/features/backlinks/BacklinksPanel.svelte:33 svelte.$effect in (script)
fx src/lib/features/backlinks/BacklinksPanel.svelte:46 svelte.$effect in (script)

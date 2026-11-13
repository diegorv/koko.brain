# file card src/lib/core/settings/sections/TrashSection.svelte
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/settings/sections/TrashSection.svelte ' codemap/files
file src/lib/core/settings/sections/TrashSection.svelte component L138 module src/lib/core/settings in1 t1
## imports
imp src/lib/core/settings/sections/TrashSection.svelte:3 -> src/lib/components/ui/button/index.ts Button
imp src/lib/core/settings/sections/TrashSection.svelte:4 -> src/lib/components/ui/scroll-area/index.ts ScrollArea
imp src/lib/core/settings/sections/TrashSection.svelte:5 -> src/lib/core/trash/trash.store.svelte.ts trashStore
imp src/lib/core/settings/sections/TrashSection.svelte:6 -> src/lib/core/trash/trash.service.ts loadTrash,restoreItem,deletePermanently,emptyTrash
imp src/lib/core/settings/sections/TrashSection.svelte:7 -> src/lib/core/trash/trash.logic.ts formatTrashedDate
imp src/lib/core/settings/sections/TrashSection.svelte:8 -> src/lib/core/vault/vault.store.svelte.ts vaultStore
imp src/lib/core/settings/sections/TrashSection.svelte:9 -> src/lib/core/trash/trash.types.ts type:TrashItem
imp src/lib/core/settings/sections/TrashSection.svelte:14 -> pkg:@tauri-apps/plugin-dialog ask
## imported-by
imp src/lib/app/SettingsPanel.svelte:13 -> src/lib/core/settings/sections/TrashSection.svelte default
## reach
in2 src/lib/core/settings/sections/TrashSection.svelte 1 files in 1 modules: src/lib/app(1)
out2 src/lib/core/settings/sections/TrashSection.svelte 10 files in 5 modules: src/lib/core/filesystem(4) src/lib/components(3) src/lib/core/editor(1) src/lib/core/vault(1) src/lib/utils(1)
## tests
test src/tests/lib/core/settings/TrashSection.test.ts imports src/lib/core/settings/sections/TrashSection.svelte
## symbols
sym src/lib/core/settings/sections/TrashSection.svelte:1 component TrashSection L138
by src/lib/core/settings/sections/TrashSection.svelte:default <- src/lib/app/SettingsPanel.svelte:82 in sectionComponents ref
## locals
local src/lib/core/settings/sections/TrashSection.svelte:23 fn handleRestore(item: TrashItem) L8
local src/lib/core/settings/sections/TrashSection.svelte:32 fn handleDeletePermanently(item: TrashItem) L14
local src/lib/core/settings/sections/TrashSection.svelte:47 fn handleEmptyTrash() L14
## mounts
mount src/lib/core/settings/sections/TrashSection.svelte:74 Button -> src/lib/components/ui/button/button.svelte
mount src/lib/core/settings/sections/TrashSection.svelte:88 ScrollArea -> src/lib/components/ui/scroll-area/scroll-area.svelte
mount src/lib/core/settings/sections/TrashSection.svelte:114 Button -> src/lib/components/ui/button/button.svelte
mount src/lib/core/settings/sections/TrashSection.svelte:123 Button -> src/lib/components/ui/button/button.svelte
## calls
call src/lib/core/settings/sections/TrashSection.svelte:19 in (script) -> src/lib/core/trash/trash.service.ts:loadTrash call
call src/lib/core/settings/sections/TrashSection.svelte:26 in handleRestore -> src/lib/core/trash/trash.service.ts:restoreItem call
call src/lib/core/settings/sections/TrashSection.svelte:40 in handleDeletePermanently -> src/lib/core/trash/trash.service.ts:deletePermanently call
call src/lib/core/settings/sections/TrashSection.svelte:55 in handleEmptyTrash -> src/lib/core/trash/trash.service.ts:emptyTrash call
call src/lib/core/settings/sections/TrashSection.svelte:74 in (markup) -> src/lib/core/settings/sections/TrashSection.svelte:handleEmptyTrash markup
call src/lib/core/settings/sections/TrashSection.svelte:109 in (markup) -> src/lib/core/trash/trash.logic.ts:formatTrashedDate markup
call src/lib/core/settings/sections/TrashSection.svelte:119 in (markup) -> src/lib/core/settings/sections/TrashSection.svelte:handleRestore markup
call src/lib/core/settings/sections/TrashSection.svelte:128 in (markup) -> src/lib/core/settings/sections/TrashSection.svelte:handleDeletePermanently markup
## effects
fx src/lib/core/settings/sections/TrashSection.svelte:34 tauri-dialog.ask in handleDeletePermanently
fx src/lib/core/settings/sections/TrashSection.svelte:49 tauri-dialog.ask in handleEmptyTrash

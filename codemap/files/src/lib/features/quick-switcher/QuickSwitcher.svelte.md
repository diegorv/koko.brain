# file card src/lib/features/quick-switcher/QuickSwitcher.svelte
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/quick-switcher/QuickSwitcher.svelte ' codemap/files
file src/lib/features/quick-switcher/QuickSwitcher.svelte component L111 module src/lib/features/quick-switcher in1 t1
## imports
imp src/lib/features/quick-switcher/QuickSwitcher.svelte:2 -> src/lib/components/ui/command/index.ts *
imp src/lib/features/quick-switcher/QuickSwitcher.svelte:3 -> src/lib/core/filesystem/fs.store.svelte.ts fsStore
imp src/lib/features/quick-switcher/QuickSwitcher.svelte:4 -> src/lib/core/vault/vault.store.svelte.ts vaultStore
imp src/lib/features/quick-switcher/QuickSwitcher.svelte:5 -> src/lib/core/editor/editor.service.ts openFileInEditor
imp src/lib/features/quick-switcher/QuickSwitcher.svelte:6 -> src/lib/core/editor/editor.hooks.ts notifyNoteCreated
imp src/lib/features/quick-switcher/QuickSwitcher.svelte:8 -> src/lib/core/filesystem/fs.service.ts createFile
imp src/lib/features/quick-switcher/QuickSwitcher.svelte:9 -> src/lib/core/note-creator/explicit-organization.logic.ts applyExplicitOrganization
imp src/lib/features/quick-switcher/QuickSwitcher.svelte:10 -> src/lib/core/settings/settings.store.svelte.ts settingsStore
imp src/lib/features/quick-switcher/QuickSwitcher.svelte:11 -> src/lib/features/properties/lifecycle-filter.store.svelte.ts lifecycleFilterStore
imp src/lib/features/quick-switcher/QuickSwitcher.svelte:12 -> src/lib/utils/path.ts relativePath
imp src/lib/features/quick-switcher/QuickSwitcher.svelte:13 -> src/lib/core/filesystem/file-entries.logic.ts flattenFileTree,filterAndRank
imp src/lib/features/quick-switcher/QuickSwitcher.svelte:14 -> src/lib/features/quick-switcher/quick-switcher.store.svelte.ts quickSwitcherStore
## imported-by
imp src/lib/app/AppOverlays.svelte:5 -> src/lib/features/quick-switcher/QuickSwitcher.svelte default
## reach
in2 src/lib/features/quick-switcher/QuickSwitcher.svelte 1 files in 1 modules: src/routes(1)
out2 src/lib/features/quick-switcher/QuickSwitcher.svelte 30 files in 9 modules: src/lib/components(11) src/lib/utils(5) src/lib/core/filesystem(4) src/lib/core/editor(3) src/lib/core/settings(3) +4 modules
## tests
test src/tests/lib/features/quick-switcher/QuickSwitcher.test.ts imports src/lib/features/quick-switcher/QuickSwitcher.svelte mirror
## symbols
sym src/lib/features/quick-switcher/QuickSwitcher.svelte:1 component QuickSwitcher L111
by src/lib/features/quick-switcher/QuickSwitcher.svelte:default <- src/lib/app/AppOverlays.svelte:18 in (markup) mount
## locals
local src/lib/features/quick-switcher/QuickSwitcher.svelte:27 fn handleOpenChange(open: boolean) L6
local src/lib/features/quick-switcher/QuickSwitcher.svelte:34 fn selectFile(path: string) L6
local src/lib/features/quick-switcher/QuickSwitcher.svelte:41 fn createAndOpenNote() L20
## mounted-at
mount src/lib/app/AppOverlays.svelte:18 QuickSwitcher -> src/lib/features/quick-switcher/QuickSwitcher.svelte
## calls
call src/lib/features/quick-switcher/QuickSwitcher.svelte:21 in allFiles=$derived -> src/lib/core/filesystem/file-entries.logic.ts:flattenFileTree call
call src/lib/features/quick-switcher/QuickSwitcher.svelte:23 in filteredFiles=$derived -> src/lib/core/filesystem/file-entries.logic.ts:filterAndRank call
call src/lib/features/quick-switcher/QuickSwitcher.svelte:29 in handleOpenChange -> src/lib/features/quick-switcher/quick-switcher.store.svelte.ts:quickSwitcherStore.close mcall
call src/lib/features/quick-switcher/QuickSwitcher.svelte:35 in selectFile -> src/lib/features/quick-switcher/quick-switcher.store.svelte.ts:quickSwitcherStore.addRecentPath mcall
call src/lib/features/quick-switcher/QuickSwitcher.svelte:36 in selectFile -> src/lib/features/quick-switcher/quick-switcher.store.svelte.ts:quickSwitcherStore.close mcall
call src/lib/features/quick-switcher/QuickSwitcher.svelte:38 in selectFile -> src/lib/core/editor/editor.service.ts:openFileInEditor call
call src/lib/features/quick-switcher/QuickSwitcher.svelte:50 in createAndOpenNote -> src/lib/core/filesystem/fs.service.ts:createFile call
call src/lib/features/quick-switcher/QuickSwitcher.svelte:50 in createAndOpenNote -> src/lib/core/note-creator/explicit-organization.logic.ts:applyExplicitOrganization call
call src/lib/features/quick-switcher/QuickSwitcher.svelte:55 in createAndOpenNote -> src/lib/features/quick-switcher/quick-switcher.store.svelte.ts:quickSwitcherStore.addRecentPath mcall
call src/lib/features/quick-switcher/QuickSwitcher.svelte:56 in createAndOpenNote -> src/lib/core/editor/editor.service.ts:openFileInEditor call
call src/lib/features/quick-switcher/QuickSwitcher.svelte:57 in createAndOpenNote -> src/lib/core/editor/editor.hooks.ts:notifyNoteCreated call
call src/lib/features/quick-switcher/QuickSwitcher.svelte:58 in createAndOpenNote -> src/lib/features/quick-switcher/quick-switcher.store.svelte.ts:quickSwitcherStore.close mcall
call src/lib/features/quick-switcher/QuickSwitcher.svelte:65 in (markup) -> src/lib/features/quick-switcher/QuickSwitcher.svelte:handleOpenChange markup
call src/lib/features/quick-switcher/QuickSwitcher.svelte:75 in (markup) -> src/lib/features/properties/lifecycle-filter.store.svelte.ts:lifecycleFilterStore.isArchived markup
call src/lib/features/quick-switcher/QuickSwitcher.svelte:78 in (markup) -> src/lib/features/quick-switcher/QuickSwitcher.svelte:selectFile markup
call src/lib/features/quick-switcher/QuickSwitcher.svelte:89 in (markup) -> src/lib/utils/path.ts:relativePath markup
call src/lib/features/quick-switcher/QuickSwitcher.svelte:101 in (markup) -> src/lib/features/quick-switcher/QuickSwitcher.svelte:createAndOpenNote markup

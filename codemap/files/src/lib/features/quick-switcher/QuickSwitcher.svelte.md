# file card src/lib/features/quick-switcher/QuickSwitcher.svelte
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/quick-switcher/QuickSwitcher.svelte ' codemap/files
file src/lib/features/quick-switcher/QuickSwitcher.svelte component L203 module src/lib/features/quick-switcher in1 t1
## imports
imp src/lib/features/quick-switcher/QuickSwitcher.svelte:2 -> src/lib/components/ui/command/index.ts *
imp src/lib/features/quick-switcher/QuickSwitcher.svelte:3 -> src/lib/core/filesystem/fs.store.svelte.ts fsStore
imp src/lib/features/quick-switcher/QuickSwitcher.svelte:4 -> src/lib/core/vault/vault.store.svelte.ts vaultStore
imp src/lib/features/quick-switcher/QuickSwitcher.svelte:5 -> src/lib/core/editor/editor.service.ts openFileInEditor
imp src/lib/features/quick-switcher/QuickSwitcher.svelte:6 -> src/lib/core/editor/editor.hooks.ts notifyNoteCreated
imp src/lib/features/quick-switcher/QuickSwitcher.svelte:8 -> src/lib/contracts/ipc.ts call
imp src/lib/features/quick-switcher/QuickSwitcher.svelte:9 -> src/lib/core/filesystem/fs.service.ts createFile
imp src/lib/features/quick-switcher/QuickSwitcher.svelte:10 -> src/lib/core/note-creator/explicit-organization.logic.ts applyExplicitOrganization
imp src/lib/features/quick-switcher/QuickSwitcher.svelte:11 -> src/lib/core/settings/settings.store.svelte.ts settingsStore
imp src/lib/features/quick-switcher/QuickSwitcher.svelte:12 -> src/lib/features/properties/lifecycle-filter.store.svelte.ts lifecycleFilterStore
imp src/lib/features/quick-switcher/QuickSwitcher.svelte:13 -> src/lib/features/file-icons/icon-resolver.ts resolveIconForPath
imp src/lib/features/quick-switcher/QuickSwitcher.svelte:14 -> src/lib/features/file-icons/IconRenderer.svelte default
imp src/lib/features/quick-switcher/QuickSwitcher.svelte:15 -> src/lib/features/file-icons/file-icons.logic.ts iconColorStyle
imp src/lib/features/quick-switcher/QuickSwitcher.svelte:16 -> src/lib/features/rail-shell/lens.logic.ts fileKind
imp src/lib/features/quick-switcher/QuickSwitcher.svelte:17 -> src/lib/features/rail-shell/kind-icons.ts KIND_ICONS
imp src/lib/features/quick-switcher/QuickSwitcher.svelte:18 -> src/lib/utils/fuzzy-match.ts fuzzyMatchPositions
imp src/lib/features/quick-switcher/QuickSwitcher.svelte:19 -> src/lib/core/filesystem/file-entries.logic.ts entryFolder,flattenFileTree,filterAndRank,splitRecentFiles,type:FileEntry
imp src/lib/features/quick-switcher/QuickSwitcher.svelte:26 -> src/lib/features/quick-switcher/quick-switcher.store.svelte.ts quickSwitcherStore
imp src/lib/features/quick-switcher/QuickSwitcher.svelte:27 -> src/lib/features/quick-switcher/quick-switcher.logic.ts createTargetLabel,matchSegments,parseCreatePath
## imported-by
imp src/lib/app/AppOverlays.svelte:6 -> src/lib/features/quick-switcher/QuickSwitcher.svelte default
## reach
in2 src/lib/features/quick-switcher/QuickSwitcher.svelte 1 files in 1 modules: src/routes(1)
out2 src/lib/features/quick-switcher/QuickSwitcher.svelte 52 files in 15 modules: src/lib/components(11) src/lib/utils(8) src/lib/core/filesystem(5) src/lib/core/settings(5) src/lib/features/collection(5) +10 modules
## tests
test src/tests/lib/features/quick-switcher/QuickSwitcher.test.ts imports src/lib/features/quick-switcher/QuickSwitcher.svelte mirror
## symbols
sym src/lib/features/quick-switcher/QuickSwitcher.svelte:1 component QuickSwitcher L203
by src/lib/features/quick-switcher/QuickSwitcher.svelte:default <- src/lib/app/AppOverlays.svelte:19 in (markup) mount
## locals
local src/lib/features/quick-switcher/QuickSwitcher.svelte:70 fn targetPath(vaultPath: string, folder: string, name: string): string L3
local src/lib/features/quick-switcher/QuickSwitcher.svelte:74 fn handleOpenChange(open: boolean) L6
local src/lib/features/quick-switcher/QuickSwitcher.svelte:81 fn selectFile(path: string) L6
local src/lib/features/quick-switcher/QuickSwitcher.svelte:88 fn createAndOpenNote() L26
local src/lib/features/quick-switcher/QuickSwitcher.svelte:120 fn handleInputKeydown(e: KeyboardEvent) L6
## mounts
mount src/lib/features/quick-switcher/QuickSwitcher.svelte:137 IconRenderer -> src/lib/features/file-icons/IconRenderer.svelte
## mounted-at
mount src/lib/app/AppOverlays.svelte:19 QuickSwitcher -> src/lib/features/quick-switcher/QuickSwitcher.svelte
## calls
call src/lib/features/quick-switcher/QuickSwitcher.svelte:32 in allFiles=$derived -> src/lib/core/filesystem/file-entries.logic.ts:flattenFileTree call
call src/lib/features/quick-switcher/QuickSwitcher.svelte:33 in createPath=$derived -> src/lib/features/quick-switcher/quick-switcher.logic.ts:parseCreatePath call
call src/lib/features/quick-switcher/QuickSwitcher.svelte:40 in existingTarget=$derived -> src/lib/features/quick-switcher/QuickSwitcher.svelte:targetPath call
call src/lib/features/quick-switcher/QuickSwitcher.svelte:48 in filteredFiles=$derived -> src/lib/core/filesystem/file-entries.logic.ts:filterAndRank call
call src/lib/features/quick-switcher/QuickSwitcher.svelte:56 in recentGroups=$derived -> src/lib/core/filesystem/file-entries.logic.ts:splitRecentFiles call
call src/lib/features/quick-switcher/QuickSwitcher.svelte:76 in handleOpenChange -> src/lib/features/quick-switcher/quick-switcher.store.svelte.ts:quickSwitcherStore.close mcall
call src/lib/features/quick-switcher/QuickSwitcher.svelte:82 in selectFile -> src/lib/features/quick-switcher/quick-switcher.store.svelte.ts:quickSwitcherStore.addRecentPath mcall
call src/lib/features/quick-switcher/QuickSwitcher.svelte:83 in selectFile -> src/lib/features/quick-switcher/quick-switcher.store.svelte.ts:quickSwitcherStore.close mcall
call src/lib/features/quick-switcher/QuickSwitcher.svelte:85 in selectFile -> src/lib/core/editor/editor.service.ts:openFileInEditor call
call src/lib/features/quick-switcher/QuickSwitcher.svelte:91 in createAndOpenNote -> src/lib/features/quick-switcher/quick-switcher.logic.ts:parseCreatePath call
call src/lib/features/quick-switcher/QuickSwitcher.svelte:102 in createAndOpenNote -> src/lib/contracts/ipc.ts:call call
call src/lib/features/quick-switcher/QuickSwitcher.svelte:103 in createAndOpenNote -> src/lib/core/filesystem/fs.service.ts:createFile call
call src/lib/features/quick-switcher/QuickSwitcher.svelte:103 in createAndOpenNote -> src/lib/core/note-creator/explicit-organization.logic.ts:applyExplicitOrganization call
call src/lib/features/quick-switcher/QuickSwitcher.svelte:108 in createAndOpenNote -> src/lib/features/quick-switcher/quick-switcher.store.svelte.ts:quickSwitcherStore.addRecentPath mcall
call src/lib/features/quick-switcher/QuickSwitcher.svelte:109 in createAndOpenNote -> src/lib/core/editor/editor.service.ts:openFileInEditor call
call src/lib/features/quick-switcher/QuickSwitcher.svelte:110 in createAndOpenNote -> src/lib/core/editor/editor.hooks.ts:notifyNoteCreated call
call src/lib/features/quick-switcher/QuickSwitcher.svelte:111 in createAndOpenNote -> src/lib/features/quick-switcher/quick-switcher.store.svelte.ts:quickSwitcherStore.close mcall
call src/lib/features/quick-switcher/QuickSwitcher.svelte:124 in handleInputKeydown -> src/lib/features/quick-switcher/QuickSwitcher.svelte:createAndOpenNote call
call src/lib/features/quick-switcher/QuickSwitcher.svelte:129 in (markup) -> src/lib/features/file-icons/icon-resolver.ts:resolveIconForPath markup
call src/lib/features/quick-switcher/QuickSwitcher.svelte:130 in (markup) -> src/lib/features/rail-shell/lens.logic.ts:fileKind markup
call src/lib/features/quick-switcher/QuickSwitcher.svelte:131 in (markup) -> src/lib/core/filesystem/file-entries.logic.ts:entryFolder markup
call src/lib/features/quick-switcher/QuickSwitcher.svelte:134 in (markup) -> src/lib/features/quick-switcher/QuickSwitcher.svelte:selectFile markup
call src/lib/features/quick-switcher/QuickSwitcher.svelte:139 in (markup) -> src/lib/features/file-icons/file-icons.logic.ts:iconColorStyle markup
call src/lib/features/quick-switcher/QuickSwitcher.svelte:142 in (markup) -> src/lib/features/quick-switcher/quick-switcher.logic.ts:matchSegments markup
call src/lib/features/quick-switcher/QuickSwitcher.svelte:142 in (markup) -> src/lib/utils/fuzzy-match.ts:fuzzyMatchPositions markup
call src/lib/features/quick-switcher/QuickSwitcher.svelte:149 in (markup) -> src/lib/features/properties/lifecycle-filter.store.svelte.ts:lifecycleFilterStore.isArchived markup
call src/lib/features/quick-switcher/QuickSwitcher.svelte:157 in (markup) -> src/lib/features/quick-switcher/QuickSwitcher.svelte:handleOpenChange markup
call src/lib/features/quick-switcher/QuickSwitcher.svelte:163 in (markup) -> src/lib/features/quick-switcher/QuickSwitcher.svelte:handleInputKeydown markup
call src/lib/features/quick-switcher/QuickSwitcher.svelte:190 in (markup) -> src/lib/features/quick-switcher/QuickSwitcher.svelte:createAndOpenNote markup
call src/lib/features/quick-switcher/QuickSwitcher.svelte:195 in (markup) -> src/lib/features/quick-switcher/quick-switcher.logic.ts:createTargetLabel markup
## effects
ipc-call src/lib/features/quick-switcher/QuickSwitcher.svelte:102 in createAndOpenNote -> ipc:create_folder -> src-tauri/src/commands/vault.rs:1179

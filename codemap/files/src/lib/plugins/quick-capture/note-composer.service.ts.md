# file card src/lib/plugins/quick-capture/note-composer.service.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/plugins/quick-capture/note-composer.service.ts ' codemap/files
file src/lib/plugins/quick-capture/note-composer.service.ts service L54 module src/lib/plugins/quick-capture in2 t5
## imports
imp src/lib/plugins/quick-capture/note-composer.service.ts:2 -> src/lib/core/settings/settings.store.svelte.ts settingsStore
imp src/lib/plugins/quick-capture/note-composer.service.ts:3 -> src/lib/core/vault/vault.store.svelte.ts vaultStore
imp src/lib/plugins/quick-capture/note-composer.service.ts:4 -> src/lib/core/note-creator/note-creator.service.ts openOrCreateNote
imp src/lib/plugins/quick-capture/note-composer.service.ts:5 -> src/lib/core/note-creator/explicit-organization.logic.ts withUnorganizedFlag
imp src/lib/plugins/quick-capture/note-composer.service.ts:6 -> src/lib/plugins/quick-capture/note-composer.logic.ts buildCapturePath,getCaptureTitle,buildCaptureVariables
## imported-by
imp src/lib/app/commands.ts:47 -> src/lib/plugins/quick-capture/note-composer.service.ts createNoteComposer
imp src/lib/app/global-keybindings.ts:17 -> src/lib/plugins/quick-capture/note-composer.service.ts createNoteComposer
## reach
in2 src/lib/plugins/quick-capture/note-composer.service.ts 2 files in 2 modules: src/lib/app(1) src/routes(1)
out2 src/lib/plugins/quick-capture/note-composer.service.ts 16 files in 8 modules: src/lib/utils(4) src/lib/core/filesystem(3) src/lib/core/settings(3) src/lib/core/editor(2) src/lib/contracts(1) +3 modules
## tests
test src/tests/lib/plugins/quick-capture/note-composer.service.test.ts imports src/lib/plugins/quick-capture/note-composer.service.ts mirror
test src/tests/lib/core/note-creator/note-creator.service.test.ts imports src/lib/plugins/quick-capture/note-composer.service.ts
test src/tests/lib/app/commands.test.ts mocks src/lib/plugins/quick-capture/note-composer.service.ts
test src/tests/lib/app/global-keybindings.test.ts mocks src/lib/plugins/quick-capture/note-composer.service.ts
test src/tests/lib/features/command-palette/CommandPalette.test.ts mocks src/lib/plugins/quick-capture/note-composer.service.ts
## symbols
sym src/lib/plugins/quick-capture/note-composer.service.ts:20 fn createNoteComposer(): Promise<void> L35 | Creates and opens a new capture note instantly via the in-editor note-composer surface (Cmd+N).
by src/lib/plugins/quick-capture/note-composer.service.ts:createNoteComposer <- src/lib/app/commands.ts:362 in getBuiltInCommands call
by src/lib/plugins/quick-capture/note-composer.service.ts:createNoteComposer <- src/lib/app/global-keybindings.ts:152 in GLOBAL_KEYBINDINGS call
## calls
call src/lib/plugins/quick-capture/note-composer.service.ts:28 in createNoteComposer -> src/lib/plugins/quick-capture/note-composer.logic.ts:buildCapturePath call
call src/lib/plugins/quick-capture/note-composer.service.ts:36 in createNoteComposer -> src/lib/plugins/quick-capture/note-composer.logic.ts:getCaptureTitle call
call src/lib/plugins/quick-capture/note-composer.service.ts:42 in createNoteComposer -> src/lib/plugins/quick-capture/note-composer.logic.ts:buildCaptureVariables call
call src/lib/plugins/quick-capture/note-composer.service.ts:46 in createNoteComposer -> src/lib/core/vault/vault.store.svelte.ts:vaultStore.requestPromptIndexRefresh mcall
call src/lib/plugins/quick-capture/note-composer.service.ts:47 in createNoteComposer -> src/lib/core/note-creator/note-creator.service.ts:openOrCreateNote call
call src/lib/plugins/quick-capture/note-composer.service.ts:52 in createNoteComposer -> src/lib/core/note-creator/explicit-organization.logic.ts:withUnorganizedFlag ref

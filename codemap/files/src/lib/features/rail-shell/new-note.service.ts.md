# file card src/lib/features/rail-shell/new-note.service.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/rail-shell/new-note.service.ts ' codemap/files
file src/lib/features/rail-shell/new-note.service.ts service L47 module src/lib/features/rail-shell in1 t1
## imports
imp src/lib/features/rail-shell/new-note.service.ts:1 -> src/lib/contracts/ipc.ts call
imp src/lib/features/rail-shell/new-note.service.ts:2 -> src/lib/core/editor/editor.hooks.ts notifyNoteCreated
imp src/lib/features/rail-shell/new-note.service.ts:3 -> src/lib/core/editor/editor.service.ts openFileInEditor
imp src/lib/features/rail-shell/new-note.service.ts:4 -> src/lib/core/filesystem/fs.service.ts createFile
imp src/lib/features/rail-shell/new-note.service.ts:5 -> src/lib/core/note-creator/explicit-organization.logic.ts applyExplicitOrganization
imp src/lib/features/rail-shell/new-note.service.ts:6 -> src/lib/core/settings/settings.store.svelte.ts settingsStore
imp src/lib/features/rail-shell/new-note.service.ts:7 -> src/lib/core/vault/vault.store.svelte.ts vaultStore
imp src/lib/features/rail-shell/new-note.service.ts:8 -> src/lib/utils/debug.ts error
imp src/lib/features/rail-shell/new-note.service.ts:9 -> src/lib/features/type-definitions/type-definitions.service.ts createTypedNote
imp src/lib/features/rail-shell/new-note.service.ts:10 -> src/lib/features/rail-shell/lens.logic.ts newNoteContent
imp src/lib/features/rail-shell/new-note.service.ts:11 -> src/lib/features/rail-shell/rail-shell.types.ts type:NewNoteRule
## imported-by
imp src/lib/features/rail-shell/RailNoteList.svelte:88 -> src/lib/features/rail-shell/new-note.service.ts createNoteHere
## reach
in2 src/lib/features/rail-shell/new-note.service.ts 1 files in 1 modules: src/lib/app(1)
out2 src/lib/features/rail-shell/new-note.service.ts 39 files in 13 modules: src/lib/core/filesystem(6) src/lib/features/type-definitions(6) src/lib/utils(6) src/lib/core/settings(5) src/lib/features/collection(5) +8 modules
## tests
test src/tests/lib/features/rail-shell/new-note.service.test.ts imports src/lib/features/rail-shell/new-note.service.ts mirror
## symbols
sym src/lib/features/rail-shell/new-note.service.ts:26 fn createNoteHere(rule: NewNoteRule): Promise<string> L22 | "+ New here": a plain rule creates `Untitled.md` (deduped) in its folder with its frontmatter; a typed rule creates `Untitled <Type>` through `createTypedNote`…
by src/lib/features/rail-shell/new-note.service.ts:createNoteHere <- src/lib/features/rail-shell/RailNoteList.svelte:607 in handleNewHere call
## calls
call src/lib/features/rail-shell/new-note.service.ts:29 in createNoteHere -> src/lib/core/vault/vault.store.svelte.ts:vaultStore.requestPromptIndexRefresh mcall
call src/lib/features/rail-shell/new-note.service.ts:33 in createNoteHere -> src/lib/features/type-definitions/type-definitions.service.ts:createTypedNote call
call src/lib/features/rail-shell/new-note.service.ts:36 in createNoteHere -> src/lib/contracts/ipc.ts:call call
call src/lib/features/rail-shell/new-note.service.ts:37 in createNoteHere -> src/lib/core/note-creator/explicit-organization.logic.ts:applyExplicitOrganization call
call src/lib/features/rail-shell/new-note.service.ts:37 in createNoteHere -> src/lib/features/rail-shell/lens.logic.ts:newNoteContent call
call src/lib/features/rail-shell/new-note.service.ts:38 in createNoteHere -> src/lib/core/filesystem/fs.service.ts:createFile call
call src/lib/features/rail-shell/new-note.service.ts:40 in createNoteHere -> src/lib/core/editor/editor.service.ts:openFileInEditor call
call src/lib/features/rail-shell/new-note.service.ts:41 in createNoteHere -> src/lib/core/editor/editor.hooks.ts:notifyNoteCreated call
call src/lib/features/rail-shell/new-note.service.ts:44 in createNoteHere -> src/lib/utils/debug.ts:error call
## effects
ipc-call src/lib/features/rail-shell/new-note.service.ts:36 in createNoteHere -> ipc:create_folder -> src-tauri/src/commands/vault.rs:1179

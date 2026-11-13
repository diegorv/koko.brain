# file card src/lib/features/properties/NoteInfo.svelte
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/properties/NoteInfo.svelte ' codemap/files
file src/lib/features/properties/NoteInfo.svelte component L55 module src/lib/features/properties in1 t1
## imports
imp src/lib/features/properties/NoteInfo.svelte:4 -> src/lib/core/editor/editor.store.svelte.ts editorStore
imp src/lib/features/properties/NoteInfo.svelte:5 -> src/lib/core/vault/vault-entries.service.ts getVaultEntries
imp src/lib/features/properties/NoteInfo.svelte:6 -> src/lib/core/vault/vault.store.svelte.ts vaultStore
imp src/lib/features/properties/NoteInfo.svelte:7 -> src/lib/types/vault-v2.types.ts type:NoteEntryV2
imp src/lib/features/properties/NoteInfo.svelte:8 -> src/lib/utils/debug.ts error
imp src/lib/features/properties/NoteInfo.svelte:9 -> src/lib/features/properties/note-info.logic.ts buildNoteInfoRows
## imported-by
imp src/lib/app/AppShell.svelte:44 -> src/lib/features/properties/NoteInfo.svelte default
## reach
in2 src/lib/features/properties/NoteInfo.svelte 1 files in 1 modules: src/routes(1)
out2 src/lib/features/properties/NoteInfo.svelte 12 files in 6 modules: src/lib/contracts(3) src/lib/core/editor(2) src/lib/core/settings(2) src/lib/core/vault(2) src/lib/utils(2) +1 modules
## tests
test src/tests/lib/features/properties/NoteInfo.test.ts imports src/lib/features/properties/NoteInfo.svelte mirror
## symbols
sym src/lib/features/properties/NoteInfo.svelte:1 component NoteInfo L55
by src/lib/features/properties/NoteInfo.svelte:default <- src/lib/app/AppShell.svelte:291 in (markup) mount
## mounted-at
mount src/lib/app/AppShell.svelte:291 NoteInfo -> src/lib/features/properties/NoteInfo.svelte
## calls
call src/lib/features/properties/NoteInfo.svelte:12 in rows=$derived -> src/lib/features/properties/note-info.logic.ts:buildNoteInfoRows call
call src/lib/features/properties/NoteInfo.svelte:25 in $effect@18 -> src/lib/core/vault/vault-entries.service.ts:getVaultEntries call
call src/lib/features/properties/NoteInfo.svelte:32 in $effect@18 -> src/lib/utils/debug.ts:error call
## effects
fx src/lib/features/properties/NoteInfo.svelte:18 svelte.$effect in (script)

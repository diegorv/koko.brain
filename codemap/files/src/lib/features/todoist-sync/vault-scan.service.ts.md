# file card src/lib/features/todoist-sync/vault-scan.service.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/todoist-sync/vault-scan.service.ts ' codemap/files
file src/lib/features/todoist-sync/vault-scan.service.ts service L112 module src/lib/features/todoist-sync in1 t0
## imports
imp src/lib/features/todoist-sync/vault-scan.service.ts:1 -> src/lib/contracts/ipc.ts call
imp src/lib/features/todoist-sync/vault-scan.service.ts:2 -> src/lib/contracts/index.ts type:Task,type:TaskStatus
imp src/lib/features/todoist-sync/vault-scan.service.ts:3 -> src/lib/core/editor/editor.store.svelte.ts editorStore
imp src/lib/features/todoist-sync/vault-scan.service.ts:4 -> src/lib/features/todoist-sync/anchor.logic.ts buildAnchorOccurrences,isInSyncScope
imp src/lib/features/todoist-sync/vault-scan.service.ts:5 -> src/lib/features/todoist-sync/note-writer.service.ts readNoteContent
imp src/lib/features/todoist-sync/vault-scan.service.ts:6 -> src/lib/features/todoist-sync/pull.logic.ts extractTaskLines,type:LineFields,type:ScannedLine,type:ScannedNote
## imported-by
imp src/lib/features/todoist-sync/sync-now.service.ts:92 -> src/lib/features/todoist-sync/vault-scan.service.ts scanVault
## reach
in2 src/lib/features/todoist-sync/vault-scan.service.ts 1 files in 1 modules: src/lib/features/todoist-sync(1)
out2 src/lib/features/todoist-sync/vault-scan.service.ts 66 files in 7 modules: src/lib/contracts(54) src/lib/features/todoist-sync(5) src/lib/core/editor(3) src/lib/core/frontmatter(1) src/lib/core/markdown-editor(1) +2 modules
## symbols
sym src/lib/features/todoist-sync/vault-scan.service.ts:9 interface VaultScan L8 | What a sync cycle sees in the vault.
sym src/lib/features/todoist-sync/vault-scan.service.ts:52 fn scanVault(vaultRoot: string, templatesFolder: string): Promise<VaultScan> L61 | The vault scan every sync cycle starts from.
by src/lib/features/todoist-sync/vault-scan.service.ts:scanVault <- src/lib/features/todoist-sync/sync-now.service.ts:337 in cycle call
## locals
local src/lib/features/todoist-sync/vault-scan.service.ts:29 fn fieldsOf(task: Task): LineFields L9
## calls
call src/lib/features/todoist-sync/vault-scan.service.ts:55 in scanVault -> src/lib/features/todoist-sync/anchor.logic.ts:isInSyncScope call
call src/lib/features/todoist-sync/vault-scan.service.ts:57 in scanVault -> src/lib/contracts/ipc.ts:call call +1
call src/lib/features/todoist-sync/vault-scan.service.ts:78 in scanVault -> src/lib/features/todoist-sync/vault-scan.service.ts:fieldsOf call +1
call src/lib/features/todoist-sync/vault-scan.service.ts:86 in scanVault -> src/lib/features/todoist-sync/note-writer.service.ts:readNoteContent call
call src/lib/features/todoist-sync/vault-scan.service.ts:88 in scanVault -> src/lib/features/todoist-sync/pull.logic.ts:extractTaskLines call
call src/lib/features/todoist-sync/vault-scan.service.ts:111 in scanVault -> src/lib/features/todoist-sync/anchor.logic.ts:buildAnchorOccurrences call
## effects
ipc-call src/lib/features/todoist-sync/vault-scan.service.ts:57 in scanVault -> ipc:get_all_property_records -> src-tauri/src/commands/vault.rs:1056
ipc-call src/lib/features/todoist-sync/vault-scan.service.ts:57 in scanVault -> ipc:get_all_tasks_v2 -> src-tauri/src/commands/vault.rs:652

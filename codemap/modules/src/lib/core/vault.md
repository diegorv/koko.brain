# module card src/lib/core/vault
cols: module <path> <layer> files <n> in-modules <n> out-modules <n> pub <public>/<exports> ipc <called>/<served> card ~<k>k · dep <from> -> <to> <file pairs> · in2/out2 <module> <n> modules: <module>(<via>) · entry <file> ext-in<n> <importers> · file … · sym … · grep: grep -rF -- '-> src/lib/core/vault ' codemap/modules
module src/lib/core/vault core files 7 in-modules 33 out-modules 5 pub 9/17 ipc 1/0 card ~2.2k
## neighbors
dep src/lib/app -> src/lib/core/vault 13
dep src/lib/core/filesystem -> src/lib/core/vault 4
dep src/lib/core/frontmatter -> src/lib/core/vault 1
dep src/lib/core/note-creator -> src/lib/core/vault 1
dep src/lib/core/settings -> src/lib/core/vault 2
dep src/lib/features/auto-organize -> src/lib/core/vault 4
dep src/lib/features/backlinks -> src/lib/core/vault 2
dep src/lib/features/canvas -> src/lib/core/vault 2
dep src/lib/features/collection -> src/lib/core/vault 3
dep src/lib/features/deep-link -> src/lib/core/vault 2
dep src/lib/features/event-calendar -> src/lib/core/vault 5
dep src/lib/features/file-history -> src/lib/core/vault 2
dep src/lib/features/note-action-bar -> src/lib/core/vault 1
dep src/lib/features/note-list -> src/lib/core/vault 2
dep src/lib/features/outgoing-links -> src/lib/core/vault 2
dep src/lib/features/properties -> src/lib/core/vault 6
dep src/lib/features/quick-switcher -> src/lib/core/vault 1
dep src/lib/features/rail-shell -> src/lib/core/vault 6
dep src/lib/features/search -> src/lib/core/vault 4
dep src/lib/features/tags -> src/lib/core/vault 1
dep src/lib/features/tasks -> src/lib/core/vault 3
dep src/lib/features/todoist-sync -> src/lib/core/vault 5
dep src/lib/features/type-definitions -> src/lib/core/vault 1
dep src/lib/plugins/calendar -> src/lib/core/vault 1
dep src/lib/plugins/graph-view -> src/lib/core/vault 2
dep src/lib/plugins/kanban -> src/lib/core/vault 1
dep src/lib/plugins/mods -> src/lib/core/vault 5
dep src/lib/plugins/one-on-one -> src/lib/core/vault 2
dep src/lib/plugins/periodic-notes -> src/lib/core/vault 1
dep src/lib/plugins/queryjs -> src/lib/core/vault 2
dep src/lib/plugins/quick-capture -> src/lib/core/vault 2
dep src/lib/plugins/templates -> src/lib/core/vault 1
dep src/routes -> src/lib/core/vault 3
dep src/lib/core/vault -> src/lib/contracts 1
dep src/lib/core/vault -> src/lib/core/editor 2
dep src/lib/core/vault -> src/lib/core/settings 1
dep src/lib/core/vault -> src/lib/types 2
dep src/lib/core/vault -> src/lib/utils 4
in2 src/lib/core/vault 2 modules: src/lib/core/trash(1) src/lib/features/file-icons(1)
out2 src/lib/core/vault 2 modules: src/lib/core/filesystem(1) src/lib/core/markdown-editor(1)
## entry files
entry src/lib/core/vault/vault.store.svelte.ts ext-in80 src/lib/app/AppShell.svelte src/lib/app/LabsSection.svelte src/lib/app/boot.ts src/lib/app/commands.ts src/lib/app/editor-host.ts more importers 75 not shown: src/lib/features/rail-shell(6) src/lib/features/properties(5) src/lib/features/todoist-sync(5) +30 modules: q importers src/lib/core/vault/vault.store.svelte.ts
entry src/lib/core/vault/vault-entries.service.ts ext-in8 src/lib/app/editor-host.ts src/lib/app/lifecycle/app-lifecycle.service.ts src/lib/app/tauri-listeners.service.ts src/lib/features/event-calendar/event-calendar.service.ts src/lib/features/properties/NoteInfo.svelte more importers 3 not shown: src/lib/features/tasks(1) src/lib/plugins/mods(1) src/lib/plugins/queryjs(1): q importers src/lib/core/vault/vault-entries.service.ts
entry src/lib/core/vault/exit.service.ts ext-in2 src/lib/app/tauri-listeners.service.ts src/lib/core/settings/sections/UpdateSection.svelte
entry src/lib/core/vault/vault.service.ts ext-in2 src/lib/features/deep-link/deep-link.service.ts src/routes/(app)/+page.svelte
entry src/lib/core/vault/write-barrier.service.ts ext-in1 src/lib/app/boot.ts
## files
file src/lib/core/vault/exit.service.ts service L39 module src/lib/core/vault in3 t1
file src/lib/core/vault/vault-entries.logic.ts logic L32 module src/lib/core/vault in1 t1
file src/lib/core/vault/vault-entries.service.ts service L84 module src/lib/core/vault in8 t21
file src/lib/core/vault/vault.logic.ts logic L32 module src/lib/core/vault in1 t1
file src/lib/core/vault/vault.service.ts service L53 module src/lib/core/vault in2 t6
file src/lib/core/vault/vault.store.svelte.ts store L159 module src/lib/core/vault in82 t149
file src/lib/core/vault/write-barrier.service.ts service L41 module src/lib/core/vault in3 t3
## public
sym src/lib/core/vault/exit.service.ts:15 fn prepareForExit(): Promise<boolean> L9 | Puts every pending write on disk before the app goes away: the window close, Quit (Cmd+Q, app menu) and Restart to update all run it first.
sym src/lib/core/vault/vault-entries.service.ts:36 fn getVaultEntries(): Promise<NoteEntryV2[]> L3 | Returns the full vault entries snapshot for the current index version.
sym src/lib/core/vault/vault-entries.service.ts:45 fn invalidateVaultEntries(): void L3 | Drops the cached snapshot.
sym src/lib/core/vault/vault-entries.service.ts:73 fn patchVaultEntries(readDelta: () => Promise<EntriesDelta>): Promise<EntriesPatch> | null L12 | Advances the snapshot to the current index version by applying the delta from `readDelta` to the cached snapshot (whatever version it was read at), so readers …
sym src/lib/core/vault/vault.service.ts:22 fn switchVault(path: string): Promise<boolean> L6 | Opens `path` as the vault once every dirty tab is saved and every write behind a registered write barrier has settled.
sym src/lib/core/vault/vault.service.ts:30 fn openVaultDialog(): Promise<boolean> L5 | Opens a native directory picker and, if the user selects a folder, opens it as a vault
sym src/lib/core/vault/vault.service.ts:40 fn openRecentVault(path: string): Promise<boolean> L14 | Opens a vault by its path (used when clicking a recent vault entry).
sym src/lib/core/vault/vault.store.svelte.ts:60 store vaultStore L100 | Reactive store for the current vault and the recent vaults list
sym src/lib/core/vault/write-barrier.service.ts:23 fn registerWriteBarrier(name: string, drain: () => Promise<void>): () => void L9 | Registers a source of in-flight writes for `drainPendingWrites` to wait on.
## stores
store src/lib/core/vault/vault.store.svelte.ts:60 vaultStore esc:1
## effects
fx-count storage.getItem 1
fx-count storage.setItem 1
fx-count tauri-dialog.ask 1
fx-count tauri-dialog.open 1
fx-count tauri-fs.exists 1
ipc-count ipc:get_all_vault_entries_v2 1
## debt
-

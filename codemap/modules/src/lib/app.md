# module card src/lib/app
cols: module <path> <layer> files <n> in-modules <n> out-modules <n> pub <public>/<exports> ipc <called>/<served> card ~<k>k · dep <from> -> <to> <file pairs> · in2/out2 <module> <n> modules: <module>(<via>) · entry <file> ext-in<n> <importers> · file … · sym … · grep: grep -rF -- '-> src/lib/app ' codemap/modules
sections: neighbors, entry files, files, public, effects, debt
module src/lib/app app files 15 in-modules 1 out-modules 46 pub 12/27 ipc 11/0 card ~2.4k
## neighbors
dep src/routes -> src/lib/app 7
dep src/lib/app -> src/lib/components 5
dep src/lib/app -> src/lib/contracts 7
dep src/lib/app -> src/lib/core/editor 18
dep src/lib/app -> src/lib/core/filesystem 22
dep src/lib/app -> src/lib/core/frontmatter 2
dep src/lib/app -> src/lib/core/layout 4
dep src/lib/app -> src/lib/core/markdown-editor 10
dep src/lib/app -> src/lib/core/note-creator 4
dep src/lib/app -> src/lib/core/settings 32
dep src/lib/app -> src/lib/core/status-bar 2
dep src/lib/app -> src/lib/core/trash 1
dep src/lib/app -> src/lib/core/vault 13
dep src/lib/app -> src/lib/core/zoom 1
dep src/lib/app -> src/lib/features/auto-organize 2
dep src/lib/app -> src/lib/features/backlinks 4
dep src/lib/app -> src/lib/features/canvas 2
dep src/lib/app -> src/lib/features/collection 8
dep src/lib/app -> src/lib/features/command-palette 4
dep src/lib/app -> src/lib/features/copy-block-link 2
dep src/lib/app -> src/lib/features/deep-link 4
dep src/lib/app -> src/lib/features/dock-badge 2
dep src/lib/app -> src/lib/features/event-calendar 8
dep src/lib/app -> src/lib/features/file-history 4
dep src/lib/app -> src/lib/features/file-icons 6
dep src/lib/app -> src/lib/features/note-action-bar 1
dep src/lib/app -> src/lib/features/outgoing-links 2
dep src/lib/app -> src/lib/features/properties 8
dep src/lib/app -> src/lib/features/quick-switcher 5
dep src/lib/app -> src/lib/features/rail-shell 19
dep src/lib/app -> src/lib/features/search 10
dep src/lib/app -> src/lib/features/tags 3
dep src/lib/app -> src/lib/features/tasks 5
dep src/lib/app -> src/lib/features/todoist-sync 8
dep src/lib/app -> src/lib/features/type-definitions 14
dep src/lib/app -> src/lib/plugins/calendar 2
dep src/lib/app -> src/lib/plugins/graph-view 4
dep src/lib/app -> src/lib/plugins/kanban 4
dep src/lib/app -> src/lib/plugins/mods 9
dep src/lib/app -> src/lib/plugins/one-on-one 5
dep src/lib/app -> src/lib/plugins/periodic-notes 7
dep src/lib/app -> src/lib/plugins/queryjs 4
dep src/lib/app -> src/lib/plugins/quick-capture 3
dep src/lib/app -> src/lib/plugins/table-of-contents 2
dep src/lib/app -> src/lib/plugins/templates 3
dep src/lib/app -> src/lib/plugins/word-count 1
dep src/lib/app -> src/lib/utils 17
in2 src/lib/app 0 modules: -
out2 src/lib/app 3 modules: src/lib/types(15) src/lib/core/rule-actions(2) src/lib/features/note-list(2)
## entry files
entry src/lib/app/AppOverlays.svelte ext-in1 src/routes/(app)/+layout.svelte
entry src/lib/app/AppShell.svelte ext-in1 src/routes/(app)/+layout.svelte
entry src/lib/app/boot.ts ext-in1 src/routes/(app)/+layout.svelte
entry src/lib/app/global-keybindings.ts ext-in1 src/routes/(app)/+layout.svelte
entry src/lib/app/lifecycle/app-lifecycle.service.ts ext-in1 src/routes/(app)/+layout.svelte
entry src/lib/app/lifecycle/index-updater.service.ts ext-in1 src/routes/(app)/+layout.svelte
entry src/lib/app/tauri-listeners.service.ts ext-in1 src/routes/(app)/+layout.svelte
## files
file src/lib/app/AppOverlays.svelte component L25 module src/lib/app in1 t1
file src/lib/app/AppShell.svelte component L314 module src/lib/app in1 t2
file src/lib/app/EditorView.svelte component L159 module src/lib/app in1 t3
file src/lib/app/LabsSection.svelte component L52 module src/lib/app in1 t1
file src/lib/app/SettingsPanel.svelte component L162 module src/lib/app in1 t1
file src/lib/app/boot.ts other L97 module src/lib/app in1 t15
file src/lib/app/commands.ts other L425 module src/lib/app in1 t5
file src/lib/app/deep-link-actions.ts other L240 module src/lib/app in1 t2
file src/lib/app/editor-host.ts other L216 module src/lib/app in1 t8
file src/lib/app/global-keybindings.ts other L229 module src/lib/app in2 t1
file src/lib/app/lifecycle/app-lifecycle.service.ts service L686 module src/lib/app in1 t3
file src/lib/app/lifecycle/index-updater.service.ts service L44 module src/lib/app in1 t1
file src/lib/app/lifecycle/watcher-handler.service.ts service L126 module src/lib/app in1 t3
file src/lib/app/rail-navigation.ts other L38 module src/lib/app in3 t1
file src/lib/app/tauri-listeners.service.ts service L346 module src/lib/app in1 t2
## public
sym src/lib/app/AppOverlays.svelte:1 component AppOverlays L25
sym src/lib/app/AppShell.svelte:1 component AppShell props:children L314
sym src/lib/app/boot.ts:34 fn registerAppPorts(): void L50 | Wires the features and plugins that core reaches through ports for the whole app lifetime.
sym src/lib/app/global-keybindings.ts:222 fn registerGlobalKeybindings(): () => void L8 | Registers all app-wide keyboard shortcuts.
sym src/lib/app/lifecycle/app-lifecycle.service.ts:137 fn initializeVault(vaultPath: string): Promise<void> L423 | Initializes all app systems when a vault is opened.
sym src/lib/app/lifecycle/app-lifecycle.service.ts:565 fn teardownVault(): void L122 | Tears down all app systems when a vault is closed.
sym src/lib/app/lifecycle/index-updater.service.ts:24 fn updateIndexesForFile(filePath: string, content: string): Promise<void> L21 | Updates per-file indexes for a single file's content change.
sym src/lib/app/tauri-listeners.service.ts:25 fn registerMenuSettingsListener(): () => void L16 | Registers a listener for the native macOS menu "Settings" event.
sym src/lib/app/tauri-listeners.service.ts:48 fn registerCloseHandler(): () => void L18 | Registers a handler that runs `prepareForExit` before the window closes, preventing data loss on close.
sym src/lib/app/tauri-listeners.service.ts:77 fn registerExitRequestListener(): () => void L27 | Registers a listener for the Rust `app:exit-requested` event, which Quit (Cmd+Q, the app menu) raises after holding the exit back.
sym src/lib/app/tauri-listeners.service.ts:185 fn registerVaultIndexUpdatedListener(): () => void L134 | Registers a listener for the Rust `vault-index-updated` event.
sym src/lib/app/tauri-listeners.service.ts:327 fn registerFocusListener(): () => void L20 | Registers a listener for window focus changes.
## effects
fx-count dom.keydown 2
fx-count svelte.$effect 3
fx-count tauri-api-core.convertFileSrc 1
fx-count tauri-api-window.getCurrentWindow 3
fx-count tauri-fs.exists 3
fx-count tauri-fs.mkdir 1
fx-count tauri-fs.readTextFile 3
fx-count tauri-fs.writeTextFile 2
fx-count tauri-opener.openUrl 1
fx-count timer-wrap.debounce 1
fx-count timer.requestAnimationFrame 2
fx-count timer.setTimeout 4
ipc-count ipc:cleanup_history 1
ipc-count ipc:close_vault_db 1
ipc-count ipc:confirm_exit 1
ipc-count ipc:get_all_tags_v2 1
ipc-count ipc:get_all_vault_entries_v2 1
ipc-count ipc:get_index_delta 1
ipc-count ipc:import_staged_shot 1
ipc-count ipc:open_vault_db 1
ipc-count ipc:read_files_batch 1
ipc-count ipc:save_vault_cache 1
ipc-count ipc:shutdown_semantic 1
## debt
-

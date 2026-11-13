# file card src/lib/features/deep-link/deep-link.service.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/deep-link/deep-link.service.ts ' codemap/files
sections: imports, imported-by, reach, tests, symbols, locals, calls, effects
file src/lib/features/deep-link/deep-link.service.ts service L370 module src/lib/features/deep-link in4 t8
## imports
imp src/lib/features/deep-link/deep-link.service.ts:1 -> pkg:@tauri-apps/plugin-deep-link onOpenUrl,getCurrent
imp src/lib/features/deep-link/deep-link.service.ts:2 -> pkg:@tauri-apps/plugin-clipboard-manager readText
imp src/lib/features/deep-link/deep-link.service.ts:3 -> pkg:@tauri-apps/plugin-fs exists,readTextFile,writeTextFile,mkdir
imp src/lib/features/deep-link/deep-link.service.ts:5 -> src/lib/core/vault/vault.store.svelte.ts vaultStore
imp src/lib/features/deep-link/deep-link.service.ts:6 -> src/lib/core/vault/vault.service.ts switchVault
imp src/lib/features/deep-link/deep-link.service.ts:7 -> src/lib/features/search/open-search.service.ts openSearch
imp src/lib/features/deep-link/deep-link.service.ts:8 -> src/lib/core/editor/editor.service.ts openFileInEditor,saveFileByPath,syncExternalContentToEditor
imp src/lib/features/deep-link/deep-link.service.ts:9 -> src/lib/core/note-creator/note-creator.service.ts openOrCreateNote
imp src/lib/features/deep-link/deep-link.service.ts:10 -> src/lib/core/note-creator/explicit-organization.logic.ts applyExplicitOrganization,withUnorganizedFlag
imp src/lib/features/deep-link/deep-link.service.ts:11 -> src/lib/core/settings/settings.store.svelte.ts settingsStore
imp src/lib/features/deep-link/deep-link.service.ts:12 -> src/lib/core/filesystem/fs.service.ts addToTree
imp src/lib/features/deep-link/deep-link.service.ts:13 -> src/lib/core/filesystem/fs.logic.ts isMarkdownFile
imp src/lib/features/deep-link/deep-link.service.ts:14 -> src/lib/core/editor/editor.hooks.ts markRecentSave,notifyAfterSave
imp src/lib/features/deep-link/deep-link.service.ts:15 -> src/lib/features/deep-link/deep-link.store.svelte.ts deepLinkStore
imp src/lib/features/deep-link/deep-link.service.ts:16 -> src/lib/features/deep-link/deep-link.logic.ts parseDeepLinkUri,resolveFilePath
imp src/lib/features/deep-link/deep-link.service.ts:17 -> src/lib/features/deep-link/deep-link.types.ts type:DeepLinkAction,type:NewAction
imp src/lib/features/deep-link/deep-link.service.ts:18 -> src/lib/utils/debug.ts debug,error
## imported-by
imp src/lib/app/deep-link-actions.ts:17 -> src/lib/features/deep-link/deep-link.service.ts registerDeepLinkAction,resolveContent,saveOpenNoteBeforeWrite
imp src/lib/app/lifecycle/app-lifecycle.service.ts:76 -> src/lib/features/deep-link/deep-link.service.ts executePendingAction,resetDeepLink
imp src/lib/plugins/quick-capture/quick-capture.service.ts:5 -> src/lib/features/deep-link/deep-link.service.ts executeAction
imp src/routes/(app)/+layout.svelte:12 -> src/lib/features/deep-link/deep-link.service.ts registerDeepLinkListener
## reach
in2 src/lib/features/deep-link/deep-link.service.ts 1 files in 1 modules: src/lib/app(1)
out2 src/lib/features/deep-link/deep-link.service.ts 27 files in 11 modules: src/lib/utils(5) src/lib/core/filesystem(4) src/lib/core/settings(4) src/lib/core/editor(3) src/lib/core/vault(3) +6 modules
## tests
test src/tests/lib/features/deep-link/deep-link.service.race-audit.test.ts imports src/lib/features/deep-link/deep-link.service.ts mirror
test src/tests/lib/features/deep-link/deep-link.service.test.ts imports src/lib/features/deep-link/deep-link.service.ts mirror
test src/tests/lib/app/deep-link-capture-frontmatter.test.ts imports src/lib/features/deep-link/deep-link.service.ts
test src/tests/lib/app/lifecycle/app-lifecycle.service.test.ts imports src/lib/features/deep-link/deep-link.service.ts
test src/tests/lib/core/vault/vault.service.switch-save.test.ts imports src/lib/features/deep-link/deep-link.service.ts
test src/tests/lib/features/deep-link/deep-link-dirty-buffer.test.ts imports src/lib/features/deep-link/deep-link.service.ts
test src/tests/lib/features/deep-link/deep-link-silent-new-overwrites.test.ts imports src/lib/features/deep-link/deep-link.service.ts
test src/tests/lib/plugins/quick-capture/quick-capture.service.test.ts mocks src/lib/features/deep-link/deep-link.service.ts
## symbols
sym src/lib/features/deep-link/deep-link.service.ts:39 type RegisteredDeepLinkActionType L1 | The action types whose handler lives outside deep-link and is registered.
sym src/lib/features/deep-link/deep-link.service.ts:42 type DeepLinkActionHandler L4 | Carries out one registered action against the open vault.
sym src/lib/features/deep-link/deep-link.service.ts:56 fn registerDeepLinkAction<T extends RegisteredDeepLinkActionType>(type: T, handler: DeepLinkActionHandler<T>): () => void L11 | Registers the handler of a deep-link action that needs code outside this feature (`daily`, `capture`); `src/lib/app/` wires them in.
by src/lib/features/deep-link/deep-link.service.ts:registerDeepLinkAction <- src/lib/app/deep-link-actions.ts:234 in registerDeepLinkActions call +1
sym src/lib/features/deep-link/deep-link.service.ts:85 fn registerDeepLinkListener(): () => void L31 | Registers a listener for deep-link URL events from the Tauri deep-link plugin.
by src/lib/features/deep-link/deep-link.service.ts:registerDeepLinkListener <- src/routes/(app)/+layout.svelte:59 in $effect@58 call
sym src/lib/features/deep-link/deep-link.service.ts:121 fn handleDeepLinkUrl(url: string): Promise<void> L12 | Handles a single deep-link URL string.
sym src/lib/features/deep-link/deep-link.service.ts:140 fn resolveVaultPath(vaultName: string): string | null L7 | Resolves a vault name to a path from the recent vaults list.
sym src/lib/features/deep-link/deep-link.service.ts:153 fn resolveAndDispatch(action: DeepLinkAction): Promise<void> L22 | Resolves the vault from a deep-link action and dispatches it.
sym src/lib/features/deep-link/deep-link.service.ts:182 fn executeAction(action: DeepLinkAction, vaultPath: string): Promise<boolean> L35 | Executes a deep-link action against the currently open vault.
by src/lib/features/deep-link/deep-link.service.ts:executeAction <- src/lib/plugins/quick-capture/quick-capture.service.ts:117 in dispatchCapture call
sym src/lib/features/deep-link/deep-link.service.ts:223 fn resolveContent(action: { content?: string; clipboard?: boolean }): Promise<string> L11 | Resolves the actual content for a deep-link action.
by src/lib/features/deep-link/deep-link.service.ts:resolveContent <- src/lib/app/deep-link-actions.ts:53 in executeDailyAction call
sym src/lib/features/deep-link/deep-link.service.ts:242 fn saveOpenNoteBeforeWrite(path: string): Promise<boolean> L5 | Saves the open tab of `path` when it has unsaved typing, before a deep link writes the note from its disk copy and marks the tab saved (which would otherwise d…
by src/lib/features/deep-link/deep-link.service.ts:saveOpenNoteBeforeWrite <- src/lib/app/deep-link-actions.ts:67 in executeDailyAction call
sym src/lib/features/deep-link/deep-link.service.ts:353 fn executePendingAction(): Promise<void> L13 | Executes a pending deep-link action after vault initialization completes.
by src/lib/features/deep-link/deep-link.service.ts:executePendingAction <- src/lib/app/lifecycle/app-lifecycle.service.ts:528 in initializeVault call
sym src/lib/features/deep-link/deep-link.service.ts:368 fn resetDeepLink(): void L3 | Resets all deep-link state.
by src/lib/features/deep-link/deep-link.service.ts:resetDeepLink <- src/lib/app/lifecycle/app-lifecycle.service.ts:679 in teardownVault call
## locals
local src/lib/features/deep-link/deep-link.service.ts:28 fn enqueueDeepLinkUrl(url: string): Promise<void> L9
local src/lib/features/deep-link/deep-link.service.ts:69 fn runRegisteredAction(action: Extract<DeepLinkAction, { type: RegisteredDeepLinkActionType }>, vaultPath: string): Promise<void> L8
local src/lib/features/deep-link/deep-link.service.ts:252 fn executeNewAction(action: NewAction, vaultPath: string): Promise<void> L96
## calls
call src/lib/features/deep-link/deep-link.service.ts:30 in enqueueDeepLinkUrl -> src/lib/features/deep-link/deep-link.service.ts:handleDeepLinkUrl call
call src/lib/features/deep-link/deep-link.service.ts:33 in enqueueDeepLinkUrl -> src/lib/utils/debug.ts:error call
call src/lib/features/deep-link/deep-link.service.ts:92 in registerDeepLinkListener -> src/lib/features/deep-link/deep-link.service.ts:enqueueDeepLinkUrl call +1
call src/lib/features/deep-link/deep-link.service.ts:98 in registerDeepLinkListener -> src/lib/utils/debug.ts:error call +1
call src/lib/features/deep-link/deep-link.service.ts:122 in handleDeepLinkUrl -> src/lib/utils/debug.ts:debug call
call src/lib/features/deep-link/deep-link.service.ts:124 in handleDeepLinkUrl -> src/lib/features/deep-link/deep-link.logic.ts:parseDeepLinkUri call
call src/lib/features/deep-link/deep-link.service.ts:126 in handleDeepLinkUrl -> src/lib/utils/debug.ts:error call
call src/lib/features/deep-link/deep-link.service.ts:131 in handleDeepLinkUrl -> src/lib/features/deep-link/deep-link.service.ts:resolveAndDispatch call
call src/lib/features/deep-link/deep-link.service.ts:154 in resolveAndDispatch -> src/lib/features/deep-link/deep-link.service.ts:resolveVaultPath call
call src/lib/features/deep-link/deep-link.service.ts:156 in resolveAndDispatch -> src/lib/utils/debug.ts:error call
call src/lib/features/deep-link/deep-link.service.ts:163 in resolveAndDispatch -> src/lib/utils/debug.ts:debug call +1
call src/lib/features/deep-link/deep-link.service.ts:164 in resolveAndDispatch -> src/lib/features/deep-link/deep-link.service.ts:executeAction call
call src/lib/features/deep-link/deep-link.service.ts:168 in resolveAndDispatch -> src/lib/features/deep-link/deep-link.store.svelte.ts:deepLinkStore.setPendingAction mcall
call src/lib/features/deep-link/deep-link.service.ts:172 in resolveAndDispatch -> src/lib/core/vault/vault.service.ts:switchVault call
call src/lib/features/deep-link/deep-link.service.ts:172 in resolveAndDispatch -> src/lib/features/deep-link/deep-link.store.svelte.ts:deepLinkStore.consumePendingAction mcall
call src/lib/features/deep-link/deep-link.service.ts:188 in executeAction -> src/lib/utils/path.ts:resolveFilePath call
call src/lib/features/deep-link/deep-link.service.ts:189 in executeAction -> src/lib/utils/debug.ts:debug call +1
call src/lib/features/deep-link/deep-link.service.ts:190 in executeAction -> src/lib/core/editor/editor.service.ts:openFileInEditor call
call src/lib/features/deep-link/deep-link.service.ts:197 in executeAction -> src/lib/features/deep-link/deep-link.service.ts:executeNewAction call
call src/lib/features/deep-link/deep-link.service.ts:202 in executeAction -> src/lib/features/search/open-search.service.ts:openSearch call
call src/lib/features/deep-link/deep-link.service.ts:207 in executeAction -> src/lib/features/deep-link/deep-link.service.ts:runRegisteredAction call
call src/lib/features/deep-link/deep-link.service.ts:212 in executeAction -> src/lib/utils/debug.ts:error call
call src/lib/features/deep-link/deep-link.service.ts:229 in resolveContent -> src/lib/utils/debug.ts:error call
call src/lib/features/deep-link/deep-link.service.ts:243 in saveOpenNoteBeforeWrite -> src/lib/core/editor/editor.service.ts:saveFileByPath call
call src/lib/features/deep-link/deep-link.service.ts:254 in executeNewAction -> src/lib/utils/path.ts:resolveFilePath call
call src/lib/features/deep-link/deep-link.service.ts:256 in executeNewAction -> src/lib/features/deep-link/deep-link.service.ts:resolveContent call
call src/lib/features/deep-link/deep-link.service.ts:257 in executeNewAction -> src/lib/utils/debug.ts:debug call
call src/lib/features/deep-link/deep-link.service.ts:263 in executeNewAction -> src/lib/features/deep-link/deep-link.service.ts:saveOpenNoteBeforeWrite call
call src/lib/features/deep-link/deep-link.service.ts:273 in executeNewAction -> src/lib/core/editor/editor.hooks.ts:markRecentSave call +3
call src/lib/features/deep-link/deep-link.service.ts:276 in executeNewAction -> src/lib/core/editor/editor.service.ts:syncExternalContentToEditor call +2
call src/lib/features/deep-link/deep-link.service.ts:277 in executeNewAction -> src/lib/core/editor/editor.hooks.ts:notifyAfterSave call +3
call src/lib/features/deep-link/deep-link.service.ts:279 in executeNewAction -> src/lib/core/editor/editor.service.ts:openFileInEditor call +2
call src/lib/features/deep-link/deep-link.service.ts:315 in executeNewAction -> src/lib/core/filesystem/fs.service.ts:addToTree call +1
call src/lib/features/deep-link/deep-link.service.ts:324 in executeNewAction -> src/lib/core/filesystem/fs.logic.ts:isMarkdownFile call
call src/lib/features/deep-link/deep-link.service.ts:334 in executeNewAction -> src/lib/core/note-creator/explicit-organization.logic.ts:applyExplicitOrganization call
call src/lib/features/deep-link/deep-link.service.ts:340 in executeNewAction -> src/lib/core/note-creator/note-creator.service.ts:openOrCreateNote call
call src/lib/features/deep-link/deep-link.service.ts:344 in executeNewAction -> src/lib/core/note-creator/explicit-organization.logic.ts:withUnorganizedFlag ref
call src/lib/features/deep-link/deep-link.service.ts:354 in executePendingAction -> src/lib/features/deep-link/deep-link.store.svelte.ts:deepLinkStore.consumePendingAction mcall
call src/lib/features/deep-link/deep-link.service.ts:359 in executePendingAction -> src/lib/utils/debug.ts:error call
call src/lib/features/deep-link/deep-link.service.ts:363 in executePendingAction -> src/lib/utils/debug.ts:debug call
call src/lib/features/deep-link/deep-link.service.ts:364 in executePendingAction -> src/lib/features/deep-link/deep-link.service.ts:executeAction call
call src/lib/features/deep-link/deep-link.service.ts:369 in resetDeepLink -> src/lib/features/deep-link/deep-link.store.svelte.ts:deepLinkStore.reset mcall
## effects
fx src/lib/features/deep-link/deep-link.service.ts:90 tauri-deep-link.onOpenUrl in registerDeepLinkListener
fx src/lib/features/deep-link/deep-link.service.ts:102 tauri-deep-link.getCurrent in registerDeepLinkListener
fx src/lib/features/deep-link/deep-link.service.ts:226 tauri-clipboard-manager.readText in resolveContent
fx src/lib/features/deep-link/deep-link.service.ts:269 tauri-fs.exists in executeNewAction
fx src/lib/features/deep-link/deep-link.service.ts:271 tauri-fs.readTextFile in executeNewAction
fx src/lib/features/deep-link/deep-link.service.ts:274 tauri-fs.writeTextFile in executeNewAction
fx src/lib/features/deep-link/deep-link.service.ts:288 tauri-fs.exists in executeNewAction
fx src/lib/features/deep-link/deep-link.service.ts:290 tauri-fs.readTextFile in executeNewAction
fx src/lib/features/deep-link/deep-link.service.ts:293 tauri-fs.writeTextFile in executeNewAction
fx src/lib/features/deep-link/deep-link.service.ts:308 tauri-fs.mkdir in executeNewAction
fx src/lib/features/deep-link/deep-link.service.ts:310 tauri-fs.writeTextFile in executeNewAction
fx src/lib/features/deep-link/deep-link.service.ts:328 tauri-fs.exists in executeNewAction
fx src/lib/features/deep-link/deep-link.service.ts:333 tauri-fs.mkdir in executeNewAction
fx src/lib/features/deep-link/deep-link.service.ts:336 tauri-fs.writeTextFile in executeNewAction

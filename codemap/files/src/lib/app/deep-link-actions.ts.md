# file card src/lib/app/deep-link-actions.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/app/deep-link-actions.ts ' codemap/files
file src/lib/app/deep-link-actions.ts other L240 module src/lib/app in1 t2
## imports
imp src/lib/app/deep-link-actions.ts:1 -> pkg:@tauri-apps/plugin-fs exists,mkdir,readTextFile,writeTextFile
imp src/lib/app/deep-link-actions.ts:3 -> src/lib/core/editor/editor.hooks.ts markRecentSave,notifyAfterSave
imp src/lib/app/deep-link-actions.ts:4 -> src/lib/core/editor/editor.service.ts syncExternalContentToEditor
imp src/lib/app/deep-link-actions.ts:5 -> src/lib/core/filesystem/fs.service.ts addToTree
imp src/lib/app/deep-link-actions.ts:6 -> src/lib/core/frontmatter/frontmatter-write.service.ts FrontmatterWriteError,toastFrontmatterWriteError
imp src/lib/app/deep-link-actions.ts:10 -> src/lib/core/frontmatter/properties.logic.ts detectLossyFrontmatter
imp src/lib/app/deep-link-actions.ts:11 -> src/lib/core/note-creator/explicit-organization.logic.ts applyExplicitOrganization
imp src/lib/app/deep-link-actions.ts:12 -> src/lib/contracts/ipc.ts call
imp src/lib/app/deep-link-actions.ts:13 -> src/lib/core/settings/settings.store.svelte.ts settingsStore
imp src/lib/app/deep-link-actions.ts:14 -> src/lib/utils/debug.ts debug
imp src/lib/app/deep-link-actions.ts:15 -> src/lib/utils/path.ts vaultRelativeKey
imp src/lib/app/deep-link-actions.ts:16 -> src/lib/features/deep-link/deep-link.logic.ts injectTagsIntoContent,injectTitleIntoContent,renderCaptureBody
imp src/lib/app/deep-link-actions.ts:17 -> src/lib/features/deep-link/deep-link.service.ts registerDeepLinkAction,resolveContent,saveOpenNoteBeforeWrite
imp src/lib/app/deep-link-actions.ts:22 -> src/lib/features/deep-link/deep-link.types.ts type:CaptureAction,type:DailyAction
imp src/lib/app/deep-link-actions.ts:23 -> src/lib/plugins/periodic-notes/periodic-notes.logic.ts buildPeriodicNotePath
imp src/lib/app/deep-link-actions.ts:24 -> src/lib/plugins/periodic-notes/periodic-notes.service.ts openOrCreateDailyNote
imp src/lib/app/deep-link-actions.ts:25 -> src/lib/plugins/quick-capture/note-composer.logic.ts buildCapturePath,buildCaptureVariables,getCaptureTitle,processCaptureTemplate
## imported-by
imp src/lib/app/boot.ts:20 -> src/lib/app/deep-link-actions.ts registerDeepLinkActions
## reach
in2 src/lib/app/deep-link-actions.ts 1 files in 1 modules: src/routes(1)
out2 src/lib/app/deep-link-actions.ts 30 files in 13 modules: src/lib/utils(7) src/lib/core/filesystem(5) src/lib/core/settings(4) src/lib/core/editor(3) src/lib/contracts(2) +8 modules
## tests
test src/tests/lib/app/deep-link-capture-frontmatter.test.ts imports src/lib/app/deep-link-actions.ts
test src/tests/lib/features/deep-link/deep-link-dirty-buffer.test.ts imports src/lib/app/deep-link-actions.ts
## symbols
sym src/lib/app/deep-link-actions.ts:232 fn registerDeepLinkActions(): () => void L9 | Registers the `daily` and `capture` handlers with the deep-link dispatcher.
by src/lib/app/deep-link-actions.ts:registerDeepLinkActions <- src/lib/app/boot.ts:54 in registerAppPorts call
## locals
local src/lib/app/deep-link-actions.ts:44 fn executeDailyAction(action: DailyAction, vaultPath: string): Promise<void> L36
local src/lib/app/deep-link-actions.ts:90 fn resolveUniqueCapturePath(filePath: string): Promise<string> L13
local src/lib/app/deep-link-actions.ts:110 fn importStagedShot(source: string, folder: string, vaultPath: string): Promise<string> L6
local src/lib/app/deep-link-actions.ts:137 fn executeCaptureAction(action: CaptureAction, vaultPath: string): Promise<void> L90
## calls
call src/lib/app/deep-link-actions.ts:45 in executeDailyAction -> src/lib/utils/debug.ts:debug call
call src/lib/app/deep-link-actions.ts:50 in executeDailyAction -> src/lib/plugins/periodic-notes/periodic-notes.service.ts:openOrCreateDailyNote call
call src/lib/app/deep-link-actions.ts:53 in executeDailyAction -> src/lib/features/deep-link/deep-link.service.ts:resolveContent call
call src/lib/app/deep-link-actions.ts:57 in executeDailyAction -> src/lib/plugins/periodic-notes/periodic-notes.logic.ts:buildPeriodicNotePath call
call src/lib/app/deep-link-actions.ts:67 in executeDailyAction -> src/lib/features/deep-link/deep-link.service.ts:saveOpenNoteBeforeWrite call
call src/lib/app/deep-link-actions.ts:74 in executeDailyAction -> src/lib/core/editor/editor.hooks.ts:markRecentSave call
call src/lib/app/deep-link-actions.ts:77 in executeDailyAction -> src/lib/core/editor/editor.service.ts:syncExternalContentToEditor call
call src/lib/app/deep-link-actions.ts:78 in executeDailyAction -> src/lib/core/editor/editor.hooks.ts:notifyAfterSave call
call src/lib/app/deep-link-actions.ts:111 in importStagedShot -> src/lib/contracts/ipc.ts:call call
call src/lib/app/deep-link-actions.ts:112 in importStagedShot -> src/lib/utils/path.ts:vaultRelativeKey call
call src/lib/app/deep-link-actions.ts:150 in executeCaptureAction -> src/lib/plugins/quick-capture/note-composer.logic.ts:buildCapturePath call
call src/lib/app/deep-link-actions.ts:158 in executeCaptureAction -> src/lib/utils/debug.ts:debug call +1
call src/lib/app/deep-link-actions.ts:164 in executeCaptureAction -> src/lib/app/deep-link-actions.ts:importStagedShot call
call src/lib/app/deep-link-actions.ts:165 in executeCaptureAction -> src/lib/features/deep-link/deep-link.logic.ts:renderCaptureBody call
call src/lib/app/deep-link-actions.ts:172 in executeCaptureAction -> src/lib/plugins/quick-capture/note-composer.logic.ts:getCaptureTitle call
call src/lib/app/deep-link-actions.ts:173 in executeCaptureAction -> src/lib/plugins/quick-capture/note-composer.logic.ts:buildCaptureVariables call
call src/lib/app/deep-link-actions.ts:193 in executeCaptureAction -> src/lib/plugins/quick-capture/note-composer.logic.ts:processCaptureTemplate call
call src/lib/app/deep-link-actions.ts:205 in executeCaptureAction -> src/lib/core/frontmatter/properties.logic.ts:detectLossyFrontmatter call
call src/lib/app/deep-link-actions.ts:207 in executeCaptureAction -> src/lib/features/deep-link/deep-link.logic.ts:injectTitleIntoContent call
call src/lib/app/deep-link-actions.ts:208 in executeCaptureAction -> src/lib/features/deep-link/deep-link.logic.ts:injectTagsIntoContent call
call src/lib/app/deep-link-actions.ts:210 in executeCaptureAction -> src/lib/core/note-creator/explicit-organization.logic.ts:applyExplicitOrganization call
call src/lib/app/deep-link-actions.ts:213 in executeCaptureAction -> src/lib/app/deep-link-actions.ts:resolveUniqueCapturePath call
call src/lib/app/deep-link-actions.ts:214 in executeCaptureAction -> src/lib/core/editor/editor.hooks.ts:markRecentSave call
call src/lib/app/deep-link-actions.ts:216 in executeCaptureAction -> src/lib/core/editor/editor.hooks.ts:notifyAfterSave call
call src/lib/app/deep-link-actions.ts:220 in executeCaptureAction -> src/lib/core/frontmatter/frontmatter-write.service.ts:FrontmatterWriteError new
call src/lib/app/deep-link-actions.ts:220 in executeCaptureAction -> src/lib/core/frontmatter/frontmatter-write.service.ts:toastFrontmatterWriteError call
call src/lib/app/deep-link-actions.ts:225 in executeCaptureAction -> src/lib/core/filesystem/fs.service.ts:addToTree call
call src/lib/app/deep-link-actions.ts:234 in registerDeepLinkActions -> src/lib/app/deep-link-actions.ts:executeDailyAction ref
call src/lib/app/deep-link-actions.ts:234 in registerDeepLinkActions -> src/lib/features/deep-link/deep-link.service.ts:registerDeepLinkAction call +1
call src/lib/app/deep-link-actions.ts:235 in registerDeepLinkActions -> src/lib/app/deep-link-actions.ts:executeCaptureAction ref
## effects
fx src/lib/app/deep-link-actions.ts:64 tauri-fs.exists in executeDailyAction
fx src/lib/app/deep-link-actions.ts:68 tauri-fs.readTextFile in executeDailyAction
fx src/lib/app/deep-link-actions.ts:75 tauri-fs.writeTextFile in executeDailyAction
fx src/lib/app/deep-link-actions.ts:91 tauri-fs.exists in resolveUniqueCapturePath
fx src/lib/app/deep-link-actions.ts:97 tauri-fs.exists in resolveUniqueCapturePath
ipc-call src/lib/app/deep-link-actions.ts:111 in importStagedShot -> ipc:import_staged_shot -> src-tauri/src/quick_capture/commands.rs:173
fx src/lib/app/deep-link-actions.ts:161 tauri-fs.mkdir in executeCaptureAction
fx src/lib/app/deep-link-actions.ts:171 tauri-fs.readTextFile in executeCaptureAction
fx src/lib/app/deep-link-actions.ts:215 tauri-fs.writeTextFile in executeCaptureAction
reg src/lib/app/deep-link-actions.ts:234 src/lib/features/deep-link/deep-link.service.ts:registerDeepLinkAction in registerDeepLinkActions args='daily', executeDailyAction
reg src/lib/app/deep-link-actions.ts:235 src/lib/features/deep-link/deep-link.service.ts:registerDeepLinkAction in registerDeepLinkActions args='capture', executeCaptureAction

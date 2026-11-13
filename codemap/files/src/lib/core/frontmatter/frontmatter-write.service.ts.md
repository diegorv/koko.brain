# file card src/lib/core/frontmatter/frontmatter-write.service.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/frontmatter/frontmatter-write.service.ts ' codemap/files
file src/lib/core/frontmatter/frontmatter-write.service.ts service L163 module src/lib/core/frontmatter in12 t3
## imports
imp src/lib/core/frontmatter/frontmatter-write.service.ts:1 -> pkg:@tauri-apps/plugin-fs exists,readTextFile,writeTextFile
imp src/lib/core/frontmatter/frontmatter-write.service.ts:3 -> src/lib/core/editor/editor.store.svelte.ts editorStore
imp src/lib/core/frontmatter/frontmatter-write.service.ts:4 -> src/lib/core/editor/editor.service.ts saveFileByPath,syncExternalContentToEditor
imp src/lib/core/frontmatter/frontmatter-write.service.ts:5 -> src/lib/core/editor/editor.hooks.ts notifyAfterSave
imp src/lib/core/frontmatter/frontmatter-write.service.ts:6 -> src/lib/core/vault/vault.store.svelte.ts vaultStore
imp src/lib/core/frontmatter/frontmatter-write.service.ts:7 -> src/lib/utils/path.ts basename
imp src/lib/core/frontmatter/frontmatter-write.service.ts:8 -> src/lib/core/frontmatter/properties.logic.ts detectLossyFrontmatter,extractBody,LOSSY_FRONTMATTER_MESSAGES,parseFrontmatterProperties,rebuildContent,type:LossyFrontmatterReason
imp src/lib/core/frontmatter/frontmatter-write.service.ts:16 -> src/lib/core/frontmatter/properties.types.ts type:Property
## imported-by
imp src/lib/app/deep-link-actions.ts:6 -> src/lib/core/frontmatter/frontmatter-write.service.ts FrontmatterWriteError,toastFrontmatterWriteError
imp src/lib/features/auto-organize/auto-organize.service.ts:11 -> src/lib/core/frontmatter/frontmatter-write.service.ts updateNoteFrontmatter
imp src/lib/features/event-calendar/event-calendar.service.ts:29 -> src/lib/core/frontmatter/frontmatter-write.service.ts FrontmatterWriteError,updateNoteFrontmatter,type:FrontmatterWriteReason
imp src/lib/features/file-icons/frontmatter-icon.service.ts:3 -> src/lib/core/frontmatter/frontmatter-write.service.ts FrontmatterWriteError,toastFrontmatterWriteError,updateNoteFrontmatter
imp src/lib/features/properties/bookmark-migration.service.ts:7 -> src/lib/core/frontmatter/frontmatter-write.service.ts FrontmatterWriteError,updateNoteFrontmatter
imp src/lib/features/properties/lifecycle.service.ts:4 -> src/lib/core/frontmatter/frontmatter-write.service.ts FrontmatterWriteError,toastFrontmatterWriteError,updateNoteFrontmatter
imp src/lib/features/properties/properties.service.ts:3 -> src/lib/core/frontmatter/frontmatter-write.service.ts FrontmatterWriteError,toastFrontmatterWriteError
imp src/lib/features/rail-shell/RailNoteList.svelte:23 -> src/lib/core/frontmatter/frontmatter-write.service.ts FrontmatterWriteError,toastFrontmatterWriteError
imp src/lib/features/rail-shell/list-prefs.service.ts:1 -> src/lib/core/frontmatter/frontmatter-write.service.ts updateNoteFrontmatter
imp src/lib/features/todoist-sync/sync-now.service.ts:16 -> src/lib/core/frontmatter/frontmatter-write.service.ts FrontmatterWriteError,updateNoteFrontmatter
imp src/lib/plugins/mods/mod-app.service.ts:4 -> src/lib/core/frontmatter/frontmatter-write.service.ts updateNoteFrontmatter
imp src/lib/plugins/mods/mod-vault.service.ts:11 -> src/lib/core/frontmatter/frontmatter-write.service.ts updateNoteFrontmatter
## reach
in2 src/lib/core/frontmatter/frontmatter-write.service.ts 22 files in 11 modules: src/lib/features/event-calendar(7) src/lib/app(5) src/lib/plugins/mods(2) src/lib/features/auto-organize(1) src/lib/features/file-icons(1) +6 modules: q impact src/lib/core/frontmatter/frontmatter-write.service.ts --depth 2
out2 src/lib/core/frontmatter/frontmatter-write.service.ts 11 files in 5 modules: src/lib/utils(5) src/lib/core/editor(2) src/lib/core/filesystem(2) src/lib/core/markdown-editor(1) src/lib/core/vault(1)
## tests
test src/tests/lib/core/frontmatter/frontmatter-write.service.test.ts imports src/lib/core/frontmatter/frontmatter-write.service.ts mirror
test src/tests/lib/features/event-calendar/event-calendar.service.test.ts imports src/lib/core/frontmatter/frontmatter-write.service.ts
test src/tests/lib/plugins/mods/mods-host.service.test.ts imports src/lib/core/frontmatter/frontmatter-write.service.ts
## symbols
sym src/lib/core/frontmatter/frontmatter-write.service.ts:30 type FrontmatterWriteReason L1 | Why `updateNoteFrontmatter` refused or failed: - a `LossyFrontmatterReason`: the rewrite would lose data; nothing was written. - `save-failed`: saving the open…
by src/lib/core/frontmatter/frontmatter-write.service.ts:FrontmatterWriteReason <- src/lib/features/event-calendar/event-calendar.service.ts:29 in (module) import
sym src/lib/core/frontmatter/frontmatter-write.service.ts:33 class FrontmatterWriteError extends Error L13 | Typed failure of `updateNoteFrontmatter`, so callers can roll back by reason.
by src/lib/core/frontmatter/frontmatter-write.service.ts:FrontmatterWriteError <- src/lib/app/deep-link-actions.ts:220 in executeCaptureAction new
by src/lib/core/frontmatter/frontmatter-write.service.ts:FrontmatterWriteError <- src/lib/features/event-calendar/event-calendar.service.ts:538 in requireEvent new +7
by src/lib/core/frontmatter/frontmatter-write.service.ts:FrontmatterWriteError <- src/lib/features/file-icons/frontmatter-icon.service.ts:46 in writeIconFrontmatter ref
by src/lib/core/frontmatter/frontmatter-write.service.ts:FrontmatterWriteError <- src/lib/features/properties/bookmark-migration.service.ts:82 in migrateBookmarksToFavorites ref +1
by src/lib/core/frontmatter/frontmatter-write.service.ts:FrontmatterWriteError <- src/lib/features/properties/lifecycle.service.ts:38 in updateActiveNote ref +2
by src/lib/core/frontmatter/frontmatter-write.service.ts:FrontmatterWriteError <- src/lib/features/properties/properties.service.ts:92 in commitChanges new
by src/lib/core/frontmatter/frontmatter-write.service.ts:FrontmatterWriteError <- src/lib/features/rail-shell/RailNoteList.svelte:448 in writeThroughOverlay ref
by src/lib/core/frontmatter/frontmatter-write.service.ts:FrontmatterWriteError <- src/lib/features/todoist-sync/sync-now.service.ts:898 in writeProjectId new
sym src/lib/core/frontmatter/frontmatter-write.service.ts:64 fn toastFrontmatterWriteError(err: FrontmatterWriteError, options: { id?: string; suffix?: string } = {}): void L9 | Reports a failed `updateNoteFrontmatter` call in an error toast prefixed with the note's file name, since the target can differ from what the user clicked (a f…
by src/lib/core/frontmatter/frontmatter-write.service.ts:toastFrontmatterWriteError <- src/lib/app/deep-link-actions.ts:220 in executeCaptureAction call
by src/lib/core/frontmatter/frontmatter-write.service.ts:toastFrontmatterWriteError <- src/lib/features/file-icons/frontmatter-icon.service.ts:47 in writeIconFrontmatter call
by src/lib/core/frontmatter/frontmatter-write.service.ts:toastFrontmatterWriteError <- src/lib/features/properties/lifecycle.service.ts:39 in updateActiveNote call +2
by src/lib/core/frontmatter/frontmatter-write.service.ts:toastFrontmatterWriteError <- src/lib/features/properties/properties.service.ts:92 in commitChanges call
by src/lib/core/frontmatter/frontmatter-write.service.ts:toastFrontmatterWriteError <- src/lib/features/rail-shell/RailNoteList.svelte:448 in writeThroughOverlay call
sym src/lib/core/frontmatter/frontmatter-write.service.ts:99 fn updateNoteFrontmatter(path: string, mutate: (props: Property[]) => Property[]): Promise<string> L7 | Rewrites one note's frontmatter by path without losing data, and returns the written content (the unchanged base when `mutate` changes nothing).
by src/lib/core/frontmatter/frontmatter-write.service.ts:updateNoteFrontmatter <- src/lib/features/auto-organize/auto-organize.service.ts:721 in writeRuleProperties call
by src/lib/core/frontmatter/frontmatter-write.service.ts:updateNoteFrontmatter <- src/lib/features/event-calendar/event-calendar.service.ts:759 in renameAndWrite call
by src/lib/core/frontmatter/frontmatter-write.service.ts:updateNoteFrontmatter <- src/lib/features/file-icons/frontmatter-icon.service.ts:43 in writeIconFrontmatter call
by src/lib/core/frontmatter/frontmatter-write.service.ts:updateNoteFrontmatter <- src/lib/features/properties/bookmark-migration.service.ts:80 in migrateBookmarksToFavorites call
by src/lib/core/frontmatter/frontmatter-write.service.ts:updateNoteFrontmatter <- src/lib/features/properties/lifecycle.service.ts:36 in updateActiveNote call +2
by src/lib/core/frontmatter/frontmatter-write.service.ts:updateNoteFrontmatter <- src/lib/features/rail-shell/list-prefs.service.ts:44 in saveDefinitionProperty call
by src/lib/core/frontmatter/frontmatter-write.service.ts:updateNoteFrontmatter <- src/lib/features/todoist-sync/sync-now.service.ts:903 in writeProjectId call
by src/lib/core/frontmatter/frontmatter-write.service.ts:updateNoteFrontmatter <- src/lib/plugins/mods/mod-app.service.ts:53 in MOD_APP ref
more by 1 not shown: src/lib/plugins/mods(1): q importers src/lib/core/frontmatter/frontmatter-write.service.ts:updateNoteFrontmatter
## locals
local src/lib/core/frontmatter/frontmatter-write.service.ts:75 fn assertVault(vault: string | null, path: string): void L3
local src/lib/core/frontmatter/frontmatter-write.service.ts:80 fn findTab(path: string) L3
local src/lib/core/frontmatter/frontmatter-write.service.ts:111 fn attempt(path: string, mutate: (props: Property[]) => Property[], vault: string | null): Promise<string> L53
## calls
call src/lib/core/frontmatter/frontmatter-write.service.ts:69 in toastFrontmatterWriteError -> src/lib/utils/path.ts:basename call
call src/lib/core/frontmatter/frontmatter-write.service.ts:76 in assertVault -> src/lib/core/frontmatter/frontmatter-write.service.ts:FrontmatterWriteError new
call src/lib/core/frontmatter/frontmatter-write.service.ts:104 in updateNoteFrontmatter -> src/lib/core/frontmatter/frontmatter-write.service.ts:attempt call
call src/lib/core/frontmatter/frontmatter-write.service.ts:116 in attempt -> src/lib/core/frontmatter/frontmatter-write.service.ts:findTab call +2
call src/lib/core/frontmatter/frontmatter-write.service.ts:122 in attempt -> src/lib/core/frontmatter/frontmatter-write.service.ts:assertVault call +3
call src/lib/core/frontmatter/frontmatter-write.service.ts:125 in attempt -> src/lib/core/frontmatter/properties.logic.ts:detectLossyFrontmatter call
call src/lib/core/frontmatter/frontmatter-write.service.ts:126 in attempt -> src/lib/core/frontmatter/frontmatter-write.service.ts:FrontmatterWriteError new +3
call src/lib/core/frontmatter/frontmatter-write.service.ts:128 in attempt -> src/lib/core/frontmatter/properties.logic.ts:extractBody call
call src/lib/core/frontmatter/frontmatter-write.service.ts:128 in attempt -> src/lib/core/frontmatter/properties.logic.ts:parseFrontmatterProperties call
call src/lib/core/frontmatter/frontmatter-write.service.ts:128 in attempt -> src/lib/core/frontmatter/properties.logic.ts:rebuildContent call
call src/lib/core/frontmatter/frontmatter-write.service.ts:132 in attempt -> src/lib/core/editor/editor.service.ts:syncExternalContentToEditor call +2
call src/lib/core/frontmatter/frontmatter-write.service.ts:133 in attempt -> src/lib/core/editor/editor.service.ts:saveFileByPath call
call src/lib/core/frontmatter/frontmatter-write.service.ts:148 in attempt -> src/lib/core/frontmatter/frontmatter-write.service.ts:attempt call
call src/lib/core/frontmatter/frontmatter-write.service.ts:161 in attempt -> src/lib/core/editor/editor.hooks.ts:notifyAfterSave call
## effects
fx src/lib/core/frontmatter/frontmatter-write.service.ts:121 tauri-fs.readTextFile in attempt
fx src/lib/core/frontmatter/frontmatter-write.service.ts:143 tauri-fs.exists in attempt
fx src/lib/core/frontmatter/frontmatter-write.service.ts:153 tauri-fs.writeTextFile in attempt
fx src/lib/core/frontmatter/frontmatter-write.service.ts:155 tauri-fs.exists in attempt

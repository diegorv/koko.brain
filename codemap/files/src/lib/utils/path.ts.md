# file card src/lib/utils/path.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/utils/path.ts ' codemap/files
file src/lib/utils/path.ts other L123 module src/lib/utils in27 t1
## imported-by
imp src/lib/app/deep-link-actions.ts:15 -> src/lib/utils/path.ts vaultRelativeKey
imp src/lib/app/editor-host.ts:27 -> src/lib/utils/path.ts resolveFilePath
imp src/lib/core/editor/editor.logic.ts:1 -> src/lib/utils/path.ts basename
imp src/lib/core/filesystem/delete-note.service.ts:5 -> src/lib/utils/path.ts basename
imp src/lib/core/filesystem/fs.logic.ts:4 -> src/lib/utils/path.ts basename,relativePath
imp src/lib/core/filesystem/link-updater.logic.ts:1 -> src/lib/utils/path.ts stem,vaultRelativeKey
imp src/lib/core/filesystem/note-change.service.ts:3 -> src/lib/utils/path.ts vaultRelativeKey
imp src/lib/core/filesystem/path-change.service.ts:13 -> src/lib/utils/path.ts vaultRelativeKey
imp src/lib/core/frontmatter/frontmatter-write.service.ts:7 -> src/lib/utils/path.ts basename
imp src/lib/core/vault/vault.logic.ts:1 -> src/lib/utils/path.ts basename
imp src/lib/features/auto-organize/auto-organize.service.ts:48 -> src/lib/utils/path.ts vaultRelativeKey
imp src/lib/features/deep-link/deep-link.logic.ts:7 -> src/lib/utils/path.ts vaultRelativeKey
imp src/lib/features/deep-link/deep-link.logic.ts:318 -> src/lib/utils/path.ts resolveFilePath
imp src/lib/features/note-action-bar/note-action-bar.logic.ts:1 -> src/lib/utils/path.ts basename
imp src/lib/features/note-action-bar/note-action-bar.service.ts:12 -> src/lib/utils/path.ts basename,stem
imp src/lib/features/properties/RelationshipSearch.svelte:9 -> src/lib/utils/path.ts relativePath
imp src/lib/features/properties/bookmark-migration.service.ts:6 -> src/lib/utils/path.ts basename,normalizePath
imp src/lib/features/quick-switcher/QuickSwitcher.svelte:12 -> src/lib/utils/path.ts relativePath
imp src/lib/features/search/SearchResult.svelte:7 -> src/lib/utils/path.ts relativePath
imp src/lib/features/search/search.logic.ts:4 -> src/lib/utils/path.ts relativePath,stem
imp src/lib/features/search/search.service.ts:10 -> src/lib/utils/path.ts vaultRelativeKey
imp src/lib/features/tasks/task-query.logic.ts:3 -> src/lib/utils/path.ts vaultRelativeKey
imp src/lib/features/tasks/tasks.logic.ts:2 -> src/lib/utils/path.ts vaultRelativeKey
imp src/lib/features/tasks/tasks.service.ts:19 -> src/lib/utils/path.ts vaultRelativeKey
imp src/lib/plugins/mods/mod-query.service.ts:5 -> src/lib/utils/path.ts relativePath
imp src/lib/plugins/mods/mod-vault.service.ts:13 -> src/lib/utils/path.ts relativePath
imp src/lib/plugins/mods/mods-host.service.ts:18 -> src/lib/utils/path.ts vaultRelativeKey
imp src/lib/plugins/one-on-one/one-on-one.service.ts:18 -> src/lib/utils/path.ts stem
## reach
in2 src/lib/utils/path.ts 81 files in 29 modules: src/lib/features/rail-shell(10) src/lib/app(9) src/lib/features/tasks(5) src/lib/features/type-definitions(5) src/lib/core/editor(4) +24 modules: q impact src/lib/utils/path.ts --depth 2
out2 src/lib/utils/path.ts 0 files in 0 modules: -
## tests
test src/tests/lib/utils/path.test.ts imports src/lib/utils/path.ts mirror
## symbols
sym src/lib/utils/path.ts:5 fn normalizePath(path: string): string L14 | Normalizes a path by resolving `.` and `..` segments.
by src/lib/utils/path.ts:normalizePath <- src/lib/features/properties/bookmark-migration.service.ts:67 in migrateBookmarksToFavorites call
sym src/lib/utils/path.ts:33 fn resolveFilePath(vaultPath: string, file: string): string L21 | Resolves a relative file path against a vault root, normalizing path segments and ensuring the result stays within the vault.
by src/lib/utils/path.ts:resolveFilePath <- src/lib/app/editor-host.ts:162 in appEditorHost.createNote call +1
by src/lib/utils/path.ts:resolveFilePath <- src/lib/features/deep-link/deep-link.service.ts:188 in executeAction call +1
sym src/lib/utils/path.ts:64 fn basename(path: string): string L3 | Extracts the last segment of a path, extension included.
by src/lib/utils/path.ts:basename <- src/lib/core/editor/editor.logic.ts:36 in getFileName call
by src/lib/utils/path.ts:basename <- src/lib/core/filesystem/delete-note.service.ts:13 in deleteNoteWithConfirm call
by src/lib/utils/path.ts:basename <- src/lib/core/filesystem/fs.logic.ts:55 in getFileName call
by src/lib/utils/path.ts:basename <- src/lib/core/frontmatter/frontmatter-write.service.ts:69 in toastFrontmatterWriteError call
by src/lib/utils/path.ts:basename <- src/lib/core/vault/vault.logic.ts:17 in extractVaultName call
by src/lib/utils/path.ts:basename <- src/lib/features/note-action-bar/note-action-bar.logic.ts:35 in getActionBarState call
by src/lib/utils/path.ts:basename <- src/lib/features/note-action-bar/note-action-bar.service.ts:28 in revealNote call
by src/lib/utils/path.ts:basename <- src/lib/features/properties/bookmark-migration.service.ts:65 in migrateBookmarksToFavorites call
sym src/lib/utils/path.ts:79 fn stem(path: string): string L5 | Extracts the last segment of a path without its extension.
by src/lib/utils/path.ts:stem <- src/lib/core/filesystem/link-updater.logic.ts:16 in extractNoteName call
by src/lib/utils/path.ts:stem <- src/lib/features/note-action-bar/note-action-bar.service.ts:76 in createLinkedNote call
by src/lib/utils/path.ts:stem <- src/lib/features/search/search.logic.ts:194 in getFileName call
by src/lib/utils/path.ts:stem <- src/lib/plugins/one-on-one/one-on-one.service.ts:112 in registerOneOnOneActionBarAction call
sym src/lib/utils/path.ts:98 fn relativePath(vaultPath: string, filePath: string): string L6 | Strips the vault root prefix from an absolute path to produce a vault-relative path.
by src/lib/utils/path.ts:relativePath <- src/lib/core/filesystem/fs.logic.ts:277 in getRelativePath call
by src/lib/utils/path.ts:relativePath <- src/lib/features/properties/RelationshipSearch.svelte:82 in (markup) markup
by src/lib/utils/path.ts:relativePath <- src/lib/features/quick-switcher/QuickSwitcher.svelte:89 in (markup) markup
by src/lib/utils/path.ts:relativePath <- src/lib/features/search/SearchResult.svelte:66 in subtitle=$derived call
by src/lib/utils/path.ts:relativePath <- src/lib/features/search/search.logic.ts:176 in performOperatorOnlySearch call +1
by src/lib/utils/path.ts:relativePath <- src/lib/plugins/mods/mod-query.service.ts:57 in createModQuery call
by src/lib/utils/path.ts:relativePath <- src/lib/plugins/mods/mod-vault.service.ts:95 in createModVault call +1
sym src/lib/utils/path.ts:120 fn vaultRelativeKey(vaultPath: string, filePath: string): string | null L4 | Derives the vault-relative key that the FTS5 and semantic tables index on.
by src/lib/utils/path.ts:vaultRelativeKey <- src/lib/app/deep-link-actions.ts:112 in importStagedShot call
by src/lib/utils/path.ts:vaultRelativeKey <- src/lib/core/filesystem/link-updater.logic.ts:90 in replaceWikilinks call
by src/lib/utils/path.ts:vaultRelativeKey <- src/lib/core/filesystem/note-change.service.ts:281 in ftsKey call
by src/lib/utils/path.ts:vaultRelativeKey <- src/lib/core/filesystem/path-change.service.ts:230 in applyPathChange call +1
by src/lib/utils/path.ts:vaultRelativeKey <- src/lib/features/auto-organize/auto-organize.service.ts:443 in runRuleAction call
by src/lib/utils/path.ts:vaultRelativeKey <- src/lib/features/deep-link/deep-link.logic.ts:329 in buildOpenNoteDeepLink call
by src/lib/utils/path.ts:vaultRelativeKey <- src/lib/features/search/search.service.ts:311 in registerSearchIndexHook call
by src/lib/utils/path.ts:vaultRelativeKey <- src/lib/features/tasks/task-query.logic.ts:267 in buildTaskRows call
more by 3 not shown: src/lib/features/tasks(2) src/lib/plugins/mods(1): q importers src/lib/utils/path.ts:vaultRelativeKey
## calls
call src/lib/utils/path.ts:39 in resolveFilePath -> src/lib/utils/path.ts:normalizePath call
call src/lib/utils/path.ts:80 in stem -> src/lib/utils/path.ts:basename call
call src/lib/utils/path.ts:121 in vaultRelativeKey -> src/lib/utils/path.ts:relativePath call

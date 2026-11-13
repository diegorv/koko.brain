# file card src/lib/features/properties/bookmark-migration.service.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/properties/bookmark-migration.service.ts ' codemap/files
file src/lib/features/properties/bookmark-migration.service.ts service L115 module src/lib/features/properties in1 t2
## imports
imp src/lib/features/properties/bookmark-migration.service.ts:1 -> pkg:@tauri-apps/plugin-fs exists,readTextFile,remove
imp src/lib/features/properties/bookmark-migration.service.ts:3 -> src/lib/core/filesystem/fs.logic.ts isMarkdownFile
imp src/lib/features/properties/bookmark-migration.service.ts:4 -> src/lib/core/vault/vault.store.svelte.ts vaultStore
imp src/lib/features/properties/bookmark-migration.service.ts:5 -> src/lib/utils/debug.ts error
imp src/lib/features/properties/bookmark-migration.service.ts:6 -> src/lib/utils/path.ts basename,normalizePath
imp src/lib/features/properties/bookmark-migration.service.ts:7 -> src/lib/core/frontmatter/frontmatter-write.service.ts FrontmatterWriteError,updateNoteFrontmatter
imp src/lib/features/properties/bookmark-migration.service.ts:8 -> src/lib/features/properties/lifecycle.logic.ts toggleFavorite
## imported-by
imp src/lib/app/lifecycle/app-lifecycle.service.ts:48 -> src/lib/features/properties/bookmark-migration.service.ts migrateBookmarksToFavorites
## reach
in2 src/lib/features/properties/bookmark-migration.service.ts 1 files in 1 modules: src/routes(1)
out2 src/lib/features/properties/bookmark-migration.service.ts 12 files in 7 modules: src/lib/core/editor(3) src/lib/contracts(2) src/lib/core/frontmatter(2) src/lib/core/settings(2) src/lib/core/filesystem(1) +2 modules
## tests
test src/tests/lib/features/properties/bookmark-migration.service.test.ts imports src/lib/features/properties/bookmark-migration.service.ts mirror
test src/tests/lib/app/lifecycle/app-lifecycle.service.test.ts mocks src/lib/features/properties/bookmark-migration.service.ts
## symbols
sym src/lib/features/properties/bookmark-migration.service.ts:49 fn migrateBookmarksToFavorites(vaultPath: string): Promise<void> L67 | Moves the legacy bookmarks into Favorites, once per vault (ADR 0033, PRD Q7).
by src/lib/features/properties/bookmark-migration.service.ts:migrateBookmarksToFavorites <- src/lib/app/lifecycle/app-lifecycle.service.ts:310 in initializeVault call
## locals
local src/lib/features/properties/bookmark-migration.service.ts:22 fn bookmarksFrom(content: string): LegacyBookmark[] L13
## calls
call src/lib/features/properties/bookmark-migration.service.ts:27 in bookmarksFrom -> src/lib/utils/debug.ts:error call
call src/lib/features/properties/bookmark-migration.service.ts:54 in migrateBookmarksToFavorites -> src/lib/features/properties/bookmark-migration.service.ts:bookmarksFrom call
call src/lib/features/properties/bookmark-migration.service.ts:56 in migrateBookmarksToFavorites -> src/lib/utils/debug.ts:error call +2
call src/lib/features/properties/bookmark-migration.service.ts:65 in migrateBookmarksToFavorites -> src/lib/utils/path.ts:basename call
call src/lib/features/properties/bookmark-migration.service.ts:67 in migrateBookmarksToFavorites -> src/lib/utils/path.ts:normalizePath call
call src/lib/features/properties/bookmark-migration.service.ts:68 in migrateBookmarksToFavorites -> src/lib/core/filesystem/fs.logic.ts:isMarkdownFile call
call src/lib/features/properties/bookmark-migration.service.ts:80 in migrateBookmarksToFavorites -> src/lib/core/frontmatter/frontmatter-write.service.ts:updateNoteFrontmatter call
call src/lib/features/properties/bookmark-migration.service.ts:80 in migrateBookmarksToFavorites -> src/lib/features/properties/lifecycle.logic.ts:toggleFavorite call
## effects
fx src/lib/features/properties/bookmark-migration.service.ts:53 tauri-fs.exists in migrateBookmarksToFavorites
fx src/lib/features/properties/bookmark-migration.service.ts:54 tauri-fs.readTextFile in migrateBookmarksToFavorites
fx src/lib/features/properties/bookmark-migration.service.ts:73 tauri-fs.exists in migrateBookmarksToFavorites
fx src/lib/features/properties/bookmark-migration.service.ts:102 tauri-fs.remove in migrateBookmarksToFavorites

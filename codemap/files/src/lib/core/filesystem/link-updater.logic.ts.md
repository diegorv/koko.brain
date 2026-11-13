# file card src/lib/core/filesystem/link-updater.logic.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/filesystem/link-updater.logic.ts ' codemap/files
file src/lib/core/filesystem/link-updater.logic.ts logic L119 module src/lib/core/filesystem in1 t1
## imports
imp src/lib/core/filesystem/link-updater.logic.ts:1 -> src/lib/utils/path.ts stem,vaultRelativeKey
imp src/lib/core/filesystem/link-updater.logic.ts:2 -> src/lib/core/filesystem/wikilink-resolution.logic.ts buildResolutionCache,resolveWikilinkCached,type:WikilinkResolutionCache
## imported-by
imp src/lib/core/filesystem/link-updater.service.ts:11 -> src/lib/core/filesystem/link-updater.logic.ts buildRenameResolution,extractNoteName,replaceWikilinks
## reach
in2 src/lib/core/filesystem/link-updater.logic.ts 1 files in 1 modules: src/lib/core/filesystem(1)
out2 src/lib/core/filesystem/link-updater.logic.ts 1 files in 1 modules: src/lib/contracts(1)
## tests
test src/tests/lib/core/filesystem/link-updater.logic.test.ts imports src/lib/core/filesystem/link-updater.logic.ts mirror
## symbols
sym src/lib/core/filesystem/link-updater.logic.ts:15 fn extractNoteName(filePath: string): string L3 | Extracts the note name (filename without extension) from a file path.
by src/lib/core/filesystem/link-updater.logic.ts:extractNoteName <- src/lib/core/filesystem/link-updater.service.ts:36 in updateLinksAfterRename call +1
sym src/lib/core/filesystem/link-updater.logic.ts:39 interface RenameResolution L12 | One rename as wikilink resolution sees it: the note's old and new path and the vault's note paths resolved before and after the rename.
sym src/lib/core/filesystem/link-updater.logic.ts:59 fn buildRenameResolution(oldPath: string, newPath: string, notePaths: string[], vaultRoot: string | null): RenameResolution L12 | Builds the before and after resolution of renaming `oldPath` to `newPath`.
by src/lib/core/filesystem/link-updater.logic.ts:buildRenameResolution <- src/lib/core/filesystem/link-updater.service.ts:44 in updateLinksAfterRename call
sym src/lib/core/filesystem/link-updater.logic.ts:86 fn replaceWikilinks(content: string, rename: RenameResolution): string L34 | Rewrites the wikilinks in `content` that resolve to `rename.oldPath` before the rename (case-insensitive stem match first, so `[[Old.png]]` is never touched).
by src/lib/core/filesystem/link-updater.logic.ts:replaceWikilinks <- src/lib/core/filesystem/link-updater.service.ts:55 in updateLinksAfterRename call
## locals
local src/lib/core/filesystem/link-updater.logic.ts:25 fn splitTarget(target: string): { prefix: string; noteStem: string; ext: string } L9
## calls
call src/lib/core/filesystem/link-updater.logic.ts:16 in extractNoteName -> src/lib/utils/path.ts:stem call
call src/lib/core/filesystem/link-updater.logic.ts:67 in buildRenameResolution -> src/lib/core/filesystem/wikilink-resolution.logic.ts:buildResolutionCache call +1
call src/lib/core/filesystem/link-updater.logic.ts:88 in replaceWikilinks -> src/lib/core/filesystem/link-updater.logic.ts:extractNoteName call +1
call src/lib/core/filesystem/link-updater.logic.ts:90 in replaceWikilinks -> src/lib/utils/path.ts:vaultRelativeKey call
call src/lib/core/filesystem/link-updater.logic.ts:94 in replaceWikilinks -> src/lib/core/filesystem/link-updater.logic.ts:splitTarget call
call src/lib/core/filesystem/link-updater.logic.ts:105 in replaceWikilinks -> src/lib/core/filesystem/wikilink-resolution.logic.ts:resolveWikilinkCached call +1

# file card src/lib/core/trash/trash.logic.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/trash/trash.logic.ts ' codemap/files
file src/lib/core/trash/trash.logic.ts logic L105 module src/lib/core/trash in2 t1
## imports
imp src/lib/core/trash/trash.logic.ts:1 -> src/lib/core/trash/trash.types.ts type:TrashItem
## imported-by
imp src/lib/core/settings/sections/TrashSection.svelte:7 -> src/lib/core/trash/trash.logic.ts formatTrashedDate
imp src/lib/core/trash/trash.service.ts:4 -> src/lib/core/trash/trash.logic.ts getTrashDir,getTrashItemsDir,getTrashManifestPath,getTrashItemPath,getTrashItemDir,createTrashItem,parseTrashManifest,serializeTrashManifest
## reach
in2 src/lib/core/trash/trash.logic.ts 4 files in 3 modules: src/lib/app(2) src/lib/core/filesystem(1) src/lib/features/event-calendar(1)
out2 src/lib/core/trash/trash.logic.ts 0 files in 0 modules: -
## tests
test src/tests/lib/core/trash/trash.logic.test.ts imports src/lib/core/trash/trash.logic.ts mirror
## symbols
sym src/lib/core/trash/trash.logic.ts:11 fn getTrashDir(vaultPath: string): string L3 | Returns the absolute path to the trash root directory
by src/lib/core/trash/trash.logic.ts:getTrashDir <- src/lib/core/trash/trash.service.ts:58 in moveToTrash call +1
sym src/lib/core/trash/trash.logic.ts:16 fn getTrashItemsDir(vaultPath: string): string L3 | Returns the absolute path to the items directory inside trash
by src/lib/core/trash/trash.logic.ts:getTrashItemsDir <- src/lib/core/trash/trash.service.ts:62 in moveToTrash call +1
sym src/lib/core/trash/trash.logic.ts:21 fn getTrashManifestPath(vaultPath: string): string L3 | Returns the absolute path to the trash manifest JSON file
by src/lib/core/trash/trash.logic.ts:getTrashManifestPath <- src/lib/core/trash/trash.service.ts:27 in loadTrash call +1
sym src/lib/core/trash/trash.logic.ts:26 fn getTrashItemPath(vaultPath: string, id: string, fileName: string): string L3 | Returns the absolute path where a trashed item's content is stored
by src/lib/core/trash/trash.logic.ts:getTrashItemPath <- src/lib/core/trash/trash.service.ts:70 in moveToTrash call +1
sym src/lib/core/trash/trash.logic.ts:31 fn getTrashItemDir(vaultPath: string, id: string): string L3 | Returns the absolute path to a trashed item's container directory
by src/lib/core/trash/trash.logic.ts:getTrashItemDir <- src/lib/core/trash/trash.service.ts:52 in moveToTrash call +2
sym src/lib/core/trash/trash.logic.ts:39 fn createTrashItem(originalRelativePath: string, isDirectory: boolean): TrashItem L14 | Creates a new TrashItem from the given vault-relative path.
by src/lib/core/trash/trash.logic.ts:createTrashItem <- src/lib/core/trash/trash.service.ts:51 in moveToTrash call
sym src/lib/core/trash/trash.logic.ts:58 fn parseTrashManifest(json: string): TrashItem[] L9 | Parses a JSON string into a validated array of TrashItem objects.
by src/lib/core/trash/trash.logic.ts:parseTrashManifest <- src/lib/core/trash/trash.service.ts:34 in loadTrash call
sym src/lib/core/trash/trash.logic.ts:69 fn serializeTrashManifest(items: TrashItem[]): string L3 | Serializes a TrashItem array to a formatted JSON string
by src/lib/core/trash/trash.logic.ts:serializeTrashManifest <- src/lib/core/trash/trash.service.ts:278 in saveManifest call
sym src/lib/core/trash/trash.logic.ts:78 fn formatTrashedDate(timestamp: number): string L15 | Formats a trash timestamp as a human-readable relative time string.
by src/lib/core/trash/trash.logic.ts:formatTrashedDate <- src/lib/core/settings/sections/TrashSection.svelte:109 in (markup) markup
## locals
local src/lib/core/trash/trash.logic.ts:95 fn isValidTrashItem(value: unknown): value is TrashItem L11
## calls
call src/lib/core/trash/trash.logic.ts:62 in parseTrashManifest -> src/lib/core/trash/trash.logic.ts:isValidTrashItem ref

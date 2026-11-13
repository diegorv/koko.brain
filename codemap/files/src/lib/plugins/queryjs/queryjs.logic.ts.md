# file card src/lib/plugins/queryjs/queryjs.logic.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/plugins/queryjs/queryjs.logic.ts ' codemap/files
file src/lib/plugins/queryjs/queryjs.logic.ts logic L218 module src/lib/plugins/queryjs in1 t3
## imports
imp src/lib/plugins/queryjs/queryjs.logic.ts:1 -> src/lib/features/collection/collection.types.ts type:PropertyIndexRecord
imp src/lib/plugins/queryjs/queryjs.logic.ts:2 -> src/lib/plugins/queryjs/queryjs.types.ts type:KBPage,type:KBLink,type:KBTask
imp src/lib/plugins/queryjs/queryjs.logic.ts:3 -> src/lib/types/vault-v2.types.ts type:NoteEntryV2
imp src/lib/plugins/queryjs/queryjs.logic.ts:4 -> src/lib/plugins/queryjs/kb-datetime.ts KBDateTime
imp src/lib/plugins/queryjs/queryjs.logic.ts:5 -> src/lib/core/filesystem/wikilink-resolution.logic.ts isLinkTargetFile,resolveWikilinkCached,type:WikilinkResolutionCache
## imported-by
imp src/lib/plugins/queryjs/kb-api.ts:8 -> src/lib/plugins/queryjs/queryjs.logic.ts buildKBLink,buildKBPage,buildReverseIndex,parseSource
## reach
in2 src/lib/plugins/queryjs/queryjs.logic.ts 3 files in 2 modules: src/lib/plugins/mods(2) src/lib/plugins/queryjs(1)
out2 src/lib/plugins/queryjs/queryjs.logic.ts 4 files in 4 modules: src/lib/contracts(1) src/lib/features/collection(1) src/lib/plugins/queryjs(1) src/lib/utils(1)
## tests
test src/tests/lib/plugins/queryjs/queryjs.logic.test.ts imports src/lib/plugins/queryjs/queryjs.logic.ts mirror
test src/tests/lib/plugins/queryjs/kb-api-contract.test.ts imports src/lib/plugins/queryjs/queryjs.logic.ts
test src/tests/lib/plugins/queryjs/kbapi-firewall.test.ts imports src/lib/plugins/queryjs/queryjs.logic.ts
## symbols
sym src/lib/plugins/queryjs/queryjs.logic.ts:20 fn buildKBLink(filePath: string): KBLink L3 | Creates a KBLink from a file path
by src/lib/plugins/queryjs/queryjs.logic.ts:buildKBLink <- src/lib/plugins/queryjs/kb-api.ts:211 in KBAPI.fileLink call
sym src/lib/plugins/queryjs/queryjs.logic.ts:28 fn resolveWikiLinkTarget(target: string, allFilePaths: string[]): string | null L14 | Resolves a wikilink target name to an absolute file path (case-insensitive).
sym src/lib/plugins/queryjs/queryjs.logic.ts:47 fn buildReverseIndex(entries: NoteEntryV2[]): Map<string, Set<string>> L17 | Pre-computes a reverse index: basename (lowercase) → set of source file paths that link to that basename.
by src/lib/plugins/queryjs/queryjs.logic.ts:buildReverseIndex <- src/lib/plugins/queryjs/kb-api.ts:446 in KBAPI.ensureCache call
sym src/lib/plugins/queryjs/queryjs.logic.ts:71 fn resolveInlinks(filePath: string, reverseIndex: Map<string, Set<string>>): KBLink[] L17 | Finds all files whose outgoing wikilinks target the given file.
sym src/lib/plugins/queryjs/queryjs.logic.ts:113 fn buildKBPage(record: PropertyIndexRecord, entry: NoteEntryV2 | undefined, allFilePaths: string[], reverseIndex?: Map<string, Set<st… L61 | Builds a KBPage from a PropertyIndexRecord and its corresponding Rust-parsed `NoteEntryV2` (matched by absolute path).
by src/lib/plugins/queryjs/queryjs.logic.ts:buildKBPage <- src/lib/plugins/queryjs/kb-api.ts:456 in KBAPI.ensureCache call
sym src/lib/plugins/queryjs/queryjs.logic.ts:184 fn parseSource(source: string | undefined, vaultPath: string): ((page: KBPage) => boolean) | null L35 | Parses a kb.pages() source string into a filter function.
by src/lib/plugins/queryjs/queryjs.logic.ts:parseSource <- src/lib/plugins/queryjs/kb-api.ts:123 in KBAPI.pages call
## locals
local src/lib/plugins/queryjs/queryjs.logic.ts:12 fn getBasename(filePath: string): string L6
local src/lib/plugins/queryjs/queryjs.logic.ts:93 fn maybeParseDate(value: unknown): unknown L7
## calls
call src/lib/plugins/queryjs/queryjs.logic.ts:21 in buildKBLink -> src/lib/plugins/queryjs/queryjs.logic.ts:getBasename call
call src/lib/plugins/queryjs/queryjs.logic.ts:31 in resolveWikiLinkTarget -> src/lib/plugins/queryjs/queryjs.logic.ts:getBasename call +2
call src/lib/plugins/queryjs/queryjs.logic.ts:53 in buildReverseIndex -> src/lib/plugins/queryjs/queryjs.logic.ts:getBasename call
call src/lib/plugins/queryjs/queryjs.logic.ts:75 in resolveInlinks -> src/lib/core/filesystem/wikilink-resolution.logic.ts:isLinkTargetFile call
call src/lib/plugins/queryjs/queryjs.logic.ts:76 in resolveInlinks -> src/lib/plugins/queryjs/queryjs.logic.ts:getBasename call
call src/lib/plugins/queryjs/queryjs.logic.ts:83 in resolveInlinks -> src/lib/plugins/queryjs/queryjs.logic.ts:buildKBLink call
call src/lib/plugins/queryjs/queryjs.logic.ts:96 in maybeParseDate -> src/lib/plugins/queryjs/kb-datetime.ts:KBDateTime new
call src/lib/plugins/queryjs/queryjs.logic.ts:123 in buildKBPage -> src/lib/plugins/queryjs/queryjs.logic.ts:resolveInlinks call
call src/lib/plugins/queryjs/queryjs.logic.ts:141 in buildKBPage -> src/lib/core/filesystem/wikilink-resolution.logic.ts:resolveWikilinkCached call
call src/lib/plugins/queryjs/queryjs.logic.ts:142 in buildKBPage -> src/lib/plugins/queryjs/queryjs.logic.ts:resolveWikiLinkTarget call
call src/lib/plugins/queryjs/queryjs.logic.ts:154 in buildKBPage -> src/lib/plugins/queryjs/queryjs.logic.ts:buildKBLink call
call src/lib/plugins/queryjs/queryjs.logic.ts:168 in buildKBPage -> src/lib/plugins/queryjs/queryjs.logic.ts:maybeParseDate call

# file card src/lib/core/filesystem/wikilink-resolution.logic.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/filesystem/wikilink-resolution.logic.ts ' codemap/files
file src/lib/core/filesystem/wikilink-resolution.logic.ts logic L184 module src/lib/core/filesystem in15 t8
## imports
imp src/lib/core/filesystem/wikilink-resolution.logic.ts:1 -> src/lib/contracts/index.ts type:WikiLink
## imported-by
imp src/lib/app/editor-host.ts:11 -> src/lib/core/filesystem/wikilink-resolution.logic.ts buildResolutionCache,isLinkTargetFile,resolveWikilinkCached,type:WikilinkResolutionCache
imp src/lib/core/filesystem/link-updater.logic.ts:2 -> src/lib/core/filesystem/wikilink-resolution.logic.ts buildResolutionCache,resolveWikilinkCached,type:WikilinkResolutionCache
imp src/lib/core/markdown-editor/copy-block-link/copy-block-link.logic.ts:2 -> src/lib/core/filesystem/wikilink-resolution.logic.ts getNoteName
imp src/lib/core/markdown-editor/extensions/wikilink/completion.ts:2 -> src/lib/core/filesystem/wikilink-resolution.logic.ts getNoteName
imp src/lib/features/collection/collection.logic.ts:16 -> src/lib/core/filesystem/wikilink-resolution.logic.ts parseWikilinks
imp src/lib/features/note-list/NoteRow.svelte:11 -> src/lib/core/filesystem/wikilink-resolution.logic.ts resolveWikilink
imp src/lib/features/properties/PropertiesView.svelte:15 -> src/lib/core/filesystem/wikilink-resolution.logic.ts resolveWikilink
imp src/lib/features/properties/RelationshipSearch.svelte:8 -> src/lib/core/filesystem/wikilink-resolution.logic.ts isLinkTargetFile
imp src/lib/features/rail-shell/lens.logic.ts:18 -> src/lib/core/filesystem/wikilink-resolution.logic.ts buildResolutionCache,resolveWikilinkCached
imp src/lib/plugins/graph-view/graph-view.logic.ts:2 -> src/lib/core/filesystem/wikilink-resolution.logic.ts buildResolutionCache,resolveWikilinkCached
imp src/lib/plugins/kanban/KanbanWikilinkSuggestions.svelte:6 -> src/lib/core/filesystem/wikilink-resolution.logic.ts isLinkTargetFile
imp src/lib/plugins/kanban/kanban.service.ts:9 -> src/lib/core/filesystem/wikilink-resolution.logic.ts buildResolutionCache,resolveWikilinkCached
imp src/lib/plugins/queryjs/kb-api.ts:9 -> src/lib/core/filesystem/wikilink-resolution.logic.ts buildResolutionCache
imp src/lib/plugins/queryjs/queryjs.logic.ts:5 -> src/lib/core/filesystem/wikilink-resolution.logic.ts isLinkTargetFile,resolveWikilinkCached,type:WikilinkResolutionCache
imp src/lib/plugins/quick-capture/composer-editor-host.service.ts:3 -> src/lib/core/filesystem/wikilink-resolution.logic.ts getNoteName,isLinkTargetFile
## reach
in2 src/lib/core/filesystem/wikilink-resolution.logic.ts 43 files in 16 modules: src/lib/features/rail-shell(11) src/lib/app(6) src/lib/features/collection(6) src/lib/features/auto-organize(3) src/lib/plugins/graph-view(3) +11 modules: q impact src/lib/core/filesystem/wikilink-resolution.logic.ts --depth 2
out2 src/lib/core/filesystem/wikilink-resolution.logic.ts 52 files in 1 modules: src/lib/contracts(52)
## tests
test src/tests/lib/core/filesystem/wikilink-resolution.logic.test.ts imports src/lib/core/filesystem/wikilink-resolution.logic.ts mirror
test e2e/mocks/vault-index.ts e2e src/lib/core/filesystem/wikilink-resolution.logic.ts
test src/tests/fixtures/vault-entries.fixture.ts imports src/lib/core/filesystem/wikilink-resolution.logic.ts
test src/tests/lib/app/editor-host.test.ts imports src/lib/core/filesystem/wikilink-resolution.logic.ts
test src/tests/lib/core/filesystem/link-updater.logic.test.ts imports src/lib/core/filesystem/wikilink-resolution.logic.ts
test src/tests/lib/core/frontmatter/properties.logic.test.ts imports src/lib/core/filesystem/wikilink-resolution.logic.ts
test src/tests/lib/features/event-calendar/event-calendar.model.test.ts imports src/lib/core/filesystem/wikilink-resolution.logic.ts
test src/tests/lib/plugins/queryjs/queryjs.logic.test.ts imports src/lib/core/filesystem/wikilink-resolution.logic.ts
## symbols
sym src/lib/core/filesystem/wikilink-resolution.logic.ts:4 fn getNoteName(filePath: string): string L5 | Returns the file name without its last extension (`a/b.md` -> `b`); a dotfile keeps its name.
by src/lib/core/filesystem/wikilink-resolution.logic.ts:getNoteName <- src/lib/core/markdown-editor/copy-block-link/copy-block-link.logic.ts:2 in (module) import
by src/lib/core/filesystem/wikilink-resolution.logic.ts:getNoteName <- src/lib/core/markdown-editor/extensions/wikilink/completion.ts:90 in buildFileCompletions call
by src/lib/core/filesystem/wikilink-resolution.logic.ts:getNoteName <- src/lib/features/copy-block-link/copy-block-link.service.ts:28 in copyBlockLink call
by src/lib/core/filesystem/wikilink-resolution.logic.ts:getNoteName <- src/lib/plugins/quick-capture/composer-editor-host.service.ts:46 in createComposerEditorHost call
sym src/lib/core/filesystem/wikilink-resolution.logic.ts:15 fn isLinkTargetFile(filePath: string): boolean L4 | Whether a wikilink can resolve to `filePath`: false for a `.view` (any casing), true for every other file.
by src/lib/core/filesystem/wikilink-resolution.logic.ts:isLinkTargetFile <- src/lib/app/editor-host.ts:80 in treeLinkIndex call +1
by src/lib/core/filesystem/wikilink-resolution.logic.ts:isLinkTargetFile <- src/lib/features/properties/RelationshipSearch.svelte:24 in allFiles=$derived call
by src/lib/core/filesystem/wikilink-resolution.logic.ts:isLinkTargetFile <- src/lib/plugins/kanban/KanbanWikilinkSuggestions.svelte:28 in files=$derived call
by src/lib/core/filesystem/wikilink-resolution.logic.ts:isLinkTargetFile <- src/lib/plugins/queryjs/queryjs.logic.ts:75 in resolveInlinks call
by src/lib/core/filesystem/wikilink-resolution.logic.ts:isLinkTargetFile <- src/lib/plugins/quick-capture/composer-editor-host.service.ts:43 in createComposerEditorHost call
sym src/lib/core/filesystem/wikilink-resolution.logic.ts:64 fn resolveWikilink(target: string, allFilePaths: string[], vaultRoot?: string | null): string | null L33 | Resolves a wikilink target to a file path; null when nothing matches.
by src/lib/core/filesystem/wikilink-resolution.logic.ts:resolveWikilink <- src/lib/features/note-list/NoteRow.svelte:111 in (markup) markup
by src/lib/core/filesystem/wikilink-resolution.logic.ts:resolveWikilink <- src/lib/features/properties/PropertiesView.svelte:65 in relLinksMap=$derived ref
sym src/lib/core/filesystem/wikilink-resolution.logic.ts:103 type WikilinkResolutionCache L4 | Pre-computed lookup table for O(1) wikilink resolution: the map itself is lowercase note name → file path, and `byFileName` serves the exact-file step for a ta…
by src/lib/core/filesystem/wikilink-resolution.logic.ts:WikilinkResolutionCache <- src/lib/app/editor-host.ts:15 in (module) import
by src/lib/core/filesystem/wikilink-resolution.logic.ts:WikilinkResolutionCache <- src/lib/core/filesystem/link-updater.logic.ts:2 in (module) import
by src/lib/core/filesystem/wikilink-resolution.logic.ts:WikilinkResolutionCache <- src/lib/plugins/queryjs/queryjs.logic.ts:8 in (module) import
sym src/lib/core/filesystem/wikilink-resolution.logic.ts:109 fn buildResolutionCache(allFilePaths: string[]): WikilinkResolutionCache L17 | Builds a resolution cache from file paths.
by src/lib/core/filesystem/wikilink-resolution.logic.ts:buildResolutionCache <- src/lib/app/editor-host.ts:81 in treeLinkIndex call
by src/lib/core/filesystem/wikilink-resolution.logic.ts:buildResolutionCache <- src/lib/core/filesystem/link-updater.logic.ts:67 in buildRenameResolution call +1
by src/lib/core/filesystem/wikilink-resolution.logic.ts:buildResolutionCache <- src/lib/features/rail-shell/lens.logic.ts:395 in resolveNeighbourhoodLens call
by src/lib/core/filesystem/wikilink-resolution.logic.ts:buildResolutionCache <- src/lib/plugins/graph-view/graph-view.logic.ts:29 in buildGraphData call
by src/lib/core/filesystem/wikilink-resolution.logic.ts:buildResolutionCache <- src/lib/plugins/kanban/kanban.service.ts:73 in loadLinkedFileContent call
by src/lib/core/filesystem/wikilink-resolution.logic.ts:buildResolutionCache <- src/lib/plugins/queryjs/kb-api.ts:452 in KBAPI.ensureCache call
sym src/lib/core/filesystem/wikilink-resolution.logic.ts:128 fn resolveWikilinkCached(target: string, cache: WikilinkResolutionCache, vaultRoot?: string | null): string | null L22 | O(1) wikilink resolution using a pre-built cache.
by src/lib/core/filesystem/wikilink-resolution.logic.ts:resolveWikilinkCached <- src/lib/app/editor-host.ts:125 in appEditorHost.resolveLink call
by src/lib/core/filesystem/wikilink-resolution.logic.ts:resolveWikilinkCached <- src/lib/core/filesystem/link-updater.logic.ts:105 in replaceWikilinks call +1
by src/lib/core/filesystem/wikilink-resolution.logic.ts:resolveWikilinkCached <- src/lib/features/rail-shell/lens.logic.ts:400 in resolveNeighbourhoodLens call +1
by src/lib/core/filesystem/wikilink-resolution.logic.ts:resolveWikilinkCached <- src/lib/plugins/graph-view/graph-view.logic.ts:34 in buildGraphData call
by src/lib/core/filesystem/wikilink-resolution.logic.ts:resolveWikilinkCached <- src/lib/plugins/kanban/kanban.service.ts:74 in loadLinkedFileContent call
by src/lib/core/filesystem/wikilink-resolution.logic.ts:resolveWikilinkCached <- src/lib/plugins/queryjs/queryjs.logic.ts:141 in buildKBPage call
sym src/lib/core/filesystem/wikilink-resolution.logic.ts:154 fn parseWikilinks(content: string): WikiLink[] L31 | Lists every `[[target|alias#heading]]` wikilink in `content`, in order, with its offset.
by src/lib/core/filesystem/wikilink-resolution.logic.ts:parseWikilinks <- src/lib/features/collection/collection.logic.ts:88 in wikilinkTargets call
## locals
local src/lib/core/filesystem/wikilink-resolution.logic.ts:27 fn exactTarget(target: string): string | null L4
local src/lib/core/filesystem/wikilink-resolution.logic.ts:36 fn isExactFile(filePathLower: string, exact: string): boolean L4
local src/lib/core/filesystem/wikilink-resolution.logic.ts:47 fn findExactFile(candidates: string[], exact: string, vaultRoot: string | null | undefined): string | undefined L8
## calls
call src/lib/core/filesystem/wikilink-resolution.logic.ts:29 in exactTarget -> src/lib/core/filesystem/wikilink-resolution.logic.ts:getNoteName call
call src/lib/core/filesystem/wikilink-resolution.logic.ts:37 in isExactFile -> src/lib/core/filesystem/wikilink-resolution.logic.ts:isLinkTargetFile call
call src/lib/core/filesystem/wikilink-resolution.logic.ts:50 in findExactFile -> src/lib/core/filesystem/wikilink-resolution.logic.ts:isLinkTargetFile call
call src/lib/core/filesystem/wikilink-resolution.logic.ts:53 in findExactFile -> src/lib/core/filesystem/wikilink-resolution.logic.ts:isExactFile call
call src/lib/core/filesystem/wikilink-resolution.logic.ts:67 in resolveWikilink -> src/lib/core/filesystem/wikilink-resolution.logic.ts:exactTarget call
call src/lib/core/filesystem/wikilink-resolution.logic.ts:69 in resolveWikilink -> src/lib/core/filesystem/wikilink-resolution.logic.ts:findExactFile call
call src/lib/core/filesystem/wikilink-resolution.logic.ts:76 in resolveWikilink -> src/lib/core/filesystem/wikilink-resolution.logic.ts:isLinkTargetFile call +1
call src/lib/core/filesystem/wikilink-resolution.logic.ts:77 in resolveWikilink -> src/lib/core/filesystem/wikilink-resolution.logic.ts:getNoteName call +2
call src/lib/core/filesystem/wikilink-resolution.logic.ts:114 in buildResolutionCache -> src/lib/core/filesystem/wikilink-resolution.logic.ts:isLinkTargetFile call
call src/lib/core/filesystem/wikilink-resolution.logic.ts:115 in buildResolutionCache -> src/lib/core/filesystem/wikilink-resolution.logic.ts:getNoteName call
call src/lib/core/filesystem/wikilink-resolution.logic.ts:131 in resolveWikilinkCached -> src/lib/core/filesystem/wikilink-resolution.logic.ts:exactTarget call
call src/lib/core/filesystem/wikilink-resolution.logic.ts:134 in resolveWikilinkCached -> src/lib/core/filesystem/wikilink-resolution.logic.ts:findExactFile call
call src/lib/core/filesystem/wikilink-resolution.logic.ts:143 in resolveWikilinkCached -> src/lib/core/filesystem/wikilink-resolution.logic.ts:getNoteName call

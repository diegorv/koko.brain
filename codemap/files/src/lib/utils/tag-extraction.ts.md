# file card src/lib/utils/tag-extraction.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/utils/tag-extraction.ts ' codemap/files
file src/lib/utils/tag-extraction.ts other L152 module src/lib/utils in7 t4
## imported-by
imp src/lib/core/markdown-editor/extensions/live-preview/click-handler.ts:4 -> src/lib/utils/tag-extraction.ts findInlineTags
imp src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/tag-handler.ts:2 -> src/lib/utils/tag-extraction.ts findInlineTags
imp src/lib/features/collection/collection.logic.ts:14 -> src/lib/utils/tag-extraction.ts extractAllTags
imp src/lib/features/search/search.logic.ts:3 -> src/lib/utils/tag-extraction.ts extractFrontmatterTags
imp src/lib/features/tasks/task-headings.logic.ts:1 -> src/lib/utils/tag-extraction.ts findInlineTags
imp src/lib/features/tasks/task-query.logic.ts:4 -> src/lib/utils/tag-extraction.ts findInlineTags
imp src/lib/features/todoist-sync/task-line.logic.ts:12 -> src/lib/utils/tag-extraction.ts findInlineTags,INLINE_TAG_NAME_SOURCE
## reach
in2 src/lib/utils/tag-extraction.ts 27 files in 8 modules: src/lib/features/collection(6) src/lib/features/tasks(6) src/lib/features/todoist-sync(6) src/lib/features/auto-organize(3) src/lib/core/markdown-editor(2) +3 modules: q impact src/lib/utils/tag-extraction.ts --depth 2
out2 src/lib/utils/tag-extraction.ts 0 files in 0 modules: -
## tests
test src/tests/lib/utils/tag-extraction.test.ts imports src/lib/utils/tag-extraction.ts mirror
test e2e/mocks/vault-index.ts e2e src/lib/utils/tag-extraction.ts
test src/tests/fixtures/todoist-vault.fake.ts imports src/lib/utils/tag-extraction.ts
test src/tests/help/queryjs-contract.test.ts imports src/lib/utils/tag-extraction.ts
## symbols
sym src/lib/utils/tag-extraction.ts:7 const INLINE_TAG_NAME_SOURCE L1 | The tag name after `#` in the inline tag rule (a letter or `_`, then letters, digits, `_`, `/` and `-`), as a `u`-flag regex source.
by src/lib/utils/tag-extraction.ts:INLINE_TAG_NAME_SOURCE <- src/lib/features/todoist-sync/task-line.logic.ts:64 in TOKEN_RE ref
sym src/lib/utils/tag-extraction.ts:49 fn extractFrontmatterTags(content: string): string[] L43
by src/lib/utils/tag-extraction.ts:extractFrontmatterTags <- src/lib/features/search/search.logic.ts:106 in matchesTagFilter call
sym src/lib/utils/tag-extraction.ts:93 fn extractInlineTags(content: string): string[] L15
sym src/lib/utils/tag-extraction.ts:110 interface InlineTagMatch L8 | One inline `#tag` occurrence in a text.
sym src/lib/utils/tag-extraction.ts:125 fn findInlineTags(text: string): InlineTagMatch[] L11 | Every inline `#tag` in `text`, in order, duplicates included, by the indexer's rule (`vault/parsing.rs::extract_inline_tags` mirrors it): `#` at line start or …
by src/lib/utils/tag-extraction.ts:findInlineTags <- src/lib/core/markdown-editor/extensions/live-preview/click-handler.ts:60 in handleLivePreviewTagMousedown call
by src/lib/utils/tag-extraction.ts:findInlineTags <- src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/tag-handler.ts:25 in tagHandler.decorate call
by src/lib/utils/tag-extraction.ts:findInlineTags <- src/lib/features/tasks/task-headings.logic.ts:47 in headingHasTag call
by src/lib/utils/tag-extraction.ts:findInlineTags <- src/lib/features/tasks/task-query.logic.ts:713 in sourceSuggestions call
by src/lib/utils/tag-extraction.ts:findInlineTags <- src/lib/features/todoist-sync/task-line.logic.ts:165 in isTaskTagName call +1
sym src/lib/utils/tag-extraction.ts:137 fn extractAllTags(content: string): string[] L16
by src/lib/utils/tag-extraction.ts:extractAllTags <- src/lib/features/collection/collection.logic.ts:69 in projectDerivedProperties call
## locals
local src/lib/utils/tag-extraction.ts:14 fn findTopLevelKey(lines: string[], key: string): number L34
## calls
call src/lib/utils/tag-extraction.ts:56 in extractFrontmatterTags -> src/lib/utils/tag-extraction.ts:findTopLevelKey call
call src/lib/utils/tag-extraction.ts:106 in extractInlineTags -> src/lib/utils/tag-extraction.ts:findInlineTags call
call src/lib/utils/tag-extraction.ts:138 in extractAllTags -> src/lib/utils/tag-extraction.ts:extractFrontmatterTags call
call src/lib/utils/tag-extraction.ts:139 in extractAllTags -> src/lib/utils/tag-extraction.ts:extractInlineTags call

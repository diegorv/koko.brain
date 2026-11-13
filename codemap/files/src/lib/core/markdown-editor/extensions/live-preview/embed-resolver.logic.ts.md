# file card src/lib/core/markdown-editor/extensions/live-preview/embed-resolver.logic.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/markdown-editor/extensions/live-preview/embed-resolver.logic.ts ' codemap/files
file src/lib/core/markdown-editor/extensions/live-preview/embed-resolver.logic.ts logic L75 module src/lib/core/markdown-editor in2 t1
## imported-by
imp src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:644 -> src/lib/core/markdown-editor/extensions/live-preview/embed-resolver.logic.ts dyn:extractHeadingSection,dyn:extractBlockContent,dyn:getNotePreview
imp src/lib/plugins/kanban/kanban.service.ts:10 -> src/lib/core/markdown-editor/extensions/live-preview/embed-resolver.logic.ts stripFrontmatter
## reach
in2 src/lib/core/markdown-editor/extensions/live-preview/embed-resolver.logic.ts 12 files in 3 modules: src/lib/core/markdown-editor(8) src/lib/app(3) src/lib/plugins/kanban(1)
out2 src/lib/core/markdown-editor/extensions/live-preview/embed-resolver.logic.ts 0 files in 0 modules: -
## tests
test src/tests/lib/core/markdown-editor/extensions/live-preview/embed-resolver.logic.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/embed-resolver.logic.ts mirror
## symbols
sym src/lib/core/markdown-editor/extensions/live-preview/embed-resolver.logic.ts:8 fn extractHeadingSection(content: string, headingName: string): string | null L27 | Extracts the section under a heading from file content.
by src/lib/core/markdown-editor/extensions/live-preview/embed-resolver.logic.ts:extractHeadingSection <- src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:646 in loadEmbedContent call
sym src/lib/core/markdown-editor/extensions/live-preview/embed-resolver.logic.ts:40 fn extractBlockContent(content: string, blockId: string): string | null L12 | Extracts the block (paragraph/line) identified by a block ID marker (`^blockid`).
by src/lib/core/markdown-editor/extensions/live-preview/embed-resolver.logic.ts:extractBlockContent <- src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:647 in loadEmbedContent call
sym src/lib/core/markdown-editor/extensions/live-preview/embed-resolver.logic.ts:54 fn stripFrontmatter(content: string): string L9 | Strips YAML frontmatter from content if present
by src/lib/core/markdown-editor/extensions/live-preview/embed-resolver.logic.ts:stripFrontmatter <- src/lib/plugins/kanban/kanban.service.ts:82 in loadLinkedFileContent call
sym src/lib/core/markdown-editor/extensions/live-preview/embed-resolver.logic.ts:71 fn getNotePreview(content: string): string L5 | Gets a preview of the full note content (without frontmatter).
by src/lib/core/markdown-editor/extensions/live-preview/embed-resolver.logic.ts:getNotePreview <- src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:648 in loadEmbedContent call
## calls
call src/lib/core/markdown-editor/extensions/live-preview/embed-resolver.logic.ts:72 in getNotePreview -> src/lib/core/markdown-editor/extensions/live-preview/embed-resolver.logic.ts:stripFrontmatter call

# file card src/lib/core/markdown-editor/extensions/live-preview/handlers/paste-html-link.logic.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/markdown-editor/extensions/live-preview/handlers/paste-html-link.logic.ts ' codemap/files
file src/lib/core/markdown-editor/extensions/live-preview/handlers/paste-html-link.logic.ts logic L112 module src/lib/core/markdown-editor in1 t1 | Pure converter: clipboard HTML with `<a href>` anchors → plain text with markdown links.
## imported-by
imp src/lib/core/markdown-editor/extensions/live-preview/handlers/paste-html-link-handler.ts:3 -> src/lib/core/markdown-editor/extensions/live-preview/handlers/paste-html-link.logic.ts htmlLinksToMarkdown
## reach
in2 src/lib/core/markdown-editor/extensions/live-preview/handlers/paste-html-link.logic.ts 1 files in 1 modules: src/lib/core/markdown-editor(1)
out2 src/lib/core/markdown-editor/extensions/live-preview/handlers/paste-html-link.logic.ts 0 files in 0 modules: -
## tests
test src/tests/lib/core/markdown-editor/extensions/live-preview/handlers/paste-html-link.logic.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/handlers/paste-html-link.logic.ts mirror
## symbols
sym src/lib/core/markdown-editor/extensions/live-preview/handlers/paste-html-link.logic.ts:79 fn htmlLinksToMarkdown(html: string, plainText: string): string | null L34 | Converts clipboard HTML into plain text with each `<a href>` rewritten as a markdown link, or returns `null` when the paste should fall through.
by src/lib/core/markdown-editor/extensions/live-preview/handlers/paste-html-link.logic.ts:htmlLinksToMarkdown <- src/lib/core/markdown-editor/extensions/live-preview/handlers/paste-html-link-handler.ts:28 in pasteHtmlLinkHandler call
## locals
local src/lib/core/markdown-editor/extensions/live-preview/handlers/paste-html-link.logic.ts:35 fn blockAwareText(root: Element): string L24
local src/lib/core/markdown-editor/extensions/live-preview/handlers/paste-html-link.logic.ts:65 fn escapeLinkLabel(text: string): string L3
## calls
call src/lib/core/markdown-editor/extensions/live-preview/handlers/paste-html-link.logic.ts:105 in htmlLinksToMarkdown -> src/lib/core/markdown-editor/extensions/live-preview/handlers/paste-html-link.logic.ts:escapeLinkLabel call
call src/lib/core/markdown-editor/extensions/live-preview/handlers/paste-html-link.logic.ts:110 in htmlLinksToMarkdown -> src/lib/core/markdown-editor/extensions/live-preview/handlers/paste-html-link.logic.ts:blockAwareText call

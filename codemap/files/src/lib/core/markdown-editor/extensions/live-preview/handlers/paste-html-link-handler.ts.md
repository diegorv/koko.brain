# file card src/lib/core/markdown-editor/extensions/live-preview/handlers/paste-html-link-handler.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/markdown-editor/extensions/live-preview/handlers/paste-html-link-handler.ts ' codemap/files
file src/lib/core/markdown-editor/extensions/live-preview/handlers/paste-html-link-handler.ts other L46 module src/lib/core/markdown-editor in1 t0
## imports
imp src/lib/core/markdown-editor/extensions/live-preview/handlers/paste-html-link-handler.ts:3 -> src/lib/core/markdown-editor/extensions/live-preview/handlers/paste-html-link.logic.ts htmlLinksToMarkdown
## imported-by
imp src/lib/core/markdown-editor/extensions/live-preview/live-preview.ts:32 -> src/lib/core/markdown-editor/extensions/live-preview/handlers/paste-html-link-handler.ts pasteHtmlLinkHandler
## reach
in2 src/lib/core/markdown-editor/extensions/live-preview/handlers/paste-html-link-handler.ts 1 files in 1 modules: src/lib/core/markdown-editor(1)
out2 src/lib/core/markdown-editor/extensions/live-preview/handlers/paste-html-link-handler.ts 0 files in 0 modules: -
## symbols
sym src/lib/core/markdown-editor/extensions/live-preview/handlers/paste-html-link-handler.ts:22 const pasteHtmlLinkHandler: Extension L25 | Paste handler that converts clipboard HTML anchors (`<a href>`) into markdown links on insert.
by src/lib/core/markdown-editor/extensions/live-preview/handlers/paste-html-link-handler.ts:pasteHtmlLinkHandler <- src/lib/core/markdown-editor/extensions/live-preview/live-preview.ts:104 in livePreviewExtensions ref
## calls
call src/lib/core/markdown-editor/extensions/live-preview/handlers/paste-html-link-handler.ts:28 in pasteHtmlLinkHandler -> src/lib/core/markdown-editor/extensions/live-preview/handlers/paste-html-link.logic.ts:htmlLinksToMarkdown call

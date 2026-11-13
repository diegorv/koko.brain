# file card src/lib/plugins/table-of-contents/toc.logic.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/plugins/table-of-contents/toc.logic.ts ' codemap/files
file src/lib/plugins/table-of-contents/toc.logic.ts logic L93 module src/lib/plugins/table-of-contents in1 t1
## imports
imp src/lib/plugins/table-of-contents/toc.logic.ts:1 -> src/lib/core/markdown-editor/extensions/wikilink/navigation.logic.ts HEADING_RE
imp src/lib/plugins/table-of-contents/toc.logic.ts:2 -> src/lib/plugins/table-of-contents/toc.types.ts type:TocHeading
## imported-by
imp src/lib/plugins/table-of-contents/toc.service.ts:2 -> src/lib/plugins/table-of-contents/toc.logic.ts extractTocHeadings
## reach
in2 src/lib/plugins/table-of-contents/toc.logic.ts 2 files in 2 modules: src/lib/app(1) src/lib/plugins/table-of-contents(1)
out2 src/lib/plugins/table-of-contents/toc.logic.ts 0 files in 0 modules: -
## tests
test src/tests/lib/plugins/table-of-contents/toc.logic.test.ts imports src/lib/plugins/table-of-contents/toc.logic.ts mirror
## symbols
sym src/lib/plugins/table-of-contents/toc.logic.ts:35 fn stripHeadingChrome(raw: string): string L14 | Strips markdown chrome (bold/italic/strike/inline-code, wikilinks, regular markdown links) and emoji codepoints from a heading text so the TOC panel shows the …
sym src/lib/plugins/table-of-contents/toc.logic.ts:63 fn extractTocHeadings(content: string): TocHeading[] L31 | Extracts every ATX heading (H1-H6) from markdown `content`.
by src/lib/plugins/table-of-contents/toc.logic.ts:extractTocHeadings <- src/lib/plugins/table-of-contents/toc.service.ts:14 in rebuildToc call
## calls
call src/lib/plugins/table-of-contents/toc.logic.ts:77 in extractTocHeadings -> src/lib/core/markdown-editor/extensions/wikilink/navigation.logic.ts:HEADING_RE mcall
call src/lib/plugins/table-of-contents/toc.logic.ts:82 in extractTocHeadings -> src/lib/plugins/table-of-contents/toc.logic.ts:stripHeadingChrome call

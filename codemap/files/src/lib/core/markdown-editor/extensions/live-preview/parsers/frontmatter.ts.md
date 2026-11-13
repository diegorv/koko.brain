# file card src/lib/core/markdown-editor/extensions/live-preview/parsers/frontmatter.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/markdown-editor/extensions/live-preview/parsers/frontmatter.ts ' codemap/files
file src/lib/core/markdown-editor/extensions/live-preview/parsers/frontmatter.ts other L32 module src/lib/core/markdown-editor in2 t2
## imported-by
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/frontmatter-field.ts:4 -> src/lib/core/markdown-editor/extensions/live-preview/parsers/frontmatter.ts findFrontmatterBlock
imp src/lib/core/markdown-editor/setup/editor-extensions.ts:30 -> src/lib/core/markdown-editor/extensions/live-preview/parsers/frontmatter.ts FRONTMATTER_FENCE_RE
## reach
in2 src/lib/core/markdown-editor/extensions/live-preview/parsers/frontmatter.ts 4 files in 2 modules: src/lib/core/markdown-editor(3) src/lib/app(1)
out2 src/lib/core/markdown-editor/extensions/live-preview/parsers/frontmatter.ts 0 files in 0 modules: -
## tests
test src/tests/lib/core/markdown-editor/extensions/live-preview/parsers/frontmatter.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/parsers/frontmatter.ts mirror
test src/tests/lib/core/markdown-editor/extensions/live-preview/parsers/combined-block-structures.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/parsers/frontmatter.ts
## symbols
sym src/lib/core/markdown-editor/extensions/live-preview/parsers/frontmatter.ts:2 interface FrontmatterBlock L6 | Line range of a frontmatter block at the start of a document
sym src/lib/core/markdown-editor/extensions/live-preview/parsers/frontmatter.ts:10 const FRONTMATTER_FENCE_RE L1 | Matches the opening/closing `---` fence of a YAML frontmatter block
by src/lib/core/markdown-editor/extensions/live-preview/parsers/frontmatter.ts:FRONTMATTER_FENCE_RE <- src/lib/core/markdown-editor/setup/editor-extensions.ts:177 in createExtensions mcall +1
sym src/lib/core/markdown-editor/extensions/live-preview/parsers/frontmatter.ts:17 fn findFrontmatterBlock(lines: { text: string; from: number; to: number }[]): FrontmatterBlock | null L16 | Finds a YAML frontmatter block at the beginning of a document.
by src/lib/core/markdown-editor/extensions/live-preview/parsers/frontmatter.ts:findFrontmatterBlock <- src/lib/core/markdown-editor/extensions/live-preview/plugins/frontmatter-field.ts:17 in computeFrontmatter call +1

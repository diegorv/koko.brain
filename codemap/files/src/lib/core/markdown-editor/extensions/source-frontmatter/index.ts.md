# file card src/lib/core/markdown-editor/extensions/source-frontmatter/index.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/markdown-editor/extensions/source-frontmatter/index.ts ' codemap/files
file src/lib/core/markdown-editor/extensions/source-frontmatter/index.ts other L1 module src/lib/core/markdown-editor in1 t0
## imports
imp src/lib/core/markdown-editor/extensions/source-frontmatter/index.ts:1 -> src/lib/core/markdown-editor/extensions/source-frontmatter/source-frontmatter.ts sourceFrontmatter
## imported-by
imp src/lib/core/markdown-editor/setup/editor-extensions.ts:23 -> src/lib/core/markdown-editor/extensions/source-frontmatter/index.ts sourceFrontmatter
## reach
in2 src/lib/core/markdown-editor/extensions/source-frontmatter/index.ts 3 files in 2 modules: src/lib/core/markdown-editor(2) src/lib/app(1)
out2 src/lib/core/markdown-editor/extensions/source-frontmatter/index.ts 2 files in 1 modules: src/lib/core/markdown-editor(2)
## symbols
sym src/lib/core/markdown-editor/extensions/source-frontmatter/index.ts:1 reexport sourceFrontmatter = src/lib/core/markdown-editor/extensions/source-frontmatter/source-frontmatter.ts:sourceFrontmatter L1

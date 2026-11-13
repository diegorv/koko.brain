# file card src/lib/core/markdown-editor/highlight-styles.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/markdown-editor/highlight-styles.ts ' codemap/files
file src/lib/core/markdown-editor/highlight-styles.ts other L134 module src/lib/core/markdown-editor in2 t10
## imports
imp src/lib/core/markdown-editor/highlight-styles.ts:9 -> src/lib/core/markdown-editor/extensions/lezer/math-extension.ts MathExtension
imp src/lib/core/markdown-editor/highlight-styles.ts:10 -> src/lib/core/markdown-editor/extensions/lezer/highlight-extension.ts HighlightExtension
imp src/lib/core/markdown-editor/highlight-styles.ts:11 -> src/lib/core/filesystem/fs.logic.ts getLanguageForFile
imp src/lib/core/markdown-editor/highlight-styles.ts:12 -> src/lib/utils/font-stacks.ts MONO_FONT_STACK
## imported-by
imp src/lib/core/markdown-editor/MarkdownEditor.svelte:36 -> src/lib/core/markdown-editor/highlight-styles.ts getLanguageEffects,getLanguageEffectsSync
imp src/lib/core/markdown-editor/setup/editor-extensions.ts:25 -> src/lib/core/markdown-editor/highlight-styles.ts markdownHighlight,markdownLanguage,sourceHeadingSize
## reach
in2 src/lib/core/markdown-editor/highlight-styles.ts 3 files in 2 modules: src/lib/app(2) src/lib/core/markdown-editor(1)
out2 src/lib/core/markdown-editor/highlight-styles.ts 2 files in 2 modules: src/lib/core/filesystem(1) src/lib/utils(1)
## tests
test src/tests/lib/core/markdown-editor/highlight-styles.test.ts imports src/lib/core/markdown-editor/highlight-styles.ts mirror
test src/tests/lib/core/markdown-editor/extensions/live-preview/arrow-reveal.test.ts imports src/lib/core/markdown-editor/highlight-styles.ts
test src/tests/lib/core/markdown-editor/extensions/live-preview/core/block-band-click.test.ts imports src/lib/core/markdown-editor/highlight-styles.ts
test src/tests/lib/core/markdown-editor/extensions/live-preview/decorator-toggles.test.ts imports src/lib/core/markdown-editor/highlight-styles.ts
test src/tests/lib/core/markdown-editor/extensions/live-preview/inline/pipeline-dom.test.ts imports src/lib/core/markdown-editor/highlight-styles.ts
test src/tests/lib/core/markdown-editor/extensions/live-preview/invariants-harness.test.ts imports src/lib/core/markdown-editor/highlight-styles.ts
test src/tests/lib/core/markdown-editor/extensions/live-preview/plugins/frontmatter-field-click.test.ts imports src/lib/core/markdown-editor/highlight-styles.ts
test src/tests/lib/core/markdown-editor/extensions/live-preview/plugins/frontmatter-field-keyboard.test.ts imports src/lib/core/markdown-editor/highlight-styles.ts
test src/tests/lib/core/markdown-editor/extensions/live-preview/widgets/math-widget.test.ts imports src/lib/core/markdown-editor/highlight-styles.ts
test src/tests/lib/core/markdown-editor/heading-fallbacks.test.ts imports src/lib/core/markdown-editor/highlight-styles.ts
## symbols
sym src/lib/core/markdown-editor/highlight-styles.ts:21 const markdownHighlight = HighlightStyle.define(…) L24 | Syntax highlight style for markdown documents (headings, emphasis, links, etc.).
by src/lib/core/markdown-editor/highlight-styles.ts:markdownHighlight <- src/lib/core/markdown-editor/setup/editor-extensions.ts:171 in createExtensions ref
sym src/lib/core/markdown-editor/highlight-styles.ts:51 const sourceHeadingSize = HighlightStyle.define(…) L8 | Heading font size for source mode, installed only by `sourceModeExtensions()`.
by src/lib/core/markdown-editor/highlight-styles.ts:sourceHeadingSize <- src/lib/core/markdown-editor/setup/editor-extensions.ts:105 in sourceModeExtensions ref
sym src/lib/core/markdown-editor/highlight-styles.ts:61 const codeHighlight = HighlightStyle.define(…) L23 | Syntax highlight style for code files (JS, TS, Python, Rust, etc.)
sym src/lib/core/markdown-editor/highlight-styles.ts:86 fn markdownLanguage() L3 | Default markdown language extension with GFM, math, and highlight support
by src/lib/core/markdown-editor/highlight-styles.ts:markdownLanguage <- src/lib/core/markdown-editor/setup/editor-extensions.ts:167 in createExtensions call
sym src/lib/core/markdown-editor/highlight-styles.ts:102 fn getLanguageEffectsSync(fileName: string, languageCompartment: Compartment, highlightStyleCompartment: Compartment): StateEffect<unknown>[] | … L12 | Synchronous fast-path: returns reconfigure effects for files that don't need async language loading (markdown, kanban — they reuse the already-bundled markdown…
by src/lib/core/markdown-editor/highlight-styles.ts:getLanguageEffectsSync <- src/lib/core/markdown-editor/MarkdownEditor.svelte:502 in $effect@455 call
sym src/lib/core/markdown-editor/highlight-styles.ts:121 fn getLanguageEffects(fileName: string, languageCompartment: Compartment, highlightStyleCompartment: Compartment): Promise<StateEffect<unkno… L14 | Returns the StateEffect[] to reconfigure language parser and highlight style for the given file.
by src/lib/core/markdown-editor/highlight-styles.ts:getLanguageEffects <- src/lib/core/markdown-editor/MarkdownEditor.svelte:86 in applyLanguageForTab call
## calls
call src/lib/core/markdown-editor/highlight-styles.ts:107 in getLanguageEffectsSync -> src/lib/core/filesystem/fs.logic.ts:getLanguageForFile call
call src/lib/core/markdown-editor/highlight-styles.ts:110 in getLanguageEffectsSync -> src/lib/core/markdown-editor/highlight-styles.ts:markdownLanguage call
call src/lib/core/markdown-editor/highlight-styles.ts:126 in getLanguageEffects -> src/lib/core/markdown-editor/highlight-styles.ts:getLanguageEffectsSync call
call src/lib/core/markdown-editor/highlight-styles.ts:128 in getLanguageEffects -> src/lib/core/filesystem/fs.logic.ts:getLanguageForFile call

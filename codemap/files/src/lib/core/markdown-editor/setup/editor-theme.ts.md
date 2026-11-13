# file card src/lib/core/markdown-editor/setup/editor-theme.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/markdown-editor/setup/editor-theme.ts ' codemap/files
file src/lib/core/markdown-editor/setup/editor-theme.ts other L93 module src/lib/core/markdown-editor in2 t1
## imports
imp src/lib/core/markdown-editor/setup/editor-theme.ts:4 -> src/lib/utils/font-stacks.ts editorFontFamily
## imported-by
imp src/lib/core/markdown-editor/setup/editor-extensions.ts:29 -> src/lib/core/markdown-editor/setup/editor-theme.ts buildEditorTheme
imp src/lib/core/markdown-editor/setup/index.ts:1 -> src/lib/core/markdown-editor/setup/editor-theme.ts buildEditorTheme
## reach
in2 src/lib/core/markdown-editor/setup/editor-theme.ts 2 files in 2 modules: src/lib/app(1) src/lib/core/markdown-editor(1)
out2 src/lib/core/markdown-editor/setup/editor-theme.ts 0 files in 0 modules: -
## tests
test src/tests/lib/core/markdown-editor/setup/editor-theme.test.ts imports src/lib/core/markdown-editor/setup/editor-theme.ts mirror
## symbols
sym src/lib/core/markdown-editor/setup/editor-theme.ts:12 fn buildEditorTheme(fontFamily: string, fontSize: number, lineHeight: number, contentWidth: number, paragraphSpacing: number, dark: boolea… L82 | Builds a CodeMirror theme from the current editor settings.
by src/lib/core/markdown-editor/setup/editor-theme.ts:buildEditorTheme <- src/lib/core/markdown-editor/MarkdownEditor.svelte:235 in showTabState call +1
by src/lib/core/markdown-editor/setup/editor-theme.ts:buildEditorTheme <- src/lib/core/markdown-editor/setup/editor-extensions.ts:169 in createExtensions call
## calls
call src/lib/core/markdown-editor/setup/editor-theme.ts:33 in buildEditorTheme -> src/lib/utils/font-stacks.ts:editorFontFamily call

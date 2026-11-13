# file card src/lib/utils/font-stacks.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/utils/font-stacks.ts ' codemap/files
file src/lib/utils/font-stacks.ts other L56 module src/lib/utils in5 t5 | Font stacks shared by every place that sets a `font-family` from TypeScript, so code and app text render in one face per role on every machine.
## imported-by
imp src/lib/core/markdown-editor/extensions/live-preview/styles.ts:3 -> src/lib/utils/font-stacks.ts MONO_FONT_STACK
imp src/lib/core/markdown-editor/highlight-styles.ts:12 -> src/lib/utils/font-stacks.ts MONO_FONT_STACK
imp src/lib/core/markdown-editor/setup/editor-theme.ts:4 -> src/lib/utils/font-stacks.ts editorFontFamily
imp src/lib/core/settings/sections/EditorSection.svelte:8 -> src/lib/utils/font-stacks.ts quoteFontFamily
imp src/lib/plugins/queryjs/kb-ui.ts:26 -> src/lib/utils/font-stacks.ts APP_SANS_FONT_STACK
## reach
in2 src/lib/utils/font-stacks.ts 21 files in 3 modules: src/lib/core/markdown-editor(19) src/lib/app(1) src/lib/plugins/queryjs(1)
out2 src/lib/utils/font-stacks.ts 0 files in 0 modules: -
## tests
test src/tests/lib/utils/font-stacks.test.ts imports src/lib/utils/font-stacks.ts mirror
test src/tests/lib/core/markdown-editor/extensions/live-preview/styles.test.ts imports src/lib/utils/font-stacks.ts
test src/tests/lib/core/markdown-editor/highlight-styles.test.ts imports src/lib/utils/font-stacks.ts
test src/tests/lib/core/markdown-editor/setup/editor-theme.test.ts imports src/lib/utils/font-stacks.ts
test src/tests/lib/plugins/queryjs/kb-ui.test.ts imports src/lib/utils/font-stacks.ts
## symbols
sym src/lib/utils/font-stacks.ts:7 const MONO_FONT_STACK L1 | Monospace stack for inline code, code blocks and code-like labels.
by src/lib/utils/font-stacks.ts:MONO_FONT_STACK <- src/lib/core/markdown-editor/extensions/live-preview/styles.ts:297 in livePreviewStyles ref +5
by src/lib/utils/font-stacks.ts:MONO_FONT_STACK <- src/lib/core/markdown-editor/highlight-styles.ts:35 in markdownHighlight ref
sym src/lib/utils/font-stacks.ts:13 const APP_SANS_FONT_STACK L1 | App sans stack.
by src/lib/utils/font-stacks.ts:APP_SANS_FONT_STACK <- src/lib/plugins/queryjs/kb-ui.ts:746 in KBUI.heatmapCalendar ref +1
sym src/lib/utils/font-stacks.ts:39 fn quoteFontFamily(value: string): string L8 | Makes a `font-family` value safe for CSS.
by src/lib/utils/font-stacks.ts:quoteFontFamily <- src/lib/core/settings/sections/EditorSection.svelte:74 in (markup) markup
sym src/lib/utils/font-stacks.ts:53 fn editorFontFamily(value: string): string L4 | The editor `font-family`: the user's value (quoted when it is a single name) followed by the app sans stack, so a font the machine lacks falls back to the syst…
by src/lib/utils/font-stacks.ts:editorFontFamily <- src/lib/core/markdown-editor/setup/editor-theme.ts:33 in buildEditorTheme call
## calls
call src/lib/utils/font-stacks.ts:54 in editorFontFamily -> src/lib/utils/font-stacks.ts:quoteFontFamily call

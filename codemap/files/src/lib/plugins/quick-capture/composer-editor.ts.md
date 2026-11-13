# file card src/lib/plugins/quick-capture/composer-editor.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/plugins/quick-capture/composer-editor.ts ' codemap/files
file src/lib/plugins/quick-capture/composer-editor.ts other L158 module src/lib/plugins/quick-capture in1 t1
## imports
imp src/lib/plugins/quick-capture/composer-editor.ts:5 -> src/lib/core/markdown-editor/editor-host.ts editorHost,type:EditorHost
imp src/lib/plugins/quick-capture/composer-editor.ts:6 -> src/lib/core/markdown-editor/extensions/tag/completion.ts tagCompletionSource
imp src/lib/plugins/quick-capture/composer-editor.ts:7 -> src/lib/core/markdown-editor/extensions/wikilink/completion.ts wikilinkCompletionSource
imp src/lib/plugins/quick-capture/composer-editor.ts:8 -> src/lib/core/markdown-editor/setup/editor-theme.ts buildEditorTheme
## imported-by
imp src/routes/composer/+page.svelte:10 -> src/lib/plugins/quick-capture/composer-editor.ts createComposerEditor,setComposerDark,setComposerText
## reach
in2 src/lib/plugins/quick-capture/composer-editor.ts 0 files in 0 modules: -
out2 src/lib/plugins/quick-capture/composer-editor.ts 8 files in 4 modules: src/lib/core/markdown-editor(3) src/lib/core/filesystem(2) src/lib/utils(2) src/lib/types(1)
## tests
test src/tests/lib/plugins/quick-capture/composer-editor.test.ts imports src/lib/plugins/quick-capture/composer-editor.ts mirror
## symbols
sym src/lib/plugins/quick-capture/composer-editor.ts:11 interface ComposerEditorOptions L14 | Options of `createComposerEditor`.
sym src/lib/plugins/quick-capture/composer-editor.ts:88 fn createComposerEditor(opts: ComposerEditorOptions): EditorView L47 | The text field of the Quick Capture composer: plain text, with the editor's `[[wikilink]]` and `#tag` completion.
by src/lib/plugins/quick-capture/composer-editor.ts:createComposerEditor <- src/routes/composer/+page.svelte:202 in (script) call
sym src/lib/plugins/quick-capture/composer-editor.ts:143 fn setComposerText(view: EditorView, text: string): void L10 | Replaces the whole text, with the cursor at the end, when it differs.
by src/lib/plugins/quick-capture/composer-editor.ts:setComposerText <- src/routes/composer/+page.svelte:46 in setText call
sym src/lib/plugins/quick-capture/composer-editor.ts:155 fn setComposerDark(view: EditorView, dark: boolean): void L4 | Switches the editor theme between its light and dark base.
by src/lib/plugins/quick-capture/composer-editor.ts:setComposerDark <- src/routes/composer/+page.svelte:163 in onStorage call +1
## locals
local src/lib/plugins/quick-capture/composer-editor.ts:64 fn composerTheme(dark: boolean) L3
local src/lib/plugins/quick-capture/composer-editor.ts:75 fn listShown(view: EditorView): boolean L3
## calls
call src/lib/plugins/quick-capture/composer-editor.ts:60 in composerThemes -> src/lib/core/markdown-editor/setup/editor-theme.ts:buildEditorTheme call +1
call src/lib/plugins/quick-capture/composer-editor.ts:93 in createComposerEditor -> src/lib/plugins/quick-capture/composer-editor.ts:listShown call
call src/lib/plugins/quick-capture/composer-editor.ts:108 in createComposerEditor -> src/lib/core/markdown-editor/editor-host.ts:editorHost mcall
call src/lib/plugins/quick-capture/composer-editor.ts:112 in createComposerEditor -> src/lib/core/markdown-editor/extensions/tag/completion.ts:tagCompletionSource ref
call src/lib/plugins/quick-capture/composer-editor.ts:112 in createComposerEditor -> src/lib/core/markdown-editor/extensions/wikilink/completion.ts:wikilinkCompletionSource ref
call src/lib/plugins/quick-capture/composer-editor.ts:127 in createComposerEditor -> src/lib/plugins/quick-capture/composer-editor.ts:composerTheme call
call src/lib/plugins/quick-capture/composer-editor.ts:157 in setComposerDark -> src/lib/plugins/quick-capture/composer-editor.ts:composerTheme call
## effects
reg src/lib/plugins/quick-capture/composer-editor.ts:108 src/lib/core/markdown-editor/editor-host.ts:editorHost in createComposerEditor args=opts.host

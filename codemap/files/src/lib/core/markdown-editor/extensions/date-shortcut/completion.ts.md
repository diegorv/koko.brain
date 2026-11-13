# file card src/lib/core/markdown-editor/extensions/date-shortcut/completion.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/markdown-editor/extensions/date-shortcut/completion.ts ' codemap/files
file src/lib/core/markdown-editor/extensions/date-shortcut/completion.ts other L35 module src/lib/core/markdown-editor in1 t0
## imports
imp src/lib/core/markdown-editor/extensions/date-shortcut/completion.ts:2 -> src/lib/core/markdown-editor/extensions/date-shortcut/completion.logic.ts detectDateShortcut,dateForToken
## imported-by
imp src/lib/core/markdown-editor/setup/editor-extensions.ts:20 -> src/lib/core/markdown-editor/extensions/date-shortcut/completion.ts dateShortcutCompletionSource
## reach
in2 src/lib/core/markdown-editor/extensions/date-shortcut/completion.ts 3 files in 2 modules: src/lib/core/markdown-editor(2) src/lib/app(1)
out2 src/lib/core/markdown-editor/extensions/date-shortcut/completion.ts 1 files in 1 modules: src/lib/utils(1)
## symbols
sym src/lib/core/markdown-editor/extensions/date-shortcut/completion.ts:18 fn dateShortcutCompletionSource(context: CompletionContext): CompletionResult | null L18 | Completion source for `@today` / `@tomorrow` / `@yesterday` date shortcuts.
by src/lib/core/markdown-editor/extensions/date-shortcut/completion.ts:dateShortcutCompletionSource <- src/lib/core/markdown-editor/setup/editor-extensions.ts:143 in createExtensions ref
## calls
call src/lib/core/markdown-editor/extensions/date-shortcut/completion.ts:21 in dateShortcutCompletionSource -> src/lib/core/markdown-editor/extensions/date-shortcut/completion.logic.ts:detectDateShortcut call
call src/lib/core/markdown-editor/extensions/date-shortcut/completion.ts:25 in dateShortcutCompletionSource -> src/lib/core/markdown-editor/extensions/date-shortcut/completion.logic.ts:dateForToken call

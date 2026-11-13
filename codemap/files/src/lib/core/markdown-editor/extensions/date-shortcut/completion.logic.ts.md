# file card src/lib/core/markdown-editor/extensions/date-shortcut/completion.logic.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/markdown-editor/extensions/date-shortcut/completion.logic.ts ' codemap/files
file src/lib/core/markdown-editor/extensions/date-shortcut/completion.logic.ts logic L46 module src/lib/core/markdown-editor in1 t1
## imports
imp src/lib/core/markdown-editor/extensions/date-shortcut/completion.logic.ts:1 -> src/lib/utils/date.ts formatNow
## imported-by
imp src/lib/core/markdown-editor/extensions/date-shortcut/completion.ts:2 -> src/lib/core/markdown-editor/extensions/date-shortcut/completion.logic.ts detectDateShortcut,dateForToken
## reach
in2 src/lib/core/markdown-editor/extensions/date-shortcut/completion.logic.ts 1 files in 1 modules: src/lib/core/markdown-editor(1)
out2 src/lib/core/markdown-editor/extensions/date-shortcut/completion.logic.ts 0 files in 0 modules: -
## tests
test src/tests/lib/core/markdown-editor/extensions/date-shortcut/completion.logic.test.ts imports src/lib/core/markdown-editor/extensions/date-shortcut/completion.logic.ts mirror
## symbols
sym src/lib/core/markdown-editor/extensions/date-shortcut/completion.logic.ts:4 const DATE_SHORTCUT_TOKENS L1 | Tokens recognised after `@`, in popup order.
sym src/lib/core/markdown-editor/extensions/date-shortcut/completion.logic.ts:7 type DateShortcutToken L1 | One of the recognised date-shortcut tokens.
sym src/lib/core/markdown-editor/extensions/date-shortcut/completion.logic.ts:10 interface DateShortcutMatch L6 | Result of a successful `@token` detection at the cursor.
sym src/lib/core/markdown-editor/extensions/date-shortcut/completion.logic.ts:25 fn detectDateShortcut(text: string, pos: number): DateShortcutMatch | null L10 | Detects an `@token` date shortcut ending at `pos`.
by src/lib/core/markdown-editor/extensions/date-shortcut/completion.logic.ts:detectDateShortcut <- src/lib/core/markdown-editor/extensions/date-shortcut/completion.ts:21 in dateShortcutCompletionSource call
sym src/lib/core/markdown-editor/extensions/date-shortcut/completion.logic.ts:37 fn dateForToken(token: DateShortcutToken): string L10 | Resolves a token to its `YYYY-MM-DD` date string (relative to now).
by src/lib/core/markdown-editor/extensions/date-shortcut/completion.logic.ts:dateForToken <- src/lib/core/markdown-editor/extensions/date-shortcut/completion.ts:25 in dateShortcutCompletionSource call
## calls
call src/lib/core/markdown-editor/extensions/date-shortcut/completion.logic.ts:40 in dateForToken -> src/lib/utils/date.ts:formatNow call +2

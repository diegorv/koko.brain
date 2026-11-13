# file card src/lib/utils/keybindings.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/utils/keybindings.ts ' codemap/files
file src/lib/utils/keybindings.ts other L81 module src/lib/utils in5 t4
## imported-by
imp src/lib/app/global-keybindings.ts:1 -> src/lib/utils/keybindings.ts registerKeybinding,type:KeyBinding,type:KeyCombo
imp src/lib/core/markdown-editor/MarkdownEditor.svelte:33 -> src/lib/utils/keybindings.ts formatShortcut
imp src/lib/core/markdown-editor/setup/editor-extensions.ts:26 -> src/lib/utils/keybindings.ts toCodeMirrorKey
imp src/lib/features/command-palette/CommandPalette.svelte:4 -> src/lib/utils/keybindings.ts formatShortcut
imp src/lib/features/note-list/NoteRowMenu.svelte:28 -> src/lib/utils/keybindings.ts formatShortcut
## reach
in2 src/lib/utils/keybindings.ts 6 files in 4 modules: src/lib/app(3) src/lib/core/markdown-editor(1) src/lib/features/rail-shell(1) src/routes(1)
out2 src/lib/utils/keybindings.ts 0 files in 0 modules: -
## tests
test src/tests/lib/utils/keybindings.test.ts imports src/lib/utils/keybindings.ts mirror
test src/tests/lib/app/commands.test.ts imports src/lib/utils/keybindings.ts
test src/tests/lib/core/markdown-editor/MarkdownEditor.test.ts imports src/lib/utils/keybindings.ts
test src/tests/lib/app/global-keybindings.test.ts mocks src/lib/utils/keybindings.ts
## symbols
sym src/lib/utils/keybindings.ts:2 interface KeyBinding L9 | Describes a keyboard shortcut with modifier keys and a handler callback.
by src/lib/utils/keybindings.ts:KeyBinding <- src/lib/app/global-keybindings.ts:1 in (module) import
sym src/lib/utils/keybindings.ts:13 type KeyCombo L1 | The key and modifiers of a binding, without its handler.
by src/lib/utils/keybindings.ts:KeyCombo <- src/lib/app/global-keybindings.ts:1 in (module) import
sym src/lib/utils/keybindings.ts:19 fn toCodeMirrorKey(combo: KeyCombo & { key: string }): string L9 | Writes a combo as a CodeMirror keymap key (`Mod-Shift-l`).
by src/lib/utils/keybindings.ts:toCodeMirrorKey <- src/lib/core/markdown-editor/setup/editor-extensions.ts:152 in createExtensions call
sym src/lib/utils/keybindings.ts:40 fn formatShortcut(combo: KeyCombo): string L15 | Writes a combo as the macOS hint shown next to a command or menu item (`⌘⇧L`): modifiers in the order Ctrl, Cmd, Shift, Option, then the key.
by src/lib/utils/keybindings.ts:formatShortcut <- src/lib/core/markdown-editor/MarkdownEditor.svelte:755 in (markup) markup
by src/lib/utils/keybindings.ts:formatShortcut <- src/lib/features/command-palette/CommandPalette.svelte:62 in (markup) markup
by src/lib/utils/keybindings.ts:formatShortcut <- src/lib/features/note-list/NoteRowMenu.svelte:280 in (markup) markup
sym src/lib/utils/keybindings.ts:57 fn registerKeybinding(binding: KeyBinding): () => void L25 | Registers a global keyboard shortcut.
by src/lib/utils/keybindings.ts:registerKeybinding <- src/lib/app/global-keybindings.ts:224 in registerGlobalKeybindings call
## effects
fx src/lib/utils/keybindings.ts:76 dom.keydown document in registerKeybinding

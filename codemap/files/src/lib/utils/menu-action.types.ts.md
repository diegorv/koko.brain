# file card src/lib/utils/menu-action.types.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/utils/menu-action.types.ts ' codemap/files
file src/lib/utils/menu-action.types.ts types L21 module src/lib/utils in2 t0
## imported-by
imp src/lib/features/note-list/NoteRowMenu.svelte:29 -> src/lib/utils/menu-action.types.ts type:MenuActionItem
imp src/lib/features/rail-shell/rail-shell.types.ts:220 -> src/lib/utils/menu-action.types.ts type:MenuActionTarget,type:MenuActionItem
## reach
in2 src/lib/utils/menu-action.types.ts 15 files in 2 modules: src/lib/features/rail-shell(13) src/lib/plugins/calendar(2)
out2 src/lib/utils/menu-action.types.ts 0 files in 0 modules: -
## symbols
sym src/lib/utils/menu-action.types.ts:2 interface MenuActionTarget L6 | The clicked note or folder, captured when a menu action is invoked.
sym src/lib/utils/menu-action.types.ts:10 interface MenuActionItem L12 | A flat action in note-row or folder menus; rendering reads data only.
by src/lib/utils/menu-action.types.ts:MenuActionItem <- src/lib/features/note-list/NoteRowMenu.svelte:29 in (script) import
by src/lib/utils/menu-action.types.ts:MenuActionItem <- src/lib/features/rail-shell/rail-registry.store.svelte.ts:1 in (module) import

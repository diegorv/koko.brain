# file card src/lib/features/rail-shell/kind-icons.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/rail-shell/kind-icons.ts ' codemap/files
file src/lib/features/rail-shell/kind-icons.ts other L24 module src/lib/features/rail-shell in2 t0
## imports
imp src/lib/features/rail-shell/kind-icons.ts:9 -> src/lib/features/rail-shell/rail-shell.types.ts type:FileKind
## imported-by
imp src/lib/features/quick-switcher/QuickSwitcher.svelte:19 -> src/lib/features/rail-shell/kind-icons.ts KIND_ICONS
imp src/lib/features/rail-shell/RailNoteList.svelte:106 -> src/lib/features/rail-shell/kind-icons.ts KIND_ICONS
## reach
in2 src/lib/features/rail-shell/kind-icons.ts 2 files in 1 modules: src/lib/app(2)
out2 src/lib/features/rail-shell/kind-icons.ts 5 files in 5 modules: src/lib/core/filesystem(1) src/lib/features/note-list(1) src/lib/features/type-definitions(1) src/lib/types(1) src/lib/utils(1)
## symbols
sym src/lib/features/rail-shell/kind-icons.ts:16 const KIND_ICONS: Record<FileKind, Component> L9 | The row icon of each file kind when the file has no icon of its own (the file tree's kind icons).
by src/lib/features/rail-shell/kind-icons.ts:KIND_ICONS <- src/lib/features/quick-switcher/QuickSwitcher.svelte:135 in (markup) markup
by src/lib/features/rail-shell/kind-icons.ts:KIND_ICONS <- src/lib/features/rail-shell/RailNoteList.svelte:1168 in (markup) markup

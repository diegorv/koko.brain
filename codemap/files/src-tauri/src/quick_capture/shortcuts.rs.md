# file card src-tauri/src/quick_capture/shortcuts.rs
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src-tauri/src/quick_capture/shortcuts.rs ' codemap/files
file src-tauri/src/quick_capture/shortcuts.rs rust L79 module src-tauri/src/quick_capture in1 t0 t:inline | Global-shortcut intent registry.
## imported-by
imp src-tauri/src/lib.rs:27 -> src-tauri/src/quick_capture/shortcuts.rs default_registry,ShortcutBinding,ShortcutId
## reach
in2 src-tauri/src/quick_capture/shortcuts.rs 1 files in 1 modules: src-tauri/src(1)
out2 src-tauri/src/quick_capture/shortcuts.rs 0 files in 0 modules: -
## symbols
sym src-tauri/src/quick_capture/shortcuts.rs:14 enum ShortcutId L4 | Closed set of shortcut intents wired in this merge.
by src-tauri/src/quick_capture/shortcuts.rs:ShortcutId <- src-tauri/src/lib.rs:40 in dispatch_shortcut ref +2
sym src-tauri/src/quick_capture/shortcuts.rs:21 struct ShortcutBinding L4 | One row in the registry: which accelerator triggers it.
by src-tauri/src/quick_capture/shortcuts.rs:ShortcutBinding <- src-tauri/src/lib.rs:257 in run ref
sym src-tauri/src/quick_capture/shortcuts.rs:28 fn default_registry() -> Vec<ShortcutBinding> L12 | Default Phase 1 registry.
by src-tauri/src/quick_capture/shortcuts.rs:default_registry <- src-tauri/src/lib.rs:257 in run lexical

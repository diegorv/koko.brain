# file card src-tauri/src/commands/fonts.rs
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src-tauri/src/commands/fonts.rs ' codemap/files
file src-tauri/src/commands/fonts.rs rust L113 module src-tauri/src/commands in1 t0 t:inline
## imported-by
imp src-tauri/src/lib.rs:389 -> src-tauri/src/commands/fonts.rs list_system_fonts
## reach
in2 src-tauri/src/commands/fonts.rs 1 files in 1 modules: src-tauri/src(1)
out2 src-tauri/src/commands/fonts.rs 0 files in 0 modules: -
## symbols
sym src-tauri/src/commands/fonts.rs:6 cmd list_system_fonts() -> Result<Vec<String>, String> L70 | Returns a sorted list of all available font family names on the system.
by src-tauri/src/commands/fonts.rs:list_system_fonts <- src-tauri/src/lib.rs:389 in run import
## ipc-in
ipc-call src/lib/core/settings/sections/EditorSection.svelte:20 in (script) -> ipc:list_system_fonts -> src-tauri/src/commands/fonts.rs:6

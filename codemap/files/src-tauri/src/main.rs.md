# file card src-tauri/src/main.rs
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src-tauri/src/main.rs ' codemap/files
file src-tauri/src/main.rs rust L6 module src-tauri/src in0 t0
## imports
imp src-tauri/src/main.rs:5 -> src-tauri/src/lib.rs run
## reach
in2 src-tauri/src/main.rs 0 files in 0 modules: -
out2 src-tauri/src/main.rs 23 files in 6 modules: src-tauri/src/commands(13) src-tauri/src/quick_capture(4) src-tauri/src(2) src-tauri/src/vault(2) src-tauri/src/db(1) +1 modules
## locals
local src-tauri/src/main.rs:4 fn main() L3
## calls
call src-tauri/src/main.rs:5 in main -> src-tauri/src/lib.rs:run lexical

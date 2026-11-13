# effects disk-write: one fx line per site, by sink, file, line
cols: fx <loc> <sink> [<arg>] in <enclosing> · grep: grep -F -- ' <sink> ' codemap/effects/disk-write.md
fx src-tauri/src/utils/fs.rs:5 rust-fs.write in write_atomic
fx src/lib/core/notes/notes.service.ts:9 tauri-fs.writeTextFile in writeNote

# effects spawn: one fx line per site, by sink, file, line
cols: fx <loc> <sink> [<arg>] in <enclosing> · grep: grep -F -- ' <sink> ' codemap/effects/spawn.md
fx src-tauri/src/commands/semantic.rs:324 rust-spawn.spawn in schedule_reranker_unload
fx src-tauri/src/commands/semantic.rs:336 rust-spawn.spawn in schedule_embedder_unload
fx src-tauri/src/quick_capture/commands.rs:378 rust-spawn.spawn in schedule_refocus_after_space_move
fx src-tauri/src/vault/watcher.rs:287 rust-spawn.spawn in start_watcher_inner

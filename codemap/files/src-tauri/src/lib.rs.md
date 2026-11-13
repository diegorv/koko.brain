# file card src-tauri/src/lib.rs
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src-tauri/src/lib.rs ' codemap/files
sections: imports, imported-by, reach, symbols, locals, calls, effects
file src-tauri/src/lib.rs rust L406 module src-tauri/src in1 t0
## imports
imp src-tauri/src/lib.rs:19 -> src-tauri/src/commands/app_exit.rs exit_decision,ExitDecision,ExitFlushState,MAIN_WINDOW_LABEL
imp src-tauri/src/lib.rs:20 -> src-tauri/src/events.rs APP_EXIT_REQUESTED_EVENT,MENU_SETTINGS_EVENT,QC_CAPTURE_DETECTED_EVENT,TAURI_DEBUG_LOG_EVENT
imp src-tauri/src/lib.rs:23 -> src-tauri/src/quick_capture/clipboard.rs SystemClipboard
imp src-tauri/src/lib.rs:24 -> src-tauri/src/quick_capture/commands.rs capture_clipboard_now_with,show_composer,COMPOSER_WINDOW_LABEL,LastCaptureSignature
imp src-tauri/src/lib.rs:27 -> src-tauri/src/quick_capture/shortcuts.rs default_registry,ShortcutBinding,ShortcutId
imp src-tauri/src/lib.rs:28 -> src-tauri/src/quick_capture/source.rs frontmost_bundle_id,resolve_context_for_bundle,PrevFrontmostPid
imp src-tauri/src/lib.rs:31 -> src-tauri/src/utils/logger.rs set_log_sink,DebugLogPayload
imp src-tauri/src/lib.rs:32 -> src-tauri/src/vault/watcher.rs VaultWatcherState
imp src-tauri/src/lib.rs:33 -> src-tauri/src/vault/mod.rs VaultIndexState
imp src-tauri/src/lib.rs:34 -> src-tauri/src/error_monitoring.rs SentryState
imp src-tauri/src/lib.rs:45 -> src-tauri/src/db/mod.rs is_open
imp src-tauri/src/lib.rs:326 -> src-tauri/src/commands/db.rs open_vault_db
imp src-tauri/src/lib.rs:327 -> src-tauri/src/commands/db.rs close_vault_db
imp src-tauri/src/lib.rs:328 -> src-tauri/src/commands/history.rs save_snapshot
imp src-tauri/src/lib.rs:329 -> src-tauri/src/commands/history.rs get_file_history
imp src-tauri/src/lib.rs:330 -> src-tauri/src/commands/history.rs get_snapshot_content
imp src-tauri/src/lib.rs:331 -> src-tauri/src/commands/history.rs compute_diff
imp src-tauri/src/lib.rs:332 -> src-tauri/src/commands/history.rs cleanup_history
imp src-tauri/src/lib.rs:333 -> src-tauri/src/commands/todoist.rs todoist_read_kv
imp src-tauri/src/lib.rs:334 -> src-tauri/src/commands/todoist.rs todoist_read_links
imp src-tauri/src/lib.rs:335 -> src-tauri/src/commands/todoist.rs todoist_read_sections
imp src-tauri/src/lib.rs:336 -> src-tauri/src/commands/todoist.rs todoist_commit_state
imp src-tauri/src/lib.rs:337 -> src-tauri/src/commands/todoist.rs todoist_append_log
imp src-tauri/src/lib.rs:338 -> src-tauri/src/commands/todoist.rs todoist_read_log
imp src-tauri/src/lib.rs:339 -> src-tauri/src/commands/vault.rs scan_vault
imp src-tauri/src/lib.rs:340 -> src-tauri/src/commands/vault.rs scan_vault_v2
imp src-tauri/src/lib.rs:341 -> src-tauri/src/commands/vault.rs scan_vault_v2_cached
imp src-tauri/src/lib.rs:342 -> src-tauri/src/commands/vault.rs save_vault_cache
imp src-tauri/src/lib.rs:343 -> src-tauri/src/commands/vault.rs get_backlinks_v2
imp src-tauri/src/lib.rs:344 -> src-tauri/src/commands/vault.rs get_relationship_backlinks_v2
imp src-tauri/src/lib.rs:345 -> src-tauri/src/commands/vault.rs get_outgoing_links_v2
imp src-tauri/src/lib.rs:346 -> src-tauri/src/commands/vault.rs get_outgoing_unlinked_mentions_v2
imp src-tauri/src/lib.rs:347 -> src-tauri/src/commands/vault.rs get_all_vault_entries_v2
imp src-tauri/src/lib.rs:348 -> src-tauri/src/commands/vault.rs get_unlinked_mentions_v2
imp src-tauri/src/lib.rs:349 -> src-tauri/src/commands/vault.rs update_note_in_index
imp src-tauri/src/lib.rs:350 -> src-tauri/src/commands/vault.rs propagate_type_rename
imp src-tauri/src/lib.rs:351 -> src-tauri/src/commands/vault.rs get_all_tags_v2
imp src-tauri/src/lib.rs:352 -> src-tauri/src/commands/vault.rs get_all_tasks_v2
imp src-tauri/src/lib.rs:353 -> src-tauri/src/commands/vault.rs toggle_task_status
imp src-tauri/src/lib.rs:354 -> src-tauri/src/commands/vault.rs write_task_lines
imp src-tauri/src/lib.rs:355 -> src-tauri/src/commands/vault.rs write_task_text
imp src-tauri/src/lib.rs:356 -> src-tauri/src/commands/vault.rs remove_note_from_index
imp src-tauri/src/lib.rs:357 -> src-tauri/src/commands/vault.rs rename_note
imp src-tauri/src/lib.rs:358 -> src-tauri/src/commands/vault.rs get_all_property_records
imp src-tauri/src/lib.rs:359 -> src-tauri/src/commands/vault.rs get_index_delta
imp src-tauri/src/lib.rs:360 -> src-tauri/src/commands/vault.rs create_note
imp src-tauri/src/lib.rs:361 -> src-tauri/src/commands/vault.rs create_folder
imp src-tauri/src/lib.rs:362 -> src-tauri/src/commands/vault.rs write_mod_data
imp src-tauri/src/lib.rs:363 -> src-tauri/src/commands/vault.rs read_mod_data
imp src-tauri/src/lib.rs:364 -> src-tauri/src/commands/watcher.rs start_vault_watcher
imp src-tauri/src/lib.rs:365 -> src-tauri/src/commands/watcher.rs stop_vault_watcher
imp src-tauri/src/lib.rs:366 -> src-tauri/src/commands/files.rs read_files_batch
imp src-tauri/src/lib.rs:367 -> src-tauri/src/commands/search_index.rs build_search_index
imp src-tauri/src/lib.rs:368 -> src-tauri/src/commands/search_index.rs search_fts
imp src-tauri/src/lib.rs:369 -> src-tauri/src/commands/search_index.rs update_search_index_file
imp src-tauri/src/lib.rs:370 -> src-tauri/src/commands/search_index.rs remove_from_search_index
imp src-tauri/src/lib.rs:371 -> src-tauri/src/commands/search_index.rs rename_in_search_index
imp src-tauri/src/lib.rs:372 -> src-tauri/src/commands/semantic.rs init_semantic_search
imp src-tauri/src/lib.rs:373 -> src-tauri/src/commands/semantic.rs is_semantic_model_available
imp src-tauri/src/lib.rs:374 -> src-tauri/src/commands/semantic.rs build_semantic_index
imp src-tauri/src/lib.rs:375 -> src-tauri/src/commands/semantic.rs search_semantic
imp src-tauri/src/lib.rs:376 -> src-tauri/src/commands/semantic.rs search_hybrid
imp src-tauri/src/lib.rs:377 -> src-tauri/src/commands/semantic.rs get_semantic_stats
imp src-tauri/src/lib.rs:378 -> src-tauri/src/commands/semantic.rs get_semantic_file_status
imp src-tauri/src/lib.rs:379 -> src-tauri/src/commands/semantic.rs update_semantic_file
imp src-tauri/src/lib.rs:380 -> src-tauri/src/commands/semantic.rs remove_semantic_file
imp src-tauri/src/lib.rs:381 -> src-tauri/src/commands/semantic.rs download_semantic_model
imp src-tauri/src/lib.rs:382 -> src-tauri/src/commands/semantic.rs is_reranker_model_available
imp src-tauri/src/lib.rs:383 -> src-tauri/src/commands/semantic.rs download_reranker_model
imp src-tauri/src/lib.rs:384 -> src-tauri/src/commands/semantic.rs shutdown_semantic
imp src-tauri/src/lib.rs:385 -> src-tauri/src/commands/debug.rs set_tauri_debug_mode
imp src-tauri/src/lib.rs:386 -> src-tauri/src/commands/debug.rs set_main_thread_heartbeat
imp src-tauri/src/lib.rs:387 -> src-tauri/src/commands/debug.rs get_process_memory
imp src-tauri/src/lib.rs:388 -> src-tauri/src/commands/sentry.rs configure_sentry
imp src-tauri/src/lib.rs:389 -> src-tauri/src/commands/fonts.rs list_system_fonts
imp src-tauri/src/lib.rs:390 -> src-tauri/src/commands/update_channel.rs check_for_update_on_channel
imp src-tauri/src/lib.rs:391 -> src-tauri/src/quick_capture/commands.rs capture_clipboard_now
imp src-tauri/src/lib.rs:392 -> src-tauri/src/quick_capture/commands.rs open_composer
imp src-tauri/src/lib.rs:393 -> src-tauri/src/quick_capture/commands.rs dismiss_composer
imp src-tauri/src/lib.rs:394 -> src-tauri/src/quick_capture/commands.rs submit_composer_capture
imp src-tauri/src/lib.rs:395 -> src-tauri/src/quick_capture/commands.rs report_composer_capture_result
imp src-tauri/src/lib.rs:396 -> src-tauri/src/quick_capture/commands.rs import_staged_shot
imp src-tauri/src/lib.rs:397 -> src-tauri/src/commands/app_exit.rs confirm_exit
## imported-by
imp src-tauri/src/main.rs:5 -> src-tauri/src/lib.rs run
## reach
in2 src-tauri/src/lib.rs 0 files in 0 modules: -
out2 src-tauri/src/lib.rs 29 files in 6 modules: src-tauri/src/semantic(11) src-tauri/src/vault(6) src-tauri/src/db(4) src-tauri/src/search(4) src-tauri/src/utils(3) +1 modules
## symbols
sym src-tauri/src/lib.rs:251 fn run() L156
by src-tauri/src/lib.rs:run <- src-tauri/src/main.rs:5 in main lexical
## locals
local src-tauri/src/lib.rs:40 fn dispatch_shortcut(app: &tauri::AppHandle<R>, id: ShortcutId) L51
local src-tauri/src/lib.rs:95 fn intercept_close_as_hide(window: &tauri::WebviewWindow) L9
local src-tauri/src/lib.rs:110 fn apply_move_to_active_space(window: &tauri::WebviewWindow) L17
local src-tauri/src/lib.rs:135 fn build_composer_window(app: &tauri::AppHandle) -> tauri::Result<tauri::WebviewWindow> L20
local src-tauri/src/lib.rs:163 fn on_exit_requested(app: &tauri::AppHandle, code: Option<i32>, api: &ExitRequestApi) L8
local src-tauri/src/lib.rs:172 fn build_menu(app: &tauri::App) -> tauri::Result<tauri::menu::Menu<tauri::Wry>> L77
## calls
call src-tauri/src/lib.rs:45 in dispatch_shortcut -> src-tauri/src/db/mod.rs:is_open lexical
call src-tauri/src/lib.rs:49 in dispatch_shortcut -> src-tauri/src/quick_capture/shortcuts.rs:ShortcutId lexical +1
call src-tauri/src/lib.rs:54 in dispatch_shortcut -> src-tauri/src/quick_capture/commands.rs:show_composer lexical
call src-tauri/src/lib.rs:61 in dispatch_shortcut -> src-tauri/src/quick_capture/source.rs:frontmost_bundle_id lexical
call src-tauri/src/lib.rs:61 in dispatch_shortcut -> src-tauri/src/quick_capture/source.rs:resolve_context_for_bundle lexical
call src-tauri/src/lib.rs:70 in dispatch_shortcut -> src-tauri/src/quick_capture/commands.rs:capture_clipboard_now_with lexical
call src-tauri/src/lib.rs:71 in dispatch_shortcut -> src-tauri/src/quick_capture/clipboard.rs:SystemClipboard lexical
call src-tauri/src/lib.rs:71 in dispatch_shortcut -> src-tauri/src/quick_capture/clipboard.rs:SystemClipboard::new lexical
call src-tauri/src/lib.rs:151 in build_composer_window -> src-tauri/src/lib.rs:intercept_close_as_hide call
call src-tauri/src/lib.rs:152 in build_composer_window -> src-tauri/src/lib.rs:apply_move_to_active_space call
call src-tauri/src/lib.rs:164 in on_exit_requested -> src-tauri/src/commands/app_exit.rs:ExitFlushState::is_flushed lexical-method
call src-tauri/src/lib.rs:166 in on_exit_requested -> src-tauri/src/commands/app_exit.rs:ExitDecision lexical
call src-tauri/src/lib.rs:166 in on_exit_requested -> src-tauri/src/commands/app_exit.rs:exit_decision lexical
call src-tauri/src/lib.rs:257 in run -> src-tauri/src/quick_capture/shortcuts.rs:default_registry lexical
call src-tauri/src/lib.rs:278 in run -> src-tauri/src/lib.rs:dispatch_shortcut call
call src-tauri/src/lib.rs:284 in run -> src-tauri/src/lib.rs:build_menu call
call src-tauri/src/lib.rs:287 in run -> src-tauri/src/utils/logger.rs:set_log_sink lexical
call src-tauri/src/lib.rs:297 in run -> src-tauri/src/lib.rs:build_composer_window call
call src-tauri/src/lib.rs:319 in run -> src-tauri/src/vault/mod.rs:VaultIndexState lexical
call src-tauri/src/lib.rs:320 in run -> src-tauri/src/vault/watcher.rs:VaultWatcherState lexical
call src-tauri/src/lib.rs:321 in run -> src-tauri/src/error_monitoring.rs:SentryState lexical
call src-tauri/src/lib.rs:321 in run -> src-tauri/src/error_monitoring.rs:SentryState::default lexical
call src-tauri/src/lib.rs:322 in run -> src-tauri/src/quick_capture/source.rs:PrevFrontmostPid lexical
call src-tauri/src/lib.rs:322 in run -> src-tauri/src/quick_capture/source.rs:PrevFrontmostPid::new lexical
call src-tauri/src/lib.rs:323 in run -> src-tauri/src/quick_capture/commands.rs:LastCaptureSignature lexical
call src-tauri/src/lib.rs:324 in run -> src-tauri/src/commands/app_exit.rs:ExitFlushState lexical
call src-tauri/src/lib.rs:403 in run -> src-tauri/src/lib.rs:on_exit_requested call
## effects
ev src-tauri/src/lib.rs:81 in dispatch_shortcut -> event:qc:capture-detected -> src/lib/plugins/quick-capture/quick-capture.service.ts:62 in registerQuickCaptureListener
ev src-tauri/src/lib.rs:168 in on_exit_requested -> event:app:exit-requested -> src/lib/app/tauri-listeners.service.ts:81 in registerExitRequestListener
ev src-tauri/src/lib.rs:289 in run -> event:tauri-debug-log -> src/lib/utils/debug.ts:128 in startTauriDebugListener
ev src-tauri/src/lib.rs:305 in run -> event:menu:settings -> src/lib/app/tauri-listeners.service.ts:28 in registerMenuSettingsListener

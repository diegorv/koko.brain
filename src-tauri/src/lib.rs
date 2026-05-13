pub mod commands;
pub mod db;
pub mod mcp;
pub mod search;
pub mod security;
pub mod semantic;
pub mod utils;
pub mod vault;

use commands::terminal::TerminalState;
use tauri::menu::{AboutMetadata, MenuItemBuilder, SubmenuBuilder};
use tauri::Emitter;
use utils::logger::init_logger;
use vault::watcher::VaultWatcherState;
use vault::VaultIndexState;

fn build_menu(app: &tauri::App) -> tauri::Result<tauri::menu::Menu<tauri::Wry>> {
    let settings_item = MenuItemBuilder::new("Settings...")
        .id("settings")
        .accelerator("CmdOrCtrl+,")
        .build(app)?;

    let about = AboutMetadata {
        version: Some(env!("CARGO_PKG_VERSION").to_string()),
        short_version: Some(env!("GIT_HASH").to_string()),
        ..Default::default()
    };

    let app_menu = SubmenuBuilder::new(app, "KokoBrain")
        .about(Some(about))
        .separator()
        .item(&settings_item)
        .separator()
        .services()
        .separator()
        .hide()
        .hide_others()
        .show_all()
        .separator()
        .quit()
        .build()?;

    let edit_menu = SubmenuBuilder::new(app, "Edit")
        .undo()
        .redo()
        .separator()
        .cut()
        .copy()
        .paste()
        .select_all()
        .build()?;

    let window_menu = SubmenuBuilder::new(app, "Window")
        .minimize()
        .maximize()
        .separator()
        .fullscreen()
        .build()?;

    tauri::menu::MenuBuilder::new(app)
        .item(&app_menu)
        .item(&edit_menu)
        .item(&window_menu)
        .build()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let menu = build_menu(app)?;
            app.set_menu(menu)?;
            init_logger(app.handle());
            let mcp_handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                crate::mcp::start(mcp_handle).await;
            });
            Ok(())
        })
        .on_menu_event(|app, event| {
            if event.id() == "settings" {
                let _ = app.emit("menu:settings", ());
            }
        })
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .manage(TerminalState::new())
        .manage(VaultIndexState::default())
        .manage(VaultWatcherState::default())
        .invoke_handler(tauri::generate_handler![
            commands::db::open_vault_db,
            commands::db::close_vault_db,
            commands::history::save_snapshot,
            commands::history::get_file_history,
            commands::history::get_snapshot_content,
            commands::history::compute_diff,
            commands::history::cleanup_history,
            commands::vault::scan_vault,
            commands::vault::scan_vault_v2,
            commands::vault::get_backlinks_v2,
            commands::vault::get_outgoing_links_v2,
            commands::vault::get_outgoing_unlinked_mentions_v2,
            commands::vault::get_all_vault_entries_v2,
            commands::vault::get_unlinked_mentions_v2,
            commands::vault::update_note_in_index,
            commands::vault::get_all_tags_v2,
            commands::vault::get_notes_with_tag_v2,
            commands::vault::get_all_tasks_v2,
            commands::vault::get_tasks_in_path_v2,
            commands::vault::get_tasks_in_section_v2,
            commands::vault::toggle_task_status,
            commands::vault::remove_note_from_index,
            commands::vault::query_notes_by_property,
            commands::vault::get_property_values,
            commands::vault::get_note_properties,
            commands::vault::get_all_property_records,
            commands::vault::create_note,
            commands::vault::create_folder,
            vault::watcher::start_vault_watcher,
            vault::watcher::stop_vault_watcher,
            commands::files::read_files_batch,
            commands::search::search_vault,
            commands::terminal::spawn_terminal,
            commands::terminal::write_terminal,
            commands::terminal::resize_terminal,
            commands::terminal::kill_terminal,
            commands::terminal::kill_all_terminals,
            commands::crypto::encrypt_content,
            commands::crypto::decrypt_content,
            commands::crypto::initialize_encryption,
            commands::crypto::has_encryption_key,
            commands::crypto::ensure_encryption_key,
            commands::crypto::get_recovery_key,
            commands::crypto::restore_from_recovery_key,
            commands::crypto::lock_encryption,
            commands::search_index::build_search_index,
            commands::search_index::search_fts,
            commands::search_index::update_search_index_file,
            commands::search_index::remove_from_search_index,
            commands::search_index::get_search_index_stats,
            commands::semantic::init_semantic_search,
            commands::semantic::is_semantic_model_available,
            commands::semantic::build_semantic_index,
            commands::semantic::search_semantic,
            commands::semantic::search_hybrid,
            commands::semantic::get_semantic_stats,
            commands::semantic::get_semantic_file_status,
            commands::semantic::update_semantic_file,
            commands::semantic::download_semantic_model,
            commands::semantic::is_reranker_model_available,
            commands::semantic::download_reranker_model,
            commands::semantic::debug_semantic_embeddings,
            commands::semantic::shutdown_semantic,
            commands::debug::set_tauri_debug_mode,
            commands::debug::get_process_memory,
            commands::fonts::list_system_fonts,
            commands::update_channel::check_for_update_on_channel,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

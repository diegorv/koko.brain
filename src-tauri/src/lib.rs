pub mod commands;
pub mod db;
pub mod quick_capture;
pub mod search;
pub mod semantic;
pub mod utils;
pub mod vault;

use std::str::FromStr;

use tauri::menu::{AboutMetadata, MenuItemBuilder, SubmenuBuilder};
use tauri::{Emitter, WebviewUrl, WebviewWindowBuilder};
use tauri_plugin_global_shortcut::{Builder as ShortcutBuilder, Shortcut, ShortcutState};

use quick_capture::clipboard::SystemClipboard;
use quick_capture::commands::{
    capture_clipboard_now_with, show_composer, COMPOSER_WINDOW_LABEL, QC_CAPTURE_DETECTED_EVENT,
    QC_OPEN_COMPOSER_EVENT,
};
use quick_capture::shortcuts::{default_registry, ShortcutBinding, ShortcutId};
use utils::logger::init_logger;
use vault::watcher::VaultWatcherState;
use vault::VaultIndexState;

/// Dispatch a fired global shortcut to its side-effect. `CaptureClipboard`
/// runs the same helper the IPC command uses and emits one
/// `qc:capture-detected` event per detected input. `OpenComposer` summons
/// the composer popover via the shared `show_composer` helper.
fn dispatch_shortcut<R: tauri::Runtime>(app: &tauri::AppHandle<R>, id: ShortcutId) {
    match id {
        ShortcutId::OpenComposer => {
            show_composer(app);
            // Keep the event for any current listeners; the composer
            // route ignores empty payloads as a no-op.
            let _ = app.emit(QC_OPEN_COMPOSER_EVENT, "");
        }
        ShortcutId::CaptureClipboard => {
            let captured_at = chrono::Utc::now().to_rfc3339();
            match capture_clipboard_now_with(&SystemClipboard::new(), captured_at) {
                Ok(payloads) => {
                    for payload in payloads {
                        let _ = app.emit(QC_CAPTURE_DETECTED_EVENT, payload);
                    }
                }
                Err(err) => {
                    eprintln!("capture_clipboard_now (shortcut) failed: {err}");
                }
            }
        }
    }
}

/// Convert a window's macOS Close button into a Hide. Ported from
/// quick-capture so the composer popover behaves like a popover instead
/// of being permanently destroyed when the user clicks the red dot.
fn intercept_close_as_hide(window: &tauri::WebviewWindow) {
    let target = window.clone();
    window.on_window_event(move |event| {
        if let tauri::WindowEvent::CloseRequested { api, .. } = event {
            api.prevent_close();
            let _ = target.hide();
        }
    });
}

/// macOS: make the window summon onto whichever Space is currently
/// active, instead of yanking the user back to the Space where it last
/// lived. Sets `NSWindowCollectionBehaviorMoveToActiveSpace` on the
/// underlying NSWindow. Ported verbatim from quick-capture.
#[cfg(target_os = "macos")]
fn apply_move_to_active_space(window: &tauri::WebviewWindow) {
    use objc2::msg_send;
    use objc2::runtime::AnyObject;
    // NSWindowCollectionBehaviorMoveToActiveSpace = 1 << 1.
    const MOVE_TO_ACTIVE_SPACE: usize = 1 << 1;
    let Ok(ns_window) = window.ns_window() else {
        return;
    };
    let ns_window = ns_window as *mut AnyObject;
    if ns_window.is_null() {
        return;
    }
    unsafe {
        let current: usize = msg_send![ns_window, collectionBehavior];
        let _: () = msg_send![ns_window, setCollectionBehavior: current | MOVE_TO_ACTIVE_SPACE];
    }
}

#[cfg(not(target_os = "macos"))]
fn apply_move_to_active_space(_window: &tauri::WebviewWindow) {}

/// Build the composer popover. Config copied from quick-capture:
/// 600x240 frameless popover, transparent, not resizable, hidden at
/// startup, centred, intercepts close as hide so the popover stays
/// alive across global-shortcut summons.
fn build_composer_window(app: &tauri::AppHandle) -> tauri::Result<tauri::WebviewWindow> {
    let composer_window = WebviewWindowBuilder::new(
        app,
        COMPOSER_WINDOW_LABEL,
        WebviewUrl::App("/composer".into()),
    )
    .visible(false)
    .title("")
    .inner_size(600.0, 240.0)
    .decorations(false)
    .transparent(true)
    .resizable(false)
    .skip_taskbar(true)
    .shadow(true)
    .center()
    .build()?;
    intercept_close_as_hide(&composer_window);
    apply_move_to_active_space(&composer_window);
    Ok(composer_window)
}

fn build_menu(app: &tauri::App) -> tauri::Result<tauri::menu::Menu<tauri::Wry>> {
    let settings_item = MenuItemBuilder::new("Settings...")
        .id("settings")
        .accelerator("CmdOrCtrl+,")
        .build(app)?;

    // Read the version from `app.package_info()` rather than
    // `env!("CARGO_PKG_VERSION")` so the macOS About panel reflects the
    // version Tauri actually baked into the bundle. Nightly builds
    // patch `tauri.conf.json#version` (not `Cargo.toml#version`, since
    // touching Cargo.toml invalidates the rust-cache workspace-hash
    // and forces a cold rebuild every nightly) — `package_info()`
    // reads the tauri.conf.json-derived value, so the About panel
    // shows `2.0.19-alpha-nightly.<count>.<sha>` for nightlies and
    // `X.Y.Z-alpha` for stable.
    //
    // `short_version` always carries the git hash. Cannot omit it
    // (setting `None` makes macOS fall back to `Info.plist`'s
    // `CFBundleVersion`, which Tauri writes from the SAME
    // tauri.conf.json#version field — so an "empty" short_version
    // renders as the full nightly version duplicated in parens).
    // For stable this gives "Version 2.0.19-alpha (sha)". For
    // nightly it gives "Version X.Y.Z-nightly.N.sha (sha)" — the
    // sha repeats at the tail but only ~7 characters, far less ugly
    // than a full-version duplicate.
    let about = AboutMetadata {
        version: Some(app.package_info().version.to_string()),
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
    // Parse each accelerator once so the OS-level handler can compare
    // the `Shortcut` instance the plugin hands back against the ones we
    // registered. We cannot key on string form: `HotKey`'s Display impl
    // normalises (`control+alt+super+space`) while the registry stores
    // the user-facing `Ctrl+Alt+Cmd+Space` spelling.
    let parsed: Vec<(Shortcut, ShortcutBinding)> = default_registry()
        .iter()
        .map(|binding| {
            let shortcut = Shortcut::from_str(binding.accelerator)
                .expect("invalid accelerator string in default_registry");
            (shortcut, binding.clone())
        })
        .collect();
    let dispatch_table = parsed.clone();
    let mut shortcut_builder = ShortcutBuilder::new().with_handler(move |app, shortcut, evt| {
        if evt.state() != ShortcutState::Pressed {
            return;
        }
        if let Some((_, binding)) = dispatch_table.iter().find(|(s, _)| s == shortcut) {
            dispatch_shortcut(app, binding.id);
        }
    });
    for (shortcut, _) in &parsed {
        shortcut_builder = shortcut_builder
            .with_shortcut(*shortcut)
            .expect("failed to register accelerator");
    }

    tauri::Builder::default()
        .setup(|app| {
            let menu = build_menu(app)?;
            app.set_menu(menu)?;
            init_logger(app.handle());
            build_composer_window(app.handle())?;
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
        .plugin(shortcut_builder.build())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
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
            commands::vault::scan_vault_v2_cached,
            commands::vault::save_vault_cache,
            commands::vault::get_backlinks_v2,
            commands::vault::get_relationship_backlinks_v2,
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
            quick_capture::commands::capture_clipboard_now,
            quick_capture::commands::open_composer,
            quick_capture::commands::dismiss_composer,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

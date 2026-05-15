//! Dialog commands that mirror `@tauri-apps/plugin-dialog::open` and
//! `@tauri-apps/plugin-dialog::ask` so the embedded HTTP transport
//! can trigger native file/folder pickers and confirmations from a
//! browser-loaded frontend.
//!
//! The dialog UI always appears on the native Tauri window — both
//! transports share the same `AppHandle`. The browser path is only
//! useful when the binary is running with a native window open
//! (the normal `pnpm tauri dev` flow).

use serde::{Deserialize, Serialize};
use serde_json::Value;
use tauri::{AppHandle, Runtime};
use tauri_plugin_dialog::{DialogExt, MessageDialogButtons, MessageDialogKind};

#[derive(Deserialize, Debug, Default)]
#[serde(rename_all = "camelCase")]
pub struct OpenDialogOptions {
	#[serde(default)]
	pub directory: bool,
	#[serde(default)]
	pub multiple: bool,
	#[serde(default)]
	pub default_path: Option<String>,
	#[serde(default)]
	pub title: Option<String>,
}

#[derive(Deserialize, Debug, Default)]
#[serde(rename_all = "camelCase")]
pub struct AskDialogOptions {
	#[serde(default)]
	pub title: Option<String>,
	#[serde(default)]
	pub kind: Option<String>,
	#[serde(default)]
	pub ok_label: Option<String>,
	#[serde(default)]
	pub cancel_label: Option<String>,
}

#[derive(Serialize, Debug)]
#[serde(untagged)]
pub enum OpenResult {
	None,
	Single(String),
	Multiple(Vec<String>),
}

/// Native file/folder picker. Mirrors `@tauri-apps/plugin-dialog::open`.
/// Returns `null` if the user cancelled, `string` for single-selection,
/// or `string[]` for multi-selection. Always blocks via a tokio oneshot
/// channel against the plugin's callback API.
pub async fn open_dialog_core<R: Runtime>(
	app: AppHandle<R>,
	options: OpenDialogOptions,
) -> Result<Value, String> {
	let mut builder = app.dialog().file();
	if let Some(p) = options.default_path {
		builder = builder.set_directory(p);
	}
	if let Some(t) = options.title {
		builder = builder.set_title(t);
	}

	let (tx, rx) = tokio::sync::oneshot::channel();
	let tx_cell = std::sync::Mutex::new(Some(tx));
	match (options.directory, options.multiple) {
		(true, false) => builder.pick_folder(move |path| {
			let _ = tx_cell.lock().ok().and_then(|mut g| g.take()).map(|tx| {
				tx.send(
					path.map(|p| serde_json::json!(p.to_string()))
						.unwrap_or(Value::Null),
				)
			});
		}),
		(true, true) => builder.pick_folders(move |paths| {
			let _ = tx_cell.lock().ok().and_then(|mut g| g.take()).map(|tx| {
				tx.send(match paths {
					Some(list) => serde_json::json!(list
						.into_iter()
						.map(|p| p.to_string())
						.collect::<Vec<_>>()),
					None => Value::Null,
				})
			});
		}),
		(false, false) => builder.pick_file(move |path| {
			let _ = tx_cell.lock().ok().and_then(|mut g| g.take()).map(|tx| {
				tx.send(
					path.map(|p| serde_json::json!(p.to_string()))
						.unwrap_or(Value::Null),
				)
			});
		}),
		(false, true) => builder.pick_files(move |paths| {
			let _ = tx_cell.lock().ok().and_then(|mut g| g.take()).map(|tx| {
				tx.send(match paths {
					Some(list) => serde_json::json!(list
						.into_iter()
						.map(|p| p.to_string())
						.collect::<Vec<_>>()),
					None => Value::Null,
				})
			});
		}),
	}

	rx.await.map_err(|e| format!("open_dialog: {e}"))
}

/// Native confirmation dialog. Mirrors `@tauri-apps/plugin-dialog::ask`.
/// Returns `true` if the user confirmed, `false` otherwise.
pub async fn ask_dialog_core<R: Runtime>(
	app: AppHandle<R>,
	message: String,
	options: AskDialogOptions,
) -> Result<bool, String> {
	let mut builder = app.dialog().message(message);
	if let Some(t) = options.title {
		builder = builder.title(t);
	}
	if let Some(k) = options.kind.as_deref() {
		let kind = match k {
			"warning" => MessageDialogKind::Warning,
			"error" => MessageDialogKind::Error,
			_ => MessageDialogKind::Info,
		};
		builder = builder.kind(kind);
	}
	let buttons = match (options.ok_label, options.cancel_label) {
		(Some(ok), Some(cancel)) => MessageDialogButtons::OkCancelCustom(ok, cancel),
		(Some(ok), None) => MessageDialogButtons::OkCancelCustom(ok, "Cancel".into()),
		(None, Some(cancel)) => MessageDialogButtons::OkCancelCustom("OK".into(), cancel),
		(None, None) => MessageDialogButtons::OkCancel,
	};
	builder = builder.buttons(buttons);

	let (tx, rx) = tokio::sync::oneshot::channel();
	let tx_cell = std::sync::Mutex::new(Some(tx));
	builder.show(move |ok| {
		let _ = tx_cell
			.lock()
			.ok()
			.and_then(|mut g| g.take())
			.map(|tx| tx.send(ok));
	});

	rx.await.map_err(|e| format!("ask_dialog: {e}"))
}

#[tauri::command]
pub async fn dialog_open(
	app: AppHandle,
	options: Option<OpenDialogOptions>,
) -> Result<Value, String> {
	open_dialog_core(app, options.unwrap_or_default()).await
}

#[tauri::command]
pub async fn dialog_ask(
	app: AppHandle,
	message: String,
	options: Option<AskDialogOptions>,
) -> Result<bool, String> {
	ask_dialog_core(app, message, options.unwrap_or_default()).await
}

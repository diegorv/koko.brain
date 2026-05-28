//! Tauri commands for quick-capture.
//!
//! `capture_clipboard_now` reads the clipboard, runs the pure
//! `kind_detect::decide`, and emits one `qc:capture-detected` event
//! per detected input. The frontend listener in
//! `src/lib/plugins/quick-capture/quick-capture.service.ts` wraps each
//! payload into a kokobrain `CaptureAction` (filling `vault`) and
//! dispatches via `executeAction` from `deep-link.service.ts`.
//!
//! The clipboard adapter is injected so tests can feed arbitrary
//! snapshots via `FakeClipboard`. The Tauri command instantiates the
//! real `SystemClipboard`.

use serde_json::{json, Value};
use tauri::{Emitter, Manager};

use crate::quick_capture::clipboard::{Clipboard, SystemClipboard};
use crate::quick_capture::kind_detect::{decide, CaptureInput, ShotSource};

/// Event name used to deliver detected captures to the frontend.
pub const QC_CAPTURE_DETECTED_EVENT: &str = "qc:capture-detected";

/// Event the composer popover listens for to focus its textarea after a
/// show. Carries an optional initial-text payload (empty for the
/// shortcut-summoned path).
pub const QC_OPEN_COMPOSER_EVENT: &str = "qc:open-composer";

/// Tauri label of the composer popover window. Must match the value
/// passed to `WebviewWindowBuilder::new` in `lib.rs::build_composer_window`.
pub const COMPOSER_WINDOW_LABEL: &str = "composer";

/// Pure helper: read the clipboard via the injected adapter, decide
/// the kind(s), materialize any in-memory shot bytes to a temp file,
/// and serialize each result into a kokobrain `CaptureAction`-shaped
/// JSON object — minus `vault`, which the frontend fills from the
/// active vault.
///
/// Returns one `Value` per detected input. An empty clipboard or an
/// empty file list returns the underlying `KindDetectError` as a
/// String. A failed temp-file write surfaces as `Err`.
pub fn capture_clipboard_now_with(
    clipboard: &dyn Clipboard,
    captured_at: String,
) -> Result<Vec<Value>, String> {
    let snapshot = clipboard.read().map_err(|e| e.to_string())?;
    let inputs = decide(snapshot).map_err(|e| e.to_string())?;
    let mut out = Vec::with_capacity(inputs.len());
    for input in inputs {
        let resolved = materialize_input(input)?;
        out.push(capture_input_to_payload(resolved, &captured_at));
    }
    Ok(out)
}

/// Resolve a `CaptureInput` against the filesystem before it goes out
/// as a payload. The only variant that needs work is
/// `Shot::Bytes` — the kokobrain capture handler accepts a `file://`
/// path embed, not in-memory bytes, so we write the PNG out to the
/// OS temp directory and rewrite the input to `Shot::Path` pointing
/// at it. All other variants pass through unchanged.
fn materialize_input(input: CaptureInput) -> Result<CaptureInput, String> {
    match input {
        CaptureInput::Shot {
            source: ShotSource::Bytes { bytes, mime },
        } => {
            let path = write_shot_bytes_to_temp(&bytes, &mime)?;
            Ok(CaptureInput::Shot {
                source: ShotSource::Path { path, mime },
            })
        }
        other => Ok(other),
    }
}

/// Write clipboard image bytes to a uniquely-named file in
/// `std::env::temp_dir()`. Returns the absolute path of the new file.
/// File names are `qc-shot-<utc-rfc3339-no-colons>.<ext>` so multiple
/// captures within the same second never collide.
fn write_shot_bytes_to_temp(bytes: &[u8], mime: &str) -> Result<std::path::PathBuf, String> {
    let ext = match mime {
        "image/png" => "png",
        "image/jpeg" | "image/jpg" => "jpg",
        // Default to .bin so an unknown mime is still writable. The
        // CommonMark image embed in `deep-link.service.ts` falls back
        // to a plain link when the mime is not image/*, so this stays
        // visually correct.
        _ => "bin",
    };
    // chrono's RFC3339 includes colons + dots that some filesystems
    // dislike; replace with dashes. Microseconds make collisions on a
    // single-machine clock effectively impossible.
    let stamp = chrono::Utc::now()
        .format("%Y%m%dT%H%M%S%6f")
        .to_string();
    let path = std::env::temp_dir().join(format!("qc-shot-{stamp}.{ext}"));
    std::fs::write(&path, bytes).map_err(|e| format!("write shot temp: {e}"))?;
    Ok(path)
}

/// Map one detected input to a `CaptureAction`-shaped JSON object.
/// Field names match `src/lib/features/deep-link/deep-link.types.ts`
/// (`kind`, `text`, `url`, `path`, `mime`, `originalName`,
/// `capturedAt`). `vault`, `tags`, `sourceApp`, `sourceTitle`, and
/// `sourceUrl` are not populated here — the frontend or caller adds
/// them. `type: 'capture'` is included so the frontend can hand the
/// payload directly to `executeAction`.
fn capture_input_to_payload(input: CaptureInput, captured_at: &str) -> Value {
    match input {
        CaptureInput::Note { text } => json!({
            "type": "capture",
            "kind": "note",
            "text": text,
            "capturedAt": captured_at,
        }),
        CaptureInput::Clip { text } => json!({
            "type": "capture",
            "kind": "clip",
            "text": text,
            "capturedAt": captured_at,
        }),
        CaptureInput::Link { url, title } => json!({
            "type": "capture",
            "kind": "link",
            "url": url,
            "title": title,
            "capturedAt": captured_at,
        }),
        CaptureInput::Shot {
            source: ShotSource::Path { path, mime },
        } => json!({
            "type": "capture",
            "kind": "shot",
            "path": path.to_string_lossy(),
            "mime": mime,
            "capturedAt": captured_at,
        }),
        CaptureInput::Shot {
            source: ShotSource::Bytes { bytes: _, mime },
        } => {
            // P3.3 will write the bytes to a temp file and convert this
            // into a `Path` variant before dispatch. For now the
            // payload carries the mime + a `pending: true` marker so
            // the frontend can decide what to do (toast, ignore, etc.).
            json!({
                "type": "capture",
                "kind": "shot",
                "path": "",
                "mime": mime,
                "capturedAt": captured_at,
                "pending": true,
            })
        }
        CaptureInput::File {
            path,
            mime,
            original_name,
        } => json!({
            "type": "capture",
            "kind": "file",
            "path": path.to_string_lossy(),
            "mime": mime,
            "originalName": original_name,
            "capturedAt": captured_at,
        }),
    }
}

/// Tauri command: read the system clipboard, detect kind(s), emit one
/// `qc:capture-detected` event per detected input.
#[tauri::command]
pub fn capture_clipboard_now<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<(), String> {
    let captured_at = chrono::Utc::now().to_rfc3339();
    let payloads = capture_clipboard_now_with(&SystemClipboard::new(), captured_at)?;
    for payload in payloads {
        app.emit(QC_CAPTURE_DETECTED_EVENT, payload)
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

/// Show the composer popover window and emit `qc:open-composer` so the
/// route resets its focus state. P4.2 wires `record_prev_frontmost`
/// here; for now the show path is just `show + set_focus`.
pub fn show_composer<R: tauri::Runtime>(app: &tauri::AppHandle<R>) {
    let handle = app.clone();
    let _ = app.run_on_main_thread(move || {
        if let Some(window) = handle.get_webview_window(COMPOSER_WINDOW_LABEL) {
            let _ = window.show();
            let _ = window.set_focus();
        }
        let _ = handle.emit(QC_OPEN_COMPOSER_EVENT, "");
    });
}

/// Tauri command counterpart of `show_composer`. Exposed so the
/// frontend can also summon the popover (e.g. from an in-window menu).
#[tauri::command]
pub fn open_composer<R: tauri::Runtime>(app: tauri::AppHandle<R>) -> Result<(), String> {
    show_composer(&app);
    Ok(())
}

/// Hide the composer popover. Called from the route on Esc / blur /
/// after a successful save. P4.2 will add `activate_prev_app` so focus
/// returns to whatever was frontmost before the popover summoned.
#[tauri::command]
pub fn dismiss_composer<R: tauri::Runtime>(app: tauri::AppHandle<R>) -> Result<(), String> {
    let handle = app.clone();
    app.run_on_main_thread(move || {
        if let Some(window) = handle.get_webview_window(COMPOSER_WINDOW_LABEL) {
            let _ = window.hide();
        }
    })
    .map_err(|e| e.to_string())
}

/// Build a `note`-kind capture payload from composer text. Pure so the
/// caller-side guard (trim → no-emit on empty) is testable without a
/// Tauri runtime.
pub fn build_composer_note_payload(text: &str, captured_at: String) -> Value {
    json!({
        "type": "capture",
        "kind": "note",
        "text": text,
        "capturedAt": captured_at,
    })
}

/// Composer-side save path. The composer webview cannot directly invoke
/// `executeAction` because it lives in a separate JS context from the
/// main window (different webview origin → no shared `vaultStore`).
/// Instead it posts the typed text here and Rust emits the same
/// `qc:capture-detected` event the clipboard-shortcut path uses — the
/// main-window listener then fills the active vault and dispatches.
#[tauri::command]
pub fn submit_composer_capture<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    text: String,
) -> Result<(), String> {
    if text.trim().is_empty() {
        // Empty composer body should never reach Rust (the route filters
        // before calling), but the guard makes the contract explicit.
        return Ok(());
    }
    let captured_at = chrono::Utc::now().to_rfc3339();
    let payload = build_composer_note_payload(&text, captured_at);
    app.emit(QC_CAPTURE_DETECTED_EVENT, payload)
        .map_err(|e| e.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::quick_capture::clipboard::{ClipboardSnapshot, FakeClipboard};
    use std::path::PathBuf;

    const FIXED_TS: &str = "2026-05-28T10:00:00Z";

    fn run(snapshot: Result<ClipboardSnapshot, crate::quick_capture::clipboard::ClipboardError>) -> Vec<Value> {
        let fake = FakeClipboard::with(snapshot);
        capture_clipboard_now_with(&fake, FIXED_TS.to_string()).expect("inner")
    }

    #[test]
    fn text_clipboard_emits_clip_payload() {
        let out = run(Ok(ClipboardSnapshot::Text("just a thought".into())));
        assert_eq!(out.len(), 1);
        assert_eq!(out[0]["type"], "capture");
        assert_eq!(out[0]["kind"], "clip");
        assert_eq!(out[0]["text"], "just a thought");
        assert_eq!(out[0]["capturedAt"], FIXED_TS);
    }

    #[test]
    fn url_text_clipboard_emits_link_payload() {
        let out = run(Ok(ClipboardSnapshot::Text("https://example.com".into())));
        assert_eq!(out.len(), 1);
        assert_eq!(out[0]["kind"], "link");
        assert_eq!(out[0]["url"], "https://example.com");
        assert!(out[0]["title"].is_null());
        assert_eq!(out[0]["capturedAt"], FIXED_TS);
    }

    #[test]
    fn image_clipboard_writes_temp_file_and_emits_path_payload() {
        let bytes = vec![1, 2, 3, 4];
        let out = run(Ok(ClipboardSnapshot::Image {
            bytes: bytes.clone(),
            mime: "image/png".into(),
        }));
        assert_eq!(out.len(), 1);
        assert_eq!(out[0]["kind"], "shot");
        assert_eq!(out[0]["mime"], "image/png");
        let path = out[0]["path"]
            .as_str()
            .expect("path field present on shot payload");
        assert!(!path.is_empty(), "path must be filled after materialization");
        assert!(path.ends_with(".png"), "extension follows mime: got {path}");
        let buf = std::path::PathBuf::from(path);
        let read_back = std::fs::read(&buf).expect("temp shot file readable");
        assert_eq!(read_back, bytes, "bytes preserved through temp write");
        // Test housekeeping: drop the temp file so we do not leak across
        // test runs (cargo isolates per process but multiple tests in
        // the same binary share /tmp, so be explicit).
        let _ = std::fs::remove_file(&buf);
        assert!(
            out[0].get("pending").is_none(),
            "materialized payload must not carry pending=true"
        );
    }

    #[test]
    fn files_clipboard_emits_one_payload_per_path() {
        let out = run(Ok(ClipboardSnapshot::Files(vec![
            PathBuf::from("/tmp/a.png"),
            PathBuf::from("/tmp/b.pdf"),
        ])));
        assert_eq!(out.len(), 2);
        assert_eq!(out[0]["kind"], "shot");
        assert_eq!(out[0]["path"], "/tmp/a.png");
        assert_eq!(out[0]["mime"], "image/png");
        assert_eq!(out[1]["kind"], "file");
        assert_eq!(out[1]["path"], "/tmp/b.pdf");
        assert_eq!(out[1]["mime"], "application/pdf");
        assert_eq!(out[1]["originalName"], "b.pdf");
    }

    #[test]
    fn empty_text_clipboard_returns_error() {
        let err = capture_clipboard_now_with(
            &FakeClipboard::with(Ok(ClipboardSnapshot::Text(String::new()))),
            FIXED_TS.to_string(),
        )
        .expect_err("empty text must error");
        assert!(err.contains("clipboard text is empty"), "got: {err}");
    }

    #[test]
    fn composer_note_payload_has_note_kind() {
        let p = build_composer_note_payload("a thought", FIXED_TS.to_string());
        assert_eq!(p["type"], "capture");
        assert_eq!(p["kind"], "note");
        assert_eq!(p["text"], "a thought");
        assert_eq!(p["capturedAt"], FIXED_TS);
    }

    #[test]
    fn composer_note_payload_preserves_whitespace_in_text() {
        // The caller trims to decide whether to emit, but the payload
        // itself must keep the user's exact body verbatim — preserving
        // leading/trailing newlines and indentation.
        let body = "\n  indented line\nsecond\n";
        let p = build_composer_note_payload(body, FIXED_TS.to_string());
        assert_eq!(p["text"], body);
    }
}

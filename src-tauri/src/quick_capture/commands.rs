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
use tauri::Emitter;

use crate::quick_capture::clipboard::{Clipboard, SystemClipboard};
use crate::quick_capture::kind_detect::{decide, CaptureInput, ShotSource};

/// Event name used to deliver detected captures to the frontend.
pub const QC_CAPTURE_DETECTED_EVENT: &str = "qc:capture-detected";

/// Pure helper: read the clipboard via the injected adapter, decide
/// the kind(s), and serialize each result into a kokobrain
/// `CaptureAction`-shaped JSON object — minus `vault`, which the
/// frontend fills from the active vault.
///
/// Returns one `Value` per detected input. An empty clipboard or an
/// empty file list returns the underlying `KindDetectError` as a
/// String.
pub fn capture_clipboard_now_with(
    clipboard: &dyn Clipboard,
    captured_at: String,
) -> Result<Vec<Value>, String> {
    let snapshot = clipboard.read().map_err(|e| e.to_string())?;
    let inputs = decide(snapshot).map_err(|e| e.to_string())?;
    Ok(inputs
        .into_iter()
        .map(|input| capture_input_to_payload(input, &captured_at))
        .collect())
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
    fn image_clipboard_emits_pending_shot_payload() {
        let out = run(Ok(ClipboardSnapshot::Image {
            bytes: vec![1, 2, 3, 4],
            mime: "image/png".into(),
        }));
        assert_eq!(out.len(), 1);
        assert_eq!(out[0]["kind"], "shot");
        assert_eq!(out[0]["mime"], "image/png");
        assert_eq!(out[0]["pending"], true);
        assert_eq!(out[0]["path"], "");
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
}

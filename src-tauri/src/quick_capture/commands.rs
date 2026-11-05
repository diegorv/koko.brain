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

use std::path::Path;

use serde_json::{json, Value};
use tauri::{Emitter, Manager};

use crate::events::{
    QC_CAPTURE_DETECTED_EVENT, QC_COMPOSER_CAPTURE_RESULT_EVENT, QC_OPEN_COMPOSER_EVENT,
};
use crate::quick_capture::clipboard::{Clipboard, SystemClipboard};
use crate::quick_capture::kind_detect::{decide, CaptureInput, ShotSource};
use crate::quick_capture::source::{
    activate_prev_app, bundle_id_for_pid, frontmost_bundle_id, record_prev_frontmost,
    resolve_context_for_bundle, CaptureContext, PrevFrontmostPid,
};

/// Tauri label of the composer popover window. Must match the value
/// passed to `WebviewWindowBuilder::new` in `lib.rs::build_composer_window`.
pub const COMPOSER_WINDOW_LABEL: &str = "composer";

/// Session-only memory of the most recently captured clipboard
/// signature. Suppresses re-capturing identical clipboard content when
/// the user fires the capture shortcut twice in a row. Resets on app
/// restart — quick-capture compared against its persistent SQLite store,
/// which the merge dropped, so dedup here is best-effort and in-session.
#[derive(Default)]
pub struct LastCaptureSignature(pub std::sync::Mutex<Option<String>>);

/// Stable per-kind key identifying a detected input, for dedup. Returns
/// `None` for in-memory image bytes (`Shot::Bytes`) — those have no cheap
/// stable key, matching quick-capture which never deduped them. The NUL
/// separator keeps the kind tag from colliding with the value.
fn capture_signature(input: &CaptureInput) -> Option<String> {
    match input {
        CaptureInput::Clip { text } => Some(format!("clip\u{0}{text}")),
        CaptureInput::Note { text } => Some(format!("note\u{0}{text}")),
        CaptureInput::Link { url, .. } => Some(format!("link\u{0}{url}")),
        CaptureInput::File { path, .. } => Some(format!("file\u{0}{}", path.to_string_lossy())),
        CaptureInput::Shot {
            source: ShotSource::Path { path, .. },
        } => Some(format!("shot\u{0}{}", path.to_string_lossy())),
        CaptureInput::Shot {
            source: ShotSource::Bytes { .. },
        } => None,
    }
}

/// Pure helper: read the clipboard via the injected adapter, decide
/// the kind(s), materialize any in-memory shot bytes to a temp file,
/// and serialize each result into a kokobrain `CaptureAction`-shaped
/// JSON object — minus `vault`, which the frontend fills from the
/// active vault.
///
/// `last_signature` carries the previously-captured signature across
/// calls (and advances within a single multi-item batch). A dedup-able
/// input matching it is skipped, so pressing the capture shortcut twice
/// on the same clipboard does not write a duplicate note. A
/// non-dedup-able image-bytes capture clears the anchor.
///
/// Returns one `Value` per emitted input. An empty clipboard or an
/// empty file list returns the underlying `KindDetectError` as a
/// String. A failed temp-file write surfaces as `Err`.
pub fn capture_clipboard_now_with(
    clipboard: &dyn Clipboard,
    captured_at: String,
    context: CaptureContext,
    last_signature: &mut Option<String>,
) -> Result<Vec<Value>, String> {
    let snapshot = clipboard.read().map_err(|e| e.to_string())?;
    let inputs = decide(snapshot).map_err(|e| e.to_string())?;
    let mut out = Vec::with_capacity(inputs.len());
    for input in inputs {
        let signature = capture_signature(&input);
        // Skip a dedup-able input identical to the last captured one.
        // The anchor advances below as we go, so two identical
        // consecutive items in one batch also dedupe.
        if let Some(sig) = &signature {
            if last_signature.as_deref() == Some(sig.as_str()) {
                continue;
            }
        }
        let staged = matches!(
            input,
            CaptureInput::Shot {
                source: ShotSource::Bytes { .. }
            }
        );
        let resolved = materialize_input(input)?;
        let mut payload = capture_input_to_payload(resolved, &captured_at, &context)?;
        if staged {
            // The temp file is the only copy: the frontend moves it into
            // the vault with `import_staged_shot` before writing the note.
            payload["staged"] = Value::Bool(true);
        }
        out.push(payload);
        // Advance the anchor to the emitted item (None for image bytes,
        // which clears it so an unrelated following item can't match).
        *last_signature = signature;
    }
    Ok(out)
}

/// Resolve a `CaptureInput` against the filesystem before it goes out
/// as a payload. The only variant that needs work is
/// `Shot::Bytes`: the payload carries a path, not in-memory bytes, so we
/// stage the PNG in the OS temp directory and rewrite the input to
/// `Shot::Path` pointing at it. The capture has no vault here, so the
/// frontend moves the staged file into the vault (`import_staged_shot`).
/// All other variants pass through unchanged.
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

/// Prefix of the file names `write_shot_bytes_to_temp` stages. The import
/// command accepts only files carrying it.
const STAGED_SHOT_PREFIX: &str = "qc-shot-";

/// Tauri command: move a clipboard screenshot that `materialize_input`
/// staged in the OS temp dir into `dest_dir` inside the vault, so the
/// capture note embeds a file that lasts and that the asset protocol can
/// serve. Returns the new absolute path, spelled under `dest_dir` as given.
///
/// The frontend calls this only for a payload marked `staged`; the guards
/// in `import_staged_shot_in` keep the command from moving any other file.
#[tauri::command]
pub fn import_staged_shot(
    source: String,
    dest_dir: String,
    vault_path: String,
) -> Result<String, String> {
    import_staged_shot_in(&std::env::temp_dir(), &source, &dest_dir, &vault_path)
}

/// `import_staged_shot` with the temp dir injected for tests.
///
/// Refuses a source that is not a `qc-shot-*` file directly inside
/// `temp_dir`, and a `dest_dir` that does not resolve inside the vault
/// (`canonicalize` + `starts_with`, as `read_files_batch` does; both sides
/// are canonicalized because macOS `/var` is a symlink to `/private/var`).
/// Never overwrites: a taken name gets a `-1`, `-2`, ... suffix, claimed with
/// `create_new`. The temp file is removed only after the copy succeeded; a
/// failed removal is logged, since the vault copy already exists.
fn import_staged_shot_in(
    temp_dir: &Path,
    source: &str,
    dest_dir: &str,
    vault_path: &str,
) -> Result<String, String> {
    let not_staged = || format!("not a staged quick-capture shot: {source}");
    let source_canonical = Path::new(source).canonicalize().map_err(|_| not_staged())?;
    let temp_canonical = temp_dir
        .canonicalize()
        .map_err(|e| format!("Failed to resolve temp dir: {e}"))?;
    let file_name = source_canonical
        .file_name()
        .and_then(|n| n.to_str())
        .filter(|n| n.starts_with(STAGED_SHOT_PREFIX))
        .ok_or_else(not_staged)?
        .to_string();
    if source_canonical.parent() != Some(temp_canonical.as_path()) || !source_canonical.is_file() {
        return Err(not_staged());
    }

    let vault_root = crate::utils::fs::validate_vault_path(vault_path)?;
    let outside = || format!("destination is outside the vault: {dest_dir}");
    let dest_canonical = Path::new(dest_dir).canonicalize().map_err(|_| outside())?;
    if !dest_canonical.starts_with(&vault_root) || !dest_canonical.is_dir() {
        return Err(outside());
    }

    let (stem, ext) = match file_name.rfind('.') {
        Some(dot) => (&file_name[..dot], &file_name[dot..]),
        None => (file_name.as_str(), ""),
    };
    let mut reader =
        std::fs::File::open(&source_canonical).map_err(|e| format!("open staged shot: {e}"))?;
    let mut n = 0u32;
    let (name, mut writer) = loop {
        let candidate = if n == 0 {
            file_name.clone()
        } else {
            format!("{stem}-{n}{ext}")
        };
        match std::fs::OpenOptions::new()
            .write(true)
            .create_new(true)
            .open(dest_canonical.join(&candidate))
        {
            Ok(file) => break (candidate, file),
            Err(e) if e.kind() == std::io::ErrorKind::AlreadyExists => n += 1,
            Err(e) => return Err(format!("create shot in vault: {e}")),
        }
    };
    let copied = std::io::copy(&mut reader, &mut writer).and_then(|_| writer.sync_all());
    if let Err(e) = copied {
        drop(writer);
        let _ = std::fs::remove_file(dest_canonical.join(&name));
        return Err(format!("copy shot into vault: {e}"));
    }
    if let Err(e) = std::fs::remove_file(&source_canonical) {
        crate::utils::logger::debug_log(
            "QUICK_CAPTURE",
            format!("staged shot copied but temp file not removed: {e}"),
        );
    }
    Ok(Path::new(dest_dir).join(&name).to_string_lossy().into_owned())
}

/// Map one detected input to a `CaptureAction`-shaped JSON object.
/// Field names match `src/lib/features/deep-link/deep-link.types.ts`
/// (`kind`, `text`, `url`, `path`, `mime`, `originalName`,
/// `capturedAt`). `vault`, `tags`, `sourceApp`, `sourceTitle`, and
/// `sourceUrl` are not populated here — the frontend or caller adds
/// them. `type: 'capture'` is included so the frontend can hand the
/// payload directly to `executeAction`.
fn capture_input_to_payload(
    input: CaptureInput,
    captured_at: &str,
    context: &CaptureContext,
) -> Result<Value, String> {
    let mut payload = match input {
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
            source: ShotSource::Bytes { .. },
        } => {
            // `materialize_input` rewrites Bytes -> Path before this is
            // ever reached on the public path. Raw bytes here mean a
            // caller skipped that step; refuse rather than emit a
            // path-less payload the frontend can't render.
            return Err(
                "shot bytes must be materialized to a temp-file path before serialization".into(),
            );
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
    };
    merge_context(&mut payload, context);
    Ok(payload)
}

/// Inject `sourceApp` / `sourceTitle` / `sourceUrl` from `context`
/// into `payload`. Each field is only set when present so the deep-
/// link template renderer treats absent fields as empty rather than
/// `"null"`.
fn merge_context(payload: &mut Value, context: &CaptureContext) {
    let Some(obj) = payload.as_object_mut() else {
        return;
    };
    if let Some(ref app) = context.source_app {
        obj.insert("sourceApp".to_string(), Value::String(app.clone()));
    }
    if let Some(ref title) = context.source_title {
        obj.insert("sourceTitle".to_string(), Value::String(title.clone()));
    }
    if let Some(ref url) = context.source_url {
        obj.insert("sourceUrl".to_string(), Value::String(url.clone()));
    }
}

/// Tauri command: read the system clipboard, detect kind(s), stamp
/// the live frontmost-app context (bundle id + browser tab when
/// applicable), and emit one `qc:capture-detected` event per result.
#[tauri::command]
pub fn capture_clipboard_now<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    last_signature: tauri::State<'_, LastCaptureSignature>,
) -> Result<(), String> {
    let captured_at = chrono::Utc::now().to_rfc3339();
    let context = resolve_context_for_bundle(frontmost_bundle_id().as_deref());
    let payloads = {
        let mut guard = last_signature.0.lock().map_err(|e| e.to_string())?;
        capture_clipboard_now_with(&SystemClipboard::new(), captured_at, context, &mut guard)?
    };
    for payload in payloads {
        app.emit(QC_CAPTURE_DETECTED_EVENT, payload)
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

/// Re-fire `set_focus` a couple of times after a show() to cover a macOS
/// race between Tauri's `makeKeyAndOrderFront` and an in-flight
/// `MoveToActiveSpace` transition. When the popover is summoned from a
/// Space other than the one it last lived on, AppKit animates the move;
/// the synchronous `set_focus` after `show` can fire before that
/// animation settles, leaving the window visible but not key (gray
/// traffic lights, keyboard input goes nowhere) until the user clicks it.
/// Two retries (150ms + 280ms) give the move a wide window to land in
/// without hurting perceived latency. Idempotent: a no-op at the AppKit
/// layer if the window is already key. Ported from quick-capture.
fn schedule_refocus_after_space_move<R: tauri::Runtime>(window: tauri::WebviewWindow<R>) {
    const RETRY_DELAYS_MS: [u64; 2] = [150, 280];
    let app = window.app_handle().clone();
    std::thread::spawn(move || {
        for &delay in &RETRY_DELAYS_MS {
            std::thread::sleep(std::time::Duration::from_millis(delay));
            let w = window.clone();
            let _ = app.run_on_main_thread(move || {
                let _ = w.set_focus();
            });
        }
    });
}

/// Show the composer popover window and emit `qc:open-composer` so the
/// route resets its focus state. Snapshots the frontmost app first, on
/// the main thread, before the popover takes focus — so the save path
/// can stamp `sourceApp` and dismiss can restore focus to that app.
pub fn show_composer<R: tauri::Runtime>(app: &tauri::AppHandle<R>) {
    let handle = app.clone();
    let _ = app.run_on_main_thread(move || {
        // macOS AppKit reads (NSWorkspace.frontmostApplication) belong on
        // the main thread. Record BEFORE show/set_focus, otherwise the
        // popover itself becomes frontmost and we lose the prior app.
        record_prev_frontmost(&handle);
        if let Some(window) = handle.get_webview_window(COMPOSER_WINDOW_LABEL) {
            let _ = window.show();
            let _ = window.set_focus();
            // Win the Space-move focus race (see helper doc).
            schedule_refocus_after_space_move(window);
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

/// Hide the composer popover. Called from the route on Esc / after a
/// successful save. Restores focus to whichever app was frontmost
/// before the popover summoned (PID stored by `record_prev_frontmost`).
#[tauri::command]
pub fn dismiss_composer<R: tauri::Runtime>(app: tauri::AppHandle<R>) -> Result<(), String> {
    let handle = app.clone();
    app.run_on_main_thread(move || {
        if let Some(window) = handle.get_webview_window(COMPOSER_WINDOW_LABEL) {
            let _ = window.hide();
        }
        activate_prev_app(&handle);
    })
    .map_err(|e| e.to_string())
}

/// Build a `note`-kind capture payload from composer text, stamped
/// with `context`. `composerRequestId` marks the payload as composer
/// sent, so the main window answers it with
/// `report_composer_capture_result`; clipboard-shortcut payloads carry
/// no id and get no answer. Pure so the caller-side guard (trim →
/// no-emit on empty) is testable without a Tauri runtime.
pub fn build_composer_note_payload(
    text: &str,
    captured_at: String,
    request_id: &str,
    context: &CaptureContext,
) -> Value {
    let mut payload = json!({
        "type": "capture",
        "kind": "note",
        "text": text,
        "capturedAt": captured_at,
        "composerRequestId": request_id,
    });
    merge_context(&mut payload, context);
    payload
}

/// Composer-side save path. The composer webview cannot directly invoke
/// `executeAction` because it lives in a separate JS context from the
/// main window (different webview origin → no shared `vaultStore`).
/// Instead it posts the typed text here and Rust emits the same
/// `qc:capture-detected` event the clipboard-shortcut path uses — the
/// main-window listener then fills the active vault and dispatches.
/// `Ok` only means the event was emitted: the outcome of the write comes
/// back to the composer as a `qc:composer-capture-result` event carrying
/// the same `request_id`.
///
/// Source-app context comes from the PID recorded at summon (see
/// `record_prev_frontmost`); we `peek` so dismiss can still take it.
#[tauri::command]
pub fn submit_composer_capture<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    text: String,
    request_id: String,
) -> Result<(), String> {
    if text.trim().is_empty() {
        // Empty composer body should never reach Rust (the route filters
        // before calling), but the guard makes the contract explicit.
        return Ok(());
    }
    let captured_at = chrono::Utc::now().to_rfc3339();
    let prev_pid = app.state::<PrevFrontmostPid>().peek();
    let bundle = bundle_id_for_pid(prev_pid);
    let context = resolve_context_for_bundle(bundle.as_deref());
    let payload = build_composer_note_payload(&text, captured_at, &request_id, &context);
    app.emit(QC_CAPTURE_DETECTED_EVENT, payload)
        .map_err(|e| e.to_string())
}

/// Outcome of one composer capture, sent from the main window back to
/// the composer on `qc:composer-capture-result`.
#[derive(serde::Serialize, Clone, Debug, PartialEq, ts_rs::TS)]
#[ts(export)]
#[serde(rename_all = "camelCase")]
pub struct ComposerCaptureResult {
    /// The `request_id` the composer passed to `submit_composer_capture`.
    pub request_id: String,
    /// `true` once the capture note is written; `false` when the main
    /// window could not write it.
    pub ok: bool,
}

/// Main-window side of the composer round trip: relays the outcome of a
/// composer capture to the composer window, which keeps its text until
/// it hears `ok`.
#[tauri::command]
pub fn report_composer_capture_result<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    request_id: String,
    ok: bool,
) -> Result<(), String> {
    app.emit(
        QC_COMPOSER_CAPTURE_RESULT_EVENT,
        ComposerCaptureResult { request_id, ok },
    )
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
        let mut last = None;
        capture_clipboard_now_with(&fake, FIXED_TS.to_string(), CaptureContext::default(), &mut last)
            .expect("inner")
    }

    fn run_with_context(
        snapshot: Result<ClipboardSnapshot, crate::quick_capture::clipboard::ClipboardError>,
        ctx: CaptureContext,
    ) -> Vec<Value> {
        let fake = FakeClipboard::with(snapshot);
        let mut last = None;
        capture_clipboard_now_with(&fake, FIXED_TS.to_string(), ctx, &mut last).expect("inner")
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
        assert_eq!(
            out[0]["staged"], true,
            "a temp-staged shot is marked so the frontend copies it into the vault"
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
        assert!(
            out[0].get("staged").is_none(),
            "a Finder-copied image is the user's file, not a staged copy"
        );
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
            CaptureContext::default(),
            &mut None,
        )
        .expect_err("empty text must error");
        assert!(err.contains("clipboard text is empty"), "got: {err}");
    }

    #[test]
    fn duplicate_text_on_a_repeat_press_is_deduped() {
        let mut last = None;
        let first = capture_clipboard_now_with(
            &FakeClipboard::with(Ok(ClipboardSnapshot::Text("repeat me".into()))),
            FIXED_TS.to_string(),
            CaptureContext::default(),
            &mut last,
        )
        .expect("first capture");
        assert_eq!(first.len(), 1, "first press emits");
        let second = capture_clipboard_now_with(
            &FakeClipboard::with(Ok(ClipboardSnapshot::Text("repeat me".into()))),
            FIXED_TS.to_string(),
            CaptureContext::default(),
            &mut last,
        )
        .expect("second capture");
        assert!(second.is_empty(), "identical clipboard on a repeat press is skipped");
    }

    #[test]
    fn different_text_after_a_capture_is_not_deduped() {
        let mut last = None;
        let _ = capture_clipboard_now_with(
            &FakeClipboard::with(Ok(ClipboardSnapshot::Text("first".into()))),
            FIXED_TS.to_string(),
            CaptureContext::default(),
            &mut last,
        )
        .expect("first capture");
        let second = capture_clipboard_now_with(
            &FakeClipboard::with(Ok(ClipboardSnapshot::Text("second".into()))),
            FIXED_TS.to_string(),
            CaptureContext::default(),
            &mut last,
        )
        .expect("second capture");
        assert_eq!(second.len(), 1, "different content still captures");
        assert_eq!(second[0]["text"], "second");
    }

    #[test]
    fn duplicate_path_within_one_batch_is_deduped() {
        let mut last = None;
        let out = capture_clipboard_now_with(
            &FakeClipboard::with(Ok(ClipboardSnapshot::Files(vec![
                PathBuf::from("/tmp/doc.pdf"),
                PathBuf::from("/tmp/doc.pdf"),
            ]))),
            FIXED_TS.to_string(),
            CaptureContext::default(),
            &mut last,
        )
        .expect("batch capture");
        assert_eq!(out.len(), 1, "two identical paths in one batch dedupe to one");
        assert_eq!(out[0]["path"], "/tmp/doc.pdf");
    }

    #[test]
    fn composer_note_payload_has_note_kind() {
        let p = build_composer_note_payload(
            "a thought",
            FIXED_TS.to_string(),
            "req-1",
            &CaptureContext::default(),
        );
        assert_eq!(p["type"], "capture");
        assert_eq!(p["kind"], "note");
        assert_eq!(p["text"], "a thought");
        assert_eq!(p["capturedAt"], FIXED_TS);
        assert_eq!(p["composerRequestId"], "req-1");
    }

    #[test]
    fn clipboard_payload_has_no_composer_request_id() {
        // Only composer payloads are answered with a capture result.
        let out = run(Ok(ClipboardSnapshot::Text("idea".into())));
        assert!(out[0].get("composerRequestId").is_none());
    }

    #[test]
    fn composer_capture_result_serializes_camel_case() {
        let result = ComposerCaptureResult { request_id: "req-1".into(), ok: false };
        assert_eq!(
            serde_json::to_value(&result).unwrap(),
            json!({ "requestId": "req-1", "ok": false })
        );
    }

    #[test]
    fn composer_note_payload_preserves_whitespace_in_text() {
        // The caller trims to decide whether to emit, but the payload
        // itself must keep the user's exact body verbatim — preserving
        // leading/trailing newlines and indentation.
        let body = "\n  indented line\nsecond\n";
        let p = build_composer_note_payload(body, FIXED_TS.to_string(), "req-1", &CaptureContext::default());
        assert_eq!(p["text"], body);
    }

    #[test]
    fn payload_includes_source_app_when_context_present() {
        let ctx = CaptureContext {
            source_app: Some("com.google.Chrome".into()),
            source_title: Some("Example".into()),
            source_url: Some("https://example.com".into()),
        };
        let out = run_with_context(Ok(ClipboardSnapshot::Text("idea".into())), ctx);
        assert_eq!(out[0]["sourceApp"], "com.google.Chrome");
        assert_eq!(out[0]["sourceTitle"], "Example");
        assert_eq!(out[0]["sourceUrl"], "https://example.com");
    }

    #[test]
    fn payload_omits_source_fields_when_context_empty() {
        let out = run_with_context(
            Ok(ClipboardSnapshot::Text("idea".into())),
            CaptureContext::default(),
        );
        assert!(out[0].get("sourceApp").is_none());
        assert!(out[0].get("sourceTitle").is_none());
        assert!(out[0].get("sourceUrl").is_none());
    }

    #[test]
    fn composer_payload_includes_source_app_from_context() {
        let ctx = CaptureContext {
            source_app: Some("com.apple.Safari".into()),
            source_title: None,
            source_url: None,
        };
        let p = build_composer_note_payload("idea", FIXED_TS.to_string(), "req-1", &ctx);
        assert_eq!(p["sourceApp"], "com.apple.Safari");
        assert!(p.get("sourceTitle").is_none());
        assert!(p.get("sourceUrl").is_none());
    }

    /// A fake OS temp dir and a vault with an `Inbox` folder.
    struct ImportFixture {
        temp: tempfile::TempDir,
        vault: tempfile::TempDir,
    }

    impl ImportFixture {
        fn new() -> Self {
            let fx = Self {
                temp: tempfile::tempdir().unwrap(),
                vault: tempfile::tempdir().unwrap(),
            };
            std::fs::create_dir(fx.inbox()).unwrap();
            fx
        }

        fn inbox(&self) -> PathBuf {
            self.vault.path().join("Inbox")
        }

        fn stage(&self, name: &str, bytes: &[u8]) -> PathBuf {
            let path = self.temp.path().join(name);
            std::fs::write(&path, bytes).unwrap();
            path
        }

        fn import(&self, source: &std::path::Path, dest: &std::path::Path) -> Result<String, String> {
            import_staged_shot_in(
                self.temp.path(),
                &source.to_string_lossy(),
                &dest.to_string_lossy(),
                &self.vault.path().to_string_lossy(),
            )
        }
    }

    #[test]
    fn import_staged_shot_copies_into_the_vault_folder_and_removes_the_temp_file() {
        let fx = ImportFixture::new();
        let source = fx.stage("qc-shot-20261102T100000000001.png", &[9, 8, 7]);

        let out = fx.import(&source, &fx.inbox()).expect("import succeeds");

        let expected = fx.inbox().join("qc-shot-20261102T100000000001.png");
        assert_eq!(PathBuf::from(&out), expected, "returns the path inside the given folder");
        assert_eq!(std::fs::read(&expected).unwrap(), vec![9, 8, 7], "same bytes");
        assert!(!source.exists(), "the temp file is removed after the copy");
    }

    #[test]
    fn import_staged_shot_never_overwrites_an_existing_file() {
        let fx = ImportFixture::new();
        let taken = fx.inbox().join("qc-shot-a.png");
        std::fs::write(&taken, b"keep me").unwrap();
        let source = fx.stage("qc-shot-a.png", b"new");

        let out = fx.import(&source, &fx.inbox()).expect("import succeeds");

        assert_eq!(PathBuf::from(&out), fx.inbox().join("qc-shot-a-1.png"));
        assert_eq!(std::fs::read(&taken).unwrap(), b"keep me", "existing file untouched");
        assert_eq!(std::fs::read(&out).unwrap(), b"new");
    }

    #[test]
    fn import_staged_shot_refuses_a_source_not_named_qc_shot() {
        let fx = ImportFixture::new();
        let source = fx.stage("secrets.png", b"x");

        let err = fx.import(&source, &fx.inbox()).expect_err("refused");

        assert!(err.contains("not a staged"), "got: {err}");
        assert!(source.exists(), "a refused source is left alone");
        assert_eq!(std::fs::read_dir(fx.inbox()).unwrap().count(), 0);
    }

    #[test]
    fn import_staged_shot_refuses_a_source_outside_the_temp_dir() {
        let fx = ImportFixture::new();
        let elsewhere = tempfile::tempdir().unwrap();
        let source = elsewhere.path().join("qc-shot-b.png");
        std::fs::write(&source, b"x").unwrap();

        let err = fx.import(&source, &fx.inbox()).expect_err("refused");

        assert!(err.contains("not a staged"), "got: {err}");
        assert!(source.exists());
    }

    #[test]
    fn import_staged_shot_refuses_a_source_in_a_temp_subfolder() {
        let fx = ImportFixture::new();
        std::fs::create_dir(fx.temp.path().join("sub")).unwrap();
        let source = fx.stage("sub/qc-shot-c.png", b"x");

        let err = fx.import(&source, &fx.inbox()).expect_err("refused");

        assert!(err.contains("not a staged"), "got: {err}");
    }

    #[test]
    fn import_staged_shot_refuses_a_destination_outside_the_vault() {
        let fx = ImportFixture::new();
        let source = fx.stage("qc-shot-d.png", b"x");
        let outside = tempfile::tempdir().unwrap();

        let err = fx.import(&source, outside.path()).expect_err("refused");

        assert!(err.contains("outside the vault"), "got: {err}");
        assert!(source.exists(), "the temp file survives a refused import");
        assert_eq!(std::fs::read_dir(outside.path()).unwrap().count(), 0);
    }

    #[test]
    fn import_staged_shot_refuses_a_destination_escaping_the_vault_with_dot_dot() {
        let fx = ImportFixture::new();
        let source = fx.stage("qc-shot-e.png", b"x");
        let escaping = fx.inbox().join("..").join("..");

        let err = fx.import(&source, &escaping).expect_err("refused");

        assert!(err.contains("outside the vault"), "got: {err}");
    }
}

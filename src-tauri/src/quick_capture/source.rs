//! Frontmost-app source helpers.
//!
//! Adapted from quick-capture so every captured note can be stamped
//! with `source_app`, `source_title`, and `source_url`. The bundle id
//! comes from NSWorkspace; browser tab title + URL come from a thin
//! AppleScript over Chrome/Safari (the only two browsers QC supported,
//! and the only ones macOS officially scriptable without extra
//! entitlements). Anything that is not Chrome/Safari just resolves to
//! `(source_app, None, None)`.
//!
//! For the composer save path, the frontmost-at-summon PID is stored
//! in `PrevFrontmostPid` (a Tauri-managed atomic) and looked up on
//! submit. Clipboard shortcut takes the live `frontmostApplication`
//! directly because the user's app is still frontmost — kokobrain
//! doesn't steal focus for the clipboard path.

use std::sync::atomic::{AtomicI32, Ordering};

/// What we stamp onto a `CaptureAction` payload before dispatching.
/// Every field is independently optional — missing pieces stay
/// `None` and the deep-link handler treats them as absent (empty
/// YAML field rather than literal "null").
#[derive(Debug, Default, Clone, PartialEq, Eq)]
pub struct CaptureContext {
    pub source_app: Option<String>,
    pub source_title: Option<String>,
    pub source_url: Option<String>,
}

/// Tauri-managed PID of the macOS app that was frontmost when the
/// composer was last summoned. -1 means "no recorded frontmost".
/// Atomic so `record_prev_frontmost` (shortcut dispatcher thread)
/// and the composer save / dismiss commands (main thread) stay
/// race-free.
#[derive(Default)]
pub struct PrevFrontmostPid(AtomicI32);

impl PrevFrontmostPid {
    pub fn new() -> Self {
        Self(AtomicI32::new(-1))
    }

    pub fn store(&self, pid: i32) {
        self.0.store(pid, Ordering::SeqCst);
    }

    /// Atomically read the stored PID and reset to -1.
    pub fn take(&self) -> i32 {
        self.0.swap(-1, Ordering::SeqCst)
    }

    /// Read the stored PID without resetting. Used by the composer
    /// save path to stamp `source_app` while leaving the dismiss
    /// path's reactivation target intact.
    pub fn peek(&self) -> i32 {
        self.0.load(Ordering::SeqCst)
    }
}

/// Snapshot the macOS frontmost-app PID into `PrevFrontmostPid`. Call
/// from every composer-summon path BEFORE showing the popover, while
/// the user's real prior app is still frontmost. Our own PID is
/// filtered out so a re-summon while the popover is already up does
/// not record us as the "prior" app.
#[cfg(target_os = "macos")]
pub fn record_prev_frontmost<R: tauri::Runtime>(app: &tauri::AppHandle<R>) {
    use objc2::runtime::AnyObject;
    use objc2::{class, msg_send};
    use tauri::Manager;
    unsafe {
        let workspace: *mut AnyObject = msg_send![class!(NSWorkspace), sharedWorkspace];
        if workspace.is_null() {
            return;
        }
        let frontmost: *mut AnyObject = msg_send![workspace, frontmostApplication];
        if frontmost.is_null() {
            return;
        }
        let pid: i32 = msg_send![frontmost, processIdentifier];
        let our_pid = std::process::id() as i32;
        if pid > 0 && pid != our_pid {
            app.state::<PrevFrontmostPid>().store(pid);
        }
    }
}

#[cfg(not(target_os = "macos"))]
pub fn record_prev_frontmost<R: tauri::Runtime>(_app: &tauri::AppHandle<R>) {}

/// Activate the app whose PID was last recorded by
/// `record_prev_frontmost`. Takes the stored PID (resetting to -1) so
/// a subsequent unrelated dismiss does not re-trigger.
#[cfg(target_os = "macos")]
pub fn activate_prev_app<R: tauri::Runtime>(app: &tauri::AppHandle<R>) {
    use objc2::runtime::AnyObject;
    use objc2::{class, msg_send};
    use tauri::Manager;
    let pid = app.state::<PrevFrontmostPid>().take();
    if pid <= 0 {
        return;
    }
    unsafe {
        let cls: *mut AnyObject =
            msg_send![class!(NSRunningApplication), runningApplicationWithProcessIdentifier: pid];
        if cls.is_null() {
            return;
        }
        // 0 = no special options; macOS still brings the target app to
        // the foreground. activateWithOptions: stays supported and
        // works on every macOS we ship to (10.6+).
        let _: bool = msg_send![cls, activateWithOptions: 0u64];
    }
}

#[cfg(not(target_os = "macos"))]
pub fn activate_prev_app<R: tauri::Runtime>(_app: &tauri::AppHandle<R>) {}

/// Read the bundle identifier of whatever macOS app is currently
/// frontmost. Used by the clipboard shortcut — kokobrain stays in the
/// background while the shortcut fires, so the user's app is still
/// the frontmost one when we query.
#[cfg(target_os = "macos")]
pub fn frontmost_bundle_id() -> Option<String> {
    use objc2::runtime::AnyObject;
    use objc2::{class, msg_send};
    use objc2_foundation::NSString;
    unsafe {
        let workspace: *mut AnyObject = msg_send![class!(NSWorkspace), sharedWorkspace];
        if workspace.is_null() {
            return None;
        }
        let app: *mut AnyObject = msg_send![workspace, frontmostApplication];
        if app.is_null() {
            return None;
        }
        let bundle: *mut NSString = msg_send![app, bundleIdentifier];
        if bundle.is_null() {
            return None;
        }
        Some((*bundle).to_string())
    }
}

#[cfg(not(target_os = "macos"))]
pub fn frontmost_bundle_id() -> Option<String> {
    None
}

/// Resolve an NSRunningApplication by PID and return its bundle
/// identifier. Used by the composer save path: we stored the PID at
/// summon and need to turn it into the human-recognisable
/// `source_app` field.
#[cfg(target_os = "macos")]
pub fn bundle_id_for_pid(pid: i32) -> Option<String> {
    use objc2::runtime::AnyObject;
    use objc2::{class, msg_send};
    use objc2_foundation::NSString;
    if pid <= 0 {
        return None;
    }
    unsafe {
        let cls: *mut AnyObject =
            msg_send![class!(NSRunningApplication), runningApplicationWithProcessIdentifier: pid];
        if cls.is_null() {
            return None;
        }
        let bundle: *mut NSString = msg_send![cls, bundleIdentifier];
        if bundle.is_null() {
            return None;
        }
        Some((*bundle).to_string())
    }
}

#[cfg(not(target_os = "macos"))]
pub fn bundle_id_for_pid(_pid: i32) -> Option<String> {
    None
}

/// Build a `CaptureContext` from a macOS bundle id. Looks up the
/// active tab title + URL for known browsers (Chrome, Safari) via
/// AppleScript; returns app-only context for anything else. `None`
/// bundle id (resolution failed) yields all-`None` context.
pub fn resolve_context_for_bundle(bundle_id: Option<&str>) -> CaptureContext {
    let Some(bid) = bundle_id else {
        return CaptureContext::default();
    };
    let (title, url) = match bid {
        // Chrome (stable / Canary / Beta / Dev) all share the same
        // AppleScript dictionary; targeting by bundle id makes them
        // all work without a per-build branch.
        b if b.starts_with("com.google.Chrome") => browser_active_tab_chrome(b),
        b @ ("com.apple.Safari" | "com.apple.SafariTechnologyPreview") => safari_active_tab(b),
        _ => (None, None),
    };
    CaptureContext {
        source_app: Some(bid.to_string()),
        source_title: title,
        source_url: url,
    }
}

#[cfg(target_os = "macos")]
fn browser_active_tab_chrome(bundle: &str) -> (Option<String>, Option<String>) {
    let script = format!(
        r#"tell application id "{bundle}"
            if (count of windows) = 0 then return ""
            set t to active tab of front window
            return (URL of t) & "
" & (title of t)
        end tell"#
    );
    parse_url_then_title(run_osascript(&script))
}

#[cfg(not(target_os = "macos"))]
fn browser_active_tab_chrome(_bundle: &str) -> (Option<String>, Option<String>) {
    (None, None)
}

#[cfg(target_os = "macos")]
fn safari_active_tab(bundle: &str) -> (Option<String>, Option<String>) {
    let script = format!(
        r#"tell application id "{bundle}"
            if (count of documents) = 0 then return ""
            return (URL of front document) & "
" & (name of front document)
        end tell"#
    );
    parse_url_then_title(run_osascript(&script))
}

#[cfg(not(target_os = "macos"))]
fn safari_active_tab(_bundle: &str) -> (Option<String>, Option<String>) {
    (None, None)
}

/// Run an AppleScript snippet via `osascript -e`. Returns the trimmed
/// stdout on success, or `None` on spawn failure / non-zero exit /
/// empty output. macOS will prompt the user the first time the app
/// tries to script another app (Apple Events permission).
#[cfg(target_os = "macos")]
fn run_osascript(script: &str) -> Option<String> {
    let out = std::process::Command::new("osascript")
        .arg("-e")
        .arg(script)
        .output()
        .ok()?;
    if !out.status.success() {
        return None;
    }
    let s = String::from_utf8(out.stdout).ok()?;
    let trimmed = s.trim();
    if trimmed.is_empty() {
        None
    } else {
        Some(trimmed.to_string())
    }
}

/// Parse a two-line "url\ntitle" string into (title, url). Both
/// fields are independently optional — a partial response from the
/// browser still surfaces whatever it managed to return.
pub fn parse_url_then_title(out: Option<String>) -> (Option<String>, Option<String>) {
    let Some(text) = out else {
        return (None, None);
    };
    let mut lines = text.lines();
    let url = lines
        .next()
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .map(str::to_string);
    let title = lines
        .next()
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .map(str::to_string);
    (title, url)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_url_then_title_handles_full_input() {
        let (title, url) =
            parse_url_then_title(Some("https://example.com\nExample Domain".into()));
        assert_eq!(url.as_deref(), Some("https://example.com"));
        assert_eq!(title.as_deref(), Some("Example Domain"));
    }

    #[test]
    fn parse_url_then_title_handles_url_only() {
        let (title, url) = parse_url_then_title(Some("https://example.com".into()));
        assert_eq!(url.as_deref(), Some("https://example.com"));
        assert!(title.is_none());
    }

    #[test]
    fn parse_url_then_title_handles_none() {
        let (title, url) = parse_url_then_title(None);
        assert!(title.is_none());
        assert!(url.is_none());
    }

    #[test]
    fn parse_url_then_title_trims_whitespace_and_drops_empty_lines() {
        let (title, url) = parse_url_then_title(Some("  https://x  \n   ".into()));
        assert_eq!(url.as_deref(), Some("https://x"));
        assert!(title.is_none());
    }

    #[test]
    fn resolve_context_for_bundle_none_returns_default() {
        assert_eq!(resolve_context_for_bundle(None), CaptureContext::default());
    }

    #[test]
    fn resolve_context_for_bundle_unknown_bundle_returns_app_only() {
        let ctx = resolve_context_for_bundle(Some("com.example.unknown"));
        assert_eq!(ctx.source_app.as_deref(), Some("com.example.unknown"));
        assert!(ctx.source_title.is_none());
        assert!(ctx.source_url.is_none());
    }

    #[test]
    fn prev_frontmost_pid_take_resets_to_minus_one() {
        let state = PrevFrontmostPid::new();
        state.store(1234);
        assert_eq!(state.peek(), 1234);
        assert_eq!(state.take(), 1234);
        assert_eq!(state.peek(), -1);
    }

    #[test]
    fn prev_frontmost_pid_peek_does_not_reset() {
        let state = PrevFrontmostPid::new();
        state.store(99);
        assert_eq!(state.peek(), 99);
        assert_eq!(state.peek(), 99);
    }
}

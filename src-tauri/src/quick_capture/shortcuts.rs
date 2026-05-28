//! Global-shortcut intent registry.
//!
//! Adapted from quick-capture's `src-tauri/src/shortcuts/mod.rs`,
//! trimmed to the two intents the merge ships in Phase 1:
//! `OpenComposer` (P2 wires the real handler) and `CaptureClipboard`.
//!
//! What we test here is the registry itself — accelerator strings and
//! ids — so a future rename or rebind is caught by cargo. The OS-level
//! plugin binding lives in `lib.rs::run`; it is verified by manual
//! smoke (press Ctrl+Alt+Cmd+C, expect a markdown file).

/// Closed set of shortcut intents wired in this merge.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum ShortcutId {
    OpenComposer,
    CaptureClipboard,
}

/// One row in the registry: which accelerator triggers it.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ShortcutBinding {
    pub id: ShortcutId,
    pub accelerator: &'static str,
}

/// Default Phase 1 registry. `OpenComposer` dispatches to a placeholder
/// in P1.6 and is wired to the real composer window in P2.3.
pub fn default_registry() -> Vec<ShortcutBinding> {
    vec![
        ShortcutBinding {
            id: ShortcutId::OpenComposer,
            accelerator: "Ctrl+Alt+Cmd+Space",
        },
        ShortcutBinding {
            id: ShortcutId::CaptureClipboard,
            accelerator: "Ctrl+Alt+Cmd+C",
        },
    ]
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn registry_has_two_entries() {
        assert_eq!(default_registry().len(), 2);
    }

    #[test]
    fn open_composer_uses_ctrl_alt_cmd_space() {
        let r = default_registry();
        let b = r
            .iter()
            .find(|b| b.id == ShortcutId::OpenComposer)
            .expect("OpenComposer present");
        assert_eq!(b.accelerator, "Ctrl+Alt+Cmd+Space");
    }

    #[test]
    fn capture_clipboard_uses_ctrl_alt_cmd_c() {
        let r = default_registry();
        let b = r
            .iter()
            .find(|b| b.id == ShortcutId::CaptureClipboard)
            .expect("CaptureClipboard present");
        assert_eq!(b.accelerator, "Ctrl+Alt+Cmd+C");
    }

    #[test]
    fn registry_has_no_duplicate_accelerators() {
        let r = default_registry();
        let mut accels: Vec<_> = r.iter().map(|b| b.accelerator).collect();
        accels.sort();
        let before = accels.len();
        accels.dedup();
        assert_eq!(accels.len(), before, "duplicate accelerator in registry");
    }
}

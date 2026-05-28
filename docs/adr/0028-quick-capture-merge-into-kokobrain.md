---
type: ADR
id: "0028"
title: "Merge quick-capture surface into kokobrain — composer popover + clipboard shortcut"
status: active
date: 2026-05-28
---

## Context

A sibling Tauri+Svelte app called **quick-capture** (`/Users/diegorv/Dev/pet-projects/koko/quick-capture`) shipped as a macOS menubar tool for fast capture. It saved into its own SQLite store, presented an Inbox + Archive split-pane UI, and ferried completed captures to kokobrain through the `kokobrain://capture?v=2&...` deep-link URI.

Two apps for one user is friction. Every capture had to round-trip across processes (URI emit → OS deep-link dispatch → kokobrain consumes). The kokobrain side already implemented the full receiving end at `src/lib/features/deep-link/deep-link.service.ts::executeAction` — every capture kind (note/clip/link/shot/file), template rendering, frontmatter injection, tag merging, v2 provenance fields. The quick-capture side had the OS-level affordances (global hotkey, popover window, NSWorkspace source-app detection, AppleScript browser-tab read).

## Decision

**Merge the OS-level affordances of quick-capture into kokobrain, keep the kokobrain receiver as the only writer of captured notes, and drop every quick-capture surface that does not survive the single-binary model.**

### What ports (as-is)

| QC source | Kokobrain destination | Notes |
|-----------|----------------------|-------|
| `clipboard/mod.rs` | `src-tauri/src/quick_capture/clipboard.rs` | Adapter trait + `SystemClipboard` + `FakeClipboard` + image→PNG re-encode. Verbatim. |
| `kind_detect/mod.rs` | `src-tauri/src/quick_capture/kind_detect.rs` | Pure `decide()` keeps URL detection + file-mime guessing. Variant names match kokobrain `CaptureKind`. |
| `shortcuts/mod.rs` | `src-tauri/src/quick_capture/shortcuts.rs` | Trimmed to two intents: `OpenComposer` (Ctrl+Alt+Cmd+Space) + `CaptureClipboard` (Ctrl+Alt+Cmd+C). |
| `commands::frontmost_bundle_id` / `record_prev_frontmost` / `activate_prev_app` / `resolve_context_for_bundle` | `src-tauri/src/quick_capture/source.rs` | NSWorkspace + AppleScript helpers for Chrome / Safari. macOS-only, no-op stubs otherwise. |
| `lib.rs::build_composer_window` block | kokobrain `lib.rs` setup hook | 600x240 popover, transparent, decorations off, hidden at startup, intercept-close-as-hide, move-to-active-space. |

### What drops

- **Inbox** + **Archive** routes, the SQLite captures store, paginated-list store, star/soft-delete logic — kokobrain captures land directly in the vault, the editor IS the long-term home.
- **Recording** + **Whisper transcription** + Silero VAD + the entire audio pipeline.
- **Dock** drag-drop widget + NSWorkspace fullscreen observer.
- **Destinations** system — kokobrain is the single destination; `settingsStore.quickCapture.folderFormat` + per-kind templates replace the QC destinations picker.
- **Settings window** — kokobrain integrates a "Quick Capture" tab into its existing settings panel per `feedback_settings-panel-not-window.md`.
- **Tray menu** — capture happens via global hotkeys only. Settings + quit via the main kokobrain window.
- **External `kokobrain://capture` URI builder** in QC — composer + clipboard call the kokobrain handler directly (no URI roundtrip). The receiving scheme stays registered as an external automation surface (Apple Shortcuts, Raycast, scripts) but no longer has an internal caller.

### What adapts (seam edits)

- `kind_detect` emits an intermediate `CaptureInput` enum shaped like the kokobrain `CaptureAction` discriminated union (no `Shot::Bytes` → bytes resolve to a temp file before payload serialization in `commands::materialize_input`).
- The clipboard-shortcut path emits a `qc:capture-detected` Tauri event; the frontend listener in `src/lib/plugins/quick-capture/quick-capture.service.ts` fills `vault` from `vaultStore.name` and dispatches via `deep-link.service.ts::executeAction`. Same path the URI handler uses.
- The composer route runs in a separate webview from the main window; it cannot import `vaultStore`. The save handler invokes a Rust IPC `submit_composer_capture(text)` which emits the same `qc:capture-detected` event so the main-window listener does the actual `executeAction` dispatch.
- `executeCaptureAction` switched the template lookup to `settingsStore.quickCapture.templates[kind]` so each capture kind picks its own template. Folder/filename read straight from `quickCapture.folderFormat` / `quickCapture.filenameFormat` — the old `quickNote.*` settings were renamed wholesale into `quickCapture` (same logic, new namespace), so there is no fallback path and no legacy key left to read.

## Consequences

### Positive

- Single binary. One install, one update story, one settings file.
- The save path is one function (`executeAction`) regardless of whether the trigger was the composer, the clipboard shortcut, an external `kokobrain://capture` URI, or a future surface — no risk of divergence between two writers.
- Source provenance (`sourceApp` / `sourceTitle` / `sourceUrl`) is captured from the same NSWorkspace + AppleScript helpers that QC already proved out, and now lands directly in the vault without IPC indirection.
- Per-kind templates let the user theme the captured note differently for a quick text idea vs. a Chrome highlight vs. a clipboard image.

### Negative

- The Inbox / Archive triage workflow disappears — captures land directly in the vault and are visible in the file explorer immediately. Users who relied on the Inbox as a buffer must triage in the editor.
- `transparent(true)` on the composer popover requires the `macos-private-api` Tauri feature, which makes the build technically App Store-incompatible. Kokobrain self-distributes via DMG, so this is not a regression.
- The composer webview lives at its own Tauri origin and cannot share `vaultStore` directly with the main window. The IPC bridge (`submit_composer_capture`) costs one extra round trip per save but the shape is simpler than threading vault state across webviews.

### Out of scope (Phase 5 follow-ups)

- Status toast on clipboard capture success.
- Wikilink `[[` autocomplete in the composer (requires CodeMirror swap + IPC exposing vault entries to the composer webview).
- Hotkey enable/disable toggles in the Settings UI (would require a Rust-side persistent store since the dispatcher runs outside any webview).

## References

- Plan + task ledger: `tasks/done/merge-quick-capture.md` (after Phase 4 closes).
- Source: `src-tauri/src/quick_capture/{clipboard,kind_detect,shortcuts,commands,source}.rs`, `src-tauri/src/lib.rs::{dispatch_shortcut, build_composer_window}`, `src/routes/composer/+page.svelte`, `src/lib/plugins/quick-capture/quick-capture.service.ts`, `src/lib/features/deep-link/deep-link.service.ts::executeCaptureAction`.
- Settings: `src/lib/core/settings/settings.types.ts::QuickCaptureSettings`, `sections/QuickCaptureSection.svelte`.
- Related: `0024-auto-update-tauri-plugin-updater.md` (auto-updater already in kokobrain, no port needed).

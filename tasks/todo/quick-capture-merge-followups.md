# Quick Capture merge follow-ups

Findings from the audit of the quick-capture -> kokobrain merge (`9a58a33b..1108d590`).
User-approved subset. One task = one commit. Run the relevant test stack before each
commit (CLAUDE.md Quick Reference rule 6).

Dropped from the audit list (no-op by convention / user decision):
- Settings migration fallback `quickNote.*` -> user explicitly dropped it (legacy block may vanish).
- Composer component test -> repo has no `@testing-library/svelte`; testable logic already in `.ts`.
- Move cargo tests to `tests/quick_capture/` -> inline `#[cfg(test)]` is an established brain convention.
- Thin Tauri command tests -> inner helpers already tested; glue needs a Tauri runtime (matches QC).

## Tasks

- [x] T1 (#1) — Fix ADR 0028: remove the promised `quickNote.*` folder/filename fallback. Code reads only `quickCapture.folderFormat`/`filenameFormat` (`deep-link.service.ts:326-327`); the ADR's fallback sentence is false. Doc-only. Verify: grep ADR for the fallback claim, confirm removed.
- [ ] T2 (#6) — Trim `image` crate feature in `src-tauri/Cargo.toml:32`: `["png", "jpeg"]` -> `["png"]`. jpeg codec never exercised (arboard hands raw RGBA -> always PNG-encoded; file paths never decode through the crate). Verify: `cargo test --manifest-path src-tauri/Cargo.toml` green.
- [ ] T3 (#5) — Remove stale "Image clipboard capture not yet supported" path. Frontend: drop the `pending` skip-branch + toast (`quick-capture.service.ts:79-83`). Rust: the `Shot::Bytes` arm in `capture_input_to_payload` (`commands.rs:146-160`) is unreachable (materialize_input rewrites Bytes->Path first). Keep match exhaustive (Shot has Bytes + Path) but make pending impossible to emit (return Err or restructure so the dead arm cannot produce `pending:true`). Verify: pnpm check + vitest + cargo test.
- [ ] T4 (#4) — Remove duplicate `qc:open-composer` emit. Emitted twice per summon: inside `show_composer` (`commands.rs:224`) and again in `dispatch_shortcut` after it returns (`lib.rs`). Keep one. Verify: cargo test green; manual smoke composer still opens.
- [ ] T5 (#3) — Move `record_prev_frontmost` (composer path) onto the main thread to match QC. Currently runs on the global-shortcut handler thread (`lib.rs` dispatch + `commands.rs:217-226`); QC ran it inside `show_composer`'s `run_on_main_thread` closure. AppKit reads should be on main. Verify: cargo test green; manual smoke focus-restore on dismiss.
- [ ] T6 (#2) — Port `schedule_refocus_after_space_move` from QC (`commands/mod.rs:471-483`) into `show_composer`. Re-fires `set_focus` at ~150ms + ~280ms after show to win the macOS Space-move focus race. Without it the composer can land visible-but-not-key when summoned from another Space. macOS-only with no-op twin for non-mac. Verify: cargo test green; manual smoke summon from another Space.
- [ ] T7 (#8) — Re-add clipboard dedup, in-memory (session-only). Tauri-managed state holds the last captured signature (per-kind string: clip/note text, link url, file/shot path). On `capture_clipboard_now`, skip a detected input equal to the last signature; update as we go so a multi-item batch dedupes consecutive identicals too (matches QC `capture_clipboard_now_with` + `is_clipboard_duplicate`). Session-only: resets on app restart (no SQLite). Port QC's per-kind comparison; binary Shot::Bytes never deduped (QC parity). Verify: cargo test with a FakeClipboard covering text/url/file dup + non-dup; pnpm check + vitest if frontend touched.

## Notes

- T7 caveat: QC compared against the last *stored* capture (persistent). Brain has no store -> session-only dedup. Covers the real case (press Ctrl+Alt+Cmd+C twice on same clipboard); lost on restart.
- T3 Rust constraint: `capture_input_to_payload` matches `CaptureInput` which has `Shot{Bytes}` + `Shot{Path}`. Removing the Bytes arm breaks exhaustiveness — restructure rather than delete blindly.
- All cargo work: keep `cfg(target_os="macos")` dual-definitions (mac fn + non-mac no-op twin) so non-mac builds still compile (QC pattern, used throughout this module).

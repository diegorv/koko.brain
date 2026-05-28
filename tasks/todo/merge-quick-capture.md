# Merge quick-capture into kokobrain

## Context

Two sibling Tauri+Svelte apps share a single user: **kokobrain** (Obsidian-like vault editor) and **quick-capture** (menubar capture popover). They already talk via the `kokobrain://capture?v=2&...` deep-link URI — quick-capture builds the URI, kokobrain consumes it in `deep-link.service.ts:317`.

Goal: collapse the two into one binary. Reuse quick-capture's code **as-is** wherever possible; only adapt the seams where the architectures collide. No refactor pass before the merge — the merged code first ships matching today's behavior, then we iterate.

Reduced scope (vs. full quick-capture): composer popover + clipboard-capture shortcut + global hotkeys. Dropped: tray/menubar, inbox, archive, recording/transcription, dock widget, SQLite captures store, destinations system, audio pipeline, NSWorkspace fullscreen observer, separate settings window.

Key load-bearing fact: kokobrain's `executeAction(action, vaultPath)` at `src/lib/features/deep-link/deep-link.service.ts:128` already implements every capture kind (note/clip/link/shot/file) including template rendering, frontmatter, tags, and v2 provenance fields. The merge wires composer + clipboard directly to this fn (no URI roundtrip). Shot/File keep today's `file://` reference behavior (no asset copy).

## Decisions snapshot

| # | Decision | Choice |
|---|----------|--------|
| 1 | Window model | Multi-window: composer = separate popover (600x240, decorations off, transparent, hidden-at-startup) |
| 2 | Storage on save | Direct vault file write; no SQLite buffer |
| 3 | Destinations | Dropped. Single capture folder via existing `settingsStore.quickNote.folderFormat` |
| 4 | Existing `quick-note` plugin | Coexists. Cmd+N keeps creating in-editor note. Composer is the popover surface. |
| 5 | Dock widget | Dropped |
| 6 | Inbox / archive / recording | Dropped |
| 7 | Shot/File attachment | `file://` reference (no copy) — matches deep-link handler today |
| 8 | Global hotkeys | Ctrl+Alt+Cmd+Space → composer, Ctrl+Alt+Cmd+C → clipboard capture |
| 9 | Tray menu | Dropped. Capture happens via global hotkeys only. Settings + quit via main kokobrain window. |
| 10 | External `kokobrain://capture` URI | Kept. Composer/clipboard call internal handler directly; URI stays as external automation surface |
| 11 | Wikilink mention picker source | Kokobrain `get_all_vault_entries_v2` IPC (replaces QC's flat-folder reader) |
| 12 | Settings UI | Inside kokobrain's existing settings panel (NOT separate window — per `feedback_settings-panel-not-window.md`) |
| 13 | Platform | macOS only |
| 14 | Auto-updater | No-op — kokobrain already has it |
| 15 | QC repo lifecycle | Out of scope |
| 16 | Phase order | Foundation → Composer → Clipboard → Polish |
| 17 | Composer save call | `executeAction({verb:'capture', kind:'note', ...}, vaultPath)` from `deep-link.service.ts:128` |

## Source map (what gets ported)

| QC source | Kokobrain destination | As-is or adapt? |
|-----------|----------------------|-----------------|
| `src-tauri/src/clipboard/mod.rs` | `src-tauri/src/quick_capture/clipboard.rs` | **As-is** (adapter trait + SystemClipboard + FakeClipboard) |
| `src-tauri/src/kind_detect/mod.rs` | `src-tauri/src/quick_capture/kind_detect.rs` | **Adapt** types — emit `CaptureAction` shape consumed by deep-link instead of QC's `CaptureInput`/`ShotSource` |
| `src-tauri/src/shortcuts/mod.rs` (intent registry) | `src-tauri/src/quick_capture/shortcuts.rs` | **As-is** intent enum; bindings registered fresh in kokobrain lib.rs |
| `src-tauri/src/lib.rs` window creation (composer block lines 519-540) | `src-tauri/src/lib.rs` setup hook | **As-is** WebviewWindowBuilder config + `apply_move_to_active_space` + `intercept_close_as_hide` helpers |
| `src/routes/composer/+page.svelte` + `src/lib/composer/` | `src/routes/composer/+page.svelte` + `src/lib/plugins/quick-capture/composer/` | **As-is** UI; adapt save call to `executeAction` |
| `src/lib/mentions/` (wikilink parsing) | `src/lib/plugins/quick-capture/mentions/` | **As-is** parsing; **adapt** source to call `get_all_vault_entries_v2` for path list |
| `src-tauri/src/commands/capture_clipboard_now` | `src-tauri/src/quick_capture/commands.rs` | **Adapt** — composes Rust clipboard + kind_detect, emits TS-side event/IPC return that frontend feeds to `executeAction` |
| QC vitest tests under `src/` | mirror under `src/tests/` | **As-is** assertions; rewrite imports |
| QC cargo tests | mirror under `src-tauri/tests/quick_capture/` | **As-is** assertions |

Not ported: `audio/`, `recording/`, `transcription/`, `dock/`, `drag_drop/`, `store/` (SQLite), `destinations/`, `inbox/`, `archive/`, `tray/`, NSWorkspace fullscreen observer, `kokobrain/` URI builder (no longer needed — internal call).

## Phases

Each task = one commit, one test pass. Follow `docs/COMMITS.md` for message format. Each phase ends with `pnpm check` + `pnpm vitest run` + `cargo test --manifest-path src-tauri/Cargo.toml` all green.

### Phase 1 — Foundation (global hotkeys, Rust clipboard adapter)

Stand up the infrastructure both composer and clipboard need. End-of-phase smoke: pressing Ctrl+Alt+Cmd+C reads clipboard, logs detected kind, writes a markdown file via `executeAction` (no UI window yet).

- [x] P1.1 — Add deps to `src-tauri/Cargo.toml`: `tauri-plugin-global-shortcut`, `arboard`, `image`, `mime_guess`. Init the global-shortcut plugin in `src-tauri/src/lib.rs` setup hook. No behavior yet — just plugin wiring + a smoke test that the plugin loads.
- [x] P1.2 — Create `src-tauri/src/quick_capture/` module skeleton (mod.rs + clipboard.rs + kind_detect.rs + shortcuts.rs + commands.rs). Wire into `lib.rs`. Empty fns + module declarations.
- [x] P1.3 — Port `clipboard.rs` (Clipboard trait, SystemClipboard, FakeClipboard, ClipboardSnapshot enum, ClipboardError, image-to-png helper) **verbatim** from QC `src-tauri/src/clipboard/mod.rs`. Port cargo tests verbatim.
- [x] P1.4 — Port `kind_detect.rs` **adapting types**: instead of QC's `CaptureInput`/`ShotSource`, emit a struct that mirrors kokobrain's `CaptureAction` shape from `src/lib/features/deep-link/deep-link.types.ts` (kind + text/url/path + optional title/tags/sourceApp/etc.). Keep `decide()` pure. Port all URL-detection and file-mime tests.
- [ ] P1.5 — Add `capture_clipboard_now` Tauri command in `quick_capture/commands.rs`: takes `&dyn Clipboard` (use `SystemClipboard` in prod), runs `kind_detect::decide`, emits a Tauri event `qc:capture-detected` carrying the action payload. Cargo test with `FakeClipboard` covers text/url/image/files cases.
- [ ] P1.6 — Register Ctrl+Alt+Cmd+Space + Ctrl+Alt+Cmd+C global shortcuts in `lib.rs` setup. Space → placeholder (composer in P2). C → invokes `capture_clipboard_now`.
- [ ] P1.7 — Frontend: TS handler in `src/lib/plugins/quick-capture/quick-capture.service.ts` listens for `qc:capture-detected`, calls `executeAction(payload, vaultStore.path)`. Vitest covers: event received → executeAction called with right shape (mock executeAction, real store). Smoke: copy text, press Ctrl+Alt+Cmd+C → markdown file lands in `_notes/YYYY/MM-MMM/...`.

### Phase 2 — Composer popover window

End-of-phase: Ctrl+Alt+Cmd+Space opens the popover; user types text; Enter (or Cmd+Enter) saves via `executeAction` and dismisses.

- [ ] P2.1 — Add composer window block in `src-tauri/src/lib.rs` setup, copying QC's config (600x240, decorations false, transparent, resizable false, skip_taskbar, shadow, centered, hidden at startup). Port `apply_move_to_active_space` helper (macOS-only with no-op fallback already in QC) and `intercept_close_as_hide`.
- [ ] P2.2 — Add `src/routes/composer/+page.svelte` route + layout. Bare textarea-only first pass. Loads vault path via IPC (read kokobrain's tauri-store, since stores from main window don't share across webviews).
- [ ] P2.3 — Tauri commands `show_composer` / `dismiss_composer` (port from QC `commands::show_composer` / `dismiss_composer`, drop the `record_prev_frontmost` logic for now). Wire to Ctrl+Alt+Cmd+Space shortcut.
- [ ] P2.4 — Port composer Svelte UI from `quick-capture/src/lib/composer/` into `src/lib/plugins/quick-capture/composer/`: textarea, Save button, Esc to dismiss, blur-to-dismiss behavior. Vitest mirrors QC's composer tests.
- [ ] P2.5 — Save handler: builds `CaptureAction` (kind: 'note', text, captured_at, source_app fields blank), calls `executeAction` directly (no URI). Vitest covers save → executeAction invocation → window dismissed.
- [ ] P2.6 — Port `src/lib/mentions/` wikilink parser **as-is** into `src/lib/plugins/quick-capture/mentions/`. Adapt source-of-paths: replace QC's flat-folder read with `invoke('get_all_vault_entries_v2', { vaultPath })` returning paths. Port mentions tests.
- [ ] P2.7 — Wire mention picker UI into composer textarea (autocomplete on `[[`). Reuses QC's picker component as-is. Vitest covers picker open/filter/select.

### Phase 3 — Clipboard capture polish

Phase 1 already lands the basic clipboard wire. Phase 3 covers the kinds that need extra handling and the visual feedback that QC provided.

- [ ] P3.1 — Extend `kind_detect` integration to handle `Files` snapshot (multi-file expansion into N `CaptureAction`s, one per file, each kind = shot/file based on mime). Loop calls `executeAction` per item. Cargo + vitest tests.
- [ ] P3.2 — Shot kind: write file:// reference into the markdown note as today. Re-verify QC's expectations on filename/embed format against kokobrain's `renderCaptureBody` in `deep-link.service.ts`. If divergent, **document divergence** rather than refactor (we adopt kokobrain's existing format).
- [ ] P3.3 — Image clipboard: SystemClipboard already re-encodes RGBA → PNG. Decide where the PNG bytes live before kokobrain references them with `file://`. Two choices live in this task: (a) write to OS temp dir + reference `file:///tmp/...`, (b) write next to the markdown file. **Default (a)** — matches "no asset copy into vault" decision. Cargo test covers temp-write happy path.
- [ ] P3.4 — Status toast / notification frontend: when clipboard capture succeeds, show a kokobrain-style toast ("Captured: text/link/image/file: <preview>"). Reuse kokobrain's existing toast infra. Vitest covers toast emit.

### Phase 4 — Settings + polish

- [ ] P4.1 — Add Settings panel section in kokobrain's existing settings UI: "Quick Capture" tab. Fields: enable composer hotkey, enable clipboard hotkey, capture folder (defaults to existing `quickNote.folderFormat`), template path (defaults to existing `quickNote.templatePath`). Settings store extension under `settingsStore.quickCapture`. Vitest covers store getters + defaults.
- [ ] P4.2 — Composer dismiss + restore-frontmost: port QC's `record_prev_frontmost` (macOS NSWorkspace.frontmostApplication via objc2) — captures the app that was frontmost when composer summoned, restores focus on dismiss. Cargo test covers the recording fn against a fake NSWorkspace.
- [ ] P4.3 — Update `docs/adr/` with an ADR noting the merge decision and the dropped surfaces. Update `CONTEXT.md` if it lists quick-capture as an external dependency. No code changes.
- [ ] P4.4 — Cleanup: any "quick-capture" comments in `src/lib/features/deep-link/deep-link.types.ts:83,127` and `src/tests/lib/features/deep-link/deep-link.service.test.ts` that referenced QC as an external app can be retired or rewritten to reflect the internal wiring. Surgical edit only.

## Critical files

Reads (must understand before touching):
- `src/lib/features/deep-link/deep-link.service.ts:128,317` — handler reused by composer + clipboard
- `src/lib/features/deep-link/deep-link.types.ts` — `CaptureAction` shape
- `src/lib/plugins/quick-note/quick-note.service.ts` + `quick-note.logic.ts` — coexisting plugin we don't disturb
- `src/lib/core/settings/settings.store.svelte.ts` — `quickNote.folderFormat` / `filenameFormat` reuse
- `src-tauri/src/lib.rs:14-110` — current Tauri setup hook (where tray + shortcuts go)
- `src-tauri/tauri.conf.json:33` — deep-link `kokobrain` scheme registration (stays)

Writes (new):
- `src-tauri/src/quick_capture/` (clipboard.rs, kind_detect.rs, shortcuts.rs, commands.rs, mod.rs)
- `src/routes/composer/+page.svelte`
- `src/lib/plugins/quick-capture/` (composer/, mentions/, quick-capture.service.ts)
- `src/tests/lib/plugins/quick-capture/` (mirror)
- `src-tauri/tests/quick_capture/` (mirror)

Quick-capture source repo to port from:
- `/Users/diegorv/Dev/pet-projects/koko/quick-capture/src-tauri/src/{clipboard,kind_detect,shortcuts,commands}/`
- `/Users/diegorv/Dev/pet-projects/koko/quick-capture/src-tauri/src/lib.rs:519-540` (composer window block)
- `/Users/diegorv/Dev/pet-projects/koko/quick-capture/src/{routes/composer,lib/composer,lib/mentions,lib/wikilink}/`

## Verification

Per task: run the relevant test stack (Quick Reference rule 6 in CLAUDE.md). Commit only when green.

Per phase end-to-end smoke (run in `pnpm tauri dev`):
- **P1**: copy text → press Ctrl+Alt+Cmd+C → markdown file appears in capture folder, contents match clipboard text. Repeat with URL, image, file path.
- **P2**: press Ctrl+Alt+Cmd+Space → composer popover opens centered, frontmost-but-not-stealing focus to other Spaces; type text + `[[`+ select mention; press Cmd+Enter; file appears, popover dismisses. Esc dismisses without save.
- **P3**: copy image (Cmd+Shift+4) → Ctrl+Alt+Cmd+C → markdown file with `file://` embed; toast confirms. Same for files in Finder.
- **P4**: settings panel shows Quick Capture tab; toggling capture-folder writes to a different folder. Dismissing composer returns focus to previously-frontmost app.

All phases end with: `pnpm check` + `pnpm vitest run` + `cargo test --manifest-path src-tauri/Cargo.toml` green.

## Notes

- **First action of P1.1 must be to copy this plan into `tasks/todo/merge-quick-capture.md`** per CLAUDE.md "Plan Mode Workflow". The harness restricts plan-mode edits to this single file; the move happens once plan mode exits.
- **No batched commits.** Each `[ ]` above is one commit. Strictly enforce.
- **Test parity before commit**: for every QC file ported, find its corresponding QC test and port it too. Source files without tests do not commit.
- **executeAction is the seam**: do not duplicate template/frontmatter/tags logic — always go through `executeAction`. If composer/clipboard need a behavior `executeAction` doesn't have, extend `executeAction` (in deep-link.service.ts) rather than fork.
- **No asset copy into vault** in this plan. Image clipboard PNG bytes land in OS temp dir; markdown embed is `file:///tmp/...`. Durable attachments = separate plan if user wants it later.

# 097: The quick-capture dedupe anchor advances only after the frontend accepts the capture

**Origin:** `audit-2026-11-05` Issue 130, moved here on 2026-11-08. Its PRD, raw evidence and closed siblings stay in `.scratch/audit-2026-11-05/`. Bare Issue numbers in the text below use that feature's numbering; `priority-2026-11-08.md` in this folder maps them to the numbers here.

**Migrated from:** `.scratch/file-io-audit/issues/38-quick-capture-dedupe-anchor.md` (audit 2026-11-05). Priority: corner case (bucket 4-corner). Ux/low. Its main trigger, the destroyed window, goes away with the N-file-io-03 fix. The composer ack (0a1c22a73) can be extended.

**Audit check at `5f8003d67`:** still_present (ux, low). The shortcut path (src-tauri/src/lib.rs:56-88) calls capture_clipboard_now_with, which sets *last_signature = signature at src-tauri/src/quick_capture/commands.rs:110 for every emitted item, before the frontend handles it. The emit at lib.rs:81 ignores the result. The frontend drop at src/lib/plugins/quick-capture/quick-capture.service.ts:104-108 (no vault, toast) and a false from executeAction (:117) return false. Only composer captures report back (:95-97, report_composer_capture_result), and nothing clears the anchor for a failed shortcut capture. A retry on the same clipboard is then deduped (commands.rs:89-92) and does nothing without feedback (Ok with an empty payload list). Mitigation: the text stays on the clipboard. Trigger: a failed shortcut capture (no vault open, or a write error) followed by a retry. Uncommon, but Quick Capture is in daily use.

**Stale in the text below:** Line refs drifted: the anchor advance is commands.rs:110 (Issue says :94), the dedupe check is :89-92 (Issue says :85-95), and the frontend drop is quick-capture.service.ts:101-118 (Issue says :85-91). The composer path now has an ack (report_composer_capture_result, from 0a1c22a73), and that ack could be extended to shortcut captures to re-arm or clear the anchor.

**Status:** ready-for-agent

**Blocked by:** none
Priority: P2
Severity: minor
Source: file I/O audit, deep-dive group(s) h08-app-json (raw reports in .scratch/file-io-audit/deep/raw/), verified at c4bfee07

## Details

- Verdict: CONFIRMED_BY_TRACE (deep dive priority P2, severity minor)
- Claims covered: feature-writers-13

**How a user hits it.** Press the capture shortcut with no vault open (the frontend drops it with a toast), open a vault, press again without copying anything new: Rust returns an empty batch and nothing is captured until the clipboard changes. Also any downstream failure after emit drops the same way. Plausible, not common.

**Recoverable from.** The text or URL is still on the clipboard until something else is copied; the capture itself was never written

**Root cause.** src-tauri/src/quick_capture/commands.rs:85-95 (dedupe check, then emit payload, then *last_signature = signature at :94 before any frontend handling). Frontend drop: src/lib/plugins/quick-capture/quick-capture.service.ts:85-91.

**Evidence.** commands.rs:77-96 advances the shared LastCaptureSignature for every emitted item. lib.rs:56-80 shortcut path uses the same state and function. quick-capture.service.ts:87-91 returns early with a toast when vaultPath or vaultName is missing; nothing re-arms the anchor. Rust not run (cargo off limits), trace only.

**Limits found while trying to refute.** Partly mitigated: the content stays on the clipboard, and the dedupe is documented as best-effort. Not a stored-content loss, so P2 not P1.

**Fix sketch.** Advance the anchor only after the frontend confirms the capture is stored (ack event or command), or clear it when the frontend reports a drop.

## Acceptance criteria

Written by audit 2026-11-05 from the text above and its audit header; the original Issue had none.

- [ ] Failing test first, in src-tauri/src/quick_capture/commands.rs (mod tests, next to duplicate_text_on_a_repeat_press_is_deduped): capture text 'a', then report that the frontend dropped that capture (through the new or extended ack function under test), then capture the same clipboard 'a' again: the second call emits one payload. Today it returns an empty list because *last_signature is set at commands.rs:110 and nothing re-arms it.
- [ ] The same test file keeps proving that a capture the frontend accepted is still deduped on an immediate repeat press (existing tests at :626, :647 and :668 pass without edits) and that a failed ack for an older capture does not clear the anchor of a newer one (compare by signature or request id, state which in the test).
- [ ] Failing test first, in src/tests/lib/plugins/quick-capture/quick-capture.service.test.ts (describe 'handleDetectedCapture'): a clipboard-shortcut payload (no composerRequestId) handled with no vault open, and one where executeAction returns false, reports the failure to Rust through the ack command (the one composer captures use, extended, or a sibling) and the call carries enough to identify the capture. A successful shortcut capture reports success or nothing, per the design chosen. It fails today because only composer payloads report back (quick-capture.service.ts:95-97).
- [ ] The composer path is unchanged: the existing 'composer result' tests pass without edits.
- [ ] The shortcut emit in src-tauri/src/lib.rs:81 and the Rust command signatures stay compatible with the generated bindings; if a new IPC type is added, cargo test regenerates src/lib/contracts/generated/ and the result is committed.
- [ ] Gate crosses Rust and frontend: cargo test --manifest-path src-tauri/Cargo.toml + pnpm check + pnpm vitest run.

## Comments

- 2026-11-06: migrated from `.scratch/file-io-audit/issues/38-quick-capture-dedupe-anchor.md` by audit 2026-11-05, which re-checked it at `5f8003d67`.

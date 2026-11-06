# 38: Quick-capture dedupe anchor advances before the frontend accepts the capture

**Status:** wontfix

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

## Comments

- 2026-11-06: migrated to `.scratch/audit-2026-11-05/issues/130-quick-capture-dedupe-anchor-advances-only-after.md` by audit 2026-11-05 (its re-checked text and any related audit findings now live there, in one plan ordered by impact on written content and daily use). Closed here as wontfix so it is worked in one place; nothing was implemented.

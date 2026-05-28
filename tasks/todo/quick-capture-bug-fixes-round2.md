# Quick Capture bug fixes (round 2)

Bugs found by the second deep audit of the quick-capture merge surface.
User-approved subset: N1, N3, N6 (NOT N2). One task = one commit, run the
relevant tests before each commit (CLAUDE.md rule 6).

## Tasks

- [x] N1 (HIGH) — Capture file overwrite / lost-update. `executeCaptureAction`
  (deep-link.service.ts:386) writes unconditionally with no exists() check, and
  the clipboard listener dispatches N events CONCURRENTLY via
  `void handleDetectedCapture` (quick-capture.service.ts:54). Two captures whose
  `dayjs()` lands in the same filename window resolve the same path -> the second
  overwrites the first (multi-file Finder capture is the main trigger). Fix in two
  parts: (A) serialize the listener dispatch via a promise chain so handlers run
  one at a time (closes the event-loop TOCTOU); (B) add a uniqueness guard in
  executeCaptureAction that appends `-1`, `-2`, ... before `.md` when the path
  exists. Verify: pnpm check + vitest (new test: exists()->true yields a suffixed
  write path).

- [ ] N3 (LOW) — Esc during the 180ms save flash double-invokes dismiss_composer.
  The `saving` guard doesn't block the Esc branch of onKeyDown
  (composer/+page.svelte). Guard the dismiss path so a save-in-progress (or
  already-dismissing) Esc is a no-op. Verify: pnpm check.

- [ ] N6 (LOW) — Startup micro-race: global hotkey is live before the composer
  window is built in setup, so an early Ctrl+Alt+Cmd+Space finds no window and
  emits to nobody (self-corrects next press). Fix: ensure the composer window is
  built before the shortcuts can show it (reorder setup), or make show_composer
  log when the window is missing instead of silently no-op'ing. Verify: cargo test.

## Notes

- N2 (composer flashes "saved" then discards text on failed capture) was
  explicitly deferred by the user — needs an IPC round-trip ack, more invasive.
- N1 needs BOTH parts: the uniqueness loop alone is not race-safe under the
  concurrent multi-file dispatch (await yields create a TOCTOU); serialization
  alone can still collide on same-millisecond timestamps. Together they are correct.
- N4 (unescaped link labels) and N5 (temp-file disk leak) are pre-existing /
  intended-by-ADR; not in this round.

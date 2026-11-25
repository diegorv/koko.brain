# 03: Save pending Canvas edits before exit or vault switching

**What to build:** Publish and persist pending Canvas text under its original file ownership before a destructive lifecycle transition.

**Blocked by:** [02: Final exit save boundary](02-final-exit-save-boundary.md).
**Status:** ready-for-agent
**Priority:** P1
**Gate:** Frontend, including mounted Canvas integration.

## Acceptance criteria

- [ ] A mounted Canvas edit followed by exit or vault switch inside its 300 ms publication delay survives reopening the original file.
- [ ] Pending-view publication runs before dirty-state selection and participates in the final boundary delivered by 02.
- [ ] Publication and disk failures enter the existing failure flow; Cancel retains the current session and recoverable edit, Retry saves it, and explicit discard remains possible.
- [ ] Publication targets the originating file and vault, never whichever tab becomes active.
- [ ] An untouched Canvas causes no unnecessary write; existing close-tab and ordinary tab-switch preservation remain.
- [ ] Escape ends Canvas editing without reverting typed text.
- [ ] Preserve Canvas-local undo/redo and typing-burst grouping; do not create per-keystroke history or duplicate boundary snapshots.
- [ ] Use real stores and mounted components; assert saved JSON and rendered reopened text.

## Provenance

Delivered Canvas close-tab flushing is not superseded. This covers the remaining lifecycle boundary. [Evidence](../evidence.md#buffered-views).

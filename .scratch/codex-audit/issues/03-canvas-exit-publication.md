# 03: Save pending Canvas edits before exit or vault switching

**What to build:** Publish and persist pending Canvas text under its original file ownership before a destructive lifecycle transition.

**Blocked by:** 02
**Files:** src/lib/features/canvas/CanvasInner.svelte, src/lib/features/canvas/TextNode.svelte, src/lib/features/canvas/canvas-history.logic.ts, src/lib/app/EditorView.svelte, src/lib/core/editor/editor.service.ts, src/lib/core/vault/exit.service.ts, src/lib/core/vault/vault.service.ts, src/lib/app/lifecycle/app-lifecycle.service.ts, src/tests/lib/features/canvas/, src/tests/lib/core/vault/exit.service.test.ts, src/tests/lib/core/vault/vault.service.switch-save.test.ts, src/tests/lib/app/lifecycle/app-lifecycle.service.test.ts
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

## Comments

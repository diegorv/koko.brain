# 05: Commit Kanban drafts to their own board before navigation

**What to build:** Existing-card edits and lane-title drafts survive keyboard navigation, tab close, and intercepted exit independently of browser blur delivery.

**Blocked by:** [03: Publish pending views before exit](03-canvas-exit-publication.md).
**Status:** ready-for-agent
**Priority:** P1
**Gate:** Frontend plus targeted WebKit keyboard-navigation verification.

## Acceptance criteria

- [ ] Card and lane edits survive next/previous-tab shortcuts and tab close without synthetic blur.
- [ ] Cover board-to-note, board-to-board, source-mode transitions, destruction, and intercepted exit through the pending-view boundary.
- [ ] Commit only to the originating board; a destination note or board remains byte-for-byte unchanged.
- [ ] Enter, blur, and navigation commit at most once, including a blur delivered during teardown.
- [ ] Escape followed by blur, navigation, or close never republishes the canceled draft.
- [ ] Blank/unchanged drafts and card newline normalization retain existing semantics.
- [ ] Flush/save failure retains a recoverable edit; Cancel keeps the tab open.
- [ ] Preserve native text-input undo before commit; do not introduce a new board-level undo system.
- [ ] Use mounted views and real stores to assert buffer and disk bytes, then verify actual WebKit keyboard navigation.
- [ ] Do not redefine unsubmitted new-card input, which has a different submission policy.

## Provenance

Supersedes [open-itens 006](../../open-itens/issues/006-kanban-card-lane-title-being-edited-saved.md). Its delivered Canvas prerequisite is replaced by the remaining exit integration dependency. [Evidence](../evidence.md#buffered-views).

# 05: Commit Kanban drafts to their own board before navigation

**What to build:** Existing-card edits and lane-title drafts survive keyboard navigation, tab close, and intercepted exit independently of browser blur delivery.

**Blocked by:** 03
**Status:** ready-for-agent
**Priority:** P1
**Gate:** Frontend plus targeted WebKit keyboard-navigation verification.
**Files:** src/lib/plugins/kanban/KanbanCard.svelte, src/lib/plugins/kanban/KanbanLane.svelte, src/lib/plugins/kanban/KanbanView.svelte, src/lib/plugins/kanban/kanban.logic.ts, src/lib/app/EditorView.svelte, src/lib/core/editor/editor.service.ts, src/tests/lib/plugins/kanban/, src/tests/lib/core/editor/editor.service.test.ts, e2e/specs/kanban-view.spec.ts, e2e/specs/tabs.spec.ts

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

## Comments

# 10: Restore history into visual views and closed notes by path

**What to build:** Apply a confirmed snapshot to its original file even without an active Markdown editor, retaining the history-session safety of 09.

**Blocked by:** 09
**Files:** src/lib/features/file-history/file-history.service.ts, src/lib/features/file-history/file-history.store.svelte.ts, src/lib/features/file-history/FileHistoryDialog.svelte, src/lib/core/editor/editor.service.ts, src/lib/core/editor/editor.hooks.ts, src/lib/core/filesystem/note-change.service.ts, src/lib/app/EditorView.svelte, src/lib/features/canvas/CanvasInner.svelte, src/lib/plugins/kanban/KanbanView.svelte, src/lib/features/collection/CollectionView.svelte, src/lib/features/type-definitions/type-definitions.service.ts, src/tests/lib/features/file-history/, src/tests/lib/core/editor/editor.service.test.ts, src/tests/lib/core/filesystem/note-change.service.test.ts, src/tests/lib/app/EditorView.test.ts, src/tests/lib/features/canvas/, src/tests/lib/plugins/kanban/, src/tests/lib/features/collection/, src/tests/lib/core/markdown-editor/undo-history-across-notes.test.ts
**Status:** ready-for-agent
**Priority:** P2
**Gate:** Frontend with rendered Canvas, Kanban, and Collection restoration.

## Acceptance criteria

- [ ] Restore into Canvas, Kanban, and Collection updates the intended view and persists the selected snapshot.
- [ ] A closed target that still exists is restored directly; if both target file and tab are absent, abort visibly without recreating or redirecting.
- [ ] Other notes, including dirty ones, remain unchanged.
- [ ] Pending view edits and queued writes cannot subsequently overwrite the restored snapshot.
- [ ] A successful operation runs the established save/index/history effects; a missing-tab save no-op is not success.
- [ ] Read or write failure remains retryable and visibly unsuccessful.
- [ ] Retain active-Markdown undo behavior and the existing explicit replacement confirmation; adding a new dirty-buffer backup policy is outside this slice.
- [ ] Session invalidation and target checks from 09 remain effective through every await.
- [ ] Assert rendered restored content, persisted bytes, and downstream state using real stores.

## Provenance

Supersedes [open-itens 101](../../open-itens/issues/101-file-history-restores-into-board-view-closed.md), retaining its approved closed-file behavior and genuine dependency. [Evidence](../evidence.md#history-restoration).

## Comments

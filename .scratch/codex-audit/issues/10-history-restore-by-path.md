# 10: Restore history into visual views and closed notes by path

**What to build:** Apply a confirmed snapshot to its original file even without an active Markdown editor, retaining the history-session safety of 09.

**Blocked by:** [09: History restore target safety](09-history-restore-target.md).
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

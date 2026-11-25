# 09: Never restore file history into another note

**What to build:** Bind history selection, confirmation, loading, and restoration to the same file and history session; reject unsafe targets without writing.

**Blocked by:** None (can start immediately).
**Status:** ready-for-agent
**Priority:** P1
**Gate:** Frontend with a real CodeMirror view and delayed-IPC integration.

## Accepted scope

Retain the previously approved first slice: restore only into the active Markdown target with an editor view. Unsupported, inactive, or closed targets fail visibly until 10 adds path-targeted restoration.

## Acceptance criteria

- [ ] Open A's history, switch to B, and restore: neither B's buffer nor disk changes; rejection identifies A.
- [ ] Revalidate identity after confirmation and snapshot loading, not only when the button is clicked.
- [ ] Closing/reopening history or switching vaults invalidates obsolete work; late completion cannot write or dismiss a newer session.
- [ ] A delayed history load for A cannot install its snapshot selection into B's history.
- [ ] Opening history clears the preceding selection/diff; delayed preview results cannot misrepresent the selected snapshot.
- [ ] The confirmation names the original file and selected version.
- [ ] An ordinary active-Markdown restore remains undoable, including recovery of the preceding dirty buffer.
- [ ] Read/save failure remains visibly unsuccessful and retryable rather than closing as success.
- [ ] No-view restoration rejects visibly; do not silently save unchanged content.
- [ ] Assert both notes' real buffers and disk payloads across delayed request orderings.

## Provenance

Supersedes [open-itens 023](../../open-itens/issues/023-file-history-restore-writes-snapshot-into-note.md). Preserves its guard-first scope and undo policy. [Evidence](../evidence.md#history-restoration).

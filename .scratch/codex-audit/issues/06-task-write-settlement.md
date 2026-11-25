# 06: Preserve newer editor changes when task writes settle

**What to build:** Tasks and Todoist task writes settle against the correct note incarnation and write order without discarding newer typing or falsely declaring stale content saved.

**Blocked by:** none
**Status:** ready-for-agent
**Priority:** P1
**Gate:** Frontend; use Both if the task-command result contract changes.
**Files:** src/lib/core/filesystem/task-write.service.ts, src/lib/core/filesystem/note-change.service.ts, src/lib/core/editor/editor.service.ts, src/lib/core/editor/editor.store.svelte.ts, src/lib/core/editor/editor.types.ts, src/lib/core/markdown-editor/MarkdownEditor.svelte, src/lib/core/markdown-editor/tab-view-state.ts, src/lib/features/tasks/tasks.service.ts, src/lib/features/todoist-sync/closed-note-writer.service.ts, src/lib/features/todoist-sync/note-writer.service.ts, src/lib/features/todoist-sync/sync-now.service.ts, src/tests/lib/core/filesystem/task-write.service.test.ts, src/tests/lib/core/filesystem/note-change.service.test.ts, src/tests/lib/core/editor/, src/tests/lib/core/markdown-editor/, src/tests/lib/features/tasks/, src/tests/lib/features/todoist-sync/

## Acceptance criteria

- [ ] Deferred status, due-date, and priority writes preserve typing after preflight for initially clean and dirty notes.
- [ ] Todoist preserves typing when a formerly closed note opens during the command or missing-note creation retry.
- [ ] Active and background tabs retain equivalent correct content and dirty state.
- [ ] Exercise autosaves before, during, and after task completion, plus overlapping task writes. A clean tab must match the latest successfully persisted bytes.
- [ ] Retain both a successful task mutation and unrelated newer typing; simply skipping synchronization on dirty tabs is insufficient.
- [ ] Rename, move, close/reopen, path reuse, and vault changes cannot apply an obsolete response to a different note.
- [ ] When same-task edits cannot be reconciled, preserve the user's edits and report a recoverable conflict/refusal rather than successful synchronization.
- [ ] Save failure, command rejection, stale refusal, and reconciliation failure preserve buffers and truthful success bookkeeping.
- [ ] Menu Undo uses the same safe lifecycle; preserve note-local CodeMirror history and test concurrent typing.
- [ ] Successful settlement still updates task overlays, search, metadata, and registered consumers through the existing note-change owner without relying on the watcher.
- [ ] Use real services/stores and deterministic IPC/FS boundaries; assert bytes and downstream state.

## Provenance

A follow-up to delivered preflight protection and Todoist writers. It is independent of the external-writer race in 16. [Evidence](../evidence.md#task-settlement).

## Comments

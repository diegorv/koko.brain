# 08: Preserve accepted edits when moving files or folders to Trash

**What to build:** Before closing affected editors and moving their files to Trash, establish a recoverable final content boundary for the entire affected set.

**Blocked by:** none
**Status:** ready-for-agent
**Priority:** P1
**Gate:** Frontend with mounted Canvas and restore/reopen coverage.
**Files:** src/lib/core/filesystem/path-change.service.ts, src/lib/core/filesystem/fs.service.ts, src/lib/core/filesystem/fs.logic.ts, src/lib/core/filesystem/delete-note.service.ts, src/lib/core/editor/editor.service.ts, src/lib/core/editor/editor.store.svelte.ts, src/lib/features/canvas/CanvasInner.svelte, src/lib/core/trash/trash.service.ts, src/tests/lib/core/filesystem/delete-dirty-tab.test.ts, src/tests/lib/core/filesystem/f165-delete-dirty-tab.test.ts, src/tests/lib/core/filesystem/delete-note.service.test.ts, src/tests/lib/core/filesystem/fs.service.race-audit.test.ts, src/tests/lib/core/editor/, src/tests/lib/features/canvas/, src/tests/lib/core/trash/

## Acceptance criteria

- [ ] Typing during a pre-delete save survives restoration, or deletion aborts with the buffer retained.
- [ ] Folder deletion preserves edits to an earlier saved child and to an initially clean child while another child saves.
- [ ] Publish pending view-local edits, including Canvas, before selecting files to save.
- [ ] Settle and reconcile outstanding saves even when Undo makes a tab look clean.
- [ ] No editor write can recreate the deleted source after the move.
- [ ] Flush failure, any child-save failure, or inability to stabilize the affected set aborts deletion and preserves recoverable editors.
- [ ] Bounded refusal or explicit edit exclusion handles sustained editing; do not loop indefinitely or discard accepted text.
- [ ] Trash rename failure retains the latest buffer; successful earlier child saves remain valid.
- [ ] Canceling the initial confirmation has no destructive effects; confirmation is not consent to discard subsequent edits.
- [ ] Cover files, folders, pinned tabs, pending Canvas content, and the undo-to-clean case using real services/stores.
- [ ] Restore and reopen, asserting rendered content and persisted bytes, not only a Trash entry.

## Provenance

Supersedes the final-save deletion window in [open-itens 089](../../open-itens/issues/089-keystrokes-typed-during-link-rewrite-type-rename.md), with newly reproduced folder and pending-write variants. Existing Trash storage remains unchanged. [Evidence](../evidence.md#trash-boundary).

## Comments

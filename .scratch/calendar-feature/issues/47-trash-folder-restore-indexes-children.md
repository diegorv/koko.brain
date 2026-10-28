# 47: Restoring a folder from the Trash indexes its notes

**What to build:** restoring a folder from the Trash indexes every Markdown note inside it, as restoring a single note already does.

**Blocked by:** None

**Status:** ready-for-agent

- `restoreItem` indexes only a single Markdown file: `src/lib/core/trash/trash.service.ts:145-146` (`if (!item.isDirectory && isMarkdownPath(restorePath)) await indexRestoredNote(...)`, helper at `:221`). The notes of a restored folder are left to the watcher.
- Walk the restored folder and route each note through `applyNoteChange` with `source: 'restore'`.

- [ ] Each Markdown file in a restored folder is indexed (VaultIndex, FTS5, semantic, consumers)
- [ ] Tests for a nested folder and for an empty folder

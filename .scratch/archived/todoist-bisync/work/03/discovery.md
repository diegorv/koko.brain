# 03 discovery: guarded writer for task lines in closed notes

No `spec.md`; the design is `research/design.md` rules 9, 10, 12. Indexing rules 4-6, 9 read.

## Files

- New `src-tauri/src/vault/task_lines.rs`: DTOs (`TaskLineEdits` {replace, insert, remove}, `TaskLinesWriteResult`, `TaskLinesOutcome`, `TaskLinesStale`, `TaskLinesStaleReason`, all `#[ts(export)]`) and pure `apply_task_line_edits(content, edits)`.
- `src-tauri/src/vault/index.rs:275,389`: `pub fn vault_root()` getter (the root `scan_vault_v2*` built with, i.e. the open vault as Rust knows it).
- `src-tauri/src/commands/vault.rs` next to `toggle_task_status` (:767-863): `write_task_lines_inner` + `#[tauri::command] write_task_lines(vault_root, rel_path, edits)`; `lib.rs:348` registers it.
- `src/lib/contracts/{commands.ts,index.ts}`, `e2e/mocks/tauri-core.ts` (the `Handlers` map is total over `CommandMap`; handler throws, like `import_staged_shot`).
- Prefactor: `tasks.service.ts:186-201` `afterTaskWrite` body (minus `buildTaskIndex`) moves to new `src/lib/core/filesystem/task-write.service.ts::settleTaskWrite`; `afterTaskWrite` keeps calling it then `buildTaskIndex()` (Tasks view keeps its refresh). Docs that name the old owner: `indexing-watcher-rules.md` rule 6, `note-change.service.ts:16,65`.
- New `src/lib/features/todoist-sync/closed-note-writer.service.ts::writeTaskLinesToClosedNote(vaultRoot, relPath, edits)`.
- `.scratch/open-itens/issues/122-*.md`: Rust half delivered here.

## Plan

- Pure function: locate each replace/remove anchor (any `🆔 td-…` token equal to it, mirroring Rust `ID_RE`) in the original lines: 0 -> `anchorMissing`, 2+ -> `anchorDuplicated`, line != expected -> `lineDiffers`. Apply replacements and removals, then inserts in order against the result. An inserted line's anchor already present -> `anchorExists`. Heading not found -> `headingMissing`, found twice -> `headingDuplicated`. Err (caller bug): a `\n`/`\r` in a new line, an anchor named by two replace/remove ops, the same anchor in two inserted lines.
- Command: refuse (Err) when `canonicalize(vault_root)` != `idx.vault_root()` (or none). Rel path: non-empty, only `Normal` components, `.md`/`.markdown`; joined with the open root; refuse when the path (or its nearest existing ancestor) canonicalizes elsewhere (symlink). Missing file: run the edits on `""`; stale -> `stale`, else `missing`. Then `write_atomic`, `update_note_in_index_inner`, emit `vault-index-updated` when changed; returns the new content. Same content -> `unchanged`, no write.
- TS wrapper: open tab at `${vaultRoot}/${relPath}` -> `{ kind: 'open-tab' }` (ticket 04). `missing` -> `create_folder` + `create_note('')` + `markRecentSave` + `applyNoteChange({source:'create'})` + `addToTree`, then the command again. `written` -> `settleTaskWrite` (sync tab no-op, `markRecentSave`, `applyNoteChange` task, `notifyContentInvalidated`).

## Prior art

- Rust: `src-tauri/tests/vault_task_test.rs` (tempdir + in-memory `VaultIndex` + `*_inner`).
- TS: `tasks.service.test.ts` "after a task write" (real stores, probe consumer/listener, `invoke` mock per command).

## Defaults taken

- `afterHeading` is heading text (ATX `#`..`######`, trimmed, exact match, outside frontmatter and code fences); lines go after the last non-blank line before the next heading of any level (so never into a subsection), and repeated inserts keep order. `end` (afterHeading null) goes after the last non-blank line of the file.
- Lines compare byte-exact (CRLF files go stale, never mis-written). Anchors in code fences count as occurrences (safe: stale).
- Vault-switch race between the Rust root check and the TS create is not handled (design rule 9 rechecks `vaultStore.path` per write in the engine).

# 16 discovery: trash restore indexes the restored note

## Files that change

- `src/lib/core/filesystem/note-change.service.ts:7-16`: docblock line "`restore` - Trash restore, after the rename back" and `'restore'` in `NoteChangeSource`; `:85-91` gains the row `restore: { consumers: 'always', rust: 'always', mark: true, yieldBeforeConsumers: false }`.
- `src/lib/core/trash/trash.service.ts:101-146` (`restoreItem`): after `trashStore.removeItem` (`:134`) and before `refreshTree` (`:137`), for `!item.isDirectory` and a Markdown path: `readTextFile(restorePath)`, `markRecentSave(restorePath)`, `void applyNoteChange({ kind: 'upsert', source: 'restore', path: restorePath, content, vaultPath })`. The read sits in its own try/catch that logs `error('Trash', ...)` and skips the mark and the change. New imports: `applyNoteChange` (`$lib/core/filesystem/note-change.service`), `markRecentSave` (`$lib/core/editor/editor.hooks`), the same pair `fs.service.ts:7-9` imports.
- `src/tests/lib/core/filesystem/note-change.service.test.ts:78-85`: the `it.each` policy table gains `['restore', true, true]`.
- `src/tests/lib/core/trash/trash.service.test.ts`: add `vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }))`; new `describe('restoreItem - indexing')`.

## Plan

1. Test first: "a .md restore indexes the note" (asserts `update_note_in_index` with `{ path, content }`, `update_search_index_file` with `filePath: 'notes/meeting.md'`, and a consumer registered through the real `registerNoteChangeConsumer` gets the upsert). Run it, see it fail.
2. Add the source + policy row, then the `restoreItem` block. Add the policy table row and the remaining trash cases: suffixed path indexed under the suffixed path, directory restore indexes nothing (no `readTextFile` of the restore path, no invoke), read failure returns the path, empties the trash store, invokes nothing and sets no recent-save mark (`areAllRecentSaves([path])` is false).
3. One `fix(trash)` commit (the ticket asks for one), then the implement comment.

## Prior art

- `fs.service.ts:117-131` (`createFile`): `markRecentSave` then `void applyNoteChange(...)`, the pattern copied here.
- `note-change.service.test.ts:46-58` for the invoke mock and consumer registration; `clearAllIndexed` in `beforeEach` so the dedupe map does not leak between cases.

## Risks

- `trash.service.ts` now imports `editor.hooks`, which imports backlinks, queryjs widget and kanban modules. `fs.service.ts` already does the same from `core/`, so no new layer edge; the trash test may need those modules to load in vitest (they do in the fs.service test).
- `recentSaves` is module state with a timer; the read-failure case uses a path no other case marks.
- `readTextFile` mock is shared with `loadTrash` tests; each indexing case sets its own resolved value.

## Defaults taken

- "Markdown" means `.md` or `.markdown`, the same filter the watcher uses (`watcher-handler.service.ts:54`), so restore and watcher index the same set of files.
- The index call runs before `refreshTree`, right after the manifest/store update, as the plan orders it; a `refreshTree` failure still throws as today, after the index was updated (the file is on disk).

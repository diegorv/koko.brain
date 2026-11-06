# 03: Task writes reach search and the QueryJS cache

**What to build:** After a toggle, FTS5 search, the semantic index, the TS per-file consumers and the QueryJS cache only learn about the change through the watcher round trip. The watcher skips a batch whose paths were all saved by the editor in the last 15 s (`src/lib/app/lifecycle/watcher-handler.service.ts:44`, `src/lib/core/editor/editor.hooks.ts:24`, `:68`), and `toggleTask` saves a dirty tab right before the Rust write (`tasks.service.ts:126`). So a toggle on a note saved in the last 15 s never reaches search, and QueryJS blocks keep the old checkbox.

Add one helper every task write goes through, and give it its own `applyNoteChange` source:

- `NoteChangeSource` (`src/lib/core/filesystem/note-change.service.ts:17`) gains `'task'`: a write a Rust task command already made and indexed. Its `SOURCE_POLICY` row (`:86-96`): `consumers: 'always'`, `rust: 'never'`, `mark: true`, `yieldBeforeConsumers: false`. Add a `task` bullet to the doc comment at `:7-16` and name the task commands next to `create_note` in the `rust` field's comment (`:61-65`).
- A module-private `afterTaskWrite(path: string, updatedContent: string): Promise<void>` in `tasks.service.ts`, replacing `:144-150` (Issue 09 later calls it too):
  1. `syncExternalContentToEditor(path, updatedContent, true, 'none')` (as today).
  2. `markRecentSave(path)` (`#lib/core/editor/editor.hooks.js`).
  3. `void applyNoteChange({ kind: 'upsert', source: 'task', path, content: updatedContent, vaultPath: vaultStore.path ?? undefined })` (`#lib/core/filesystem/note-change.service.js`). With no yield in its policy row the fan-out runs synchronously, as `notifyAfterSave` relies on (`editor.hooks.ts:81-83`).
  4. `notifyContentInvalidated()` (same module).
  5. `await buildTaskIndex()` (as today).
- `toggleTask` calls it only on a changed, non-stale result; the stale and no-op returns (Issue 02) stay before it.
- `applyNoteChange` stays the one owner of note changes (`docs/agents/indexing-watcher-rules.md` rule 6; read that file before changing this code). No new `writeTextFile` site, no `markRecentSave` without `applyNoteChange`.

**Blocked by:** 02

**Status:** ready-for-agent

**Gate:** frontend only: `pnpm check` + `pnpm vitest run`.

- [ ] Failing test first, in `src/tests/lib/features/tasks/tasks.service.test.ts`, with real stores, mocking only `invoke`: open the vault with `vaultStore.open('/vault')` (it writes the recent-vaults list, so call `setupLocalStorage()` from `src/tests/fixtures/localStorage.fixture` first, as `note-action-bar.service.test.ts:2-5` does), register a real consumer through `registerNoteChangeConsumer` and a real listener through `registerContentInvalidationListener` (unregister both in `afterEach`). After a changed toggle on `/vault/a.md`: `update_search_index_file` is invoked with `{ filePath: 'a.md', content: <updated content>, vaultPath: '/vault' }`, the consumer's `upsert` received the updated content, the listener fired once, and `areAllRecentSaves(['/vault/a.md'])` is true. Fails today.
- [ ] `update_note_in_index` is not invoked by the toggle (Rust already indexed the note).
- [ ] `src/tests/lib/core/filesystem/note-change.service.test.ts`: the per-source table at `:75-82` gains `['task', false, true]`; a `task` upsert on an already-indexed signature still runs the consumers; the FTS leg fires only when `vaultPath` is given (add `'task'` to the list at `:216`).
- [ ] A no-op toggle (`changed: false`) and a `stale: true` toggle invoke neither `update_search_index_file` nor the consumer nor the listener.

## Notes

- **Size:** S.
- Issues 09 and 12 call or change `afterTaskWrite`; nothing else should duplicate its steps.

# 46 discovery: created notes reach FTS5 at creation

## Files that change

- `src/lib/core/filesystem/fs.service.ts:131` (`createFile`): pass `vaultPath: vaultStore.path` to the `fs` upsert, only for a Markdown file (`isMarkdownFile`, `fs.logic.ts:39`). `createFile` also creates `.canvas` / `.kanban` / `.collection` JSON, and the save-side search observer (`search.service.ts:313`) indexes only `.md` / `.markdown`; feeding JSON into FTS5 would be a new behavior. Static `vaultStore` import, as `path-change.service.ts:8` already does (no cycle: `vault.store` imports only `vault.logic`).
- `src/lib/core/note-creator/note-creator.service.ts:106` (`openOrCreateNote`): same, `source: 'create'`, same Markdown guard.
- `note-change.service.ts` stays as is: `ftsKey` already derives the key with `vaultRelativeKey` and skips a path outside the vault. The `create` / `fs` policy rows keep `rust: 'never'`; the FTS5 / semantic leg is independent of that axis.
- `e2e/mocks/tauri-core.ts`: `search_fts` today greps the virtual FS, so it cannot see the gap. Model it: `create_note` marks the path "not in FTS yet", `update_search_index_file` clears it, `search_fts` skips marked paths. Seeded files (`fs.populate`) stay searchable, so existing search specs are unaffected.

## Plan

- Task 1: both create paths + unit tests in `src/tests/lib/core/filesystem/fs.service.test.ts` (createFile block, :336) and `src/tests/lib/core/note-creator/note-creator.service.test.ts`: a created note gets `update_search_index_file` / `update_semantic_file` with the vault-relative key and `vaultPath`; a path outside the vault gets neither; a non-Markdown create gets neither.
- Task 2: mock FTS gap + `e2e/specs/calendar-feature-46-created-note-search.spec.ts`: "New Calendar Event" (copy `event-calendar.spec.ts:460-489`), then text search for the note body finds it with no edit. Not run here (orchestrator runs E2E on main).

## Prior art

- `trash.service.ts:230` passes `vaultPath` on its `restore` upsert; watcher passes it at `watcher-handler.service.ts:115`.
- Note-change FTS tests: `src/tests/lib/core/filesystem/note-change.service.test.ts`.

## Risks

- note-creator test uses `vi.resetAllMocks()`, so `invoke` returns `undefined` and `.catch` would throw inside `applyNoteChange`; the new tests resolve `invoke` and open `vaultStore`, and `vaultStore._reset()` runs in `beforeEach`.
- Issue 48 edits `createFile` next (dedupe); this change is one line there.

## Defaults for open questions

- Non-Markdown creates stay out of FTS5 / semantic (matches the save observer).

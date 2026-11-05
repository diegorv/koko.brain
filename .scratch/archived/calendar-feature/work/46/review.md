VERDICT: APPROVED

# Review: Issue 46, created notes reach FTS5 at creation

Diff reviewed: `git diff main...HEAD` on `issue/calendar-feature-46-create-paths-pass-vault-path` (9acc12c1, f5c530e3, 98f783ec, b1e85199).

## Acceptance criteria

- [x] **Both create paths pass `vaultStore.path`**: met. `fs.service.ts:134-135` (`createFile`, source `fs`) and `note-creator.service.ts:110-111` (`openOrCreateNote`, source `create`) pass `vaultPath` to `applyNoteChange`. The upsert is guarded by `isMarkdownFile`, so canvas, kanban and collection JSON are not sent. Those are the only two frontend callers of `create_note` (grep of `src/lib`). `applyNoteChange` (`note-change.service.ts:195-209`) derives the key through `ftsKey` -> `vaultRelativeKey`, so it never falls back to the absolute path. The `create` / `fs` policy rows still have `rust: 'never'`, so no extra `update_note_in_index` is sent.
- [x] **Tests: a created note gets its FTS5 upsert with the vault-relative key, and a path outside the vault is skipped**: met for both paths. `fs.service.test.ts:368-412` and `note-creator.service.test.ts:94-135` assert `update_search_index_file` / `update_semantic_file` with `filePath: 'Events/Planning.md'` / `'Daily/2026-11-10.md'` and `vaultPath: '/vault'`, plus the outside-vault and non-Markdown skips. `fs.service.test.ts` also covers the no-vault case. I checked that the tests discriminate (probes reverted afterwards, worktree clean):
  - With the two sources at main, the two "upserts ... vault-relative key" tests fail (2 failed / 95 passed).
  - With the `isMarkdownFile` guard removed, the two "non-Markdown" tests fail (2 failed / 95 passed).
- [x] **An E2E shows that a note created via "New Event" is found by text search before any edit**: met by static reading. I did not run it: Playwright is off-limits here, and the orchestrator runs E2E after merge. `e2e/mocks/tauri-core.ts` now models the gap. `create_note` marks the path, `update_search_index_file` clears `${vaultPath}/${filePath}`, `build_search_index` clears all marks, and `search_fts` skips marked paths. The spec `e2e/specs/calendar-feature-46-created-note-search.spec.ts` creates the event through the dialog. `createNow` -> `createTypedNote` -> `createFile` does no save and opens no editor afterwards (`event-calendar.service.ts:722-760`, `type-definitions.service.ts:114-135`), and `build_search_index` runs only at init (`app-lifecycle.service.ts:403`). So without the fix nothing would clear the mark and the spec would fail, which makes it a real regression test. Its selectors match the existing "New Calendar Event" spec (`event-calendar.spec.ts:460-489`). "Show in Calendar" is rendered by `SearchResult.svelte:174-177`, and the snippet sits in a `<p>` (`SearchResult.svelte:166`). Following the orchestrator rules, it pins `clockTime` / `timezoneId` and filters the tab locator with `hasText`. No existing spec both creates a note and text-searches it (only seeded notes are searched), so the mock change breaks nothing.

## Other checks

- The layer rules hold. Both `core/` files import only `core/` modules (`vault.store`, `fs.logic`), with no new `features/` or `plugins/` import. Adding a static `vaultStore` import to `fs.service.ts` creates no cycle: `vault.store.svelte.ts` imports only `vault.logic`, and `path-change.service.ts:8` already imports it statically.
- Error handling: `applyNoteChange` never rejects. The FTS IPC failures are logged and the semantic ones go to debug, the same as the save observer. Both run after `await invoke('create_note')`, so `update_search_index_file` can stat the file for its mtime.
- Timing: the DB opens in initializeVault Step 2 and the daily note is auto-opened in Step 9, so the FTS connection is open when the startup create upsert runs. Before the deferred `init_semantic_search` runs, `update_semantic_file` fails silently and `build_semantic_index` picks the file up from disk later. Same as the save path.
- Rust `is_markdown_filename` is case-insensitive, and so is `isMarkdownFile`. The guard therefore matches what `build_search_index` indexes.
- Docs: the line updated in CLAUDE.md (Indexing #6) is now accurate. Before this branch it was already stale for Trash restore. `docs/SEARCH.md` and ADR 0009 make no claim that this change contradicts.
- Commits follow docs/COMMITS.md (Context / Problem / Solution / Behavior / Files with line ranges, plus the Co-Authored-By trailer).
- Scope: limited to the Issue. The E2E mock change is needed to make the gap observable.

## Test evidence (run by the reviewer)

- `pnpm vitest run src/tests/lib/core/filesystem/fs.service.test.ts src/tests/lib/core/note-creator/note-creator.service.test.ts src/tests/lib/core/filesystem/note-change.service.test.ts`: 3 files, 124 passed.
- Callers of the changed code: `pnpm vitest run src/tests/lib/core src/tests/lib/plugins src/tests/lib/features/{event-calendar,type-definitions,collection,canvas,command-palette,quick-switcher,deep-link,search}`: 251 files, 6064 passed, 1 todo, 0 failed.
- `pnpm check`: 0 errors, 0 warnings.
- The red-probe runs are described under the second criterion above.
- Not run: the full gate (the deliver step runs it) and the E2E spec (the orchestrator runs it).

## Findings

1. **Low (comment wording)**: `src/lib/core/filesystem/fs.service.ts:131-133` and `src/lib/core/note-creator/note-creator.service.ts:107-109`. The new comment "The vault root puts a Markdown note in FTS5 / semantic now instead of at its first save" narrates the change ("now instead of"), which the global CLAUDE.md comment rule (section 8) forbids. "The vault root" also reads as the subject doing the indexing. Fix: reword both to state the current behavior, e.g. "Passing the vault root upserts a Markdown note into FTS5 / semantic at creation, so it is searchable before its first save; other files stay out, as on the save side." Optional, since it does not affect behavior.
2. **Low (test gap)**: `src/tests/lib/core/note-creator/note-creator.service.test.ts:94-135`. The `openOrCreateNote` block has no "no vault open" case, although `fs.service.test.ts:404-412` has one for `createFile`. Fix: add a test that leaves `vaultStore` closed (the `beforeEach` already calls `_reset()`), creates `/vault/note.md` and asserts neither `update_search_index_file` nor `update_semantic_file` was invoked. Optional.

## Resolution

- Finding 1: fixed. Both comments now state the current behavior (`fs.service.ts:131-134`, `note-creator.service.ts:107-109`).
- Finding 2: fixed. `note-creator.service.test.ts:137-146` creates `/vault/note.md` with no vault open and asserts neither `update_search_index_file` nor `update_semantic_file` is invoked.

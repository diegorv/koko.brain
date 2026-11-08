VERDICT: APPROVED

## Acceptance criteria

- [met] Failing test first: with two `isA === 'Type'` entries whose titles normalize to `Book` (`/vault/a/book.md`, `/vault/b/Book.md`), `buildTypeMetadataMap(entries).get('Book').path` equals the path the store's `getTypeDefinitionPath('Book')` returns (logic test in `type-definitions.logic.test.ts`, plus a store test for the path index; real store, no mocks) — `type-definitions.logic.test.ts` "picks the file the store path index picks when titles differ only in case" calls the real `typeDefinitionsStore.setEntries(entries)` and asserts `buildTypeMetadataMap(entries).get('Book').path` equals `getTypeDefinitionPath('Book')`, and that it is `/vault/a/book.md` with icon `book`. `entryV2` derives the titles `book` and `Book` from the paths (fixture line 19). The store test "keeps the first definition when titles differ only in case" pins the path index to `/vault/a/book.md`. Red probe: I put the old `map.set(meta.name, meta)` back temporarily and both new logic tests failed (2 failed, 51 passed). Then I restored the file and the worktree was clean.
- [met] The same holds for two definitions with an identical title in different folders — `type-definitions.logic.test.ts` "picks the file the store path index picks when titles are identical" (`/vault/a/Book.md`, `/vault/b/Book.md`) asserts that the paths are equal and that both are `/vault/a/Book.md`. It failed in the red probe too. The existing store test "keeps the first definition when titles collide" covers the path index side.
- [met] The rule for which file wins is one rule, stated in both JSDoc comments, and the order it depends on (entries order from the Rust snapshot) is named — both the `buildTypeMetadataMap` JSDoc (`type-definitions.logic.ts:133-140`) and the `buildTypeDefinitionPaths` JSDoc (`type-definitions.store.svelte.ts:108-116`) say "the first in `entries`/`value` order wins". Both name `get_all_vault_entries_v2` sorted by path and `patchEntriesSnapshot`. I checked these claims against the code. `src-tauri/src/commands/vault.rs:565-566` does `out.sort_by(|a, b| a.path.cmp(&b.path))`. `core/vault/vault-entries.logic.ts:9-27` merges upserts at their sorted position. Both builders get the same array (`tauri-listeners.service.ts:213-214` full refresh, `:248-254` patch). `patchEntries` rebuilds the path index from the whole `value` whenever a Type entry is touched, so first-wins holds after a patch as well.

## Findings

None.

## Checks run by the reviewer

- `taskpolicy -c background pnpm check`: exit 0, 0 errors and 0 warnings.
- Targeted vitest: the 20 test files under `src/tests` that reference `buildTypeMetadataMap`, `getTypeDefinitionPath`, `refreshTypeDefinitions` or `typeMetadataMap`. This includes `src/tests/lib/features/type-definitions/type-definitions.logic.test.ts` and `src/tests/lib/features/type-definitions/type-definitions.store.test.ts`. Exit 0, 793 of 793 passed. My test verdict rests on these files.
- Red probe on `type-definitions.logic.test.ts` with the old last-wins line restored: exit 1, both new cases failed. The source file was restored afterwards with `git checkout`.
- Scope: the diff touches only the logic function (one line plus JSDoc), the store JSDoc, the two test files and the workflow's own discovery file. It has no layer-baseline changes and no new UI, which matches the owner's "resolve only" decision.
- Not run: the full suite and `pnpm build` (deliver's to run).

## Observations (not blocking)

- `EventCalendarSection.svelte:104` calls `refreshTypeDefinitions()` without arguments, so it fetches a fresh snapshot, while the store's path index still holds the memo snapshot until the next version bump. Both are sorted by path, so the tie-break rule is the same. They can differ only for a moment, on content (a definition just created), not on order. This was there before the change and is outside this Issue.

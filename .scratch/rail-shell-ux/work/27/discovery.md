# Issue 27 discovery

## Files that change

- `src/lib/features/type-definitions/type-definitions.logic.ts:133-143` `buildTypeMetadataMap`: `map.set` on every definition (last wins). Change to keep the first entry per normalized name (`if (!map.has(meta.name))`) and state the rule in its JSDoc.
- `src/lib/features/type-definitions/type-definitions.store.svelte.ts:16` (state JSDoc), `:107-121` `buildTypeDefinitionPaths`: already first-match-wins. Only the JSDoc changes, to state the same rule and name the order.
- Tests: `src/tests/lib/features/type-definitions/type-definitions.logic.test.ts` (`describe('buildTypeMetadataMap')`, line 136) and `src/tests/lib/features/type-definitions/type-definitions.store.test.ts` (`describe('getTypeDefinitionPath')`, line 213).

## Why first-wins is the one rule

Both builders read the same array. `tauri-listeners.service.ts:213-214` and `:248-254` pass one `entries` snapshot to `refreshTypeDefinitions` and to `setEntries`/`patchEntries`; `EventCalendarSection.svelte:104` fetches `get_all_vault_entries_v2`, which Rust sorts by path (`src-tauri/src/commands/vault.rs:565-566`), and `patchEntriesSnapshot` (`core/vault/vault-entries.logic.ts:3-27`) keeps that path order. So "first entry in snapshot order wins" means "the lowest absolute path wins" for both readers, also after a patch. Keeping the store's existing rule and moving the logic one is the smaller change (the store test at line 233 already pins first-wins).

## Plan

1. Failing tests first:
   - logic: entries `/vault/a/book.md` (title `book`) then `/vault/b/Book.md` (title `Book`), both `isA: 'Type'`; `buildTypeMetadataMap(entries).get('Book').path` equals `typeDefinitionsStore.getTypeDefinitionPath('Book')` after `setEntries(entries)` (real store, imported in the logic test), and both equal `/vault/a/book.md`.
   - same for identical titles `/vault/a/Book.md`, `/vault/b/Book.md`.
   - store: path index picks `/vault/a/book.md` for the case-differing pair (identical-title case already covered at store test line 233).
2. Change `buildTypeMetadataMap` to first-wins; update both JSDoc comments.
3. Targeted checks: `pnpm check`, the two test files, plus the files that call `buildTypeMetadataMap`/`getTypeDefinitionPath` (`grep` list in src/tests).

## Prior art

- Store test `keeps the first definition when titles collide` (store test line 233) and `keys a lowercase definition by the normalized name` (line 240). `typeDefEntry` helper in the logic test builds `/vault/<title>.md`; the new cases need explicit paths, so they use `entryV2(path, { title, isA: 'Type' })`.

## Risks

- Behaviour change for metadata: a vault with duplicates now shows the first (lowest path) definition's icon/folder instead of the last. No UI reports duplicates (owner decision, out of scope).
- A test somewhere asserting last-wins metadata would fail; none found by grep, the targeted run confirms.

## Defaults taken

- No shared helper extracted: two four-line loops with the same rule stated in both JSDoc comments, as the criterion asks.

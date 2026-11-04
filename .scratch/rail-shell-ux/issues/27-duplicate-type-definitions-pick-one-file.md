# 27: Two definitions of one type name resolve to the same file everywhere

**What to build:** When a vault holds two type definitions that map to the same type name (`Book.md` and `book.md` in different folders, or two `Book.md` files in different folders), every reader picks the same definition file. Today the definition-path index keeps the first entry and the type metadata map keeps the last one, so `getTypeDefinitionPath('Book')` and `typeMetadataMap.get('Book').path` can name different files. The Types row could then show one definition's icon and folder while its "open definition" action opens the other file.

**Blocked by:** none

**Status:** resolved

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`.

- [x] Failing test first: with two `isA === 'Type'` entries whose titles normalize to `Book` (`/vault/a/book.md`, `/vault/b/Book.md`), `buildTypeMetadataMap(entries).get('Book').path` equals the path the store's `getTypeDefinitionPath('Book')` returns (logic test in `type-definitions.logic.test.ts`, plus a store test for the path index; real store, no mocks)
- [x] The same holds for two definitions with an identical title in different folders
- [x] The rule for which file wins is one rule, stated in both JSDoc comments, and the order it depends on (entries order from the Rust snapshot) is named

## Notes

- **Triaged (owner decision, 2026-11-04):** build it now, resolve only. Duplicate definitions are not reported to the user: no UI, toast or warning is part of this Issue.
- **Today (traced at 8fe42637):** `buildTypeDefinitionPaths` (`src/lib/features/type-definitions/type-definitions.store.svelte.ts:113-121`) keys by `normalizeTypeCasing(e.title)` and keeps the first match (`if (!defPaths.has(name))`). `buildTypeMetadataMap` (`src/lib/features/type-definitions/type-definitions.logic.ts:134-143`) keys by `meta.name` and `map.set`s every definition, so the last one wins. Readers of the path index: `app/boot.ts:52` (`definitionPathOf`), `features/rail-shell/RailNoteList.svelte:316`.
- **History:** Issue 11 (`8fe42637`) keyed both by the normalized name, which widened the split from identical titles to titles that differ only in case. Two identical titles already split this way before Issue 11.
- **Answered at triage:** resolve consistently only; reporting duplicates to the user is out of scope.
- **Source:** `.scratch/rail-shell-ux/work/11/review.md` finding 1 (minor), left unfixed in Issue 11 as out of scope.
- **Size:** S.

## Comments

- 2026-11-04, branch `issue/27-duplicate-type-definitions-pick-one-file`: `buildTypeMetadataMap` now keeps the first definition per normalized name, matching `buildTypeDefinitionPaths`; both JSDoc comments state the first-in-Rust-snapshot-order rule. Logic and store tests cover case-differing and identical titles. Full suite: 491 files, 11660 passed, 1 skipped, 1 todo; build passed. Review round 1: APPROVED (no findings).

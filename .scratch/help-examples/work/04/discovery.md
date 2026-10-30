# 04 discovery: scope collection-features examples

Template: issue 01's SCOPING.md "Collection blocks, `.collection` and `.view` files" section
(folder-name predicate in the global filter). Only what differs is listed.

## Files that change
- `help/examples/collection-features/*.collection` (9 files): every one except
  `calendar-recent-edits` lacks a path filter; that one is only capped (`limit: 50`) and still
  reads the vault, so it gets the filter too.
- `help/examples/collection-features/collection-*.md` (8 notes, 30 ```` ```collection ```` blocks;
  4 in `collection-edge-cases.md` do not parse on purpose and stay as they are).
- `src/tests/help/examples-scoping.test.ts:25-40`: drop the 15 `collection-features/` entries.
- No `.view`, `queryjs` block or `_types` in the folder (checked with `find`).

## Plan
1. Remove the allowlist entries first; the guard fails on 15 files (red).
2. Add `file.folder.endsWith("/collection-features")` to each definition's global `filters`:
   - no filter -> `filters: '<scope>'`;
   - a string filter -> `filters: { and: [<scope>, <original>] }`;
   - an `and:` -> prepend the scope; an `or:` / `not:` -> `and: [<scope>, { or|not: [...] }]`
     (`evaluateFilter` recurses, `collection.logic.ts:164`).
   View-level filters and `limit`s stay as they are.
3. Fix prose the scope makes wrong (`collection-todos-os-itens.md` "every note in the vault").
4. Guard green; run the test file + `pnpm check`.

## Prior art
- `src/tests/help/examples-scoping.test.ts` itself (allowlist + stale-entry test is the check).

## Risks / defaults taken
- `endsWith` instead of SCOPING.md's `contains`: the folder has no subfolders, and `endsWith`
  does not match a sibling `collection-features-old` or a nested `collection-features/x`.
  `file.folder` is absolute (`collection.logic.ts:32`), so it holds whether the folder is the
  vault root or nested; it breaks if the folder is renamed (SCOPING.md's stated limit).
- Data notes (projects, events, bugs) are already in the folder, so no help-vault data changes.
- New prose is English (repo rule) inside notes otherwise written in Portuguese.
- Nothing needs an allowlist reason: every surface here can be scoped.

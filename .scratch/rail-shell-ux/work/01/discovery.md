# Issue 01 discovery: a view lists `.view` files as notes

No `spec.md` exists for rail-shell-ux; the Issue is the spec.

## Files that change

- `src/lib/features/type-definitions/type-sidebar.logic.ts` (near `excludeSystemFolder`, :49): add
  `isListableNote(entry: NoteEntryV2): boolean` = `!isViewFile(entry.path)` (`isViewFile` already imported, :7).
- `src/lib/features/rail-shell/lens.logic.ts:570-582` (`resolveViewLens`): filter
  `excludeSystemFolder(...)` output with `isListableNote` before building `byPath` and calling
  `getNotesForViewPaths`. The `viewEntry` lookup keeps reading the unfiltered `ctx.entries`
  (label `_sidebar_label`, `_sort`). JSDoc updated to say `.view` files are left out.
- `src/lib/features/rail-shell/view-lens.service.ts:24`: no code change; `countViewNotes` already
  counts `resolveViewLens(...).notes`, so the count follows.

## Tests (test-first)

- `src/tests/lib/features/type-definitions/type-sidebar.logic.test.ts`: `describe('isListableNote')`,
  false for `/v/Projects.view` (and `.VIEW` casing), true for `/v/a.md`. Copy the `excludeSystemFolder`
  block style (`entryV2` fixture).
- `src/tests/lib/features/rail-shell/lens.logic.test.ts` inside `queryViewLens and resolveViewLens`
  (:986): an unfiltered definition (`{ views: [{ type: 'table', name: 'All' }] }`) over an index and
  entries that also hold `Projects.view` (the view itself) and another `.view`; assert no `.view`
  path and the plain notes listed. A filtered case: a `.view` whose top-level keys include
  `_type: Project`, index record built with `buildNoteRecord` from `---` wrapped YAML (Issue tip),
  must not be listed by `def()`. Existing tests keep the label and `_sort` covered.
- `src/tests/lib/features/rail-shell/view-lens.service.test.ts`: an unfiltered `All.view` in
  `VIEW_FILES`, with `.view` records in the index and entries; count equals the plain notes only.
  Uses a local index/ctx so the existing count tests keep their numbers.

## Risks

- Other callers of `resolveViewLens`: only the view lens path and `countViewNotes`; both want the
  same rule. `getNotesForViewPaths` itself is untouched (Issue 12 applies the predicate elsewhere).
- Collection editor table / inline blocks still list `.view` rows (Issue 13, out of scope).

## Defaults taken

- The predicate takes the entry (signature from the Issue) and reads only `entry.path`.
- Case-insensitive `.view` match comes from `isViewFile` as is.

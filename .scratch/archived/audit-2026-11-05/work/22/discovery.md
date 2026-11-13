# Issue 22 discovery

## Files that change

- `src/lib/features/type-definitions/type-note-list.logic.ts:8-24` `buildRenameFileName`:
  return type becomes `null` (nothing to do: empty, whitespace or unchanged title),
  `{ ok: true, name }` (legal new file name) or `{ ok: false, error }` (illegal name,
  `error` from `getFileNameError`, `fs.logic.ts:133-140`). Import `getFileNameError`
  instead of `isValidFileName` (the latter is then unused in this file).
- `src/lib/features/note-list/NoteRowMenu.svelte:116-126` `commitRename`: `null` returns
  silently; `{ ok: false }` toasts `Could not rename "<title>": <error>` and returns;
  `{ ok: true }` renames as today. Doc comment updated.
- Tests:
  - `src/tests/lib/features/type-definitions/type-note-list.logic.test.ts:419-445`:
    illegal name returns `{ ok: false, error: 'Name cannot contain ":"' }` (and `/`,
    leading dot), empty/unchanged return null, legal returns `{ ok: true, name }`.
  - `src/tests/lib/features/note-list/NoteRowMenu.test.ts:412-516` (inline rename):
    'Meeting: weekly sync' + Enter toasts the error and does not call renameItem;
    empty and unchanged titles exit rename mode with no toast (whitespace test exists
    at :482, add a no-toast assertion there too).

## Plan

1. Failing NoteRowMenu test for the illegal name (fails today: no toast).
2. Change the logic contract + logic tests, then `commitRename`.
3. Targeted checks: `pnpm check`, the two test files above.

Only caller of `buildRenameFileName`: `NoteRowMenu.svelte:123` (grep).

## Prior art

- `FilesNavigator.svelte:163-175` folder rename: same toast shape.
- Existing NoteRowMenu tests at :482 (empty) and :495 (taken-name toast).

## Defaults taken

- Toast names the note by its title, as the Issue writes it
  (`Could not rename "Meeting"...` uses `note.title`), while the taken-name toast from
  `runOrToast` keeps using the file name (`alpha.md`); that path is not changed.
- Validation runs on the full new file name (title + extension), as today.

## Risks

- None beyond the single caller; rename mode still exits before validation, same as
  the folder rename.

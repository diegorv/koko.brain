# Issue 48 discovery: New File from Template keeps a typed name inside the vault

## Files that change

- `src/lib/plugins/templates/templates.service.ts:55-69` (`createFileFromTemplate`): replace the hand-built `${vaultPath}/${fullFileName}` with `resolveFilePath(vaultPath, fullFileName)` from `src/lib/utils/path.ts:33-53`. It normalizes `.`/`..`, treats a leading `/` as vault-relative, and throws `Path traversal detected` when the result leaves the vault. The throw propagates; `openOrCreateNote` is never reached.
- `src/lib/plugins/templates/templates.logic.ts`: add pure `nameLeavesVault(name)`. Walks the segments of `withMdExtension(name)` (the name the service sees, so `a/..` becomes `a/...md` and stays inside), skipping `.` and empty segments (so a leading `/` is vault-relative), and returns true as soon as a `..` takes the depth below zero.
- `src/lib/plugins/templates/TemplatePicker.svelte`: a `leavesVault` derived from `nameLeavesVault(fileName.trim())`. The hint shows "Must stay inside the vault" in place of "Creates ... in the vault" (and before the "opens the existing note" branch), and `handleKeydown` skips Enter while it holds. `confirmCreate`'s catch already shows a toast for a service throw.

## Tests (test-first)

- `src/tests/lib/plugins/templates/templates.service.test.ts` `createFileFromTemplate` describe: real `resolveFilePath` (not mocked). `'../Outside'` rejects and `openOrCreateNote` is not called; `'Folder/../Name'` calls it with `filePath: '/vault/Name.md'`, title `Name`.
- `src/tests/lib/plugins/templates/templates.logic.test.ts`: `nameLeavesVault` for plain, `Folder/Name`, `../x`, `a/../../x`, `a/../x`, plus leading `/` (false).
- `src/tests/lib/plugins/templates/TemplatePicker.test.ts`: copy the existing `typeName`/`pressEnter`/`dialogText` helpers. Typing `../Outside` shows "Must stay inside the vault", not "Creates ../Outside.md in the vault"; Enter does not call `createFileFromTemplate` and the dialog stays open.

## Risks

- `resolveFilePath` also collapses `//` and `./` segments, so `a//b` now targets `<vault>/a/b.md` instead of a path with an empty segment. That is the same file on disk; no test asserts the old string.
- The picker check is stricter than the service in one corner: `../<vault folder name>/x` climbs out and back in, which `resolveFilePath` accepts. The hint refuses it. The Issue's rule ("a `..` segment that climbs above the vault root") asks for exactly this, and the hint never claims a path the service refuses.
- `title` still comes from `extractTitleFromPath(fullFileName)` (last segment), so `Folder/../Name` keeps title `Name`.

## Defaults taken

- The toast text for a service throw stays the existing "Failed to create file from template." (the picker never sends such a name, so the toast is only a backstop for other callers).

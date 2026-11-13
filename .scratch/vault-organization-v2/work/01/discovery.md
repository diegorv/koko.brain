# 01 discovery: Move collision is silent

## Files that change

- `src/lib/core/filesystem/fs.logic.ts`: new `TargetExistsError` class (pure, so the auto-organize test, which mocks `fs.service.js`, can throw and recognize the real class).
- `src/lib/core/filesystem/fs.service.ts:271-325`: `targetExistsError` returns a `TargetExistsError` (same message); `moveItem(sourcePath, targetDirPath, fileName = getFileName(sourcePath))` gains an optional target name, so a collision is resolved in ONE `applyPathChange` (links rewritten by `updateLinksAfterRename`, tab follows, indexes re-keyed). Existing callers (FilesNavigator, mod-vault) are unchanged.
- `src/lib/features/auto-organize/auto-organize.service.ts:322-345`: on `TargetExistsError` from `moveItem`, try `<basename> 2`, `<basename> 3`... (`numberedName`, as `applyRename` does) until one is free in the destination, move there with the new name, and `toast.info` naming the note and its new name. Any other move failure (and the destination `mkdir` failure) shows a `toast.error` naming the note, once per note path per session (a `reportedMoveFailures` set, like the other `reported*` sets, cleared in `resetAutoOrganize`), so no move failure is silent and a persistent disk error does not toast on every autosave.
- `help/documentation/22-auto-organize.md:204-208` (Move to folder): document the numbered name and the toasts.

## Tests (test-first)

- `src/tests/lib/features/auto-organize/auto-organize.service.test.ts`: copy the "observer calls moveItem after debounce" setup (~l.393). New cases: `moveItem` rejects with `TargetExistsError` once, then `Untitled Task 2.md` is moved via `moveItem(src, dest, 'Untitled Task 2.md')`, the run writes properties at the new path, toast names both names; ` 2` taken -> ` 3`; a non-collision failure toasts an error once per path. Add `vi.mock('svelte-sonner')` (DOM side effect, allowed).
- `src/tests/lib/core/filesystem/fs.service.test.ts` `describe('moveItem')` (~l.1122): a move with a new name renames on disk to `<dir>/<newName>` and calls `updateLinksAfterRename(old, new)` (links follow); a collision rejects with a `TargetExistsError` instance.

## Risks

- `moveItem` still logs the collision through `error()` (Sentry) before rethrowing, as it does today; the run then recovers. Not changed, to keep `fs.service` surgical.
- `exists` is case-insensitive on APFS, which is what the free-name probe wants.
- Path change goes through `applyPathChange` only (indexing-watcher rule 6); no second owner.

## Defaults taken

- The number is appended to the note's own basename: `Untitled Task 2` colliding becomes `Untitled Task 2 2` (rare: type-sidebar notes are created as `Untitled <Type>` and move out of the creation folder). Matches `numberedName`.
- The free-name probe checks only the destination folder: the single-step move never lands in the source folder.
- Toast wording: `Filed "Untitled Task" as "Untitled Task 2": work/tasks already has a note named "Untitled Task"`; failures use `fileOperationErrorMessage` (`Could not move "Untitled Task" to work/tasks: <reason>`).

## Build note

- `pnpm install --frozen-lockfile` could not complete in the worktree (registry 401, offline metadata fails `trustPolicy`), so the build step ran no checks; review or deliver must run them.

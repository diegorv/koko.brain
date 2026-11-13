VERDICT: CHANGES_REQUESTED

## Acceptance criteria

- [not met] Failing test first, reproducing the problem; it passes after the change. — Never observed: the `move collision` suite (`src/tests/lib/features/auto-organize/auto-organize.service.test.ts:2237`) landed in the same commit as the fix (fd4a4b92) and no one has run it, red or green. The review could not run it either (finding 1).
- [met] Filing a second `Untitled Task` lands as `Untitled Task 2`, its links are updated, and a toast names the note and its new name. — Traced in the code: `moveToFreeName` (`auto-organize.service.ts:391-405`) catches `TargetExistsError`, takes the first free `numberedName(basename, n)` in the destination, and moves there in one `moveItem(filePath, destPath, name + ext)`. `moveItem` (`fs.service.ts:304-323`) goes through `applyPathChange`, which calls `updateTabAfterRenameOrMove` (`path-change.service.ts:185`) and `updateLinksAfterRename(from, to)` (`path-change.service.ts:202`). That rewrites only the links that resolve to the old path (`link-updater.logic.ts:59-104`). The toast is at line 402: `Filed "<basename>" as "<name>": <dest> already has a note named "<basename>"`. Tests cover this but have not run (finding 1). No test runs the real link rewrite for this case (finding 3).
- [met] No silent failure remains in the move path. — Traced in the code: a failed `mkdir` (`auto-organize.service.ts:339`), a failed move other than a clash, and a failure of the numbered move itself (`:349`) all reach `reportMoveFailure` (`:412-416`), which shows a `toast.error`. A clash is resolved, not dropped. `newPath === null` means the note is already in place, which is not a failure. A repeated failure is toasted once per note per session by design (documented in the help doc and the JSDoc). It is still logged through `error()`, and the vault's "Not filed" list remains the safety net.
- [not met] Frontend gate: `pnpm check` and `pnpm vitest run` pass. — Not run. `pnpm install --frozen-lockfile` fails in the worktree: online with `ERR_PNPM_FETCH_401` from the codeartifact registry, offline with `ERR_PNPM_TRUST_DOWNGRADE` on `@tauri-apps/plugin-http@2.9.0` and `@tauri-apps/plugin-opener@2.7.3`. With no `node_modules`, `pnpm check` and `pnpm vitest run <file>` both exit 1 before they start. The full suite is deliver's to run, but the typecheck and the targeted tests also have no result.

## Findings

1. **blocker**: environment, no file:line. No check has run on this branch: not the typecheck, and none of the four targeted test files (`src/tests/lib/core/filesystem/fs.logic.test.ts`, `src/tests/lib/core/filesystem/fs.service.test.ts`, `src/tests/lib/features/auto-organize/auto-organize.service.test.ts`, `src/tests/help`). The review re-tried `pnpm install --frozen-lockfile` with pnpm 11.24.0 (mise installed it this time), both offline and online, and got the same two errors as the build step. My test verdict rests on no test file: every file listed above is unrun. Fix: the owner refreshes the codeartifact token. Then run `pnpm install --frozen-lockfile`, `pnpm check` and the four test files above, and fix whatever fails. Do not work around the `trustPolicy` check.
2. **major**: `src/tests/lib/features/auto-organize/auto-organize.service.test.ts:2237`. The test-first criterion has no evidence: the tests and the fix share commit fd4a4b92, and the tests never ran. Fix: after the install, run the `move collision` suite against main's `auto-organize.service.ts` and `fs.service.ts` (for example `git stash` or a temporary revert of the source hunks) and confirm the first case fails. Then run it on the branch, confirm it passes, and note both results in `.scratch/vault-organization-v2/work/01/discovery.md`.
3. **minor**: `src/tests/lib/core/filesystem/fs.service.test.ts:1205-1216`. "Its links are updated" rests only on a call assertion against a mocked `updateLinksAfterRename` (mocked at `fs.service.test.ts:25`). The `link-updater.logic.test.ts` cases (`:181-232`) are all same-folder renames. None covers a path change that moves the note to another folder and renames it while the destination already holds a note with the old stem, which is the Issue's case. Fix: add a `link-updater.logic.test.ts` case such as `buildRenameResolution('/v/inbox/Untitled Task.md', '/v/work/tasks/Untitled Task 2.md', ['/v/work/tasks/Untitled Task.md', '/v/inbox/Untitled Task.md'], '/v')` with `replaceWikilinks` on `[[inbox/Untitled Task]]`. Assert the rewritten target, and assert that a link resolving to `work/tasks/Untitled Task.md` is left alone.
4. **minor**: `src/lib/core/filesystem/fs.service.ts:320`. On a clash, `moveItem` still sends the `TargetExistsError` to `error()` (console.error plus Sentry) before `moveToFreeName` recovers from it. Every resolved collision therefore shows up in Sentry as an error, even though it is now handled and expected. Fix: skip the `error()` call for a `TargetExistsError` in `moveItem`'s catch, since callers show the message anyway. Alternatively, `moveToFreeName` can probe `exists` for the default name before its first `moveItem`.
5. **nit**: `src/tests/lib/features/auto-organize/auto-organize.service.test.ts:688` and `:1190`. These existing tests mock `moveItem` rejecting with a plain `Error('"note.md" already exists in this folder')` to stand for a "failed move". The real `moveItem` now throws a `TargetExistsError` on that cause, and a clash no longer stops the run, so these tests describe a failure that cause no longer produces. Fix: use a non-clash reason such as `new Error('disk full')`.
6. **nit**: `help/documentation/22-auto-organize.md:210`. "Every `[[link]]` to the note is updated" overstates what happens. In this case two notes share the old stem, and `link-updater.service.ts:26-33` documents that a bare link can then be judged against a different winner and left unrewritten. Fix: say "links to the note are updated", as the Rename bullet at line 197 does.

## Other checks

- Scope: the `fs.service`/`fs.logic` changes (`TargetExistsError`, the optional `fileName` on `moveItem`) are needed for the single-path-change move. `renameItem` throwing the class is a one-line consistency change. The message text is unchanged, so the consumers that match on it (FilesNavigator, NoteRowMenu, mods) are unaffected. No scope creep.
- Indexing rule 6: the path change goes only through `applyPathChange`, with no second owner.
- Layer rules: features importing core is allowed. No baseline entry is added and `BASELINE_SIZE` is unchanged.
- The worktree is clean apart from the partial `node_modules/.pnpm` left by the failed installs.

## Resolution

Fix round 1.

1. **blocker (environment): not fixed, still blocked.** `pnpm install --frozen-lockfile` fails again in this round: online with `ERR_PNPM_FETCH_401` (GET `@chevrotain/gast` from the codeartifact registry), offline with `ERR_PNPM_TRUST_DOWNGRADE` on `@tauri-apps/plugin-http@2.9.0` and `@tauri-apps/plugin-opener@2.7.3`. The main checkout's `node_modules` is partial too (no `.bin`, no `.modules.yaml`), and no sibling worktree has an install, so no install exists to copy. The `trustPolicy` check was not bypassed. The owner has to refresh the codeartifact token. Then run `pnpm install --frozen-lockfile`, `pnpm check`, and the test files listed below.
2. **major (test-first evidence): not done, blocked by 1.** Without `node_modules`, vitest cannot run, so the `move collision` suite has not been run against main's source or against the branch. Nothing is recorded in discovery.md because there is no result to record. This still has to be done after the install.
3. **minor: fixed in a877ffb0.** `src/tests/lib/core/filesystem/link-updater.logic.test.ts:238-266` adds the suite "replaceWikilinks on a move under a numbered name", which runs the real `buildRenameResolution`/`replaceWikilinks` for `/v/inbox/Untitled Task.md` -> `/v/work/tasks/Untitled Task 2.md` while `/v/work/tasks/Untitled Task.md` exists. There are two cases:
   - The moved note owns the bare name: `[[Untitled Task]]` and `[[Untitled Task#H|a]]` are rewritten, and `[[work/tasks/Untitled Task.md]]` is left alone.
   - The namesake owns the bare name, which is the reviewer's ordering: `[[inbox/Untitled Task.md]]` is rewritten, and the bare link and the namesake path link are left alone.

   The reviewer suggested the extensionless `[[inbox/Untitled Task]]`. I used `[[inbox/Untitled Task.md]]` instead because of `resolveWikilinkCached` at `wikilink-resolution.logic.ts:127-147`. An extensionless path target has no exact-file step, so it falls back to its basename. With the namesake first in the cache, it resolves to the namesake before the move, and `replaceWikilinks` leaves it alone. That is how the resolver already behaves, and this Issue does not change it.

   The test is traced by hand and has not been run (finding 1).
4. **minor: fixed in 3ef142b6.** In `moveItem`'s catch (`src/lib/core/filesystem/fs.service.ts:319-323`), `error()` is now skipped for a `TargetExistsError`, and the error is still rethrown. Every caller handles a clash:
   - auto-organize `moveToFreeName` resolves it.
   - `FilesNavigator.svelte:288` shows it through `runOrToast`.
   - `mod-vault.service.ts:100` logs it through `logged`.

   Tests: `fs.service.test.ts:1200-1202` asserts that a clash does not call `error()`, and `:1253-1254` asserts that a `rename()` failure still does. They have not been run (finding 1).
5. **nit: fixed in feffd386.** `auto-organize.service.test.ts:688` and `:1190` now reject with `new Error('disk full')`.
6. **nit: fixed in e1dc2da9.** `help/documentation/22-auto-organize.md:210` now reads "Links to the note are updated". Line 439, in the Rename section and not part of this Issue's diff, keeps its wording.

Checks still owed once `node_modules` installs: `pnpm check`, plus `pnpm vitest run` on each of these:

- `src/tests/lib/core/filesystem/fs.logic.test.ts`
- `src/tests/lib/core/filesystem/fs.service.test.ts`
- `src/tests/lib/core/filesystem/link-updater.logic.test.ts`
- `src/tests/lib/features/auto-organize/auto-organize.service.test.ts`
- `src/tests/help`

Then the red/green run for finding 2.

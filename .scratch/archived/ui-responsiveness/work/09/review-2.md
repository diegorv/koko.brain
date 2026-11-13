VERDICT: APPROVED

## Previous findings

| # | Severity | Status | Evidence |
|---|----------|--------|----------|
| 1 | minor | resolved | `fs.logic.ts:582` returns `tree` unchanged when any vault-relative segment starts with `.`; the check runs on the vault-relative segments only, so a vault under a dot directory still works. `moveTreeNode` inherits it, so a rename to a hidden name only removes the source. Tests: `fs.logic.test.ts` "returns the same tree for a dot-prefixed name, which scan_vault hides" (`toBe(input)` for `.x.md`, `Daily/.hidden.md`, `.kokobrain/a.md`, `.git`) and "only removes the source when the target is a hidden path". Pass. |
| 2 | nit | resolved | `fs.service.ts:77,90,123` count in-flight `loadDirectoryTree` calls (decrement in `finally`, so a failed scan does not leak the count); `addToTree` (`:167-170`) starts a superseding load only while one is in flight, so the common path stays scan-free. Test "keeps a node added to the tree while a load is in flight" ends with the disk tree and two `scan_vault` calls; "adds to the tree with no scan when no load is in flight" pins the no-scan path. Mutation probe: replacing the guard with `if (false)` makes `fs.service.test.ts` fail (exit 1); restored, worktree clean. `fsStore.isLoading` is a counter, so the test's `waitFor(isLoading false)` waits for the second load too. |
| 3 | nit | rejection stands | Accepted as a known change with no code change. The watcher ignores `.kokobrain/` both before and after this branch, so the only difference is that an outside edit to `folder-order.json` waits for the next full load; nothing in the Issue asks for more. |

## Acceptance criteria

- [met] Failing first: creating a note through `openOrCreateNote` inserts it in sorted position with no `scan_vault` invoke — the fixes do not touch `note-creator.service.ts`; outside a load in flight `addToTree` still makes no invoke ("adds to the tree with no scan when no load is in flight"), and `note-creator.tree.test.ts` passes.
- [met] Failing first: a watcher patch and an app patch in flight together both survive — `fs.watcher.app-patch.test.ts` passes after the fix; the new in-flight-load path only adds a superseding full load, which reads the disk state including both patches.
- [met] Rename, move, restore and template creation each covered at their call site — `fs.service.test.ts`, `trash.restore-tree.test.ts` and `templates.service.test.ts` pass; the hidden-target change in `moveTreeNode` only affects dot-prefixed targets and has its own test.

## Findings

No new findings. Rename and move go through `moveTreeNode` in `applyPathChange`, not `addToTree`, so they do not get the in-flight-load supersede; outside the vault-opening window their watcher events still repair the tree, and the original nit was only about creates during the initial load, so I do not raise it.

## Checks run by the reviewer

- `pnpm check`: exit 0, 0 errors, 0 warnings.
- Targeted vitest: exit 0, 44 files, 1201 tests passed (`src/tests/lib/core/filesystem/`, `src/tests/lib/core/note-creator/`, `src/tests/lib/core/trash/`, `src/tests/lib/plugins/templates/`, `src/tests/lib/features/deep-link/`, `src/tests/lib/app/`).
- No test removed or weakened by the fix commit; it touches only `fs.logic.ts`, `fs.service.ts`, their two test files and `review.md`. No change to `layer-baseline.json`, `BASELINE_SIZE` or composition roots.
- Full suite, cargo suite and build are deliver's to run. Not checked: no app launch, no E2E.

VERDICT: APPROVED

Re-review, round 2, of the fixes after `.scratch/finders-ux/work/02/review.md` (`git diff 2823c7c2c..HEAD`, commit 47df8daac).

## Previous findings

| # | Severity | Status | Evidence |
|---|----------|--------|----------|
| 1 | minor | resolved | QuickSwitcher.test.ts:335-339 has `readDir` list a `Projects` directory at `/vault`. Probe: QuickSwitcher.svelte temporarily switched to fs.service `createFolder(vaultStore.path, parsed.folder)`; the test failed (exit 1, `openFileInEditor` called with `/vault/Projects 1/Idea.md`). Source restored. |
| 2 | minor | resolved | QuickSwitcher.svelte:29-45: `existingTarget` (case-insensitive path match in `allFiles`) hides Create and leads `filteredFiles` when `filterAndRank` misses it. New test QuickSwitcher.test.ts:282-303 asserts one row for `Projects/Idea.md`, no "No files found.", no Create row, and Enter opens the note with no `create_note`. Probe: the pre-fix component (2823c7c2c) failed this test (exit 1). Source restored. |
| 3 | nit | rejection stands | The round-1 reviewer marked it acceptable; the help doc states that Enter creates on no match. |

## Acceptance criteria re-checked

- [met] An existing folder is reused, not duplicated as `Projects 1`. — the test now fails against a renaming `createFolder` path (probe above) and passes on the branch.
- [met] Typing "Ideas" with `Ideas.md` present renders no Create row, and Shift+Enter creates no `Ideas 1.md`. — `showCreate` is `!!searchQuery.trim() && !existingTarget` (QuickSwitcher.svelte:45), which matches the old rule (invalid paths and no vault path still show the row); test "Ideas" passes.
- [met] Failing test first: invert the test at `QuickSwitcher.test.ts:215-227`. With `Ideas.md` present, typing "Idea" renders the match and then `Create "Idea"` last; Enter opens `/vault/Ideas.md`; Shift+Enter creates and opens `/vault/Idea.md`. — `existingTarget` is undefined for `Idea`, so `filteredFiles` is the plain ranking; tests pass.
- [met] The 042 tests (Enter on no match, both query transitions) stay green. — passing in the quick-switcher run below; the fix commit did not change them.
- [met] Frontend gate: `pnpm check` and `pnpm vitest run` pass. — `pnpm check` exit 0 (0 errors, 0 warnings); `pnpm vitest run src/tests/lib/features/quick-switcher/` exit 0 (4 files, 61 tests). The full suite is deliver's to run.

## Findings

None open or new.

## Checks

- `pnpm check`: exit 0, 234 files, 0 errors, 0 warnings.
- `pnpm vitest run src/tests/lib/features/quick-switcher/`: exit 0, 4 files, 61 tests.
- Regressions: the fix commit only adds a test and a `readDir` mock in one test; no assertion was removed or weakened. Scope stays in QuickSwitcher.svelte, its test and the review file. No layer-baseline or composition-root change.
- Worktree clean after the probes (`git status --short` empty).

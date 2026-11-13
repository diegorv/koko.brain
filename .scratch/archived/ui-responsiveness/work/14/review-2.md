VERDICT: APPROVED

## Previous findings

| # | Severity | Status | Evidence |
|---|----------|--------|----------|
| 1 | minor | resolved | `CollectionView.svelte:116-120` now records only `if (definition)`. New test `CollectionView.test.ts` "keeps the remembered index when the YAML does not parse" passes; my probe (guard removed, test run, file restored) fails with `expected +0 to be 1`. The residual case (YAML fixed while the file stays open, so the clamp's 0 is then recorded) is recorded in the Resolution; it is rare and recoverable. |
| 2 | minor | rejection stands | The review itself asked for no change; the Resolution records that a rename or move of the active collection remounts and drops per-instance UI state while the view index survives. |
| 3 | nit | resolved | `EditorView.test.ts` "keeps the active view when the active collection is renamed" goes through the real `applyPathChange` with the real `registerCollectionPathChangeConsumer`, asserts the tab path changed and A3 is still active, and unregisters in `finally`. |

## Acceptance criteria re-checked

- [met] Failing first: open A, switch to view 2, open B (two views): B shows view 0 — the fix touches only the record effect, which still records with a parsed definition; `EditorView.test.ts` passes on the branch.
- [met] Failing first: open A, switch to view 2, open B, reopen A: A shows view 2 — `EditorView.test.ts` "restores the view last used in a collection when returning to it" passes.
- [met] A remembered index larger than the file's current view count is clamped — `CollectionView.test.ts` "clamps a remembered index larger than the file's view count" still passes; `restoreViewIndex()` and the clamp effect are unchanged.
- [met] With Issue 04's synchronous seed, the remount costs no stale full-vault pass (the jsdom MutationObserver test from 04 extended to a path change) — `EditorView.test.ts` "builds only the new collection's filtered rows on a file switch" passes; the fix does not change seed order.

## Findings

None open or new.

## Other checks

- Typecheck: `pnpm check` exit 0, 212 files, 0 errors, 0 warnings.
- Targeted tests: `pnpm vitest run src/tests/lib/app/EditorView.test.ts src/tests/lib/features/collection/` exit 0, 23 files, 816 tests passed.
- The fix diff (`afdc6069..HEAD`) touches only `CollectionView.svelte` (one guard plus a comment), the two test files and the review's Resolution. No test weakened or deleted; no layer baseline, `BASELINE_SIZE` or composition-root change; `src-tauri/` untouched. Worktree clean after the probe.
- Full suite and `pnpm build` not run; deliver runs them.

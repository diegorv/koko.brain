VERDICT: APPROVED

Re-review round 2 of the fixes after `6c0e563e1` (the commit that added review.md): `git diff 6c0e563e1..HEAD` is commit `94d01414c`, which adds two assertions to `src/tests/routes/composer-page.test.ts` (+2 lines) and the "## Resolution" section of review.md. No source file changed.

## Previous findings

| # | Severity | Finding | Status | Evidence |
|---|----------|---------|--------|----------|
| 1 | nit | "Saving..." hint has no live region | rejection stands | The round 1 reviewer said no change was needed for this Issue. The Issue names no role for the Saving hint. discovery.md records the plain hint as a deliberate default. A nit cannot block. |
| 2 | nit | No test pins the default hint after a summon during a waiting save | resolved | `composer-page.test.ts:473` asserts `Saving...` while the first submit's promise is pending, and `:476` asserts `DEFAULT_HINT` right after `summon()`. Mutation probe: I commented out `saving = false` in `resetForShow` (page `:183`), and the test failed at `:476` (Expected the default hint, Received "Saving..."). I restored the file with `git checkout` and the worktree is clean. |

## Acceptance criteria re-checked

- [met] With `mockSubmit('silent')` (no result arrives), after Cmd+Enter the hint reads `Saving...`; after `resultHandler()` reports `ok: true` it no longer reads "Saving..." during the flash; after a failed or unconfirmed result it reads the matching error hint, and a retry shows "Saving..." again. — The fix only adds assertions. The tests cited in round 1 are unchanged, and the file passes 37/37. Page `:255` `{:else if saving && !saved}` is unchanged.
- [met] Frontend gate: pnpm check and pnpm vitest run pass. — `pnpm check` exits 0 with 0 errors and 0 warnings. `pnpm vitest run src/tests/routes/composer-page.test.ts` exits 0 with 37/37 passed, and this is the only test file for the changed page. Deliver runs the full suite.

## Findings

None open or new.

## Checks run

- Regressions and scope: the fix commit touches only the test file and review.md. It deletes no assertion, weakens no assertion and changes no source file. The new assertions sit in a test whose later assertions are unchanged.
- Typecheck: `pnpm check`, exit 0.
- Tests: `src/tests/routes/composer-page.test.ts`, exit 0, 37 passed.
- Mutation probe (temporary, reverted): with `resetForShow`'s `saving = false` removed, the late-reject test fails at `:476`.

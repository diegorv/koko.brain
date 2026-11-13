VERDICT: APPROVED

Re-review of the fixes for review.md: `git diff 270baea64..HEAD` (commit 36c84ce22). Files: `auto-organize.logic.ts`, `AutoOrganizeRuleRow.svelte`, `help/documentation/22-auto-organize.md` and their tests.

## Previous findings

| # | Severity | Status | Evidence |
|---|----------|--------|----------|
| 1 | minor | resolved | `AutoOrganizeRuleRow.svelte:164-170`: `commitCreatePath` sets `pathRefused` and returns before `onupdate` when `isValidCreatePath` refuses the trimmed path. `pathInvalid` (line 162) also covers a stored invalid path, so the old `!validCreate` message is still shown for it (existing test "says when the path is not a note path" passes). New row test "does not save a path the loader would refuse, and says so" asserts no `onupdate`, the "not saved" message, then a valid path saved with the template kept and the message gone. |
| 2 | nit | resolved | `auto-organize.logic.ts:413`: `isInGatedFolder` skips sources in protected or excluded folders. Help line reworded as an estimate read before any move. Logic test "leaves out sources in a protected or excluded folder, which a run skips" (3 sources, count 1). Templates folder and type definitions as sources stay counted; the estimate wording covers that. |
| 3 | nit | resolved | `isValidTemplatePath` (logic.ts:329) refuses a `..` segment and a leading `/`; `sanitizeCreateNote` drops the `createNote` (logic.ts:346-349); Settings refuses to save it (Row:178-179). Tests: `../outside.md`, `a/../../b.md`, `/etc/t.md` dropped, `t/a..b.md` kept; row test "does not save a template outside the vault, and says so". |
| 4 | nit | resolved | `createTargetProblem` (logic.ts:368) returns "has no file name" when the base name without `.md` is blank; the service calls it before any `mkdir` (service.ts:346). Tests for `.md` and `notes/ .md`, and the count leaves `{status}.md` out. |
| 5 | nit | resolved | `sanitizeCreateNote` stores `path.trim()` and `template.trim()`; test "stores the trimmed path" and the `' t/a..b.md '` case. |

## Acceptance criteria re-checked

- [met] Gates and the `..` guard hold. — The fixes add guards and remove none: `createTargetProblem` keeps the `..` and folder checks and adds the empty-name check; `sanitizeCreateNote` still drops a leading `/` and a non-`.md` path, now also a template outside the vault. `auto-organize.service.test.ts` gates and `..` tests pass.
- [met] Settings shows "Would create N notes now". — `countNotesToCreate` still feeds `data-create-count`; row test "shows how many notes it would create now, leaving out targets that exist" passes, plus the two new count tests.
- [met] Docs updated. Frontend gate passes. — `22-auto-organize.md` documents the no-file-name guard, the template check and the estimate wording; `src/tests/help/` passes. `pnpm check` exit 0 and the targeted tests pass; the full `pnpm vitest run` is deliver's to run.

## Checks run

- `pnpm check`: exit 0, 0 errors, 0 warnings.
- `pnpm vitest run src/tests/lib/features/auto-organize/ src/tests/help/`: exit 0, 18 files, 766 tests pass.
- No test was weakened or deleted: the diff only adds tests. No scope creep: every change traces to a review finding. No layer baseline or `BASELINE_SIZE` change.

## Findings

1. nit — `src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:350` — the template error shows only after a refused commit (`templateRefused`), not for a stored template the loader drops (hand-edited `"template": "../x.md"`). The path error covers both cases through `pathInvalid`, but a bad stored template shows no message, only the "does nothing" hint and no create count. Fix: derive `templateInvalid` from `templateRefused || !isValidTemplatePath(rule.createNote?.template ?? '')`, as `pathInvalid` does.

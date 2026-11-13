VERDICT: APPROVED

## Previous findings

| # | Severity | Status | Evidence |
|---|----------|--------|----------|
| 1 | blocker | resolved | 5bd998f34 deletes the 41 `--lp-codeblock-{border,header-bg,lang,copy,copy-hover,text}`, `--lp-syntax-*` and `--lp-meta-bind-*` declarations from `.dark` and adds them, value for value, to a new `:root` block (src/app.css:362-411) after the event-calendar `:root` block. A grep of `src/` finds no other declaration of these names, so nothing shadows them and `.dark` does not redeclare them. The new contract case (theme-css-contract.test.ts:89-99) flags any `.dark` variable that `themeColorsToCssVars` does not emit and that is not declared outside `.dark`. I checked that it is a real regression test: with `src/app.css` restored to c67f4e618 it fails (1 failed, 7 passed). With the fix it passes. |
| 2 | minor | resolved | e2e/specs/theme-mode.spec.ts:31-44 checks, under Lavender Haze on a dark OS, that `--lp-syntax-keyword`, `--lp-meta-bind-select-bg` and `--lp-codeblock-header-bg` are non-empty on `<html>`, after waiting for `color-scheme: light`. `bash scripts/e2e.sh e2e/specs/theme-mode.spec.ts`: 3 passed. |
| 3 | nit | resolved | src/tests/lib/core/settings/applied-theme.store.test.ts covers the dark default, `setDark(false)`, `setDark(true)` and `_reset()` against the real store. It passes. |

## Acceptance criteria re-checked

- [met] Failing first, `theme-css-contract.test.ts` asserts `src/app.css` contains the line `@custom-variant dark (&:where(.dark, .dark *));`. — The fixes leave that case (theme-css-contract.test.ts:84-87) and app.css:6 unchanged. The file passes 8/8.
- [met] New `e2e/specs/theme-mode.spec.ts` using the `vaultFiles` fixture (`e2e/fixtures/test-vault`) with `appearance.activeTheme` set in `.kokobrain/settings.json`: Lavender Haze with Playwright `colorScheme: 'dark'` gives an `<html>` without the `dark` class and a computed `color-scheme` of `light`; KokoBrain Default with `colorScheme: 'light'` gives the `dark` class and `color-scheme: dark`. Run through `bash scripts/e2e.sh`. — The fix only adds a third case. The two original cases are unchanged. `bash scripts/e2e.sh e2e/specs/theme-mode.spec.ts`: 3 passed.
- [met] No `dark:` utility is edited in this ticket. — The fixes change app.css custom properties, tests and the e2e spec. The fix diff adds or removes no `dark:` utility.

## Findings

None open or new.

## Checks run by this review

- Typecheck: `taskpolicy -c background pnpm check` passed (216 files, 0 errors, 0 warnings).
- vitest: theme-css-contract, applied-theme.store and theme.service passed (3 files, 33 tests). The other tests that read app.css also passed: commit-msg-fix-test, radius-scale, chrome-type-scale, event-color-tokens, PropertyField, text-roles and font-stacks (7 files, 104 tests).
- I confirmed the new contract case fails on the pre-fix app.css (temporary checkout of c67f4e618's file, then restored). The worktree is clean.
- E2E: `bash scripts/e2e.sh e2e/specs/theme-mode.spec.ts` passed (3 tests).
- Scope: the fix diff touches only src/app.css, the e2e spec, two test files and the review file. No layer baseline or composition-root change.
- Not run: the full vitest suite and `pnpm build`. Deliver runs those.

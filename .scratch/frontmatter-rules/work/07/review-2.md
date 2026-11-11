VERDICT: APPROVED

## Previous findings

| # | Severity | Status | Evidence |
|---|----------|--------|----------|
| 1 | minor | resolved | `AutoOrganizeRuleProperty.svelte:64` flattens an empty or one-item list to text in `fitted` for `if-missing` / `always`, so `ruleValueEditor` returns `text` (editable) instead of `json`. Tests `AutoOrganizeRuleRow.test.ts:360` (add `[]` -> always saves `''`, field enabled) and `:369` (add `['work']` -> if missing saves `'work'`). |
| 2 | minor | resolved | Menu hides "add to list" when `isBooleanOnlyKey(property.key)` (`:210`); `fitted` turns `add` on a lifecycle key into `if-missing` and the boolean branch sets `false` (`:56`, `:66`). Tests `:378` (option absent on `_archived`) and `:393` (rename `tags` add -> `_archived` saves `{ value: false, mode: 'if-missing' }` with a switch). `todoist_project` keeps the refused-key note. |
| 3 | nit | resolved | `:229` reads "A rule never sets or removes {key}"; test `:276` asserts the new text. |
| 4 | nit | resolved | X button titled "Delete row" (`:220`); row-removal test `:216` queries it. The only other "Remove property" title is in `features/properties/PropertyField.svelte`, unrelated. |
| 5 | nit | rejection stands | `error()` for the add-on-a-number mismatch was a documented discovery default, matches `reportWriteFailure`, fires once per rule per session (`reportedAddSkips`), and the owner is the sole Sentry recipient. |

## Acceptance criteria re-checked

- [met] Settings: the new modes are saved; a `remove` row has no value field. — the fix touches only the Settings row; `AutoOrganizeRuleRow.test.ts` still covers saving remove (no value / type field) and add to list, plus the four new transition tests; 321 tests in the auto-organize folder and the doc-examples test pass.
- [met] Docs updated. Frontend gate passes. — no doc change in the fix; the help page already says the X button "deletes the row", matching the new title. `pnpm check` exit 0 (230 files, 0 errors, 0 warnings); targeted tests exit 0. The full `pnpm vitest run` is deliver's to run.

## Checks run

- `pnpm check`: exit 0, 0 errors, 0 warnings.
- `pnpm vitest run src/tests/lib/features/auto-organize/ src/tests/help/auto-organize-doc-examples.test.ts`: exit 0, 8 files, 321 tests passed.
- Fix diff (`f24952a2c..HEAD`) touches only `AutoOrganizeRuleProperty.svelte`, its test and `review.md`; no test weakened or deleted (one query renamed, one assertion added), no layer-baseline or composition-root change.

## Findings

1. nit — `src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:64`: the flatten applies to any one-item list, not only one left by `add`. A hand-written `always aliases: ["x"]` (shown as read-only JSON) becomes `always aliases: "x"` when the user renames its key or switches always <-> if missing, so the rule then writes a scalar instead of a list. The comment says "left by `add`". User-initiated and visible in the field, so not blocking. Fix: flatten only when the previous mode was `add` (pass `property.mode` into `fitted`), or update the comment to say any short list is flattened; add a test either way.

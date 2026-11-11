VERDICT: APPROVED

Re-review round 2 of the fixes in `git diff 516d0a46b..HEAD` (commit df6f08597) on branch `issue/02-rule-consequences-in-settings`.

## Previous findings

| # | Severity | Status | Evidence |
|---|----------|--------|----------|
| 1 | minor | resolved | `auto-move.logic.ts:111-114` exports `isRefusedKey` over the same `REFUSED_KEYS` set the sanitizer uses (`:166`), via `canonicalizeKey`. `AutoMoveRuleRow.svelte:69` filters refused keys out of `keySuggestions`; `AutoMoveRuleProperty.svelte:174-178` shows a `text-meta text-destructive` note (`data-refused-key`). Tests: logic `isRefusedKey` (true for `todoist_project`, false for `status` and `''`), row "does not suggest the refused key todoist_project" (asserts `status` present, `todoist_project` absent in the datalist), row "notes that a rule never sets todoist_project" (absent before, present after committing the key). |
| 2 | nit | resolved | `AutoMoveRuleProperty.svelte:46-51`: `commitKey` asks `ruleValueEditor(key, '')` and resets a non-string value to `''` for `icon`/`color`. The boolean-only branch runs first and `_icon`/`_color` are not boolean-only keys, so the two resets do not conflict. Test "resets a yes/no value when the key is renamed to _icon, so the icon picker shows" asserts the saved `value: ''` and the "Pick icon" button. |
| 3 | nit | resolved | `help/documentation/22-auto-move.md:57` now reads per row: "On a `_color` row, pick from the **Icon** colors; on a `_title_color` row, from the **Text** colors", matching `setColor`. |
| 4 | nit | resolved | `auto-move.logic.ts:132` JSDoc and the `ruleValueEditor` test name say "a yes/no switch". |
| 5 | nit | resolved | `AutoMoveRuleRow.svelte:170`: the count renders only when `countedFilter === filterDraft`. `countedFilter` starts at `rule.expression` (`:55`), so the initial count still shows without waiting. Test "hides the previous count while the typed filter is not counted yet" asserts no count right after typing and `Matches 2 notes now` after the delay. |

## Acceptance criteria re-checked

- [met] The match count shows the number of index records the filter matches, and 0 for an empty filter. — Fix 5 only gates when the count renders; the existing tests "shows how many index records the filter matches", "shows 0 for an empty filter" and "counts a typed filter once the user stops typing" still pass, unmodified, in `AutoMoveRuleRow.test.ts`.
- [met] `_archived` shows a checkbox and saves a boolean. — Fix 2 adds a branch after the boolean-only reset in `commitKey`; "shows a yes/no toggle (the Settings Switch) for _archived and saves a boolean" still passes unmodified.
- [met] The `_icon` key opens the icon picker, and its choice saves `pack:name`. — Unchanged test "opens the icon picker for _icon and saves its choice as pack:name" passes; the new rename test also reaches the picker from a boolean row.
- [met] `22-auto-move.md` shows the Settings flow. — Only the color line changed (fix 3); the "Creating a Rule in Settings" section is otherwise intact; `src/tests/help/` passes.
- [met] Frontend gate: `pnpm check` and `pnpm vitest run` pass. — `pnpm check` run by this re-review: 0 errors, 0 warnings. Targeted tests pass (see Checks). The full suite is deliver's to run.

## Findings

None open or new.

Checked, not findings:
- No test was weakened or deleted: the fix diff in `src/tests/` only adds tests and renames one test title (finding 4).
- No scope creep: the six non-`.scratch` files changed are the ones the five findings name, plus their two test files.
- `isRefusedKey` reuses `REFUSED_KEYS`, so the UI note and the sanitizer cannot disagree on which keys are refused.
- No layer-baseline entry, `BASELINE_SIZE` change or composition root is added.

## Checks run by this re-review

- `pnpm check`: exit 0, 0 errors, 0 warnings.
- `pnpm vitest run src/tests/lib/features/auto-move/ src/tests/help/ src/tests/lib/core/settings/settings-controls.test.ts src/tests/lib/core/settings/settings-copy.test.ts src/tests/lib/core/settings/settings-text.test.ts`: exit 0, 20 files, 565 tests passed.
- Full suite not run: deliver runs it.

# Discovery: Issue 03, the rule filter uses the view filter builder

No `spec.md`; `PRD.md` holds the Decisions. Builds on `work/02` (the row's filter draft, match count, harness `src/tests/fixtures/AutoMoveRuleRowHarness.svelte`).

## Files that change

- `src/lib/features/auto-move/auto-move.types.ts:32-33`: `expression: FilterItem`.
- `src/lib/features/auto-move/auto-move.logic.ts:30-95`: one private `ruleMatches(expression, ctx)` used by `findMatchingRule` and `findMatchingRules`: a string goes through `evaluateExpression` (unchanged, throws reach `onError`); an object is checked by a new exported `filterProblem(filter)` and throws its message when broken, else `evaluateFilter` (`collection.logic.ts:317`). `countMatchingNotes` takes a `FilterItem`: string as today, object null when `filterProblem` reports one.
- `filterProblem`: a malformed object (not `and`/`or`/`not` lists, null item), no leaves, a leaf that fails `validateExpression` (blank or parse error) or the evaluator's `validateExpression` (unknown function), or a leaf that parses (`parseExpressionToRow`, `filter.logic.ts:22`) to a visual row with a non-unary operator and a blank value (`BLANK_VALUE_ERROR`, the ViewDialog wording "Every filter needs a value").
- `src/lib/features/auto-move/AutoMoveRuleRow.svelte:43-175`: the Expression input becomes `FilterPanel` with `showGlobal={false}`, `globalFilters={[]}`, `availableProperties = getAllKnownProperties(collectionStore.propertyIndex)`. Local `$state.raw` groups from `parseFilterToGroups(rule.expression)`; the draft is `filterGroupsToFilter(groups) ?? ''`.
- `help/documentation/22-auto-move.md`: filter section (builder, all / any / none, one example each, `(A and B) or C` as a raw row).

## Plan (test-first)

1. Logic tests in `auto-move.logic.test.ts` (Acceptance 1-3, 5): `or`, `and`, `not`, string unchanged, string throws reported, the four broken objects match nothing and are reported; `countMatchingNotes` for an object; `filterProblem` cases.
2. Implement logic + type. Commit.
3. Row tests in `AutoMoveRuleRow.test.ts` (Acceptance 4) through the harness: two rows in an "any" group save `{ or: [...] }`; a stored string shows as one row; a complex string shows as a raw row and saves back unchanged; existing filter / match-count tests ported to the builder. Prior art: `src/tests/lib/features/collection/toolbar/FilterPanel.svelte.test.ts` for driving the conjunction menu.
4. Implement the row. Commit. Docs. Commit.

## Saving (Decision 13)

FilterPanel reports every keystroke. The row updates its local groups on each report and saves: at once for a structural change (add, remove, property, operator, conjunction); on the bubbling native `change` for typing (an `input` capture listener flags the report as typing). It never saves while a visual row has a blank value (the ViewDialog check, `ViewDialog.svelte:60-64`, with its message "Every filter needs a value" under the panel): `file.name == ''` from a half-built single row is a string filter, and the string path cannot be guarded without changing old configs. Parse errors show in FilterRow's own inline error (`FilterRow.svelte:43-45`), the same validator.

## Risks

- Local groups do not follow an external change to `rule.expression` while the row is mounted (rows are keyed by rule id; a config reload with Settings open keeps the old draft). Rare; not handled.
- An old string config with `status == ''` shows "Every filter needs a value" and the builder will not save edits until the row is finished, as ViewDialog blocks it. Its matching is unchanged.

## Defaults taken

- Label stays in the left column as "Filter"; FilterPanel's own "This view" header is kept, as ViewDialog with `showGlobal={false}` shows it.
- An empty builder saves `''` (matches nothing, count 0), as today.

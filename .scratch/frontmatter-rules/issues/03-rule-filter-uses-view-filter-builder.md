# 03: The rule filter uses the view filter builder

**What to build:** a rule's filter is edited with the same visual filter builder as a view, with "all", "any" and "none" groups, instead of the one-line expression field. The rule stores the same filter shape a view stores. Read `.scratch/frontmatter-rules/PRD.md` first.

**Blocked by:** 02 (same component)

**Status:** ready-for-agent

**Gate:** frontend only: `pnpm check` + `pnpm vitest run`.

### Behavior

1. **Data.** `AutoMoveRule.expression` widens from `string` to `FilterItem` (`CollectionFilter | string`, `src/lib/features/collection/collection.types.ts:4-13`). A string config loads unchanged. The generated lifecycle rules stay strings.
2. **Matching.** A string keeps today's path (`evaluateExpression` with `onError`, `auto-move.logic.ts:17-35`), so a broken rule is still reported. An object goes through `evaluateFilter` (`src/lib/features/collection/collection.logic.ts:317`): `and` all true, `or` at least one true, `not` none true, with groups combined by AND and nesting allowed. One engine: do not write a second filter evaluator.
3. **A broken or empty object filter matches nothing.** `evaluateFilter` returns false for a leaf it cannot parse (`collection.logic.ts:318-324`), and inside `not` that false becomes true (`:335-337`). `{}` and `{ and: [] }` are true for every note. And the builder adds a new row with an empty value (`createEmptyFilterRow`, `filter.logic.ts:282-290`). So an unfinished "none" row (`{ not: ["file.name == ''"] }`) would match every note while the rule is being built. Before evaluating an object filter, check it: no leaves, a leaf that fails `validateExpression`, or a row with a blank value means the rule matches nothing, and it is reported through `onError`. The same check gives the inline error in the row.
4. **UI.** `AutoMoveRuleRow.svelte` embeds `FilterPanel.svelte` (`src/lib/features/collection/toolbar/`) with `showGlobal={false}`, the way `ViewDialog.svelte:202-210` does. Pass its required props (`globalFilters`, `onGlobalFiltersChange`, `propertyIndex`; `FilterPanel.svelte:23-37`), with empty globals:
   - `viewFilters = parseFilterToGroups(rule.expression)`;
   - on change, save `filterGroupsToFilter(groups)` (`filter.logic.ts:94-180`);
   - `availableProperties` comes from `getAllKnownProperties(collectionStore.propertyIndex)`.
   
   A complex string the panel cannot show visually becomes a raw-expression row, as it does in views. An empty filter saves as `''`, which matches nothing, as today.
5. **Validation.** Each raw or string leaf is checked with the existing validator, and an error shows as it does today. The match count from Issue 02 works for object filters too.

### Docs

`22-auto-move.md`: the filter section shows the builder, the "all / any / none" groups, and one example of each. It says that `(A and B) or C` is written as a raw expression row: `(status == "done" && _type == "project") || file.hasTag("archive")`.

### Acceptance

- [ ] Failing test first, in `auto-move.logic.test.ts`: a rule whose expression is `{ or: ["status == 'done'", "status == 'dropped'"] }` matches a note with `status: dropped` and does not match one with `status: active`. It fails today: `findMatchingRule` only takes an expression string.
- [ ] `{ and: [...] }` and `{ not: [...] }` cases; a string rule still matches as before; a string rule that throws is still reported through `onError`.
- [ ] `{ not: ["status =="] }`, `{ not: ["file.name == ''"] }`, `{}` and `{ and: [] }` match no note and are reported through `onError`.
- [ ] `AutoMoveRuleRow.test.ts`: adding two rows in an "any" group saves `{ or: [..] }`; a stored string shows as one row; a complex string shows as a raw row and saves back unchanged.
- [ ] An old config with string expressions loads and matches as before.
- [ ] Frontend gate: `pnpm check` and `pnpm vitest run` pass.

## Notes

- `evaluateFilter` returns false on a parse error instead of throwing, which is why Behavior 2 keeps the string path.
- Research: `.scratch/frontmatter-rules/research/scout-01-expression-engine.md`, `validation-01.md`.

## Comments

Status: ready-for-agent

# Collection evaluator case-insensitive type equality lowercases BOTH operands

Severity: high. Found in the f57482e6 blast-radius audit.

## What to build

Commit f57482e6 added a case-insensitive `==` / `!=` branch for the `type` / `is_a`
identifier so `type == "person"` matches a vault storing `type: Person`. Intended scope
was narrow: relax case only for the type field, keep every other field case-sensitive.

Bug at `src/lib/features/collection/expression/evaluator.ts:240-244`:

```js
if ((op === '==' || op === '!=') && (isTypeIdentifier(left) || isTypeIdentifier(right))) {
    const ll = typeof l === 'string' ? l.toLowerCase() : l;
    const rr = typeof r === 'string' ? r.toLowerCase() : r;   // lowercases the OTHER operand too
    return op === '==' ? looseEqual(ll, rr) : !looseEqual(ll, rr);
}
```

When the type identifier is compared against another property identifier, that other
field's value is silently lowercased, making an unrelated field case-insensitive.

Repro (expression + note props -> result):
- `type == status` with `{type: 'PERSON', status: 'person'}` -> ACTUAL `true`, EXPECTED `false`
- Control `status == name` with `{status: 'PERSON', name: 'person'}` -> `false`

Propagates to `.collection` filters, auto-move rules, and templates (all route through
`evaluateBinary`). Verified against current source.

Fix direction: lowercase only the operand that IS the type identifier; compare the
other side as written. Or restrict the relaxed branch to identifier-vs-literal pairs
(skip when both sides are identifiers).

## Acceptance criteria

- [ ] `type == <otherField>` no longer lowercases the other field's value
- [ ] `type == "person"` still matches `type: Person` (original fix intact)
- [ ] Test: cross-field `type == otherIdentifier` (currently uncovered)
- [ ] Test: other operators (`<` `>` `contains` `matches`) stay case-sensitive for type
- [ ] Test: numeric/boolean type values, reversed `!=`
- [ ] `pnpm check` + `pnpm vitest run` green

## Blocked by

None. Related: 03-evaluator-type-equality-array-values-no-match (same branch).

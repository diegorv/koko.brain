Status: needs-info

# Collection evaluator type equality does not match array-valued type (multi-type notes)

Severity: medium. Found in the f57482e6 blast-radius audit.

## What to build

Commit f57482e6's case-insensitive `type` equality only handles scalar strings; it
punts on arrays.

Bug at `src/lib/features/collection/expression/evaluator.ts:241-243`:

```js
const ll = typeof l === 'string' ? l.toLowerCase() : l;   // array stays an array
const rr = typeof r === 'string' ? r.toLowerCase() : r;
return op === '==' ? looseEqual(ll, rr) : !looseEqual(ll, rr);
```

When the note's `type` is a list, the lowering is skipped and `looseEqual(array, string)`
coerces the array via toString:

Repro:
- `type == "person"` with `{type: ['Person']}` -> ACTUAL `false`, EXPECTED `true`
- `type == "person"` with `{type: ['Person','Place']}` -> `false`
- `type == "Person"` (exact) with `{type: ['Person']}` -> also `false`

So the zero-match bug the commit set out to fix survives for list-valued type. Verified
against current source.

Fix direction: when one operand is the type identifier and its value is an array, apply
the comparison element-wise (some-match, case-insensitive), mirroring methods.logic.ts
list `contains`.

## Acceptance criteria

- [ ] needs-info FIRST: confirm multi-valued `type` is a supported storage shape (Rust
      stores `is_a` as `Option<String>` single in entry.rs; raw frontmatter / TS
      `buildNoteRecord` can yield an array). If unsupported -> close as wontfix.
- [ ] If supported: `type == "person"` matches `{type: ['Person','Place']}`
- [ ] Test with array-valued type for `==` and `!=`
- [ ] `pnpm check` + `pnpm vitest run` green

## Blocked by

needs-info (multi-type supported?). Related: 01-evaluator-type-equality-lowercases-both-operands (same branch).

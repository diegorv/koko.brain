# Issue 13 discovery: object rule filter reports a leaf that fails at runtime

## Files that change

- `src/lib/features/collection/collection.logic.ts:323-347` (`evaluateFilter`): add an optional
  third parameter `onLeafError?: (err: unknown) => void`, called from the leaf `catch` before
  `return false`, and passed down the `and` / `or` / `not` recursion. A callback that throws
  aborts the whole evaluation. `evaluateFilterCached` (views, `executeQuery`) is not touched.
- `src/lib/features/auto-organize/auto-organize.logic.ts:69-74` (`ruleMatches`): pass
  `(err) => { throw err; }`, so the first failing leaf throws out of `ruleMatches`; the existing
  `catch` in `findMatchingRule` / `findMatchingRules` (lines 97-104, 124-130) skips the rule for
  that note and calls `onError` once. Update the `ruleMatches` JSDoc.
- `help/documentation/22-auto-organize.md:165-168`: replace the "counts as false ... Kokobrain does
  not report it yet (Issue 13)" bullet with the new behavior (the rule is skipped for that note
  and the failure is logged, in either form).

## Plan (test-first)

1. `src/tests/lib/features/auto-organize/auto-organize.logic.test.ts`, `describe('object filters')`
   (prior art: "a string rule ... that throws is still reported", line ~482): new cases
   `{ not: ["status.nosuch()"] }` and `{ not: ["status.lower() == 'x'"] }` on a note without
   `status` match nothing and report the rule once; the missing-property case still matches a
   note whose `status` is `'y'` (per-note skip, rule not marked broken); a nested leaf
   (`{ and: [{ not: [...] }] }`) is reported too. `countMatchingNotes` counts 0 for the nosuch
   filter (it uses `findMatchingRules`).
2. `src/tests/lib/features/collection/collection-logic.test.ts`, `describe('evaluateFilter')`:
   without a callback a throwing leaf is still false (inside `not`, true); with one, it is
   called with the error. `describe('executeQuery')`: a view filter `{ not: ["status.nosuch()"] }`
   still returns every record (views unchanged).
3. Implement, run both test files and `pnpm check`.

## Defaults taken

- "once per rule per session" in the triage amendment: read as one `onError` call per rule per
  evaluation (the evaluation stops at the first failing leaf), the same as a top-level string
  rule today. The service's logger (`auto-organize.service.ts:212-214`) is unchanged; adding a
  session dedupe would also change string-rule logging, which the amendment says to match.
- Parse errors in leaves also reach the callback; `filterProblem` already rejects them first, so
  this changes nothing observable for rules.

## Risks

- `countMatchingNotes` ("Matches N notes now") drops to 0 for such a filter on notes the leaf
  throws on. That is the matcher a save uses, so it is consistent.
- Views keep the false-on-throw semantics (optional callback, cached path untouched).

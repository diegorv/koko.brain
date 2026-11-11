# 13: An object rule filter reports a condition that fails at runtime

**What to build:** A rule whose filter is an object (`and` / `or` / `not`, Issue 03) runs through the Collection filter `evaluateFilter` (`src/lib/features/collection/collection.logic.ts:323-347`). A condition that parses but throws when evaluated, such as an unknown method (`status.nosuch()`) or a method on a property the note lacks (`status.lower() == 'x'` on a note without `status`), is caught there and counts as false. Inside `not`, false means the rule matches, so `{ not: ["status.nosuch()"] }` applies the rule to every note, with no `onError` report. The same condition as a top-level string rule is reported and matches nothing (`auto-move.logic.ts`, `ruleMatches`). `filterProblem` cannot catch it ahead of time: the evaluator's `validateExpression` does not check method calls.

**Blocked by:** 03

**Status:** needs-triage

## Questions for triage

- Where does the fix go? `evaluateFilter` is the shared Collection engine (PRD Decision 1: rules reuse it). One option: an optional `onLeafError` callback, which Auto Move turns into a thrown error so the rule matches nothing and is reported. Views would keep today's behavior.
- Should a note-specific failure (a method on a missing property) skip the rule for that note only, or mark the rule as broken? Today a top-level string rule is skipped per note.
- Should views report these too (the filter error a view shows), or stay silent?

## Notes

- **Origin:** review of Issue 03 (`.scratch/frontmatter-rules/work/03/review.md`, finding 2). The reviewer's probe: `{ not: ["status.nosuch()"] }` and `{ not: ["status.lower() == 'x'"] }` both matched a note without `status`, with no report.
- The help page (`help/documentation/22-auto-move.md`, Building the Filter) states the limit until this lands.

## Comments

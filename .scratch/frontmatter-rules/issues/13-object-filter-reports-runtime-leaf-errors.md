# 13: An object rule filter reports a condition that fails at runtime

**What to build:** A rule whose filter is an object (`and` / `or` / `not`, Issue 03) runs through the Collection filter `evaluateFilter` (`src/lib/features/collection/collection.logic.ts:323-347`). A condition that parses but throws when evaluated, such as an unknown method (`status.nosuch()`) or a method on a property the note lacks (`status.lower() == 'x'` on a note without `status`), is caught there and counts as false. Inside `not`, false means the rule matches, so `{ not: ["status.nosuch()"] }` applies the rule to every note, with no `onError` report. The same condition as a top-level string rule is reported and matches nothing (`auto-move.logic.ts`, `ruleMatches`). `filterProblem` cannot catch it ahead of time: the evaluator's `validateExpression` does not check method calls.

**Blocked by:** 06

**Status:** resolved

## Questions for triage (answered in the amendments above)

- Where does the fix go? `evaluateFilter` is the shared Collection engine (PRD Decision 1: rules reuse it). One option: an optional `onLeafError` callback, which Auto Move turns into a thrown error so the rule matches nothing and is reported. Views would keep today's behavior.
- Should a note-specific failure (a method on a missing property) skip the rule for that note only, or mark the rule as broken? Today a top-level string rule is skipped per note.
- Should views report these too (the filter error a view shows), or stay silent?

## Review amendments (2026-11-10)

From the scout and adversarial reviews in `.scratch/frontmatter-rules/research/issue-review-13*.md` and `issue-review-cross.md`. **These override the Behavior and Acceptance above where they differ.** The run order and the shared gates are in `PRD.md`, "Run order and gates for Issues 07-13".

**Triaged by the main session on 2026-11-10, overnight, with the Issue's own proposal. The owner may revisit:**
- Auto Move passes an optional `onLeafError` callback to `evaluateFilter`, which turns a leaf that throws into a reported failure of the whole rule for that note: the rule matches nothing on that note, and the error goes through `onError` once per rule per session;
- views keep today's behavior, because the callback is optional;
- a note-specific failure, such as a method on a missing property, skips the rule for that note only, as a top-level string rule does today. The rule is not marked broken.

Paths use the post-06 names (`features/auto-organize/`). Acceptance: `{ not: ["status.nosuch()"] }` and `{ not: ["status.lower() == 'x'"] }` on a note without `status` match nothing, and `onError` is called; a Collection view with the same filter behaves as before.

## Notes

- **Origin:** review of Issue 03 (`.scratch/frontmatter-rules/work/03/review.md`, finding 2). The reviewer's probe: `{ not: ["status.nosuch()"] }` and `{ not: ["status.lower() == 'x'"] }` both matched a note without `status`, with no report.
- The help page (`help/documentation/22-auto-move.md`, Building the Filter) states the limit until this lands.

## Comments

- 2026-11-10, branch `issue/13-object-filter-reports-runtime-leaf-errors`: `evaluateFilter` takes an optional `onLeafError`; Auto Organize uses it so a throwing leaf inside an object filter fails the whole rule for that note and reports via `onError` once per rule per session; views unchanged. Tests: `pnpm check` 0 errors; full suite at 1efee1797 exit 0 (609 files, 15094 passed, 54 skipped, 1 todo). Reviews: round 1 APPROVED, round 2 APPROVED (nit: Issue has no `- [ ]` criteria, so `relay review-ticks` exited 1 and ticked nothing; status left for the main session).

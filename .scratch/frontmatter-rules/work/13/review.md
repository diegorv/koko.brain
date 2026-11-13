VERDICT: APPROVED

Review of `git diff main...HEAD` (c3dff5c88, f7491ec83, c3895bac6) for Issue 13.

## Acceptance criteria

The Issue has no `- [ ]` checklist. Its acceptance is the prose line in "Review amendments (2026-11-10)", checked below outside the checklist format:

- `{ not: ["status.nosuch()"] }` on a note without `status` matches nothing and `onError` is called: met. `ruleMatches` (src/lib/features/auto-organize/auto-organize.logic.ts:73-80) passes a rethrowing `onLeafError`; the existing catch in `findMatchingRule` (:104-108) and `findMatchingRules` (:128-132) skips the rule and calls `onError` once. Tests: auto-organize.logic.test.ts "an unknown method inside not" and "findMatchingRule reports it too".
- `{ not: ["status.lower() == 'x'"] }` on a note without `status` matches nothing and `onError` is called: met. Test "a method on a missing property inside not".
- Note-specific failure skips the rule for that note only, not marked broken: met. Test "still matches a note the leaf does not throw on" (status 'y' matches, no report).
- A Collection view with the same filter behaves as before: met. `executeQuery` uses `evaluateFilterCached` (collection.logic.ts:169-172, 359-386), untouched; test "counts a filter leaf that throws when evaluated as false, so not keeps every record" returns 4 records, no `filterError`. `evaluateFilter` without a callback keeps false-on-throw (test "without an onLeafError callback").

## Checks run by the reviewer

- `pnpm check`: exit 0, 0 errors, 0 warnings.
- `pnpm vitest run src/tests/lib/features/auto-organize/ src/tests/lib/features/collection/ src/tests/help/auto-organize-doc-examples.test.ts`: exit 0, 40 files, 1395 tests passed. The verdict rests on these, in particular `auto-organize.logic.test.ts`, `collection-logic.test.ts`, `toolbar/filter-logic.test.ts` and `auto-organize-doc-examples.test.ts`. The full suite is deliver's to run.
- Throwaway probe (deleted, not committed), through `findMatchingRules`:
  - Every builder-row leaf form on a note without the property (`contains`, `!contains`, `startsWith`, `endsWith`, `isEmpty`, `!isEmpty`, `==`, `!=`, `>`, `file.hasTag`, `file.inFolder`) inside `{ or: [leaf, 'true'] }` matched with no report, so rules built in the builder do not start failing.
  - `{ or: ['true', bad] }` matches without a report and `{ and: ['false', bad] }` matches nothing without a report (short-circuit), the same as the string form `true || bad`.
  - `{ not: ['status.nosuch()', 'status.nosuch2()'] }` reports once (the first leaf stops the evaluation).
  - `countMatchingNotes({ not: ["status.lower() == 'x'"] })` over a note without status and one with 'y' gives 1.
- Only caller of `evaluateFilter` in `src/lib` is `ruleMatches`; the optional third parameter changes no other call site.
- No layer-baseline or composition-root change. No `src-tauri/` change.
- Help page (help/documentation/22-auto-organize.md:165-167): the old "known problem, Issue 13" text is gone and no other stale reference remains in `help/`, `src/lib` or `docs/`. The new text matches the code and the tests.

## Findings

1. minor, src/lib/features/auto-organize/auto-organize.service.ts:212-214: the triage line "the error goes through onError once per rule per session" is implemented as once per rule per evaluation. The service logger calls `error()` (console and Sentry) on every save of every note the leaf throws on. Builder filters that used to fail silently now log on each save. This matches today's string rules, which the amendment also says to match, and the acceptance line only says "`onError` is called", so it does not block. Fix: none in this Issue. Record the reading in the delivery so the owner can open a follow-up for a session dedupe that covers string and object rules alike (the `reportedWriteFailures` pattern at auto-organize.service.ts:49, 325-333, 350).
2. nit, src/lib/features/collection/collection.logic.ts:324-326: the `evaluateFilter` JSDoc names a caller ("Auto Organize does this so ..."). That is a fact about another module, which goes stale if the caller changes. Fix: keep the contract ("a callback that throws stops the whole evaluation") and drop the caller sentence, or leave it as is.
3. nit, .scratch/frontmatter-rules/issues/13-object-filter-reports-runtime-leaf-errors.md: `relay review-lint` fails with "relay: no acceptance criteria in .scratch/frontmatter-rules/issues/13-object-filter-reports-runtime-leaf-errors.md" (exit 1). The Issue has no `- [ ]` checklist, only the prose acceptance line in the amendments, so the review cannot hold a verbatim checklist. Fix: deliver notes it; later Issues should carry their acceptance as `- [ ]` lines.

## Resolution

1. Not changed in this Issue, as the finding proposes. `onError` fires once per rule per evaluation, the same as string rules today; a session dedupe covering string and object rules alike (the `reportedWriteFailures` pattern in auto-organize.service.ts) is left for an owner follow-up.
2. Fixed: the `evaluateFilter` JSDoc keeps the contract (a throwing callback stops the evaluation, so a failing leaf inside `not` cannot turn into a match) and no longer names its caller.
3. Noted: the Issue carries its acceptance as a prose line, not `- [ ]` lines, so `relay review-lint` and `review-ticks` find no checklist. Later Issues should list acceptance as `- [ ]` lines.

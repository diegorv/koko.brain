# 27: Numeric <, <=, > and >= filters never match a note that lacks the property

**What to build:** compareValues (src/lib/features/collection/expression/evaluator.ts:708-715) falls back to `toNumber(a) - toNumber(b)`, and toNumber maps null/undefined to 0 (:627-631). A missing property resolves to null (:620), so `missing < 3` is `0 - 3 < 0`, which is true, and the note is listed. The date branch already treats null as NaN, so every comparison is false (dateOperandTime, :689-701). Give the plain number branch the same rule: when either operand is null or undefined, every ordering comparison is false. Arithmetic (`missing + 5`, pinned at evaluator.test.ts:592-594) and `==`/`!=` stay as they are. Sorting uses compareForSort in collection.logic.ts and is not affected.

**Blocked by:** none

**Status:** ready-for-agent

**First wave:** yes, added by the owner on 2026-11-06 after the challenge review (`raw/first-wave-challenge.json`).

**Gate:** frontend only: `pnpm check` + `pnpm vitest run`.

- [ ] Failing test first, in src/tests/lib/features/collection/expression/evaluator.test.ts: with makeCtx() and no `missing` property, evaluateExpression('missing < 3'), 'missing <= 3', 'missing >= 0' and 'missing > -1' all return false. It fails today.
- [ ] executeQuery with the filter `priority < 3` over notes with priority 1, priority 5 and no priority returns only the priority-1 note (a case in src/tests/lib/features/collection/collection-logic.test.ts).
- [ ] Numbers that are present compare as before, and `missing + 5` still evaluates to 5.
- [ ] Date comparisons keep their current behavior (the date-operand tests still pass).
- [ ] Frontend gate: pnpm check and pnpm vitest run pass.

## Notes

- **Priority:** daily use and UI correctness (bucket 2-ux). Upheld ux/medium. A daily view lists the wrong notes, and no test pins the current ordering.
- **Trigger:** A view, rail view list or inline collection block filters a number property that some notes do not set, e.g. `priority < 3` or `estimated_hours <= 2` from the Filter panel's number operators.
- **Evidence (verified by reading code at `5f8003d67`):** src/lib/features/collection/toolbar/filter.logic.ts:63-70: the number operators gt/lt/gte/lte emit `prop < value`, and getOperatorsForType offers them for numbers (:187). evaluator.ts:282-285 sends <, <=, >, >= to compareValues. evaluator.ts:620 resolves a missing property to null. evaluator.ts:708-715: compareValues only guards Dates, then returns toNumber(a) - toNumber(b). evaluator.ts:627-631: toNumber(null) is 0. evaluator.ts:689-701: the date path returns NaN for null, so that path is already safe. collection.logic.ts:161-170: executeQuery keeps every record whose filter is truthy. evaluator.test.ts:626 pins only `missing == 0` as false; no test covers the ordering operators with a missing operand. git log on evaluator.ts shows no later fix.
- **Second opinion:** upheld (ux, medium). Confirmed. compareValues (evaluator.ts:708-715) guards only Dates and otherwise returns toNumber(a) - toNumber(b), and toNumber(null) is 0 (:627-631), so `missing < 3` is true. The collection-logic.test.ts fixtures all set priority, and evaluator.test.ts pins only `missing == 0` and `missing + 5`, so no test pins the current ordering behavior. The view lists the wrong notes, nothing is written. Corrections to apply while implementing: Category ux, not content.
- **Source:** audit 2026-11-05, domain `views`, finding `N-views-02` (from views-ux-2). Size S.

## Comments

- 2026-11-06: added to the first wave by the owner after the challenge review.

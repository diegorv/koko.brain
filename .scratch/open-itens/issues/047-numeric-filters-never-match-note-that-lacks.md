# 047: Numeric <, <=, > and >= filters never match a note that lacks the property

**Origin:** `audit-2026-11-05` Issue 27, moved here on 2026-11-08. Its PRD, raw evidence and closed siblings stay in `.scratch/archived/audit-2026-11-05/`. Bare Issue numbers in the text below use that feature's numbering; `priority-2026-11-08.md` in this folder maps them to the numbers here.

**What to build:** compareValues (src/lib/features/collection/expression/evaluator.ts:718-725) falls back to `toNumber(a) - toNumber(b)`, and toNumber maps null/undefined to 0 (:634-639). A missing property resolves to null (resolvePropertyPath, :614-631), so `missing < 3` is `0 - 3 < 0`, which is true, and the note is listed. The date branch already treats null as NaN, so every comparison is false (dateOperandTime, :685-693). Give the plain number branch the same rule: when either operand is null or undefined, every ordering comparison is false. Arithmetic (`missing + 5`, pinned at evaluator.test.ts:626-629) and `==`/`!=` stay as they are. Sorting uses compareForSort in collection.logic.ts, and the rail sort its own compareValues in list-sort-compare.logic.ts; neither is affected.

The same evaluator decides which notes an Auto Organize rule matches (auto-organize.logic.ts imports evaluateExpression and evaluateFilter, :11-17), and those rules move and rename files. The fix therefore also stops a rule like `priority < 3` from moving notes that have no `priority`. That is the intended behavior there too, and it gets its own test.

**Blocked by:** 068

**Status:** ready-for-agent

**Answered:** 2026-11-12, owner: approved as an addition to the queue; blocked by 068, in the views chain.

**First wave:** yes, added by the owner on 2026-11-06 after the challenge review (`raw/first-wave-challenge.json`).

**Gate:** frontend only: `pnpm check` + `pnpm vitest run`.

- [ ] Failing test first, in src/tests/lib/features/collection/expression/evaluator.test.ts: with makeCtx() and no `missing` property, evaluateExpression('missing < 3'), 'missing <= 3', 'missing >= 0' and 'missing > -1' all return false. It fails today.
- [ ] executeQuery with the filter `priority < 3` over notes with priority 1, priority 5 and no priority returns only the priority-1 note (a case in src/tests/lib/features/collection/collection-logic.test.ts).
- [ ] In src/tests/lib/features/auto-organize/auto-organize.logic.test.ts: a rule with the expression `priority < 3` matches a note with priority 1 and does not match a note without `priority` (findMatchingRule returns null). It fails today.
- [ ] Numbers that are present compare as before, and `missing + 5` still evaluates to 5.
- [ ] Date comparisons keep their current behavior (the date-operand tests still pass).
- [ ] Frontend gate: pnpm check and pnpm vitest run pass.

## Notes

- **Priority:** daily use and UI correctness (bucket 2-ux). Upheld ux/medium-low to medium. A view lists the wrong notes, and no test pins the current ordering. How often it bites depends on whether the owner's views compare numbers on sparse properties.
- **Trigger:** A view, rail view list, inline collection block or Auto Organize rule filters a number property that some notes do not set, e.g. `priority < 3` or `estimated_hours <= 2` from the Filter panel's number operators.
- **Visible consequence:** `not` around an ordering comparison flips with it. `!(priority < 3)` and a Filter panel `not` group now match notes without `priority`, where today they do not. That follows from "every ordering comparison is false" and needs no special case.
- **Series:** views chain, after 068: edits evaluator.ts, which 010, 067 and 098 also edit, and adds tests to collection-logic.test.ts, which 010, 067 and 068 also edit. Never run it beside 010, 067, 068 or 098.
- **Evidence (verified by reading code at `5f8003d67`, re-checked at `3ab6de999`):** src/lib/features/collection/toolbar/filter.logic.ts:63-70: the number operators gt/lt/gte/lte emit `prop < value`, and getOperatorsForType offers them for numbers. evaluator.ts:284-287 sends >, <, >=, <= to compareValues. evaluator.ts:614-631 resolves a missing property to null. evaluator.ts:718-725: compareValues only guards Dates and two strings, then returns toNumber(a) - toNumber(b). evaluator.ts:637: toNumber(null) is 0. evaluator.ts:693: the date path returns NaN for null, so that path is already safe. collection.logic.ts executeQuery keeps every record whose filter is truthy. evaluator.test.ts:660 pins only `missing == 0` as false; no test covers the ordering operators with a missing operand. git log on evaluator.ts shows no later fix.
- **Second opinion:** upheld (ux, medium). Confirmed. compareValues guards only Dates and otherwise returns toNumber(a) - toNumber(b), and toNumber(null) is 0, so `missing < 3` is true. The collection-logic.test.ts fixtures all set priority, and evaluator.test.ts pins only `missing == 0` and `missing + 5`, so no test pins the current ordering behavior. The view lists the wrong notes, nothing is written. Corrections to apply while implementing: Category ux, not content.
- **Source:** audit 2026-11-05, domain `views`, finding `N-views-02` (from views-ux-2). Size S.

## Comments

- 2026-11-06: added to the first wave by the owner after the challenge review.
- 2026-11-12: deep dive (validate-s1+s2, cross-tests-relay M9, cross-order-files M6). Added the Auto Organize criterion, since auto-organize.logic.ts uses the same evaluator to move files. Blocked by 068 and placed in the views chain. Line references refreshed (compareValues moved to :718-725), and the `not` consequence noted.

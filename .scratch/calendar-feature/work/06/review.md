VERDICT: CHANGES_REQUESTED

# 06 review: time-grid layout helpers

Reviewed `git diff main...HEAD` at 0980e35e (commits 0a557cd6, 38cfb70b, 0980e35e).

The source is a faithful port of the prototype. A line-by-line compare of `event-calendar-layout.logic.ts:49-77` with `calender-app-design/src/components/calendar/layout.ts:20-48` shows the same algorithm, with only the types renamed. The one blocking gap is in the tests. The touching-events case passes even when the touching rule is broken, so the "end equals start does not overlap" contract is not pinned (finding 1).

## Test verdict rests on

- `src/tests/lib/features/event-calendar/event-calendar-layout.logic.test.ts` (new, 24 tests)
- `src/tests/lib/features/event-calendar/event-calendar-dates.logic.test.ts` (same directory, unchanged; run as a neighbour)
- Run by me: `./node_modules/.bin/vitest run src/tests/lib/features/event-calendar/` gives 2 files and 59/59 passed. `pnpm check` gives 192 files, 0 errors, 0 warnings.
- Mutation probe (scratchpad copy, no source touched). I ran the 24 tests against two mutated copies of `layoutDay`, and all 24 still passed against both:
  - A: `event.start >= clusterEnd` changed to `>` (line 64)
  - B: `end <= event.start` changed to `<` (line 65)

## Acceptance criteria

- [x] Port of `layout.ts:4-48` with no framework imports, JSDoc on every export, and all 8 named exports. Met. The only import is `import type` from `./event-calendar.types` (`event-calendar-layout.logic.ts:8`). The constants are at `:11,14,17,20`, and `MIN_COLUMN_PX` 96 matches `time-grid.tsx:32` (`MIN_COLUMN = 96`). The functions are at `:23,26,29,49`. Every export has a JSDoc block. The code is tab-indented.
- [x] `layoutDay` uses first-fit columns and one width per cluster. Met. See `:63-75`, where `findIndex` gives first-fit and `flush` gives one shared `columns`. The tests at `test.ts:75-88` (chained) and `:68-73` (three columns) assert this.
- [x] `floorToSnap` and `clampMinutes(n, min, max)` are exported from this file. Met (`:32`, `:39`).
- [x] `clampMinutes` lets max win, and the file does not use `$lib/utils/clamp`. Met. `:39` is `Math.min(max, Math.max(min, n))`. `$lib/utils/clamp` is not imported anywhere in the diff.
- [x] A test proves the 1430 resize clamps to 1440. Met (`test.ts:202-206`, plus the inverted-bounds case at `:198-200`).
- [x] The 3 prototype cases are ported. Met. `test.ts:35-54` matches `layout.test.ts:16-33` value for value.
- [ ] The tests cover empty input, touching events, 3+ columns, a chained cluster, and zero-length and inverted input. Partially met:
  - Covered: empty (`:57-59`), 3 columns (`:68-73`), chained (`:75-88`), zero-length (`:105-119`), inverted (`:121-136`).
  - Not met: the touching case (`:61-66`) asserts `{ column: 0, columns: 1 }` for both events. Those values do not change whether touching events are treated as overlapping or not, so the test cannot fail on the property it names (finding 1).
- [ ] Gate green, and one commit in the full format. Pending. The deliver step runs the gate. Commit 38cfb70b already has Context, Problem, Solution, Behavior, Files with line ranges, and the Co-Authored-By trailer. Its ticket references (09 drag, 22 time grid) match the issue files.

## Findings

1. **Medium.** `src/tests/lib/features/event-calendar/event-calendar-layout.logic.test.ts:61-66`. The touching-events test is vacuous. With two touching events and nothing else, the second one gets column 0 and the cluster has 1 column under every variant of the boundary rule. Mutation A (cluster flush `>=` to `>`, `logic.ts:64`) and mutation B (column reuse `<=` to `<`, `logic.ts:65`) both pass all 24 tests. Ticket 22 (time grid) and ticket 09 (drag) depend on back-to-back meetings staying full width, and nothing currently pins that.
   - **Fix:** add two cases where the boundary changes the result.
     - Cluster boundary: `a(540,600)`, `b(560,600)`, `c(600,660)`. Expect `c` to be `{ column: 0, columns: 1 }` and `a`/`b` to have `columns: 2`. Mutation A gives `c` `columns: 2`.
     - Column reuse inside a cluster: `a(540,720)`, `b(540,600)`, `c(600,660)`. Expect `c` to be `{ column: 1, columns: 2 }`. Mutation B gives column 2 and `columns: 3`.
   - Keep or fold in the existing test. Re-run the file and confirm that each mutation now fails.
2. **Low.** `src/tests/lib/features/event-calendar/event-calendar-layout.logic.test.ts:131`. The test name "ends its cluster at its start" does not match the code. `clusterEnd` becomes the event's end (500), not its start (600) (`logic.ts:73`). The behaviour is equivalent only because the sort guarantees that later events start at 600 or later.
   - **Fix:** rename it, for example to "gives a lone inverted event one column and lets the next event start a new cluster".

## Not findings (checked)

- Zero-length and inverted events are left as the prototype handles them. This is safe because the Task 6 projection rejects `end <= start` ("crosses-midnight", plan line 152), so `layoutDay` never sees such events in production. The tests pin the prototype behaviour without endorsing it.
- No scope creep. The diff is the two new files plus the scratch notes. There is no UI change and no change to existing code. `PositionedEvent` is reused from the types file, not redefined.
- Layer rules: the module is a feature `.logic.ts` with a type-only import and no state or side effects. The error-handling rules do not apply (pure arithmetic).

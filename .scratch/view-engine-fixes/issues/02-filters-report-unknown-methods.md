# 02: Filters report unknown methods and per-note failures

**What to build:** `validateExpression` checks only parsing and plain function names (`src/lib/features/collection/expression/evaluator.ts:300-332`). Methods dispatch on the value's runtime type and throw when absent (`methods.logic.ts:255-269`), and `evaluateFilterCached` turns a throw into `false` (`collection.logic.ts:347-358`). So `file.hasLink('x')`, `x.reverse()`, or `status.lower()` over a numeric `status` drop notes, or all of them, with no error, in the rail, the editor and inline blocks. Inside `not:` the same failure keeps the note instead (`:370-371`).

- `validateExpression` checks method names against every name a call can reach, and reports `Unknown method "<name>"`. That is more than `methodRegistry` (`methods.logic.ts`): list `filter` and `map` are handled in the evaluator (`evaluator.ts:490`, `:508`), and the `file.` methods `hasTag`, `inFolder`, `hasProperty`, `asLink` sit in `evaluator.ts:563-584`. Missing one of these would turn a working view into an error.
- `executeQuery` returns how many records threw. The rail list, the `.view` tab and inline blocks show "N notes could not be evaluated" next to the count. The view-editor preview gets it through `queryViewLens`.

**Blocked by:** none

**Status:** ready-for-agent

**Gate:** frontend: `pnpm check` + `pnpm vitest run`.

- [ ] Failing tests first:
  - `src/tests/lib/features/collection/expression/` (the evaluator test file): `validateExpression("file.hasLink('x')")` and `validateExpression("x.reverse()")` return a reason. `status.lower()`, `tags.filter(value != 'x')`, `tags.map(value)`, `file.hasTag('a')`, `file.inFolder('/v')`, `file.hasProperty('a')` and `file.asLink()` return none.
  - `src/tests/lib/features/collection/collection-logic.test.ts`: `status.lower() == 'a'` over records where one `status` is a number reports one failure.
  - `src/tests/lib/features/rail-shell/RailNoteList.view.test.ts`: the rendered text "1 note could not be evaluated".
  - The `.view` tab count: in `src/tests/lib/features/collection/CollectionView.test.ts`, not `CollectionView.view-writes.test.ts`, which view-editor 01 edits in parallel.
- [ ] `help/documentation/12-collection.md` § Expression Language Reference: unknown methods are errors; per-note failures are counted.
- [ ] `docs/agents/view-files.md` § Filter expressions: update the "(changes: view-engine-fixes/02)" item.

## Notes

- **Runs before (other feature):** view-editor 03 and 04, which extend `queryViewLens` and edit `RailNoteList.svelte`. Never run it in parallel with them. It can run in parallel with view-editor 01 (no shared file).
- Shares `collection.logic.ts` with 03, 04 and 08, and `CollectionView.svelte` with 01, which runs after this one.
- Visible change: a view whose filter calls a method that does not exist lists 0 notes today and shows a filter error after this, which also hides the rail's Sort and Filter (`RailNoteList.svelte:192`). Such a view is already broken, so this is ready-for-agent; 08 differs because the shapes it turns into errors list notes today.
- **Size:** M.

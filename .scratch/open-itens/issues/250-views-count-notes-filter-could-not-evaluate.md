# 250: Views say how many notes their filter could not evaluate

**Origin:** split from Issue 010 on 2026-11-12 (deep dive `research/deep-dive-2026-11-12/`, refute-010 Must-fix 1). 010 was `view-engine-fixes` Issue 02; its PRD and raw evidence stay in `.scratch/archived/view-engine-fixes/`.

**What to build:** a method that exists but not for one note's value type throws on that note (`methods.logic.ts:255-269`), and `evaluateFilterCached` turns the throw into `false` (`src/lib/features/collection/collection.logic.ts:359-386`, catch at `:368-370`). So `status.lower() == 'a'` silently leaves out every note whose `status` is a number, a list or missing, and nothing tells the user. `executeQuery` returns `{ records, columns }` with no failure count (`:223`). Show "N notes could not be evaluated" next to the count in the rail list, the `.view` tab and inline blocks.

What counts as a failure is not defined, and each answer changes the number the user sees:

- A missing property resolves to `null` (`evaluator.ts:616-630`), no registry exists for `null` (`methods.logic.ts:51-57`), so `status.lower()` throws on every note that has no `status`. A view that looks right could report hundreds of notes.
- `and:` items short-circuit (`collection.logic.ts:377-378`). `and: ["status.lower() == 'a'", "_type == 'Project'"]` throws on every note without `status`; the reverse order throws only on Projects. A count taken per leaf depends on item order.
- The property index holds `.view` records, type definitions, system-folder notes and archived notes. The row rule removes them only after the filter (`src/lib/features/rail-shell/lens.logic.ts:717-734` `viewRowSet`, `:749-762` `blockRowSet`), so a count taken in the filter loop includes records the user never sees.
- Inside `or:` beside a true item, or inside `not:`, a throwing leaf does not exclude the note: it is listed today.

Proposed definition (the deep dive's recommendation, not yet an owner decision):

- `executeQuery` returns `unevaluatedCount: number` on `QueryResult` (`collection.types.ts:107-117`, JSDoc required). A record counts when at least one filter leaf threw on it and the filters then excluded it. A record that a throwing leaf does not exclude (`or:` beside a true item, `not:`) is not counted.
- Count after the row rule: run the failed records through the same `rowSet` with `{ ...view, limit: undefined }`, so `.view` files, type definitions, system-folder notes and archived notes the filter does not cite never count. With no `rowSet`, count them all.
- A missing property counts, and `and:` order changes the count; the help says both and suggests guarding with `!isEmpty(x)`. Dispatch is not changed: Auto Organize relies on the throw so a `not:` rule does not match notes that lack the property (`auto-organize.logic.ts:64-80`).
- Text: `1 note could not be evaluated` / `N notes could not be evaluated`; nothing at 0. The rail list shows it outside the header count span, which is hidden below 12rem (`RailNoteList.svelte:725`). The `.view` tab shows it in its own element after `{n} results` (`CollectionView.svelte:587`); the test helper `resultsText()` (`CollectionView.test.ts:622-623`) matches a span ending in `results`, so the text must not join that span. The inline block shows it beside `cm-lp-collection-error` (`collection-block-widget.ts:138-146`); the count rides in the cached `QueryResult`, with no new cache (`docs/agents/live-preview-rules.md` rule 2). `queryViewLens` returns it on `ViewQueryResult` (`lens.logic.ts:775-823`) for 131's preview, and `resolveViewLens` on `ResolvedLens`.

**Blocked by:** 010

**Status:** needs-info

**Answered:** owner, 2026-11-12: split out of 010 as its own needs-info Issue. Open: which records count. The owner accepts or changes the proposed definition above (count after the row rule; a missing property counts; `or:`/`not:` survivors do not), then this Issue becomes ready-for-agent.

**Gate:** frontend: `pnpm check` + `pnpm vitest run`.

Criteria for the proposed definition; adjust them to the owner's answer:

- [ ] Failing tests first, in `src/tests/lib/features/collection/collection-logic.test.ts`:
  - `status.lower() == 'a'` over records where one `status` is a number gives `unevaluatedCount === 1`, and the other records evaluate normally.
  - A record on which two leaves throw counts once. Nothing threw: the count is 0.
  - `or: [throwing, "true"]` and `not: [throwing]` keep the row and do not count it.
  - With a row set that drops them, a `.view` record and an archived record that throw are not counted.
- [ ] `src/tests/lib/features/rail-shell/lens.logic.test.ts`: `queryViewLens(...).unevaluatedCount` and `resolveViewLens(...)` pass the count through.
- [ ] `src/tests/lib/features/rail-shell/RailNoteList.view.test.ts`: `[data-note-list-unevaluated]` renders "1 note could not be evaluated", and the matching notes and the toolbar still show.
- [ ] `src/tests/lib/features/collection/CollectionView.test.ts` (not `CollectionView.view-writes.test.ts`): the `.view` tab shows the text, and `resultsText()` still reads `{n} results`.
- [ ] `src/tests/lib/features/collection/collection-block-widget.test.ts`: the block shows the text, also on a cache hit (a second `toDOM()`).
- [ ] `help/documentation/12-collection.md` § Expression Language Reference: per-note failures are counted, a missing property counts, and how to guard against it.
- [ ] `docs/agents/view-files.md:137`: the note is still left out but now counted; drop the `(changes: open-itens/250)` marker.

## Notes

- **Read first:** `docs/agents/live-preview-rules.md` for the inline block change.
- **Blocker:** after 010, an unknown method name is a filter error, so this count measures only per-value failures. Both Issues also edit `view-files.md:137` and the same help section.
- **Runs before:** 131, whose preview shows this count (`131-sections-and-live-preview.md:27`, `:51`). 131's Blocked by lists only 011 today; add 250 there.
- **Series:** touches the `executeQuery` filter loop (the per-record hot path: keep the added work to a flag per record), `collection.types.ts`, `lens.logic.ts`, `rail-shell.types.ts`, `RailNoteList.svelte`, `CollectionView.svelte`, `collection-block-widget.ts` and the live-preview `styles.ts`. Run it in series with the views chain (009, 012, 067, 068) and with 131 and 132, never in parallel.
- **Size:** M.

## Comments

- 2026-11-12: created from Issue 010's second half by the deep dive (refute-010 Must-fix 1, cross-tests-relay M8). Status needs-info until the owner defines what counts. The proposed definition and its tests are refute-010's fallback text.

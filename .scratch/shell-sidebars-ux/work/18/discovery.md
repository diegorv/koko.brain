# Issue 18 discovery: shared roving-list util, arrow keys in Search results

No `spec.md` in the feature folder; the Issue is the source. Line numbers at `11185510a`.

## Files that change

- New `src/lib/utils/roving-list.ts` (pure, no imports): `resolveRovingFocus(input): number | null` (ArrowUp/ArrowDown clamped, Home, End; null when `!onRow`, Meta/Ctrl/Alt/Shift held, `count === 0`, or any other key), plus `nextCurrentRow` and `tabStopRow` moved verbatim from `tasks-keys.logic.ts:72-112`.
- `src/lib/features/tasks/tasks-keys.logic.ts:46-112`: `resolveTaskKey` keeps its guard order (onRow/meta/ctrl/alt/count, then Shift+F10, ContextMenu), takes the focus case from `resolveRovingFocus`, keeps Space/Enter. `nextCurrentRow` and `tabStopRow` re-exported from the util (same names and signatures, so `TasksView.svelte:83` is untouched).
- `src/lib/features/search/SearchResult.svelte:17-27,136`: new `tabindex` prop passed to the card `<button>`.
- `src/lib/features/search/SearchPanel.svelte`
  - `:41-44` `handleKeydown`: Escape with a non-empty query clears it (`searchStore.setQuery('')`, focus stays); with an empty query blurs (as today). Bare ArrowDown with results shown focuses the first row (preventDefault).
  - `rowKeys` derived per mode (`ftsResult.path` / `result.filePath` / `semanticResult.key` / `hybridResult.path`, same branch as the `{#each}` at `:218-236`); `currentKey` state set on `focusin`; `tabStopKey = tabStopRow(rowKeys, rowKeys, currentKey)`; each `SearchResultItem` gets `tabindex={key === tabStopKey ? 0 : -1}`.
  - `onkeydown` on `[data-search-result-list]` (`:213`): row = `[data-search-result] > button:first-child` (the Show in Calendar button is a sibling, not a row). ArrowUp on row 0 with no modifier focuses the input; otherwise `resolveRovingFocus`, preventDefault, focus row. Bare, non-repeat Enter on a row: preventDefault + `click()`.
- `help/documentation/06-search-and-navigation.md:90`: the Escape sentence.
- `e2e/specs/search.spec.ts:39-51`: two Escapes (first clears and keeps focus, second leaves the input, Search still shown), rail-item tail kept.

## Tests

- New `src/tests/lib/utils/roving-list.test.ts`; copy the cases from `src/tests/lib/features/tasks/tasks-keys.logic.test.ts:28-161` (focus, clamping, modifiers, count 0, onRow, `nextCurrentRow`, `tabStopRow`). Tasks tests untouched.
- `src/tests/lib/features/search/SearchPanel.test.ts`: three FTS results, keydown dispatch as at `:153-163`; Escape tests next to it (that case stays as written).
- `src/tests/lib/architecture/pure-logic.test.ts` covers the util automatically (`utils/*.ts` is a pure start).

## Risks

- Enter: jsdom does not turn Enter on a button into a click, and the browser does on keydown. Handling bare Enter in the list handler with preventDefault keeps one click in both, and drops the repeat clicks of a held Enter. Modified Enter (Cmd+Enter, ticket 31) is left native.
- Show in Calendar button stays its own Tab stop (only on event notes); out of the Issue's scope.
- `currentKey` that leaves the list falls back to the first row (`tabStopRow` with `order === rendered`); no `nextCurrentRow` follow-focus for Search, since a new query replaces the whole list.

## Defaults taken

- ArrowDown in the input only acts when result rows are rendered and no modifier is held; it focuses the first row, not the remembered tab stop (the Issue says "the first result").
- Escape on a focused result does nothing new.

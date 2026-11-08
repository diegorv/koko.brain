# 04 discovery

No `spec.md`; `PRD.md` § Writes: "A toolbar write sends only the key it changed. If that key changed on disk since it was read, the write is refused and the toolbar shows the file's value." Builds on Issue 03's `rewriteViewFile` (`work/03`).

## Files that change

- `src/lib/features/type-definitions/type-note-list.logic.ts:121-139`: `buildViewYamlUpdates` goes. New `ToolbarKey = 'filters' | 'viewFilters' | 'sort'`, `canonicalToolbarValue(key, raw)` (filters: `filterGroupsToFilter(parseFilterToGroups(raw))`; sort: `raw ?? []`; then JSON with keys sorted at every level), `toolbarKeyBase(definition, key)` (the raw key read from `definition` / its `railViewIndex` view, through `canonicalToolbarValue`), `applyToolbarEdit(yaml, key, next, base)` -> `{ ok: true, yaml } | { ok: false, reason: 'conflict' } | { ok: false, reason: 'invalid', error }`: `parseCollectionYaml`, `railViewIndex` from those bytes, compare, then `updateCollectionYaml` with only that key and `viewIndex`.
- `src/lib/features/type-definitions/type-definitions.service.ts:483-492`: `updateViewQuery` goes; `updateViewToolbarKey(path, key, next, base)` runs `applyToolbarEdit` as the `rewriteViewFile` transform (throws `ViewWriteConflict` / `Error`), then `refreshViewDefinition` and returns the definition.
- `src/lib/features/rail-shell/RailNoteList.svelte:148,227,251-310,317-330`: drop `viewRunIndex`; `toolbarBase` set at reseed (`:252-258`) and advanced in `persistViewState(key)` before the queued write; handlers pass their key; after the last pending save, another key whose `toolbarKeyBase` differs from local state -> `stepSeed({ kind: 'save-failed' })`; `ViewWriteConflict` toasts "This view changed. Your edit was not saved."
- `src/lib/features/rail-shell/lens.logic.ts:745-746,780`: drop `ViewQueryResult.viewIndex` (only read at `RailNoteList.svelte:266`).
- Comments naming `updateViewQuery`: `view-parse-cache.ts:24`, tests' headers.

## Tests

- `type-note-list.logic.test.ts`: replace `buildViewYamlUpdates` block with `toolbarKeyBase` / `applyToolbarEdit` (sort edit keeps `and: [x]` and unknown keys; reorder on disk writes the `_rail_view` view; `or`-then-`and` groups do not self-conflict on a second edit; conflict; invalid YAML).
- `RailNoteList.view.test.ts` (real cache, parser, writer; disk mocked): three component cases from the Issue.
- `type-definitions.service.test.ts`: drop the `updateViewQuery` block and its `yaml-parser` mock; the two owner tests that used it as vehicle move to `updateViewIcon`.
- `update-view-query-cache.test.ts` -> `update-view-toolbar-key.service.test.ts`: cache holds the post-write definition; conflict rejects with `ViewWriteConflict`, nothing written.
- `lens.logic.test.ts:1570-1586`, `help/type-definitions-views.test.ts:232`: assert `result.view.name` instead of `viewIndex`.

## Defaults taken

- `updateCollectionYaml`'s silent no-op stays for the collection editor (Issue 05); the toolbar path reports an unparsable file through `applyToolbarEdit` before reaching it.
- The other-key check runs only for the save that brings `pending` to 0 and while the lens is still on that view, like the existing `failed` handling.
- A queued edit after a refused one also conflicts (its base is the refused value): two toasts, then the re-seed. Rare, safe side.

## Risks

- The touched filter key still normalizes on write (accepted in the Issue's Notes).
- A reformat that reorders keys inside a sort item compares equal (keys sorted); one that changes values conflicts, on the safe side.

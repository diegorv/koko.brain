VERDICT: APPROVED

## Acceptance criteria

- [met] Failing tests first: — Component: `RailNoteList.view.test.ts` "a toolbar edit writes only its key" (Sort keeps the disk filters `{ and: ["status == 'open'"] }` and gains the sort; a filter edit after a disk change leaves `files[VIEW]` as `PEOPLE_FILTERS`, toasts "This view changed. Your edit was not saved." and shows `['Person']`; a dirty tab with other filters refuses the edit, its buffer stays `PEOPLE_FILTERS`, no `saveFileByPath` / `writeTextFile`). Probe: with the five `src/lib` files checked out from main and the branch's test file, 3 of these 4 fail and "two edits in a row" passes, as the build report says; restored afterwards (`git status` clean). Logic: `type-note-list.logic.test.ts` `applyToolbarEdit` cases cover the sort edit keeping `and: [x]` and the unknown `note: kept` key, the reorder writing to the `_rail_view` view (`Board` at index 0 after the swap), and the `or`-then-`and` second edit plus a sort edit pair never self-conflicting (asserts `Object.keys(first.filters)` is `['or', 'and']`, then that the re-read base equals the advanced base).
- [met] A Sort click leaves filter bytes structurally unchanged. — `applyToolbarEdit` passes only `{ viewSort, viewIndex }` to `updateCollectionYaml` for `sort` (`type-note-list.logic.ts:199-206`), which touches `raw.filters` only when `'filters' in updates` (`yaml-parser.ts:184`). Covered by the component test (disk filters keep `and: [x]` after the Sort click) and the logic test (top-level `and` + `note`, view-level `and: [x]` kept).

## Findings

1. nit, `src/lib/features/type-definitions/type-note-list.logic.ts` (commit 3c03b14f8): that intermediate commit removes `buildViewYamlUpdates` while `RailNoteList.svelte` still imports it, so the branch does not typecheck at that commit. Deliver squashes the branch, so no fix is needed; noted for bisect hygiene only.
2. nit, `src/tests/lib/features/rail-shell/RailNoteList.view.test.ts:507`: "writes two edits in a row with no conflict" would still pass if the stale-key check (`RailNoteList.svelte:334-338`) re-seeded spuriously after every own edit. A spurious re-seed resets the toolbar to equal file values, so it is harmless today; an assertion that the filter popover keeps its row (or that no extra load re-seeds) would pin it. Optional.

## Checks run by the reviewer

- `taskpolicy -c background pnpm check`: exit 0, 0 errors, 0 warnings.
- Targeted vitest, exit 0, 48 files / 1230 tests: `src/tests/lib/features/type-definitions/{type-note-list.logic,type-definitions.service,update-view-toolbar-key.service,view-parse-cache,rewrite-view-file.service}.test.ts`, all of `src/tests/lib/features/rail-shell/`, `src/tests/help/type-definitions-views.test.ts`, `src/tests/lib/architecture/`.
- Further vitest, exit 0, 5 files / 327 tests: `src/tests/lib/app/meta-bind-open-view.test.ts`, `src/tests/lib/features/collection/toolbar/suggestions-skip-views.test.ts`, `src/tests/lib/features/type-definitions/type-sidebar.logic.test.ts`, `src/tests/lib/raw-write-ratchet.test.ts`, `src/tests/lib/features/collection/yaml-parser.test.ts`.
- Full suite and `pnpm build`: not run; deliver runs them.

## Notes on the trace

- Orphans removed: no `updateViewQuery`, `buildViewYamlUpdates`, `viewRunIndex` or `ViewQueryResult.viewIndex` left in `src/` (only ADR-0009's history names `updateViewQuery`). No layer-baseline or composition-root change.
- Self-conflict: `toolbarBase[key]` is advanced to `canonicalToolbarValue(key, next)` at call time, and the file's key after the write reads back through the same function, so queued edits of one key chain without conflict. The seeded state is `parseFilterToGroups(file)`, so the stale-key check compares `filterGroupsToFilter(parseFilterToGroups(x))` on both sides and gives no systematic difference.
- Accepted per the Issue's Notes and stated in the commit: the touched filter key normalizes; the canonical compare ignores filter keys the toolbar drops, so a change only to such a key is not a conflict and a filter edit drops it.
- A failed or refused earlier save followed by a successful later one on another key is caught by the stale-key check at `pending === 0` and re-seeds.
- PRD § Writes ("A toolbar write sends only the key it changed ... the write is refused and the toolbar shows the file's value") is what the branch does.

## Resolution

1. Not fixed, no change needed: the intermediate commit 3c03b14f8 does not typecheck, but deliver squashes the branch into one commit, so no commit on main carries that state.
2. Not fixed (rejected as optional): the reviewer marks it optional and states a spurious re-seed is harmless today, since it resets the toolbar to values equal to the file's. Pinning it would add a test change that needs another review round for no behavior gain.

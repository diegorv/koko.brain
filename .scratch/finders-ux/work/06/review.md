VERDICT: APPROVED

## Acceptance criteria

- [met] Failing test first, `src/tests/lib/app/commands.test.ts`: with empty history there is no `event-calendar:undo` or `event-calendar:redo`; after a recorded calendar change Undo is listed; after an undo Redo is listed and runs. — `commands.test.ts:197-237`: empty history lists neither; `setHistory(pushOp(...))` lists Undo only and running it reaches `undoEventChangeFromUi` (toast.error "cannot undo", not "Nothing to undo"); `setHistory(takeUndo(...).history)` lists Redo only and running it toasts "cannot redo", which proves the redo took the op. On main's `commands.ts` both ids are always listed, so the "lists neither" test and the 43 count fail there. Passes on the branch.
- [met] The count literal at `commands.test.ts:137` becomes 43 (changed on purpose); the "Nothing to undo/redo" palette tests at `:180-197` are rewritten for a non-empty history. — `commands.test.ts:148-152` asserts `toHaveLength(43)`; the old "Nothing to undo/redo" test is replaced by the two history-backed tests at `:204-237`.
- [met] `filterAndRankCommands('cal', getBuiltInCommands(), [])` with idle history contains no Calendar: Undo or Redo. — `commands.test.ts:239-245` makes that exact call after `eventCalendarStore.reset()` in `beforeEach` (`:117`) and asserts neither label, with "Calendar: Go to Today" present.
- [met] new-event, today, undo and redo report category "Calendar"; the toggle category assertion at `:205` stays Navigation. — `commands.test.ts:247-253` checks all four with both stacks non-empty; `commands.ts:239,247,259,269` set "Calendar"; the toggle assertion (`commands.test.ts:260`) still expects Navigation and `commands.ts` leaves the toggle unchanged.
- [met] Failing test first, `command-palette.logic.test.ts`: an empty query returns the recents and the label-sorted rest apart. — `command-palette.logic.test.ts:66-94` covers recents in order with the sorted rest, no recents, unknown ids and empty commands; `splitRecentCommands` did not exist on main, so the file could not pass there. `filterAndRankCommands` keeps its empty-query result (existing tests pass).
- [met] `CommandPalette.test.ts`: "Recent" and "All commands" headings with recents, no headings without recents, none with a query; arrow keys still cross the group boundary. — `CommandPalette.test.ts:157-233`: headings `['Recent', 'All commands']` with recents and the rows of each group checked; `[]` with no recents; `[]` and one group once "save" is typed; ArrowDown from the last Recent row selects the first All commands row and ArrowUp returns.
- [met] `fuzzy-match.ts` and its tests are unchanged; the three help pages are updated. — `git diff main...HEAD --stat -- src/lib/utils/fuzzy-match.ts src/tests/lib/utils/fuzzy-match.test.ts` is empty. `06-search-and-navigation.md:36-37` describes the groups and the gating, and `:64-67` adds the Calendar category; `20-keyboard-shortcuts.md:119` and `27-calendar.md:177` say Undo/Redo are listed only when there is something to undo or redo.
- [met] Frontend gate: `pnpm check` and `pnpm vitest run` pass. — `pnpm check` exit 0 (0 errors, 0 warnings). The targeted test files listed below pass. Deliver runs the full suite.

## Checks run by the reviewer

- `pnpm check`: exit 0, 234 files, 0 errors, 0 warnings.
- `pnpm vitest run src/tests/lib/app/commands.test.ts src/tests/lib/features/command-palette/`: exit 0, 4 files, 78 tests passed (commands.test.ts, command-palette.logic.test.ts, CommandPalette.test.ts, and the store test in that folder).
- `pnpm vitest run src/tests/lib/architecture/ src/tests/scripts/sync-wiki-docs.test.ts src/tests/lib/features/event-calendar/event-calendar-keys.logic.test.ts` plus every test file that reads `help/documentation` (settings-copy, kb-api-contract, src/tests/help/*): exit 0, 14 files, 362 tests passed.
- The test verdict rests on those files. The full suite was not run (deliver's to run).
- No other consumer looks the undo/redo commands up by id (`grep` over src, e2e, help: only `commands.ts`). `mod-commands.store.svelte.ts:38` searches mod commands only. The E2E specs pick "New Calendar Event" by a label regex, so the category text does not affect them.
- `eventCalendarStore.history` is `$state.raw` (`event-calendar.store.svelte.ts:29`), and `AppOverlays.svelte:19` passes `getBuiltInCommands()` as a prop expression, so the palette list re-reads `canUndo`/`canRedo` when history changes.
- No layer-baseline or composition-root change. New lines use tabs.

## Findings

1. nit, `src/lib/features/command-palette/CommandPalette.svelte:23-32`: on an empty query with recents, `filteredCommands` and `recentGroups` both run `splitRecentCommands` over the full list, and `filteredCommands` is not rendered. The cost is negligible at about 45 commands. If the component changes again, derive the flat list from `recentGroups`, or skip `filteredCommands` when the groups are rendered. Optional.
2. nit, `src/tests/lib/app/commands.test.ts:222-237`: the Redo test builds the post-undo history with `takeUndo` and does not run a real undo first, so it does not cover the service leaving that state. `event-calendar.service.test.ts` already covers the undo itself, and the criterion ("after an undo Redo is listed and runs") holds for the state the service writes. No change required.
3. nit, `src/tests/lib/features/command-palette/CommandPalette.test.ts`: no test mounts the palette with `getBuiltInCommands()` as a live prop and checks that Undo appears after a history write while the palette is open. Reactivity follows from Svelte 5 prop expressions, the same way the rail Go to commands already work. Optional.

## Resolution

1. Rejected (no change). The double `splitRecentCommands` pass runs over about 45 commands only while the query is empty, so the cost is negligible, as the finding says. Changing `CommandPalette.svelte` now would put an unreviewed source change into delivery for no user-visible gain.
2. Rejected (no change). The finding itself says no change is required: the criterion holds for the history state the service writes, and `event-calendar.service.test.ts` covers the undo.
3. Rejected (no change). Optional: the palette re-reads `commands` through the Svelte 5 prop expression in `AppOverlays.svelte`, the same path the rail Go to commands already rely on, and `commands.test.ts` covers the gating on `canUndo`/`canRedo`.

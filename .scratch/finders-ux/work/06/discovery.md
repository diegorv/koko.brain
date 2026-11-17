# 06 discovery: palette calendar Undo/Redo gating, Calendar category, Recent groups

No `spec.md` in `.scratch/finders-ux/`; the README and the Issue are the context. Builds on 01 (`work/01`): the palette rows, footer and dense list already exist.

## Files that change

- `src/lib/app/commands.ts:236-267`: `event-calendar:new-event`, `today`, `undo`, `redo` get category "Calendar"; undo is spread in only when `eventCalendarStore.canUndo`, redo only when `canRedo` (`event-calendar.store.svelte.ts:104,106`). Ids unchanged. Toggle (`:227`) stays Navigation. Reading the getters inside `getBuiltInCommands()` keeps the `AppOverlays.svelte:19` prop expression reactive.
- `src/lib/features/command-palette/command-palette.logic.ts:9-17`: new `splitRecentCommands(commands, recentIds) => { recent, rest }`; the empty-query branch of `filterAndRankCommands` returns `[...recent, ...rest]` from it (unchanged result).
- `src/lib/features/command-palette/CommandPalette.svelte:57-72`: empty query with recents renders `Command.Group heading="Recent"` and `heading="All commands"`; otherwise the single unheaded group over `filteredCommands`. Row markup moves into a snippet shared by the groups.
- Help: `help/documentation/06-search-and-navigation.md:35` (Recent bullet) and the category table (`:41`) gain a Calendar row set; `27-calendar.md:177` and `20-keyboard-shortcuts.md:119` say Undo/Redo appear only when there is something to undo or redo.
- `fuzzy-match.ts` untouched.

## Plan (test-first)

1. `src/tests/lib/app/commands.test.ts`: reset `eventCalendarStore` in `beforeEach`; empty history lists neither undo nor redo; `setHistory(pushOp(...))` lists Undo only; `setHistory(takeUndo(h).history)` (the state the service leaves after an undo, `event-calendar.service.ts:1326-1329`) lists Redo only, and running it toasts the redo outcome (the op's note is not loaded, so "vanished"). Count 45 -> 43. `filterAndRankCommands('cal', ...)` idle has no Calendar: Undo/Redo. Categories "Calendar" for the four; toggle stays Navigation. Fail, then edit `commands.ts`.
2. `command-palette.logic.test.ts`: `splitRecentCommands` returns recents in order and the label-sorted rest apart; unknown ids ignored; no recents gives empty `recent`. Fail, then add the helper.
3. `CommandPalette.test.ts`: headings "Recent" / "All commands" with a recent; none without; none once a query is typed; ArrowDown from the last Recent row selects the first All commands row. Fail, then edit the component.
4. Help pages.

Prior art: `ModDialogHost.test.ts:40-45,295-300` (keydown on the input, `aria-selected`), `event-calendar-history.logic.test.ts:34-42` (an update op).

## Defaults taken

- Shape: a second helper (`splitRecentCommands`) rather than changing `filterAndRankCommands`' return type; the Issue allows either.
- "All commands" group is not rendered when every command is a recent (empty group would show a bare heading).
- Help table: a new **Calendar** category with New Calendar Event, Calendar: Go to Today, Calendar: Undo, Calendar: Redo. Toggle Calendar View is not in the table today and is not added.

## Risks

- bits-ui `Command.Group` uses the heading as its `value`; the headings are distinct, so no collision.
- Arrow navigation across groups relies on bits-ui walking all items in DOM order; the component test covers it.

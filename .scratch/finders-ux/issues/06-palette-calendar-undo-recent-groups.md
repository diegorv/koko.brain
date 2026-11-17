# 06: Palette: calendar Undo/Redo only when they can act, Calendar category, Recent / All commands groups

**Origin:** design review 2026-11-17, proposals P159 and P160 (`.scratch/design-review/review.md`), prototype `.scratch/design-review/prototypes/finders-search-tags-graph.html`, research `.scratch/finders-ux/research/verdict-command-dialogs.md` (ticket T2) and `.scratch/finders-ux/research/breakdown.md` (05). The P160 footer lands in 01; the switcher's "Recent notes" heading in 07.

**What to build:**

1. **Gate calendar Undo/Redo.** In `src/lib/app/commands.ts`, include `event-calendar:undo` only when `eventCalendarStore.canUndo`, and `event-calendar:redo` only when `eventCalendarStore.canRedo` (`event-calendar.store.svelte.ts:104,106`). Reading them inside `getBuiltInCommands()` keeps `AppOverlays.svelte:19` reactive. No "Calendar tab is active" condition: with empty history that would list a no-op. Command ids stay unchanged, because usage stats count commands by id.
2. **Calendar category.** `event-calendar:new-event`, `event-calendar:today`, `event-calendar:undo` and `event-calendar:redo` move to category "Calendar". "Toggle Calendar View" stays Navigation, next to the other "Toggle X View" commands. Category is not matched by the filter (`command-palette.logic.ts:24` matches `label` only), so this changes row text, not ranking.
3. **Groups on an empty query.** `command-palette.logic.ts`: for an empty query, return the recents and the label-sorted rest separately (a shape change or a second helper). `CommandPalette.svelte` renders a `Command.Group` with heading "Recent" and one with heading "All commands" when there are recents, and no headings when there are none. A non-empty query stays one flat ranked list.
4. **No ranking change.** `src/lib/utils/fuzzy-match.ts` is unchanged (no word-start bonus).
5. **Help.** In `help/documentation/06-search-and-navigation.md`, the "Recently used commands" bullet at `:35` describes the Recent and All commands groups, and the category table from `:41` lists the Calendar category. That page, `27-calendar.md:177` and `20-keyboard-shortcuts.md:119` say Calendar: Undo and Redo appear in the palette only when there is something to undo or redo.

**Blocked by:** 01

**Status:** resolved

**Gate:** `pnpm check` + `pnpm vitest run`

- [x] Failing test first, `src/tests/lib/app/commands.test.ts`: with empty history there is no `event-calendar:undo` or `event-calendar:redo`; after a recorded calendar change Undo is listed; after an undo Redo is listed and runs.
- [x] The count literal at `commands.test.ts:137` becomes 43 (changed on purpose); the "Nothing to undo/redo" palette tests at `:180-197` are rewritten for a non-empty history.
- [x] `filterAndRankCommands('cal', getBuiltInCommands(), [])` with idle history contains no Calendar: Undo or Redo.
- [x] new-event, today, undo and redo report category "Calendar"; the toggle category assertion at `:205` stays Navigation.
- [x] Failing test first, `command-palette.logic.test.ts`: an empty query returns the recents and the label-sorted rest apart.
- [x] `CommandPalette.test.ts`: "Recent" and "All commands" headings with recents, no headings without recents, none with a query; arrow keys still cross the group boundary.
- [x] `fuzzy-match.ts` and its tests are unchanged; the three help pages are updated.
- [x] Frontend gate: `pnpm check` and `pnpm vitest run` pass.

## Original proposal

- **P159.** Palette ranking puts Undo and Redo above "Go to Calendar". Show Calendar Undo and Redo only when the calendar has something to undo or its tab is active, and move the calendar commands to a "Calendar" category. Add a word-start bonus in `fuzzyMatch`. Validation: a word-start bonus alone ties the labels, so the context gating carries the fix.
- **P160.** The palette's empty query has no Recent section and no key hints. With an empty query, show "Recent" and "All commands" groups ("Recent notes" in the switcher), plus a one-line key-hint footer.

Not built: the word-start bonus (it ties the labels and would change ranking for every `fuzzyMatch` consumer: palette, switcher, wikilink and tag completion, ModDialogHost) and the "or its tab is active" condition (it lists a no-op).

## Problem

Typing "cal" puts Calendar: Undo and Redo first even with nothing to undo, because labels that start with "Calendar:" get a prefix bonus. 13 of the commands, including the calendar ones, are filed under Navigation. Recents are prepended to one flat list with no heading.

## Evidence

Checked at `bb57e6165`.

- `src/lib/app/commands.ts:236-262`: `event-calendar:new-event`, `today`, `undo` and `redo`, always listed.
- `src/lib/features/event-calendar/event-calendar.store.svelte.ts:104,106`: `canUndo` and `canRedo` getters.
- `src/lib/utils/fuzzy-match.ts:32-38`: hand-computed "cal" scores, Calendar: Undo/Redo 5, Go to Calendar 11, Calendar: Go to Today 12. With gating, "cal" gives Go to Calendar, Calendar: Go to Today, New Calendar Event, Toggle Calendar View.
- `src/lib/features/command-palette/command-palette.logic.ts:9-17` (recents prepended), `:24` (label-only match).
- `src/tests/lib/app/commands.test.ts:134-137` pins 45; `:180-197` asserts Undo/Redo exist with empty history and toast "Nothing to undo/redo"; `:205` the toggle's category.
- Precedent for conditional palette commands: `railGoToCommands` skips hidden rail items.

## Comments

- 2026-11-17, triage: ready-for-agent. Decided: idle calendar Undo/Redo are hidden from the palette; no word-start bonus; Toggle Calendar View stays in Navigation.
- 2026-11-17, deliver (branch `issue/06-palette-calendar-undo-recent-groups`): calendar Undo/Redo are listed only when `canUndo`/`canRedo`; new-event, today, undo and redo use the Calendar category; an empty query with recents shows "Recent" and "All commands" groups (`splitRecentCommands`); help pages updated. Review round 1: APPROVED (three nits, all rejected with reasons in `work/06/review.md` § Resolution). Full suite `pnpm vitest run`: 643 files, 17107 passed, 54 skipped, 1 todo, exit 0.

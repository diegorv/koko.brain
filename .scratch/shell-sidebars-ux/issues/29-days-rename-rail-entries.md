# 29: The day navigator stops being called Calendar, and Tasks, Graph and Tags get rail entries that open their tab

**Origin:** design review 2026-11-17, proposal P36, prototype `.scratch/design-review/prototypes/shell-tabs-navigation.html` (section `#P36`), research `.scratch/shell-sidebars-ux/research/verdict-sh-view-headers-entry.md` (tickets V4, V5) and `.scratch/shell-sidebars-ux/research/breakdown.md` (old tickets 7, 39).

**What to build:** do the rename first, then the entries, in one pass over the shared help and ADR lines.

1. **Rename.** The rail item and the navigator header that list a picked day's notes read "Days", so "Calendar" names only the Calendar tab. Keys stay (`calendar`, `data-rail-item="calendar"`, `rail:go-to:calendar`, `RAIL_ITEM_COLORS`), so saved layouts and usage ids are untouched. The in-panel "Periodic notes" section label and "Open Calendar tab" stay. Code: `calendar-rail.service.ts:28` (the registered `label`), `CalendarNavigator.svelte:92` (the header span). Rewrite the `commands.ts:253-254` comment, which names "Go to Calendar".
2. **Tab entries.** A rail section titled "Tabs" (not "Views": the Types navigator and the palette's Open view commands already use that word for `.view` files), placed after Browse and before Pinned, holds Tasks, Graph and Tags. A click opens or focuses the tab (never closes it) and leaves `layout.railItem` and `railPanelsVisible` alone. The entries are on by default, hideable and reorderable in Settings > Layout (no new setting: a saved `railHidden` does not list them, so existing vaults see them). There are no Go to commands for them (their Toggle commands exist) and no shortcut for Tags.
3. **Where.**
   - `rail-items.logic.ts`: a `tabs` value in `RailItemGroup` (`:6`), its keys and labels in `railItems()` (`:36-58`, built into the `arrangeRailGroups` call so `railHidden` and `railOrder` apply; `moveRailItem` keeps them in the group). Choose keys that cannot collide with a navigator id or a pin key.
   - `Rail.svelte`: a "Tabs" section beside `sectionTitle('Browse')` (`:280`) in the labeled, captioned and collapsed forms, lucide icons, `aria-current` while the tab is the active tab (compare `editorStore.activeTabPath` with `TASKS_VIRTUAL_PATH`, `GRAPH_VIRTUAL_PATH`, `TAGS_VIRTUAL_PATH` from `core/editor/editor.logic.ts`, so `rail-shell` imports no plugin).
   - `LayoutSection.svelte:24-28` (`GROUPS`): a "Rail tabs" group.
   - `app/rail-navigation.ts:14-24`: `selectRailItem` branches on the tab keys and calls `openTasksTab` (`tasks.service.ts:547`), `openGraphTab` (`graph-view.service.ts:34`, a plugin: the opener stays in `app/`, `rail-shell.boundary.test.ts`) and `openTagsTab` (`tags.service.ts:126`), writing no layout. `AppShell.svelte:200-204` passes only `{ key, pin }`, so the branch is by key.
   - `app/commands.ts:63-73`: `railGoToCommands` filters the tab items out of Go to.
4. **Docs.** One ADR-0033 amendment (`docs/adr/0033-icon-rail-and-note-list-replace-sidebar-modes.md`): the "Days" wording at `:34,37` and the Tabs section, naming the re-evaluation trigger it meets ("a new top-level area needs a rail slot that does not fit the lens model", `:221-222`), not only "a third non-lens kind". Help: `01-getting-started.md` (rail list, `:73,93`, once for both changes), `07-sidebar-panels.md:98-100` (Tags is no longer palette-only), `08-periodic-notes-and-calendar.md:18-20,40`, `27-calendar.md:15,217-225,236`, `06-search-and-navigation.md:63`, `19-settings.md` (`:34` rail groups, `:45`), `20-keyboard-shortcuts.md:121` (Go to list only; its "Calendar" heading stays, `event-calendar-keys.logic.test.ts:236` reads it), `26-theming.md:129`.

Not in this ticket: the palette half of P36 (a Calendar category, gated Undo/Redo), already in HEAD through finders-ux 06; moving "Toggle Calendar View" under Calendar would reverse that decision. Also not: a Tags shortcut, Go to commands for the tab entries, direct keys (ticket 30).

**Blocked by:** none

**Status:** ready-for-agent

**Gate:** `pnpm check` + `pnpm vitest run`, plus `bash scripts/e2e.sh e2e/specs/rail-shell.spec.ts` and `bash scripts/e2e.sh e2e/specs/calendar-plugin.spec.ts`

- [ ] Failing test first, `src/tests/lib/plugins/calendar/calendar-rail.service.test.ts:45`: the registered navigator is `['calendar', 'Days']`.
- [ ] Failing test first, `src/tests/lib/features/rail-shell/rail-items.logic.test.ts`: the tab items form their own group after the navigators, honour `railHidden` and `railOrder`, and `moveRailItem` keeps them in the group.
- [ ] Failing test first, `src/tests/lib/app/rail-navigation.test.ts` (real `editorStore` and `settingsStore`): selecting Tasks makes the Tasks tab active; a second select keeps it open and active; `layout.railItem` and `railPanelsVisible` are unchanged. Same for Graph and Tags.
- [ ] `Rail.test.ts`: the three rows render in every rail form; Tasks is `aria-current` only while its tab is active. `LayoutSection.test.ts`: the group is listed with show/hide and move.
- [ ] `commands.test.ts` over the real registration: "Go to Days" and "Toggle Calendar View" exist; "Go to Calendar", "Go to Tasks", "Go to Graph" and "Go to Tags" do not; finders-ux 06's gating and categories are unchanged; count literals change on purpose. The `commands.ts:253-254` comment no longer names "Go to Calendar".
- [ ] `rail-shell.boundary.test.ts` passes; E2E `rail-shell.spec.ts:328-346` and `:949-1011` and `calendar-plugin.spec.ts` pass; the E2E rail-shell spec gains a click on each tab entry.
- [ ] The ADR amendment and the help pages above are updated.
- [ ] Frontend gate: `pnpm check` and `pnpm vitest run` pass.

## Original proposal

- **P36.** "Calendar" names two places, and Tasks, Graph and Tags have no visible entry point. The rail Calendar is the periodic-notes navigator, while the Calendar tab is the event calendar. Rename the rail navigator (for example "Journal"), and move Calendar Undo and Redo into a "Calendar" category. Optionally add tab-opening rail items for Tasks, Graph and Tags through an ADR-0033 amendment. (Review validation: revise, the Calendar tab already has a button and the views have shortcuts.)

## Problem

The rail's "Calendar" opens the month grid of periodic notes, while Cmd+Shift+C opens a different "Calendar" tab of events, so the word means two things. Tasks, Graph and Tags are top-level areas with a tab and a palette command but no rail button, so a new user cannot find them without the command palette.

## Evidence

Checked at `ab143a411`.

- `src/lib/plugins/calendar/calendar-rail.service.ts:26-32` (navigator registration, `label: 'Calendar'` at `:28`); `src/lib/plugins/calendar/CalendarNavigator.svelte:92` (the header span); `src/lib/app/commands.ts:253-254` (the stale comment after the rename).
- `src/tests/lib/plugins/calendar/calendar-rail.service.test.ts:45` is the only test that asserts the real label; fixtures with their own label in `Rail.test.ts:95,104,129,653`, `rail-items.logic.test.ts:26,54`, `LayoutSection.test.ts:55`, `lens.logic.test.ts:960,994` and `commands.test.ts:572` need no change.
- `src/lib/features/rail-shell/rail-items.logic.ts:6,36-58`: the four groups and `railItems()`; `src/lib/features/rail-shell/Rail.svelte:91-96` (group filters), `:280` (Browse title), `:287` (Pinned); `src/lib/features/rail-shell/LayoutSection.svelte:24-28`.
- `src/lib/app/rail-navigation.ts:14-24`; `src/lib/app/AppShell.svelte:200-204`; `src/lib/app/commands.ts:63-73`.
- Openers: `tasks.service.ts:547`, `tags.service.ts:126`, `graph-view.service.ts:34` (returns early when Graph is already active, and captures the center otherwise, so open-itens 087 stays safe).
- `src/lib/features/rail-shell/rail-items.logic.ts:6` and `docs/adr/0033-...md:34,37,221-222`; the Types navigator's "Views" section is at `TypesNavigator.svelte:251`.

## Sequence with

- `commands.ts` and the count pin `commands.test.ts:151`: 01, 08, 15, 20, 24, 28, 32.
- `app/rail-navigation.ts`: 20 (focus request on Go to) and 30 (digit selection). 20 and 29 are not chained.
- `Rail.svelte`: 30 (hints on the first nine rows), 34 (strip band `:270`). `CalendarNavigator.svelte`: 34 (band class `:88`; 34 is blocked by this ticket).
- ADR-0033 amendments: 20, 30. Help `07-sidebar-panels.md`: 01, 04, 05, 06, 07, 09, 10, 26; `01-getting-started.md`: 30.

## Comments

- 2026-11-17, triage: ready-for-agent. Decided by the owner: the 34-ticket split; the Tasks, Graph and Tags rail entries are on by default and hideable (old question 39.1), and there are no direct rail shortcuts for now (ticket 30 stays needs-info). Defaults (not individually answered): 29.1 (old 07.1) the navigator's name is "Days" ("Periodic notes" collides with the panel's own section, "Journal" suggests journal notes only); 29.2 (old 39.2) no Tags shortcut.

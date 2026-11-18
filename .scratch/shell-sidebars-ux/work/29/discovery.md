# Issue 29 discovery: "Days" rename, Tabs rail entries for Tasks, Graph, Tags

No `spec.md`; the Issue and the feature README are the source. Line numbers at `11249e301`.

## Files that change

- `src/lib/plugins/calendar/calendar-rail.service.ts:28` label `'Days'`; `CalendarNavigator.svelte:92` header `Days`. Keys stay `calendar`.
- `src/lib/features/rail-shell/rail-items.logic.ts:6` `RailItemGroup` gains `'tabs'`; `RailItem` gains `tabPath?` (the virtual path the item opens). New exported keys `TASKS_TAB_RAIL_ITEM = 'tab:tasks'`, `GRAPH_TAB_RAIL_ITEM = 'tab:graph'`, `TAGS_TAB_RAIL_ITEM = 'tab:tags'` (the `tab:` prefix is neither a pin prefix, `view:`/`type:`, nor a navigator id). `railItems()` `:36-58` adds a tabs group to the `arrangeRailGroups` call, placed after the navigators and before the pins; paths from `core/editor/editor.logic.ts` (pure). `RAIL_ITEM_COLORS` gains one color per tab key. Doc comment names Days and Tabs.
- `Rail.svelte`: `tabRows` from `group === 'tabs'`; after the Browse block, a divider (`data-rail-tabs-divider`) and a `data-rail-tabs` group with `sectionTitle('Tabs')` (pinned block pattern `:285-293`); `BUILT_IN_ICONS` gain `ListChecks`, `Network`, `Tag` (the tab bar's icons, `EditorTabs.svelte:165-176`); `itemRow` `active` is `editorStore.activeTabPath === item.tabPath` for a tab item, else the key test.
- `LayoutSection.svelte:24-28`: `{ group: 'tabs', label: 'Rail tabs' }` after navigators.
- `src/lib/app/rail-navigation.ts:14-24`: a `Map` from tab key to `openTasksTab` / `openGraphTab` / `openTagsTab`; a hit runs the opener and returns before any layout write.
- `src/lib/app/commands.ts:63-73`: `railGoToCommands` filters `group === 'tabs'`; `:253-254` comment no longer names "Go to Calendar".
- Docs: ADR-0033 `:34,37` (Days) and one amendment before the re-evaluation trigger `:221`; help 01 `:73,93`, 07 `:98-100`, 08 `:18-20,40`, 27 `:15,217-225,236`, 06 `:63`, 19 `:34,45`, 20 `:121`, 26 `:129`.
- E2E: `e2e/specs/rail-shell.spec.ts` gains a test clicking each tab entry; `e2e/specs/rail-styles.spec.ts:195-202` section title counts (3 to 4, 4 to 5) and the Tabs title.

## Tests (prior art)

- `calendar-rail.service.test.ts:45` label `Days` (first, failing).
- `rail-items.logic.test.ts`: extend the default-order test; new cases for the group order, `railHidden`, `railOrder`, `moveRailItem` at the group's ends.
- `rail-navigation.test.ts`: real `editorStore` / `settingsStore`, services real (their openers only touch stores); one case per tab: select twice, tab stays open and active, layout `toEqual` the snapshot before.
- `Rail.test.ts` (runs in all three forms via `describe.each(FORMS)`): update the literal key lists; new cases for the Tabs rows, `aria-current` following `editorStore` (pinned `_open_in_editor` case `:804` is the pattern), the restore test `:691` limited to non-tab items.
- `LayoutSection.test.ts`: `groupKeys()` gains `['Rail tabs', [...]]`; show/hide and move on a tab key.
- `commands.test.ts`: a case with the real `registerCalendarRail()`: "Go to Days" and "Toggle Calendar View" present, no "Go to Calendar/Tasks/Graph/Tags". Built-in count `:151` stays 46 (no new command).

## Risks and defaults

- Tab item colors are a choice (green Tasks, indigo Graph, pink Tags); the Issue names none.
- Label "Graph" (Issue) while the tab is named "Graph View".
- The Tabs section adds three rows in every form; the rail already scrolls (`overflow-y-auto`), so short windows scroll sooner.
- A hand-edited `layout.railItem: 'tab:tasks'` restores to Today (`restoreRailItem` knows no such key); nothing writes it.
- Graph opener returns early when Graph is active, so a second click keeps the center (Issue evidence).

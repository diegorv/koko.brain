VERDICT: APPROVED

Review of `git diff main...HEAD` (main at 11249e301, branch head bcdc25a23) in `brain.worktrees/issue-29-days-rename-rail-entries`.

## Acceptance criteria

- [met] Failing test first, `src/tests/lib/plugins/calendar/calendar-rail.service.test.ts:45`: the registered navigator is `['calendar', 'Days']`. — The test now expects `[['calendar', 'Days']]` (ac94e76e2). Against main's `label: 'Calendar'` it fails; with `calendar-rail.service.ts:28` `label: 'Days'` it passes (my run). `CalendarNavigator.test.ts` also asserts that the header reads `Days`.
- [met] Failing test first, `src/tests/lib/features/rail-shell/rail-items.logic.test.ts`: the tab items form their own group after the navigators, honour `railHidden` and `railOrder`, and `moveRailItem` keeps them in the group. — New cases cover: a `tabs` group right after `files` and before the first pin, each item with its `tabPath`; `railHidden: ['tab:graph']` combined with `railOrder: ['tab:tags', …, 'tab:tasks']` gives `['tab:tags','tab:tasks']`; a `railHidden` saved before these items still lists all three; `moveRailItem` swaps within the group and returns null at both ends and for `files` → down. Main has no `tabs` group, so these fail there. They pass on the branch.
- [met] Failing test first, `src/tests/lib/app/rail-navigation.test.ts` (real `editorStore` and `settingsStore`): selecting Tasks makes the Tasks tab active; a second select keeps it open and active; `layout.railItem` and `railPanelsVisible` are unchanged. Same for Graph and Tags. — `it.each` runs over `tab:tasks`, `tab:graph` and `tab:tags`, with only `editor.service` mocked: the tab is active after the first select and is still the one active tab after the second, and `settingsStore.layout` equals the snapshot taken before (`railItem` 'inbox', `railPanelsVisible` false). A further case focuses an open tab that is not active and does not open a second one. On main, `selectRailItem` would write `railItem: 'tab:tasks'`, so the test fails there.
- [met] `Rail.test.ts`: the three rows render in every rail form; Tasks is `aria-current` only while its tab is active. `LayoutSection.test.ts`: the group is listed with show/hide and move. — The `Tabs items` describe sits inside `describe.each(FORMS)` (labeled, captioned, collapsed). It checks the rows, the icons, the divider, the position before the pins, and titles only in the titled forms. `aria-current` and the tint follow `editorStore.activeTabPath`, even when `activeItem='tab:tasks'` is passed. In LayoutSection, `groupKeys()` includes `['Rail tabs', [...]]`, and a new case shows, hides and moves `tab:graph`/`tab:tags` while the rail follows. All pass in my run.
- [met] `commands.test.ts` over the real registration: "Go to Days" and "Toggle Calendar View" exist; "Go to Calendar", "Go to Tasks", "Go to Graph" and "Go to Tags" do not; finders-ux 06's gating and categories are unchanged; count literals change on purpose. The `commands.ts:253-254` comment no longer names "Go to Calendar". — The new test calls the real `registerCalendarRail()` and checks all six labels plus the absence of the `rail:go-to:tab:*` ids. The diff only adds to commands.test.ts: the gating and category tests are untouched, and the count pin `:151` stays 46 because `railGoToCommands` filters `group !== 'tabs'`. The comment at `commands.ts:255-257` no longer says "Go to Calendar".
- [met] `rail-shell.boundary.test.ts` passes; E2E `rail-shell.spec.ts:328-346` and `:949-1011` and `calendar-plugin.spec.ts` pass; the E2E rail-shell spec gains a click on each tab entry. — `rail-shell.boundary.test.ts` passed in my run of `src/tests/lib/features/rail-shell`. I ran `bash scripts/e2e.sh e2e/specs/rail-shell.spec.ts e2e/specs/rail-styles.spec.ts e2e/specs/calendar-plugin.spec.ts`: exit 0, 94 passed. That run includes the new test at `rail-shell.spec.ts:358`, which clicks each Tabs entry twice.
- [met] The ADR amendment and the help pages above are updated. — The ADR-0033 Decision at `:34,37` now reads Days. The 2026-11-18 amendment, placed before the re-evaluation trigger, names the trigger "a new top-level area needs a rail slot that does not fit the lens model". Help pages 01 (`:73,93`, the forms table), 06 `:63`, 07 Tags, 08 `:18-20,40`, 19 `:34,45`, 20 `:121`, 26 `:129` and 27 `:15,217-225,236` are updated. The "Calendar" heading in 20 stays. The branch also fixes `25-types-and-relationships.md:151` and `README.md:30`, which the change made wrong.
- [met] Frontend gate: `pnpm check` and `pnpm vitest run` pass. — `pnpm check` exited 0 with 0 errors and 0 warnings. The targeted vitest runs listed below pass. The full `pnpm vitest run` belongs to deliver.

## Findings

1. nit, `help/documentation/14-graph-view.md:5` and `help/documentation/10-tasks-and-todoist.md:11`: these pages still give only the shortcut and the palette as ways to open Graph and Tasks, while `07-sidebar-panels.md` now names the **Tags** rail entry. The Issue does not list these pages, so this is optional. Fix: add "or **Graph** / **Tasks** on the rail" to each.
2. nit, `src/lib/app/AppShell.svelte:115` ("The plugin-registered navigator (Calendar)") and `e2e/specs/calendar-plugin.spec.ts:15` ("Picks the Calendar rail item"): comments that still use the old user-facing name. The key is still `calendar`, so neither is wrong about the code. Fix (optional): say "Days" in both.

No blocker, major or minor findings. Points checked and found correct:
- `restoreRailItem` sends an unknown `tab:` key back to Today, so a hand-edited `layout.railItem` cannot pick a Tabs item. Nothing writes such a key.
- `openGraphTab` returns early when Graph is already active, so a second click keeps the graph's center.
- `rail-items.logic.ts` imports only `core/editor/editor.logic.ts` (pure constants), which is allowed from features to core. The pure-logic and layer-rule tests pass.
- `app/rail-navigation.ts` imports the plugin opener, and `rail-shell` imports no plugin.
- `layer-baseline.json` and `BASELINE_SIZE` are untouched, and no composition root was added.
- No `src-tauri/` change, so no cargo run is needed.
- The worktree is clean.

## Tests this verdict rests on (run by the reviewer)

- `pnpm check`: exit 0.
- `pnpm vitest run src/tests/lib/app/commands.test.ts src/tests/lib/app/rail-navigation.test.ts src/tests/lib/features/rail-shell/LayoutSection.test.ts src/tests/lib/features/rail-shell/Rail.test.ts src/tests/lib/features/rail-shell/rail-items.logic.test.ts src/tests/lib/plugins/calendar/CalendarNavigator.test.ts src/tests/lib/plugins/calendar/calendar-rail.service.test.ts src/tests/lib/architecture`: exit 0, 18 files, 538 passed, 55 skipped.
- `pnpm vitest run src/tests/lib/features/rail-shell src/tests/scripts/sync-wiki-docs.test.ts src/tests/lib/core/settings/settings-copy.test.ts src/tests/lib/plugins/queryjs/kb-api-contract.test.ts src/tests/lib/features/event-calendar/event-calendar-keys.logic.test.ts src/tests/help src/tests/lib/app/global-keybindings.test.ts src/tests/lib/plugins/calendar src/tests/lib/features/tasks/tasks.service.test.ts src/tests/lib/features/tags src/tests/lib/plugins/graph-view`: exit 0, 72 files, 2230 passed (this includes `rail-shell.boundary.test.ts`).
- `pnpm vitest run src/tests/lib/app src/tests/lib/plugins/mods`: exit 0.
- `bash scripts/e2e.sh e2e/specs/rail-shell.spec.ts e2e/specs/rail-styles.spec.ts e2e/specs/calendar-plugin.spec.ts`: exit 0, 94 passed.

Not checked: the full vitest suite (deliver runs it) and a visual check in the real Tauri app.

## Resolution

1. Fixed: `help/documentation/14-graph-view.md` and `help/documentation/10-tasks-and-todoist.md` now name **Graph** / **Tasks** on the rail, linking to The Rail like 07 does.
2. Fixed: the `AppShell.svelte` comment and the `calendar-plugin.spec.ts` helper comment (and the first test title, which said the same) now say Days. The `calendar` rail id and `openCalendarNavigator` keep their names: they are ids, not user-facing text.

# 21: Calendar tab with header, Needs attention and palette toggle

**What to build:** the first user-visible slice. Users open a "Calendar" tab with the command palette entry "Toggle Calendar View" (`event-calendar:toggle`). The tab shows a header (range title and week subtitle, Today, prev/next and a D/W/M segmented control with tablist ARIA). It also shows a "Needs attention" badge and list for event notes with unreadable values, a collapsed, informational "Unscheduled" section, a footer counting hidden archived events and an empty grid placeholder. The view loads events on mount and re-projects on every index bump and every change to a projection setting. It owns the clock while mounted and closes the popover and the dialog when it unmounts. The editor hosts the tab and the tab bar gives it an icon. E2E specs can pin the clock through an opt-in `clockTime` fixture option, and a new `e2e/specs/event-calendar.spec.ts` (it does not exist today) proves the slice end to end.

**Plan reference:** Task 20 in `.scratch/calendar-feature/plan-2026-10-28.md` (lines 449-487). The plan task is the full spec (files, line anchors, test cases); this ticket is the definition of done.

**Blocked by:** 01, 14, 19

**Status:** ready-for-agent

**Touches:**
- `src/lib/features/event-calendar/EventCalendarView.svelte` (new)
- `src/lib/features/event-calendar/EventCalendarHeader.svelte` (new)
- `src/lib/features/event-calendar/EventCalendarNeedsAttention.svelte` (new)
- `src/lib/core/markdown-editor/EditorView.svelte` (modify)
- `src/lib/core/markdown-editor/EditorTabs.svelte` (modify)
- `src/lib/features/command-palette/command-palette.service.ts` (modify)
- `e2e/fixtures/test-vault.ts` (modify)
- `src/tests/lib/features/event-calendar/EventCalendarView.test.ts` (new)
- `src/tests/lib/features/command-palette/command-palette.service.test.ts` (modify)
- `e2e/specs/event-calendar.spec.ts` (new)

**Gate:** `pnpm check` + `pnpm vitest run` + `pnpm build`, then `bash scripts/e2e.sh e2e/specs/event-calendar.spec.ts e2e/specs/editor.spec.ts e2e/specs/tabs.spec.ts e2e/specs/command-palette.spec.ts`

- [x] `EventCalendarView.svelte` has a root `<section tabindex="-1">` with its own `Tooltip.Provider delayDuration={400}`. A `$effect` reads `vaultStore.vaultIndexVersion`, `vaultStore.indexReady`, `settingsStore.eventCalendar.defaultDurationMinutes`, `.defaultColor`, `.eventTypeName` and `settingsStore.templates.systemFolder`, then calls `untrack(() => loadEvents().catch(...))`; `$effect(() => untrack(() => acquireCalendarClock()))` uses the release as its cleanup
- [x] An effect cleanup calls `eventCalendarViewStore.closeTransient()`; the view shows "Indexing vault..." while the index is not ready, an inline load-error state and an empty grid placeholder
- [x] `EventCalendarHeader.svelte` shows the `rangeLabel` title and subtitle on two lines and a Today button. Prev/next are `ui/button` ghost icons (lucide `chevron-left` / `chevron-right`) with tooltips via the `child` snippet. The D/W/M control has `role="tablist"` with `aria-label="Calendar view"`, `role="tab"` buttons with `aria-selected` and `aria-keyshortcuts` (`D`, `W`, `M`), and ArrowLeft/ArrowRight move between the tabs
- [x] `EventCalendarNeedsAttention.svelte` shows a badge "N events need attention" that counts `attentionCount` only, with a list of each actionable row and its reason text. A collapsed "Unscheduled (N)" section for `unscheduledIssues` gives the hint for each `detail` ("add `date:` (and `start` / `end` for a timed event)" or "date is not YYYY-MM-DD"). With 0 actionable and N unscheduled, only a quiet "N unscheduled" link shows. A footer "N archived events hidden" appears when `archivedCount > 0`, and each row opens its note via `openFileInEditor`
- [x] `EditorView.svelte` gains the import (`:13-18`), an `isEventCalendarTab` flag (`:28-34`) and an `{:else if}` branch (`:49-63`), the accepted core-to-feature import of D3. `EditorTabs.svelte` (`:46-57`) uses the lucide icon `calendar-range`, or `calendar-days` if ticket 01 recorded that the deep path is missing (Task 1 (c), Notes > Risks 4 (c)); this is a lucide import only, not a feature import
- [x] `command-palette.service.ts` adds `event-calendar:toggle` "Toggle Calendar View" next to `tasks:toggle` (`:138-146`). In `command-palette.service.test.ts` the count at `:84-87` goes from 26 to 27. The event-calendar service is not mocked: the existing `editor.service` / `fs.service` mock factories gain the names its import chain needs, and `invoke` stays mocked. Running the command gives `editorStore.activeTab?.path === EVENT_CALENDAR_VIRTUAL_PATH` and `fileType === 'event-calendar'`, and running it again removes the tab. The count and toggle assertions fail first (C7 Q5)
- [x] Pre-Change Checklist C7 (Notes) holds: the command palette service writes no store and the new command writes only `editorStore` tabs; the `EditorView.svelte` branch adds a reader of `editorStore.activeTab`, not a writer; the view's cleanup writes only the view store (`closeTransient`)
- [x] `e2e/fixtures/test-vault.ts` (`:154-159`) gains the opt-in option fixture `clockTime: [undefined, { option: true }]`. When it is set, `vaultPage` calls `page.clock.install({ time: new Date(clockTime) })` before `populateAndOpenVault`, or uses the fallback ticket 01 recorded for Task 1 (h) (Notes > Risks 4 (h)). The default is unset, so no other spec changes behaviour
- [x] `EventCalendarView.test.ts` (jsdom docblock, `mount` / `flushSync` / `unmount`, and the ResizeObserver stub from `src/tests/lib/features/collection/CollectionView.test.ts:7-13`) asserts the title and subtitle text, the tablist roles and `aria-selected`, and an issue row title with its reason. It also asserts that with 50 unscheduled notes and 1 invalid note the badge reads 1 and the "Unscheduled (50)" section is collapsed
- [x] The same test file shows that changing `defaultDurationMinutes` after the first load re-projects: the store event's `end` follows the new default with no extra `get_all_vault_entries_v2` call. After `openPopover` and `openDialog` on the store, then mount, unmount and mount again, `popover` and `dialog` are null
- [x] `e2e/specs/event-calendar.spec.ts` uses `test.use({ clockTime: '2026-11-10T10:00:00+01:00', timezoneId: 'Europe/Berlin' })`, seeds with `fs.populate`, then emits `vault-index-updated` using `window.__e2e.vaultIndex.version`. Opened via the palette, the header reads "November, 2026" and the subtitle contains "Week 46". A seeded `_type: Event` note with an invalid `start` appears under Needs attention with its reason, and a dateless one appears only under "Unscheduled". Clicking a Needs-attention row opens that note's tab (the tab title and the editor text are asserted). This spec meets rule 11 for the `EditorView.svelte` and `EditorTabs.svelte` wiring
- [ ] Gate green; one commit in the full CLAUDE.md format (Context, Problem, Solution, Behavior, Files with line ranges)

## Comments

- **2026-10-28, from ticket 19 (b272b6ca):** `loadEvents()` still rethrows the failure of a load that a newer load or a vault switch replaced. The view effect's `.catch` must not toast for those superseded loads; toast only when the failing load is still the current one.
- 2026-10-28 13:21 — discovery — plan in work/21/discovery.md: palette entry, view + header + Needs attention + wiring, E2E fixture + spec, three commits — 29e3a578
- 2026-10-28 13:26 — implement — palette entry, Calendar view/header/Needs attention, EditorView/EditorTabs wiring, clockTime fixture and E2E spec in one feat commit; pnpm check 0 errors, vitest (event-calendar, command-palette, app-lifecycle, editor) 752/752, E2E event-calendar 3/3 and editor/tabs/command-palette 9/9; full gate left to deliver — 45cd1679
- 2026-10-28 13:29 — review — CHANGES_REQUESTED: superseded-load toast guard is per-instance (double toast on remount, toast after a same-vault reset); no test pins the clock release on unmount — fc00e26b
- 2026-10-28 13:31 — fix — review findings 1 and 2 fixed: shared module-level load counter plus loadError currency check, three new view tests; EventCalendarView.test.ts 19/19, pnpm check 0 errors — pending

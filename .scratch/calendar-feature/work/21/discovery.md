# 21 discovery: Calendar tab with header, Needs attention and palette toggle

## Files that change
- New: `src/lib/features/event-calendar/EventCalendarView.svelte`, `EventCalendarHeader.svelte`, `EventCalendarNeedsAttention.svelte`.
- `src/lib/core/markdown-editor/EditorView.svelte:13-18` (import), `:28-34` (`isEventCalendarTab`), `:49-63` (`{:else if}` branch). `isVirtualTab` already covers the path (ticket 19), so no source-mode button shows.
- `src/lib/core/markdown-editor/EditorTabs.svelte:2-8, 46-57`: `@lucide/svelte/icons/calendar-range` (ticket 01 (c): present).
- `src/lib/features/command-palette/command-palette.service.ts:138-146`: `event-calendar:toggle` "Toggle Calendar View" -> `toggleEventCalendarTab()` (no shortcut; ticket 31 owns keys).
- `e2e/fixtures/test-vault.ts:154-159`: `clockTime` option fixture; `page.clock.install` before `populateAndOpenVault` (ticket 01 (h): yes).
- Tests: new `src/tests/lib/features/event-calendar/EventCalendarView.test.ts`, `command-palette.service.test.ts:84-87` (26 -> 27, plus toggle test), new `e2e/specs/event-calendar.spec.ts`.

## Plan (test first where there is a seam)
1. Palette: failing count + toggle tests (real event-calendar service, `vi.mock('@tauri-apps/api/core')` added; its chain imports neither `editor.service` nor `fs.service`, so those factories need no new names), then the entry. One commit.
2. View + header + Needs attention + EditorView/EditorTabs wiring + view test. One commit.
3. E2E fixture option + spec. One commit.

## View details
- Load effect reads `vaultIndexVersion`, `indexReady`, the three `eventCalendar` keys and `templates.systemFolder`; loads only when `indexReady`. Superseded-load errors (ticket 19 comment): a view-local `loadSeq` plus the captured `vaultStore.path`; the `.catch` toasts (`svelte-sonner`) only when both still match. The inline error state comes from `eventCalendarStore.loadError`.
- Clock: `$effect(() => untrack(() => acquireCalendarClock()))`. A separate `$effect(() => () => eventCalendarViewStore.closeTransient())`.
- `onMount` calls `eventCalendarViewStore.initFromSettings()` (applies `defaultView` once per session; no ticket owned the call).
- Layout: header, grid placeholder (flex-1), then the Needs-attention panel at the bottom, which also holds the archived footer, so every criterion of that component lives in it.
- Reason text is a small inline map in the component (no new logic file): `invalid-time` -> "`<key>` is not a valid time (HH:mm)" / "all_day is not true or false"; `crosses-midnight` -> "end is not after start"; `trailing-comment` -> "`<key>` has a trailing # comment"; `multi-day` -> "multi-day (end_date): shown read-only on its start day". Unscheduled hints per the ticket (`no-date`, `not-a-day`).
- "Unscheduled (N)" is a `<details>` (closed by default). With 0 actionable, a quiet "N unscheduled" button toggles the same list.
- Header tablist: roving tabindex; ArrowLeft/ArrowRight wrap and move focus.

## Prior art
- `CollectionView.test.ts:7-13` (ResizeObserver stub), `event-calendar.service.test.ts:51-70` (beforeEach: `invalidateVaultEntries`, `vaultStore._reset/open`, `resetEventCalendar`), fixtures `eventEntry`, `entryV2`.
- `TasksView.svelte:71-76`, `SidebarModeToggle.svelte:19-31`, `CalendarPanel.svelte:42`, `tasks-view.spec.ts`.

## Risks
- The calendar's `role="tab"` buttons also match the tab-bar selectors `[role="tab"][aria-selected="true"]` used by `tasks-view.spec.ts`; only while the Calendar tab is open, which no other spec does.
- The index bump is throttled (2 s) in E2E; the spec waits on rendered text, not on time.
- Chromium 1248 must be installed for the E2E gate (ticket 01 (h)); the deliver step runs it.

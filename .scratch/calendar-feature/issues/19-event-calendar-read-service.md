# 19: Read service, calendar clock and Calendar tab openers

**What to build:** the editor knows a new `'event-calendar'` tab `fileType` and the virtual path `EVENT_CALENDAR_VIRTUAL_PATH = '__virtual__/event-calendar'`, which `isVirtualTab` already treats as virtual, so the tab is never saved. A new `event-calendar.service.ts` gives the feature its read side: `loadEvents()` projects the memoized `getVaultEntries()` snapshot through `eventsFromEntries` (settings defaults, event type name, vault path, system folder) into `eventCalendarStore`, latest-wins and with errors reported to `loadError` and rethrown; `openEventCalendarTab({ date?, view? })`, `closeEventCalendarTab()` and `toggleEventCalendarTab()` manage a singleton "Calendar" tab on the graph-view pattern; `acquireCalendarClock()` is a ref-counted clock that keeps today current across midnight and sleep (it backs the view store's `nowMs`); and `resetEventCalendar()` resets the two event-calendar stores and nothing else. There is no UI yet.

**Plan reference:** Task 18 in `.scratch/calendar-feature/plan-2026-10-28.md` (lines 411-435). The plan task is the full spec (files, line anchors, test cases); this ticket is the definition of done.

**Blocked by:** 17, 18

**Status:** ready-for-agent

**Touches:**
- `src/lib/core/editor/editor.types.ts` (modify)
- `src/lib/core/editor/editor.logic.ts` (modify)
- `src/lib/features/event-calendar/event-calendar.service.ts` (new)
- `src/tests/lib/features/event-calendar/event-calendar.service.test.ts` (new)
- `src/tests/lib/core/editor/editor.logic.test.ts` (modify)

**Gate:** `pnpm check` + `pnpm vitest run` + `pnpm build`, then `bash scripts/e2e.sh e2e/specs/editor.spec.ts e2e/specs/tabs.spec.ts`

- [ ] `'event-calendar'` is added to `fileType` (`editor.types.ts:12`) and `EVENT_CALENDAR_VIRTUAL_PATH = '__virtual__/event-calendar'` is exported from `editor.logic.ts` (`:5-12`); `editor.logic.test.ts` asserts `isVirtualTab` is true for the new path (written first, per C5 Q5)
- [ ] `loadEvents()` calls `getVaultEntries()`, then `eventsFromEntries(entries, { defaults: { durationMinutes, color } from settingsStore.eventCalendar, typeName: settingsStore.eventCalendar.eventTypeName, vaultPath: vaultStore.path, systemFolder: settingsStore.templates.systemFolder })`, then `eventCalendarStore.setSnapshot`; it uses a latest-wins token plus the captured `vaultStore.path`
- [ ] On failure `loadEvents()` logs via `error('EVENT-CALENDAR', ...)`, sets `loadError`, leaves events untouched and rethrows
- [ ] Service tests mock only `@tauri-apps/api/core` `invoke` and use the real `vaultStore`, `editorStore`, `settingsStore`, event-calendar stores and logic; they cover the load happy path, an empty vault, an IPC rejection (store untouched, error rethrown) and a stale result discarded after `resetEventCalendar`
- [ ] Load-scope tests: a template under `_system/templates` and an archived event are absent from `events` and `archivedCount` is 1; with `eventTypeName: 'Meeting'`, only `_type: Meeting` notes load
- [ ] `openEventCalendarTab`, `closeEventCalendarTab` and `toggleEventCalendarTab` copy `src/lib/plugins/graph-view/graph-view.service.ts:20-53` and name the tab "Calendar"; tests cover open, focus, toggle and close against `editorStore.tabs` (tab-toggle tests written first, per C5 Q5)
- [ ] Pre-Change Checklist C5 (Notes) holds: the openers write `editorStore` tabs only through `addTab`, `setActiveIndex` and `removeTab` (`editor.store.svelte.ts:52, 64, 71`), plus the view store's `focusedDate` / `view` via `setDate` / `setView` when `date` / `view` are given (which clear the popover); the `fileType` and constant changes write no state
- [ ] `acquireCalendarClock(): () => void` runs a ref-counted 30 s interval plus re-ticks on window `focus` and `visibilitychange`; the returned release is idempotent, the count never goes below 0, and the last release clears the interval and both listeners
- [ ] Clock tests use fake timers and a focus event: a double release is a no-op, and two acquirers keep the clock running until both release
- [ ] `resetEventCalendar()` resets only the two event-calendar stores and never touches the clock; a test that acquires, calls `resetEventCalendar`, releases and acquires again sees the interval still ticking
- [ ] Gate green; one commit in the full CLAUDE.md format (Context, Problem, Solution, Behavior, Files with line ranges)

## Comments

- 2026-10-28 13:09 — discovery — plan written to work/19/discovery.md — 1033a194
- 2026-10-28 13:12 — implement — service + 29 tests (28 service, 1 editor.logic); pnpm check 0 errors, editor + event-calendar vitest 596/596; full gate and e2e left to deliver — c3ef20b7

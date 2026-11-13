# 19 discovery: read service, calendar clock and Calendar tab openers

## Files that change

- `src/lib/core/editor/editor.types.ts:12`: add `'event-calendar'` to `fileType`.
- `src/lib/core/editor/editor.logic.ts:5-12`: export `EVENT_CALENDAR_VIRTUAL_PATH = '__virtual__/event-calendar'`; `isVirtualTab` (:15-17) already covers it.
- `src/lib/features/event-calendar/event-calendar.service.ts` (new).
- `src/tests/lib/core/editor/editor.logic.test.ts:113-128`: one `isVirtualTab` case (written first).
- `src/tests/lib/features/event-calendar/event-calendar.service.test.ts` (new, `// @vitest-environment jsdom` for window/document listeners).

## Plan (one feat commit, test first)

- `loadEvents()`: `token = ++loadToken`, capture `vaultStore.path` and `vaultStore.vaultIndexVersion`, `setLoading(true)`, `await getVaultEntries()` (`vault-entries.service.ts:32`), project with `eventsFromEntries` (`event-calendar-event.logic.ts:199`) using `defaults: { defaultDurationMinutes, defaultColor }` (the `EventDefaults` shape, :43), `typeName`, `vaultPath`, `systemFolder`. Stale (token or path moved): discard, no store write. Fresh: `setSnapshot(projection, capturedVersion)`, `setLoadError(null)`, `setLoading(false)`. Failure: `error('EVENT-CALENDAR', ...)` (`utils/debug.ts:26`), and if fresh `setLoadError(message)` + `setLoading(false)`; always rethrow.
- Tab openers: copy `graph-view.service.ts:20-53` with `EVENT_CALENDAR_VIRTUAL_PATH`, name "Calendar", `fileType: 'event-calendar'`. `openEventCalendarTab({ date, view })` calls `setDate` / `setView` first when given.
- `acquireCalendarClock()`: module `clockRefs`, `clockTimer`; first acquire ticks once (`setNow(Date.now())`), starts `setInterval(tick, 30_000)`, adds `focus` on window and `visibilitychange` on document. Release has a closure `released` flag; last release clears both.
- `resetEventCalendar()`: `eventCalendarStore.reset()`, `eventCalendarViewStore.reset()`, `loadToken++` (service-local guard so an in-flight load is discarded; no store besides the two is written). Clock untouched.

## Prior art

- `src/tests/lib/plugins/graph-view/graph-view.service.test.ts` (invoke mock, tab tests).
- Fixtures: `src/tests/fixtures/event-notes.fixture.ts::eventEntry`, `vault-entries.fixture.ts::entryV2`.
- `beforeEach`: `invalidateVaultEntries()` (memo is module-global), `vaultStore._reset()` + `open('/vault')`, `settingsStore.reset()`, `editorStore.reset()`, `resetEventCalendar()`.

## Risks

- The memo caches per version across tests; invalidate in `beforeEach`.
- `vaultStore.open` persists recent vaults (localStorage under jsdom; fine).
- Stale test: hold a deferred `invoke`, call `resetEventCalendar`, resolve, assert store still empty.

## Defaults taken

- The clock also ticks once on first acquire, so `nowMs` is fresh at mount.
- `visibilitychange` is listened on `document` (where it fires) and ticks on every change (jsdom reports `hidden`, and a hidden tick is harmless).
- A stale failure is logged and rethrown but writes no store state.

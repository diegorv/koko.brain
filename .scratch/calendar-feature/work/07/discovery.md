# 07 discovery: event note schema logic

## Files that change (all new)

- `src/lib/features/event-calendar/event-calendar-event.logic.ts`: read projection, issues, write planning, overlay. Imports: `./event-calendar-dates.logic` (`isValidDayKey`, `parseTimeStrict`, `formatTime`), `$lib/core/settings/settings.logic` (`EVENT_CALENDAR_COLORS`, `:41`), `$lib/features/properties/properties.logic` (`parseFrontmatterProperties` `:180`, `extractBody` `:33`, `rebuildContent` `:389`), `$lib/features/type-definitions/type-sidebar.logic` (`excludeSystemFolder` `:58-69`), `$lib/utils/frontmatter-aliases` (`canonicalizeKey`). Types from `./event-calendar.types` (ticket 05). `$lib` specifiers: sveltekit-3-migration ticket 05 is still open.
- `src/tests/fixtures/event-notes.fixture.ts`: `eventEntry`, `eventNote`, `rustFrontmatter` (a port of `parse_scalar`, `src-tauri/src/vault/parsing.rs:681-712`), seed events.
- `src/tests/lib/features/event-calendar/event-calendar-event.logic.test.ts`.

## Plan

One feat commit (the ticket asks for one), test-first: test + fixture, see it fail on the missing module, then the logic. Prior art: `event-calendar-dates.logic.test.ts` (ticket 05), `entryV2` in `src/tests/fixtures/vault-entries.fixture.ts:15`, real `isValidFileName` (`src/lib/core/filesystem/fs.logic.ts:108`).

## Risks

- The ticket says Rust gives `''` for an empty key; the contract pinned in ticket 03 (`src-tauri/tests/vault_event_frontmatter_test.rs:49-56`) says a bare `start:` is `Null` and only `start: ""` is `''`. `parseEventTime` treats both as absent, and the fixture models the pinned truth.
- `parseFrontmatterProperties` is LRU-cached; tests call `_resetParseFrontmatterCache` in `beforeEach`.

## Defaults taken for open questions

- `entryToEvent` returns `{ event; issue? } | { issue }`: `multi-day` is the only reason that carries both (rendered, `readOnly`).
- Issue check order: `trailing-comment` (so `2026-11-10 # x` is not reported as `not-a-day`), `unscheduled`, `invalid-time`, `crosses-midnight`, then `multi-day`. `detail` is `no-date` / `not-a-day`, else the offending key.
- `defaults` is `Pick<EventCalendarSettings, 'defaultDurationMinutes' | 'defaultColor'>`. `snippet` comes from `entry.snippet`; a numeric `location` is stringified, any other non-string is `''`.
- `applyEventDraft(baseContent, draft, fileBase, typeName)`: a fourth parameter carries the resolved type name for a base without `_type` (the ticket's signature has no source for it). `_type` is inserted first. When `draft.title === fileBase` it passes `eventTitle: null`, so a template's stray `event_title` is dropped too. Body is `notes`, a blank line, then the template body (either may be empty).
- `applyEventFields`: `allDay: true` removes `start` / `end` and writes `all_day: true`; `allDay: false` removes `all_day`; `start` / `end` are written whenever patched and the patch is not all-day. Existing keys are updated in place, new keys appended.
- Overlay works on projected `EventNote[]`. `mergePending` returns `PendingEventNote` (`EventNote & { pending: boolean }`, declared in the logic file); an `update` for a path not in the snapshot is dropped. `prunePending` checks presence in that same projected list.
- `isEventEntry` also rejects any `isA` equal to `type` ignoring case.

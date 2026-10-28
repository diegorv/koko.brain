# 32: Settings > Calendar section

**What to build:** Settings gains a "Calendar" entry in the Notes group where the user configures the Calendar tab: week start, time format, day start hour, show weekends, default view, default duration, default color and the event type name. Out-of-range numbers are clamped and a blank event type falls back to `Event`. The section also shows, read-only, the folder where new events will be created (the same rule as "New Event" in the type sidebar) and offers an "Open Event type" link to set that folder or a template. The section is owned by the `event-calendar` feature, following the AutoMove precedent.

**Plan reference:** Task 31 in `.scratch/calendar-feature/plan-2026-10-28.md` (lines 746-761). The plan task is the full spec (files, line anchors, test cases); this ticket is the definition of done.

**Blocked by:** 27, 28

**Status:** ready-for-agent

**Touches:**
- `src/lib/features/event-calendar/EventCalendarSection.svelte` (new)
- `src/lib/core/settings/settings.types.ts` (modify)
- `src/lib/core/settings/settings.logic.ts` (modify)
- `src/lib/core/settings/SettingsPanel.svelte` (modify)
- `src/tests/lib/features/event-calendar/EventCalendarSection.test.ts` (new)
- `src/tests/lib/core/settings/settings.logic.test.ts` (modify)
- `e2e/specs/event-calendar.spec.ts` (modify)

**Gate:** `pnpm check` + `pnpm vitest run` + `pnpm build`, plus `bash scripts/e2e.sh e2e/specs/settings.spec.ts e2e/specs/event-calendar.spec.ts`

- [ ] `EventCalendarSection.svelte` offers week start, time format, day start hour (0-12), show weekends, default view, default duration and default color (via `EventColorSwatches` from ticket 27), and every control writes through `updateEventCalendar`
- [ ] The numeric inputs commit on change through `clampDayStartHour` / `clampEventDuration`, like `EditorSection.svelte:99`
- [ ] The "Event type" text input commits through `normalizeEventTypeName` and shows the static hint "Notes of this type appear on the calendar. If you rename the type in the type sidebar, enter its new name here." (D25)
- [ ] A read-only "New events go to" line shows `buildTypeNoteDir(vault, typesBaseFolder, <event type _folder>)`, the rule of Task 14 that `createEvent` (ticket 28) writes through
- [ ] "Open Event type" calls `openFileInEditor(metadata.path)`, or `createTypeDefinition(<configured name>)` when the event type has no definition yet
- [ ] `'event-calendar'` is added to `SettingsSection` (`settings.types.ts:296`), `{ id: 'event-calendar', label: 'Calendar' }` to the Notes group (`settings.logic.ts:96-140`), and `SettingsPanel.svelte` gains the `calendar-range` icon map entry and the component map entry; the `SettingsPanel.test.ts` parity test passes
- [ ] `settings.logic.test.ts` asserts the Notes group entry
- [ ] `EventCalendarSection.test.ts` mounts the section, commits an out-of-range duration and asserts the clamped store value, and commits a blank event type and asserts `Event`; it is written first and fails before the section exists (C11)
- [ ] E2E in `event-calendar.spec.ts`: setting week start to Sunday in Settings > Calendar makes the Calendar tab's first day header Sunday; setting the time format to 12h makes the axis show "9 AM"
- [ ] Gate green; one commit in the full CLAUDE.md format (Context, Problem, Solution, Behavior, Files with line ranges)

## Comments

- 2026-10-28 15:41 — discovery — plan in work/32/discovery.md; section + settings wiring + unit and E2E tests — 6119eff3
- 2026-10-28 15:46 — implement — Calendar settings section wired; pnpm check 0 errors, vitest settings + event-calendar 31 files / 946 passed, E2E event-calendar.spec + settings.spec 29 passed; full gate not run — 58590aa7
- 2026-10-28 15:49 — review — CHANGES_REQUESTED: 1 medium (Open Event type double-create behind the open settings panel), 2 low, 2 nits; see work/32/review.md — dc6507ba

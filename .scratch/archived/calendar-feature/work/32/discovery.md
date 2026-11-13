# 32 discovery: Settings > Calendar section

Template: `AutoMoveSection.svelte` (feature-owned section imported by `SettingsPanel.svelte:11, 52, 77`); controls copied from `GeneralSection.svelte` (Switch), `QueryjsSection.svelte:55-68` (Select) and `EditorSection.svelte:93-102` (number input: raw on `input`, clamp on `change`).

## Files that change
- New `src/lib/features/event-calendar/EventCalendarSection.svelte`: `SettingItem` rows for week start (Select Monday/Sunday), time format (Select 24h/12h), day start hour (number 0-12, `clampDayStartHour`), show weekends (Switch), default view (Select over `EVENT_CALENDAR_VIEW_MODES`), default duration (number 15-480 step 15, `clampEventDuration`), default color (`EventColorSwatches`), event type (text, commit on `change` through `normalizeEventTypeName`, static D25 hint). Every write is `settingsStore.updateEventCalendar`.
  - Event type resolution: `resolveEventTypeName([...typeMetadataMap.keys()], eventTypeName)` (the same call `createNow` makes, `event-calendar.service.ts:585`), then `metadata = typeMetadataMap.get(resolved)`.
  - "New events go to": `buildTypeNoteDir(vaultStore.path, settingsStore.typesBaseFolder, metadata?.folder ?? null)`, the rule `resolveTypedNoteTarget` uses (`type-definitions.service.ts:53-57`). Hidden when no vault is open.
  - "Open Event type": `openFileInEditor(metadata.path)` when a definition exists, else `createTypeDefinition(eventTypeName)`.
- `src/lib/core/settings/settings.types.ts:297`: add `'event-calendar'` to `SettingsSection`.
- `src/lib/core/settings/settings.logic.ts:162-170`: append `{ id: 'event-calendar', label: 'Calendar' }` to the Notes group (after Types).
- `src/lib/core/settings/SettingsPanel.svelte`: import `CalendarRangeIcon` (`@lucide/svelte/icons/calendar-range`), icon map and component map entries.

## Tests
- New `src/tests/lib/features/event-calendar/EventCalendarSection.test.ts` (written first, fails without the component): copy `EditorSection.test.ts` mount + `type`/`commit` helpers; real `settingsStore` and `typeDefinitionsStore`. Cases: out-of-range duration commits clamped (999 -> 480), out-of-range hour (20 -> 12), blank event type -> `Event`, folder line follows `typesBaseFolder` + `_folder`, "Open Event type" calls the mocked `openFileInEditor` / `createTypeDefinition` (side-effect services, mocked per TESTING.md), swatch click sets `defaultColor`, empty state (no vault: no folder line).
- `src/tests/lib/core/settings/settings.logic.test.ts:258`: section-id order gains `event-calendar`; new case asserting the Notes group entry `{ id: 'event-calendar', label: 'Calendar' }`.
- `SettingsPanel.test.ts` parity runs unchanged.
- E2E `e2e/specs/event-calendar.spec.ts`: open settings (Mod+Comma), Calendar button, pick Sunday / 12h through the Select triggers, close, open the calendar; first `[data-day-header]` is a Sunday key, `[data-time-axis]` contains "9 AM".

## Risks
- bits-ui Select in jsdom: the unit test drives the number/text inputs, the Switch and the swatches, not the Selects; the Selects are covered by E2E.
- `type-definitions.service` imports Tauri plugins; mocking it in the section test keeps the mount free of IPC.

## Defaults taken
- Calendar entry placed last in the Notes group.
- The folder line shows the absolute path, exactly what `buildTypeNoteDir` returns (the ticket's wording).
- The event type input keeps a raw local value while typing and writes only on commit, so the store never holds a blank name.

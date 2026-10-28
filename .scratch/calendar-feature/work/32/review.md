VERDICT: CHANGES_REQUESTED

# 32 review: Settings > Calendar section

Reviewed `git diff main...dc6507ba` (feature commit 58590aa7) in the worktree.

## Checks I ran

- `pnpm check`: 205 files, 0 errors, 0 warnings.
- `pnpm vitest run src/tests/lib/features/event-calendar/EventCalendarSection.test.ts src/tests/lib/core/settings/settings.logic.test.ts src/tests/lib/core/settings/SettingsPanel.test.ts src/tests/lib/core/settings/EditorSection.test.ts src/tests/lib/core/settings/settings.store.test.ts`: 5 files, 141 passed.
- `bash scripts/e2e.sh e2e/specs/event-calendar.spec.ts e2e/specs/settings.spec.ts`: 29 passed.
- The full gate was not run. The deliver step runs it.

My test verdict rests on these files: `EventCalendarSection.test.ts`, `settings.logic.test.ts`, `SettingsPanel.test.ts` (map parity), `e2e/specs/event-calendar.spec.ts` ("Event calendar settings" describe) and `e2e/specs/settings.spec.ts`.

## Acceptance criteria

- [x] **Controls.** Met. `EventCalendarSection.svelte` has week start, time format, day start hour (0-12), show weekends, default view, default duration and default color (`EventColorSwatches`). Every control writes through `settingsStore.updateEventCalendar` (lines 76, 95, 119, 130, 142, 169, 181, 198).
  - Unit tests cover the number inputs, the switch and the swatches. E2E covers the week start and time format Selects.
  - The default view Select is not tested anywhere (finding 2).
- [x] **Number inputs.** Met. They commit on `change` through `clampDayStartHour` / `clampEventDuration` (lines 117-121, 167-171) and write the clamped value back into the input. Tests: 999 -> 480, 50 -> 45, hour 20 -> 12.
- [x] **Event type input.** Met. It commits on `change` through `normalizeEventTypeName` (lines 196-200), and the exact D25 hint is the row description (line 191). Tests: blank -> `Event`, trimmed name, hint text.
- [x] **"New events go to" line.** Met. It shows `buildTypeNoteDir(vaultStore.path, typesBaseFolder, eventType?.folder ?? null)` (line 52). The type is resolved with `resolveEventTypeName` over `typeMetadataMap`, the lookup `createNow` makes (`event-calendar.service.ts:585`) before `resolveTypedNoteTarget` (`type-definitions.service.ts:48-57`). Tests cover the base folder plus `_folder`, case-insensitive resolution, the vault root without a definition, and no line without a vault.
- [x] **"Open Event type".** Met as specified. It calls `openFileInEditor(eventType.path)`, or `createTypeDefinition(calendar.eventTypeName)` when there is no definition (lines 56-65). Finding 1 covers how it behaves inside the settings panel.
- [x] **Settings wiring.** Met. `'event-calendar'` was added to `SettingsSection` (`settings.types.ts:298`), `{ id: 'event-calendar', label: 'Calendar' }` is the last entry of the Notes group (`settings.logic.ts:168`), and `SettingsPanel.svelte` has the `CalendarRangeIcon` and component map entries (lines 39, 63, 90). The `SettingsPanel.test.ts` parity test passes.
- [x] **`settings.logic.test.ts`.** Met. It asserts the Notes group entry and the updated section order (lines 257-264).
- [x] **`EventCalendarSection.test.ts`.** Met. It mounts the section, commits an out-of-range duration and asserts the store, and commits a blank event type and asserts `Event`. "Fails first" holds because the component import could not resolve before the section existed.
- [x] **E2E.** Met. Sunday week start makes the first `[data-day-header]` a Sunday and shows `SUN`. 12-hour makes `[data-time-axis]` contain "9 AM". Both pass.
- [ ] **Gate green and the commit.** Pending. The commit format is right: 58590aa7 has Context, Problem, Solution, Behavior, Files with line ranges, and the trailer. The full gate has not run yet; the deliver step runs it.

Layer rule: `core/settings/SettingsPanel.svelte` imports a `features/` component. That is the direction ADR-0003 flags, but the plan prescribes it and the AutoMove precedent already exists (`SettingsPanel.svelte:12`), so I do not count it as a finding.

## Findings

1. **Medium: "Open Event type" can create duplicate type definitions, and it opens the note behind the settings panel.** `src/lib/features/event-calendar/EventCalendarSection.svelte:56-65`
   - The settings panel stays open. It is 820px wide (max 80vw, `SettingsPanel.svelte:114-118`) and covers most of the editor, so `openFileInEditor` and `createTypeDefinition` (which also calls `openFileInEditor`, `type-definitions.service.ts:151`) open the note where the user cannot see it. To the user, nothing happened.
   - `typeMetadataMap` refreshes only through the throttled `vault-index-updated` refresh (`tauri-listeners.service.ts:141-148`): about 2 s after a single event, up to 10 s during a burst. Until then `eventType` stays `undefined`.
   - So a second click in that window calls `createTypeDefinition('Event')` again. `createFile` dedupes the name (`fs.service.ts:119-121`) and writes `Event 1.md`, a stray second type definition in the user's vault.
   - Fix: after either branch, call `settingsPanelStore.close()` so the opened note is visible. That is a core import, which the layer rules allow. Also guard the create: disable the button while it is in flight, then `await refreshTypeDefinitions()` before re-enabling it.
   - Test: click twice, assert `createTypeDefinition` is called once and `settingsPanelStore.isOpen` is false.
2. **Low: the default view Select has no test.** `src/lib/features/event-calendar/EventCalendarSection.svelte:138-156`
   - Neither the unit test nor the E2E spec picks a default view, so the `EVENT_CALENDAR_VIEW_MODES.includes(v)` guard and the `updateEventCalendar({ defaultView })` write are never run.
   - Fix: add an E2E case that picks "Month" and asserts the persisted setting. The view applies only once per session (`event-calendar-view.store.svelte.ts:33, 150-153`), so assert the setting or reload, not the open tab.
3. **Low: a failed create is still silent.** `src/lib/features/event-calendar/EventCalendarSection.svelte:61-64`
   - The `.catch` toast only fires on a rejection. A disk failure never produces one: `createFile` catches, logs and returns `null` (`fs.service.ts:135-138`), and `createTypeDefinition` then returns without an error (`type-definitions.service.ts:146-147`).
   - The unit test "toasts when the definition cannot be created" injects a rejection that the real path does not produce.
   - The configured name is also not checked with `validateTypeName` (`type-definitions.logic.ts:133`), as the type sidebar's create dialog does, so a name with `/` or other characters that are invalid in a file name goes straight to `createFile`.
   - Fix: validate the name before creating and toast the validation message. Either make `createTypeDefinition` return the created path (or `null`) and toast on `null`, or record that as a follow-up if it is out of scope.
4. **Nit: the "Show weekends" description is too narrow.** `src/lib/features/event-calendar/EventCalendarSection.svelte:127`
   - It says "in the week view", but the setting also drops the weekend columns in the month view (`EventMonthGrid.svelte:10`, `buildMonthCells` in `event-calendar-view.logic.ts:190-193`).
   - Fix: "Show Saturday and Sunday in the week and month views".
5. **Nit: the "Default view" description does not say when the setting applies.** `src/lib/features/event-calendar/EventCalendarSection.svelte:136`
   - "View the Calendar tab opens in" reads as immediate, but `initFromSettings` applies the setting once per session.
   - Fix: "View the Calendar tab opens in when the app starts".

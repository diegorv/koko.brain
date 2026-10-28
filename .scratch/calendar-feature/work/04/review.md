VERDICT: CHANGES_REQUESTED

# Review: calendar-feature issue 04 (eventCalendar settings slice)

Reviewed `git diff main...HEAD` at `74c52ec6` (commits `af377e7c`, `51805550`, `74c52ec6`) against the Issue, plan Task 3 (`plan-2026-10-28.md` lines 71-96), Notes C1 and CLAUDE.md.

## Checks I ran

- `pnpm check`: 192 files, 0 errors, 0 warnings.
- `vitest run` on `src/tests/lib/core/settings/` (all 14 files, including `settings.logic.test.ts`, `settings.store.test.ts`, `settings.service.test.ts`, `settings-persistence.test.ts`) plus the other test files that touch settings state or persistence: `app-lifecycle.service.test.ts`, `global-keybindings.test.ts`, `layout.service.test.ts`, `tauri-listeners.service.test.ts`, `type-definitions.service.test.ts`, `TypeSidebar.test.ts`, `plugins/calendar/calendar.service.test.ts`. Result: 21 files, 518/518 passed. My test verdict rests on these files.
- Probe (untracked copies, deleted afterwards, worktree left clean): a copy of `settings.service.ts` with only the `eventCalendar` merge line removed, run against a copy of `settings.service.test.ts` filtered to `eventCalendar`. Result: 3 failed, 1 passed. The test that passed is "fills a missing eventCalendar block with the defaults" (finding 1).
- I did not run the full gate. The deliver step runs it.

## Acceptance criteria

- [x] **Lists in `settings.logic.ts`, only runtime copies.** Met. `settings.logic.ts:41` and `:44`, next to the `clamp*` helpers. A grep of `src/lib` finds no other copy of either literal list.
- [x] **Types derived through `import type`.** Met. `settings.types.ts:1` (`import type`), `:301`, `:304`. The `import()` form is not used for them.
- [x] **`EventCalendarSettings` and `AppSettings.eventCalendar`, no folder setting.** Met. `settings.types.ts:306-324` matches the specified shape field for field, `:349` adds the field, and there is no folder key.
- [x] **`clampDayStartHour` integer 0..12, `clampEventDuration` multiple of 15 within 15..480.** Met. `settings.logic.ts:47-58`. Because 15 and 480 are both multiples of 15, the clamp after rounding always lands on a multiple of 15.
- [x] **`normalizeEventTypeName`.** Met. `settings.logic.ts:64-69`. `'  '`, `'type'` and `' Meeting '` are tested in `settings.logic.test.ts` ("normalizeEventTypeName" block).
- [x] **`normalizeSettings` calls `normalizeEventCalendar`, rules, identity.** Met. `settings.logic.ts:75-91`, `:133`. A valid branch is returned by reference ("keeps a valid eventCalendar branch by reference"). The other branches still keep identity (the existing "carries unrelated branches" test, plus the byte-identical round-trip test).
- [x] **`DEFAULT_SETTINGS.eventCalendar` values.** Met. `settings.store.svelte.ts:102-111`.
- [x] **Getter and `updateEventCalendar` next to `autoMove`, with store tests.** Met. `settings.store.svelte.ts:161`, `:301-308`. `settings.store.test.ts` covers the default getter, the getter after `setSettings`, and the merge over two successive partial updates.
- [ ] **`loadSettings` merge, service tests for missing / partial / full, and the missing-block test fails before the merge line exists.** Partly met. The merge line is at `settings.service.ts:134`, and the partial, full and invalid tests all fail without it. The missing-block test does not fail without it (finding 1). It failed in the build's red run only because nothing in the slice existed yet.
- [x] **`settings.logic.test.ts` covers every clamp and normalize rule, identity, and both arrays.** Met. The fallback test asserts membership only (finding 2).
- [x] **p2p-sync Task 3 `sync` keys unchanged.** Not applicable: there is no `sync` key in `settings.types.ts`, `DEFAULT_SETTINGS` or the `loadSettings` merge.
- [ ] **Gate green; one commit in the full format.** Pending for the gate, which deliver runs. The feat commit `51805550` has Context, Problem, Solution, Behavior, Files with line ranges, and the Co-Authored-By trailer.

## CLAUDE.md rules

- Layer rules: `settings.logic.ts` imports only `$lib/utils/clamp` and types. The type cycle with `settings.types.ts` is type-only in both directions, so it is erased at compile time.
- JSDoc covers every new export, every interface field and the store method. All indentation is tabs.
- Every changed source file has a test change. No mocks of stores or `.logic.ts`.
- Scope: the diff stays within the seven Touches files plus the scratch files. Nothing extra.
- Production callers of `setSettings` are `loadSettings` (defaults, merge or fallback) and three sections that spread `settingsStore.settings`. None of them can produce an `AppSettings` without `eventCalendar`, so `normalizeSettings` cannot throw on save.

## Findings

1. **Medium.** `src/tests/lib/core/settings/settings.service.test.ts:332-349`: "fills a missing eventCalendar block with the defaults" passes even when the merge line is missing. Without the line, `merged.eventCalendar` is `undefined`. `normalizeEventCalendar` then throws on `calendar.weekStartsOn`, `loadSettings` catches the error and stores `DEFAULT_SETTINGS`, and the assertion on the defaults holds. My probe confirms this. The ticket requires this exact test to fail before the merge line exists. As written, it does not separate the merge path from the error-fallback path. Only the `AppSettings` type annotation would catch a dropped line, through `pnpm check`. **Fix:** assert that the file's other value survived, for example `expect(settingsStore.settings.editor.fontSize).toBe(18)`, which proves the non-fallback path ran. Optionally also assert that `writeTextFile` received `eventCalendar` with the defaults. Then remove line 134 locally and confirm the test now fails, and restore it.
2. **Low.** `src/tests/lib/core/settings/settings.logic.test.ts:351-362`: the unknown `timeFormat` / `defaultView` / `defaultColor` test checks list membership only. The commit message and discovery promise specific fallbacks: `'24h'`, `'week'` and `'blue'`. Of those, only `'blue'` is pinned, and only in the service test. **Fix:** also assert `toBe('24h')`, `toBe('week')` and `toBe('blue')`, so a change to the fallbacks has to be made on purpose. Keep the membership assertions.
3. **Nit (no change required).** `src/lib/core/settings/settings.logic.ts:47-58`: a non-finite input falls back to the lower bound, so `NaN` becomes 0 (midnight) rather than the default 7. `Infinity` also becomes 0 and 480 respectively instead of the upper bound. This stays within the AC, and JSON cannot carry `Infinity`. Recorded so later tickets know that a garbage `dayStartHour` opens the grid at 00:00.
4. **Nit (no change required, out of ticket scope).** `src/lib/core/settings/settings.logic.ts:75-91`: `showWeekends` is not normalized, so a hand-edited `"false"` string passes through as truthy. The ticket gives no rule for it. Worth a line in the Task 17/31 tickets if they rely on a strict boolean.

## Resolution

1. Fixed. The suggested `fontSize === 18` would not discriminate: `DEFAULT_SETTINGS.editor.fontSize` is 18, so the catch fallback also yields 18. The fixture now saves `editor.fontSize: 20` and the test asserts `settingsStore.settings.editor.fontSize` is 20. Probe: with the merge line at `settings.service.ts:134` deleted, the test fails (1 failed); restored, it passes.
2. Fixed. The test now also pins `toBe('24h')`, `toBe('week')` and `toBe('blue')`, keeping the membership assertions.
3. Accepted as recorded, no change (within the acceptance criteria).
4. Accepted as recorded, no change (out of ticket scope).

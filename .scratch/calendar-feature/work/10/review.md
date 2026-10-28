VERDICT: CHANGES_REQUESTED

# 10 review: event form rules

Reviewed `git diff main...HEAD` (35987c78, 3bf91350, 052ba7e4) in the worktree.

## Checks run by the reviewer

- `vitest run src/tests/lib/features/event-calendar/ src/tests/lib/core/filesystem/fs.logic.test.ts`: 7 files, 355/355 pass. The test verdict rests on `src/tests/lib/features/event-calendar/event-calendar-form.logic.test.ts` (the new file, 41 tests), plus the existing tests of the modules it imports: `event-calendar-event.logic.test.ts` (`eventFileBase`), `event-calendar-dates.logic.test.ts` (`isValidDayKey`, `parseTimeStrict`), `event-calendar-layout.logic.test.ts` (`MIN_EVENT_MINUTES`) and `src/tests/lib/core/filesystem/fs.logic.test.ts` (`generateUniqueName`).
- `pnpm check`: 0 errors, 0 warnings, 192 files.
- A throwaway probe test (deleted, tree clean afterwards) for the cases in findings 1 and 2.

## Acceptance criteria

- [x] No framework imports; uses `eventFileBase`, `MIN_EVENT_MINUTES`, `generateUniqueName` from `fs.logic.ts`; cap restated with `MIN_EVENT_MINUTES`, nothing from the drag logic. Met: `event-calendar-form.logic.ts:10-15`, `:100-102`. The extra imports (`isValidDayKey`, `parseTimeStrict`, a type-only `settings.types`) are `.logic.ts` / types, with precedent in `event-calendar-event.logic.ts`.
- [x] `draftFromEvent` sets `timingLocked` for `readOnly`, tested. Met: `:87`, test `:62-64`.
- [x] `draftForCreate` cap, anchors 1425 and 1440 tested. Met: `:100-102`, tests `:87-95`.
- [ ] `applyStartChange` keeps the duration and caps at 1440 (met, `:123-127`, tests `:112-126`); `applyEndChange` empty value becomes 1440 "as in the prototype" (met for `''`, `:136-138`, test `:140-142`), but it drops the prototype's `|| 1440` for `00:00`, see finding 2; `toggleAllDay` exported (met, `:147`). Partly met.
- [x] `validateDraft` messages for empty title after trim, empty/invalid date, end <= start; `:` and `/` titles valid. Met: `:158-164`, tests `:163-194`.
- [x] `draftToPatch` returns only changed fields plus `title`. Met: `:174-187`, tests `:196-222`.
- [ ] `planTitleChange` rules. Same base and case-only change against the current filename give `renameTo: null` (`:207`), numbering through `generateUniqueName` with self excluded (`:208-212`), `eventTitle` vs the final base (`:214`). Not met in one case: when the numbered result is the note's own name in a different case, it returns a case-only rename of the note onto itself, which `renameItem` refuses on a case-insensitive volume, the exact failure this rule exists to avoid. See finding 1.
- [x] The four named `planTitleChange` tests pass (`:225-245`).
- [x] JSDoc on every export and interface field, tabs, test under `src/tests/lib/features/event-calendar/`. Met (no space-indented lines in either file).
- [ ] Gate green: left for the deliver step, as expected.

## Findings

1. **Medium, correctness.** `src/lib/features/event-calendar/event-calendar-form.logic.ts:207-213`. The case-only guard compares the new base only with the current filename, before numbering. A numbered note can still be planned onto itself. Probe: note `Standup 1.md` (`event_title: Standup`) beside `Standup.md`, title changed to `standup`. `planTitleChange('Standup 1', 'standup', ['Standup.md', 'Standup 1.md'])` returns `{ renameTo: 'standup 1.md', eventTitle: 'standup' }`. `renameItem` (`src/lib/core/filesystem/fs.service.ts:192-198`) gets `oldPath !== newPath`, `exists(newPath)` is true on APFS, and it returns `null`, which the write service turns into a "name may already exist" error. The same thing happens for `STANDUP`. With identical casing (`planTitleChange('1-1 with manager 1', '1/1 with manager', [...])`) it returns `renameTo: '1-1 with manager 1.md'`, the note's own name. That is a no-op inside `renameItem`, but the plan should say "no rename" (`null`) so the service does not run `remapPath(from, from)`. This is the second-same-title case the ticket targets. **Fix:** after `generateUniqueName`, if `unique === self`, keep the file (`renameTo = null`, `finalBase = currentFileBase`). Then `eventTitle` follows the existing rule. Add tests for `('Standup 1', 'standup', ['Standup.md', 'Standup 1.md'])` giving `{ renameTo: null, eventTitle: 'standup' }`, and for the identical-case variant giving `renameTo: null`.

2. **Medium, behavior regression vs the prototype.** `src/lib/features/event-calendar/event-calendar-form.logic.ts:132-138` (and test `:144-148`). The prototype's `parseTime(v) || 1440` (`event-dialog.tsx:128`) maps an end of `00:00` to 1440. `<input type="time">` cannot show or type `24:00`, and `timeInputValue` shows 1440 as `23:59`, so typing `00:00` is how a user sets an end at midnight. The port keeps it as 0. Events cannot cross midnight in v1 (D2, `crosses-midnight`), so an end of 0 is always invalid. The deviation turns the only typed way to end at midnight into a guaranteed validation error ("End time must be after the start time."), and nothing makes up for it. The AC asks for the empty-value rule "as in the prototype". **Fix:** `const end = parseTimeStrict(value); return { ...draft, end: end === null || end === 0 ? DAY_MINUTES : end };`, update the JSDoc, and replace the test at `:144-148` with one where `00:00` gives `end: 1440` and passes `validateDraft`. If the 0 behavior is wanted on purpose, record it as a decision in the plan instead of in discovery.md only.

3. **Low, test gap.** `src/tests/lib/features/event-calendar/event-calendar-form.logic.test.ts:224-275`. No `planTitleChange` test starts from a numbered current file (`Standup 1`), which is how finding 1 went unnoticed. The fix for finding 1 covers this.

## Scope

No scope creep. Exactly the two files in the Issue's Touches list, plus scratch notes. Comparing sibling names case-insensitively (`:209`) goes beyond the literal spec, but it follows from the plan's own case-insensitive-volume reasoning, is documented in discovery.md, and is tested (`:261-266`).

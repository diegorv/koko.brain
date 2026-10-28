VERDICT: APPROVED

# Review: Issue 68, Calendar actions that can create duplicates

Branch `issue/calendar-feature-68-duplicate-creation-guards`, `git diff main...HEAD` (676cd650..c5709c3f, base 48e49feb).

## Acceptance criteria

- [x] **"Open Event type" with an ordinary root `Event.md` no longer writes `Event N.md` on every click.** Met.
  - `EventCalendarSection.svelte:91-96`: before creating, it looks for a vault-root file `<name>.md` (case-insensitive) in `fsStore.fileTree`. That tree is the vault's top-level children (`scan_vault` result, `fs.service.ts:77-92`), and `createTypeDefinition` always writes to the vault root (`type-definitions.service.ts:146-149`). On a hit it shows a toast and creates nothing.
  - `:104-107`: backstop. If the returned basename is not `<name>.md` (stale tree, dedupe in `createFile`), it shows the same toast and Settings stays open. The next click gets caught by the pre-check, because `createFile` awaits `refreshTree()` (`fs.service.ts:132`). So a stale tree leaves at most one stray file.
  - `fs.service.ts createFile` is untouched, as the orchestrator required.
  - Tests: `EventCalendarSection.test.ts` has three new cases (root note taken, folder/nested note ignored, deduped return path). On main's source, 2 of the 3 fail (probe below). The folder/nested case is a negative guard, so it passes on both, as expected.
- [x] **Daily note in-flight guard is per day, not per button instance.** Met.
  - `event-calendar-daily-note.store.svelte.ts:14-20, 43-50`: a module-level `Map<day, Promise>`. A repeat `open(day)` returns the pending promise, and the entry is deleted in `.finally`. That covers remounts and a second Calendar view (`EventDayHeaders` and `EventMonthGrid` both route through `EventDailyNoteButton` -> the store). The per-instance `pending` flag was removed from `EventDailyNoteButton.svelte`.
  - Tests: the store test has three new cases (join, different days run separately, reopen after a rejection), and `EventMonthGrid.test.ts` has a remount case. On main's source, the join test and the remount test fail.
- [ ] **Nit: `TypeSidebar.svelte:396` discards the return value.** Not done, by recorded decision. I accept that for the return value itself, but see finding 3.
- [ ] **The daily note opener is registered unconditionally (`app-lifecycle.service.ts:247`).** Not applicable today. `PeriodicNotesSettings` / `PeriodicNoteTypeSettings` (`settings.types.ts:7-35`) have no enable flag, so there is nothing to hide the button behind. I accept the decision.

## Verification (run by the reviewer)

- `vitest run` on `src/tests/lib/features/event-calendar/EventCalendarSection.test.ts`, `EventMonthGrid.test.ts`, `event-calendar-daily-note.store.test.ts`, `EventTimeGrid.test.ts` and `src/tests/lib/plugins/periodic-notes/`: 6 files, 197/197 pass. My test verdict rests on these files.
- Probe: I put main's versions of the three changed source files back in place and ran the three changed test files. 5 fail, as expected: the two Event-type tests, the store join test, the grid remount test, and the edited in-flight test, whose new tail `await open(...)` needs the join. Then I restored the files, and `git status` was clean.
- `pnpm check`: 0 errors, 0 warnings.
- Layer rules: OK. `features/event-calendar` imports `core/filesystem/fs.store`.
- Mock rules: OK. The tests use the real `fsStore` and the real daily-note store, and only the type-definitions service is mocked.
- JSDoc: present on `inFlight` and `toastNameTaken`.
- Commits: all four follow the COMMITS.md sections.

## Findings

1. **Low**, `src/lib/features/event-calendar/event-calendar-daily-note.store.svelte.ts:32-37`. `register()` replaces the opener but leaves `inFlight` alone. Scenario: vault A is still opening day D when the vault switches and the new opener registers. A click on D in vault B within that window joins vault A's promise, so no note opens in B and no toast appears. The window is a few ms to one `create_note`, so the risk is small. Fix (optional): call `inFlight.clear()` in `register()`, or key the map on the opener as well as the day.
2. **Low**, `src/lib/features/event-calendar/EventCalendarSection.svelte:91-96`. The pre-check assumes that any root `<name>.md` the type map has not resolved is an ordinary note. If the root file *is* a type definition and the map is stale (created outside the app, or inside the throttled index refresh window), the toast tells the user to "Add `_type: Type`" when it is already there. This is still strictly better than main, which wrote `Event 1.md`. Fix (optional): word the toast as conditional, e.g. "...exists in the vault root and is not the Event type yet. If it should be, add `_type: Type`...". Another option is to call `refreshTypeDefinitions()` once before toasting.
3. **Low (follow-up, out of scope)**, `src/lib/features/type-definitions/TypeSidebar.svelte:396`. "Create type definition" has the same dedupe class. With an ordinary root `Name.md`, `createTypeDefinition(name)` writes `Name 1.md`, which defines type "Name 1", and the section stays without a definition, so every repeat writes another copy. The Calendar call-site fix does not cover this surface. A basename check inside `createTypeDefinition` (not `fs.service.ts`) would cover both callers. Fix: file a follow-up Issue. Do not widen this one.
4. **Nit**, `src/lib/features/event-calendar/EventDailyNoteButton.svelte:17-23`. A double click whose open fails now shows two identical toasts, because both callers share one rejected promise. This is disclosed and accepted in the discovery notes. No change required.
5. **Nit**, `.scratch/calendar-feature/issues/68-calendar-duplicate-creation-guards.md`. The two deferred items are still `[ ]` in a file that the closing commit deletes. The decision is recorded only in the Comments log. Fix (optional, at delivery): name both items and their reasons in the closing commit message so the record survives the file's deletion.

VERDICT: CHANGES_REQUESTED

# 34 review: Calendar user guide and project docs

Reviewed `git diff main...db6697e7` in the worktree: commits 79b34352 (discovery), 307ab3e2 (docs) and db6697e7 (implement comment).

## Checks I ran

- `git diff main...HEAD --stat`: 11 files, all Markdown (9 docs plus the Issue file and `work/34/discovery.md`). Nothing under `src/` or `src-tauri/`, so `pnpm check` and vitest do not apply. I ran neither.
- Link and anchor probe (a throwaway Python script, not committed) over the 7 changed help pages. Every relative link added by this diff resolves, including `25-types-and-relationships.md#frontmatter-key-aliases`, `#creating-notes-from-types`, `27-calendar.md#using-existing-event-notes`, `19-settings.md#calendar` and `../../docs/adr/0029-frontmatter-yaml-canonical-form.md`. The probe also flagged 3 missing targets that were already broken on main (`screenshots/calendar.png`, `screenshots/settings.png`, and a `file:///Users/you/...` example), so they are not findings.
- I checked the page's claims against the code (files listed under each criterion below).
- I did not run the full gate. The deliver step runs it.

My test verdict rests on no test file, because the diff changes no source or test file (CLAUDE.md rule 11 does not apply). The evidence is the code reads and the link probe above.

## Acceptance criteria

- [x] **Opening, views, narrow panes, create/move/resize, tab vs. panel.** Met. `27-calendar.md:7-55, 203-211`. Checked against:
  - `toggleEventCalendarTab`, which closes the tab only when it is active (`event-calendar.service.ts:132-141`), and the single virtual tab (`:103-121`);
  - the palette labels (`command-palette.service.ts:157-191`) and the panel bridge (`CalendarPanel.svelte:44-52`);
  - the month day click and second click (`EventMonthGrid.svelte:24-48`), `+N` / `+N more` (`EventAllDayLane.svelte:66-74`, `EventMonthGrid.svelte:112-116`) and 5 columns without weekends (`EventMonthGrid.svelte:10`);
  - the sticky axis (`EventTimeGrid.svelte:290`), the `dayStartHour` scroll (`:84`) and Escape cancelling a drag (`:119-126`);
  - the popover buttons (`EventPopover.svelte:187-195`) and the form labels (`EventForm.svelte:64-166`).
  See finding 3 for the narrow-column wording.
- [x] **Schema, event type, sanitized titles, Needs attention.** Met, with one wrong statement (finding 1). Checked:
  - the schema table against `entryToEvent` (`event-calendar-event.logic.ts:122-181`): absent `start` means all-day, absent `end` means start plus the default duration, an unknown color falls back to the default, and `end_date` makes the event read-only;
  - `24:00` against `parseTimeStrict` (`event-calendar-dates.logic.ts:326-334`);
  - the sanitizing rule (`event-calendar-event.logic.ts:37, 221-224`) and the `Standup 1.md` numbering (`event-calendar-form.logic.ts:205-222`);
  - every Needs-attention text against `EventCalendarNeedsAttention.svelte:15-36`.
- [x] **Which notes show, "Using existing Event notes".** Met. `27-calendar.md:112-124`. Checked against `eventsFromEntries` (system folder skipped, archived counted, `event-calendar-event.logic.ts:198-212`), the quiet `N unscheduled` link and the `Unscheduled (N)` section (`EventCalendarNeedsAttention.svelte:78-97`), the "date is not YYYY-MM-DD" hint (`:33-37`) and the `_system` default (`settings.store.svelte.ts:87`).
- [x] **Floating times, 24 rows, where new events go.** Met. `27-calendar.md:126-139`. Checked against `createNow`: `createTypedNote` with `contextDate: dayjs(draft.date)`, and a lossy template refused with `template-lossy` (`event-calendar.service.ts:587-604`).
- [x] **Write rules.** Met. `27-calendar.md:141-155`. The six refusal shapes match `WRITE_ERROR_MESSAGES` (`event-calendar.service.ts:945-953`) and `detectLossyFrontmatter`. The duplicate rule matches `duplicateEvent`: bytes are copied unchanged unless `event_title` is present and the frontmatter is safe (`event-calendar.service.ts:643-661`).
- [x] **Undo scope, search timing, sync copies, `.collection` recipe.** Met. `27-calendar.md:157-201`. Checked:
  - the history cap of 100 (`event-calendar-history.logic.ts:34`);
  - the refused and vanished toast texts and `dropPath` (`event-calendar.service.ts:840-844, 1054-1070`).
  The recipe's use of `filters: '_type == "Event"'` in place of the Issue's `filter:` shorthand is correct: `12-collection.md:186-205, 362-365` gives `filters:` as the real key, with case-insensitive `_type` matching.
- [x] **Help index row and cross-links (08, 18, 19, 20, 25).** Met. `README.md:48`, `08:39, 50-53`, `18:33, 76`, `19:151-167`, `20:14, 60-74, 97-99, 120`, `25:591-593, 660`. The 19-settings labels and defaults match `EventCalendarSection.svelte:88-221` and `settings.store.svelte.ts:102-111`. The 18-trash claim that a note is indexed again at once matches `trash.service.ts:143-146`. See findings 4-6 for small issues in 20.
- [x] **README feature list.** Met. `README.md:50`.
- [x] **CLAUDE.md.** Met. `event-calendar` is under `features/` (`CLAUDE.md:66`), `trash.service::restoreItem` is on the write-path list (`:272`), and `restore` is in the source list with "fires the IPC on every call" (`:274`). This matches `SOURCE_POLICY.restore = { consumers: 'always', rust: 'always' }` (`note-change.service.ts:93-94`) and the call site (`trash.service.ts:105-106, 143-146`). See finding 7 (formatting only).
- [x] **Archify map.** Met by the fallback. The `archify` skill is not available, both map files are untouched (`kokobrain-runtime.architecture.json:73` still reads "5 change sources"), and `36-followups-full-e2e.md` carries the follow-up.
- [ ] **Gate green, one commit in full format.** The deliver step confirms this. The diff is docs only, and 307ab3e2 has Context, Problem, Solution, Behavior and Files with line ranges.

## Findings

1. **Medium** `help/documentation/27-calendar.md:96`. The page says that after you rename the type in the type sidebar, "notes keep their old `type:` value until they are updated, and the calendar keeps looking for the old name". The first half is wrong. `renameType` (`src/lib/features/type-definitions/type-definitions.service.ts:174-189`) rewrites open tabs and then calls `propagate_type_rename`, which rewrites `_type:` and `type:` on every member note (`src-tauri/src/commands/vault.rs:331-371`, `src-tauri/src/vault/parsing.rs:98-147`). So the notes carry the new name at once, and the setting still holds the old one, so every event drops off the calendar. Rewrite the sentence along these lines: "Renaming the type in the type sidebar renames it in every member note, but not in this setting: enter the new name in **Settings > Calendar > Event type**, or your events disappear from the calendar."
2. **Low** `help/documentation/27-calendar.md:94`. "The calendar never uses the name `Type`." does not tell the user what happens. `normalizeEventTypeName` (`src/lib/core/settings/settings.logic.ts:64-69`) turns an empty value or `Type` (in any case) into `Event`. Write that: "Leaving the field empty, or entering `Type` (the type of type-definition notes), resets it to `Event`."
3. **Low** `help/documentation/27-calendar.md:32`. "Short events in a narrow column show only their title" understates the rule. Under the 84 px container width, every block shows only its title, whatever its height (`src/lib/features/event-calendar/EventBlock.svelte:76-104`). Write "Events in a narrow column show only their title."
4. **Low** `help/documentation/27-calendar.md:182`. The Escape row reads "Close the popover", but `20-keyboard-shortcuts.md:71` reads "Close the event popover, or cancel a drag", and the page itself says Escape cancels a drag (`:51`). Make the two tables say the same thing.
5. **Low** `help/documentation/20-keyboard-shortcuts.md:120`. On the printable reference card, the lone `Cmd+Shift+C Calendar` line sits between two three-column rows and breaks the column layout. Move it below the last row (`Cmd+Shift+B L Side  Cmd+Shift+L Block`).
6. **Low** `help/documentation/20-keyboard-shortcuts.md:99`. **Calendar: Undo / Calendar: Redo** is listed under "Commands Without Shortcuts", but inside the Calendar tab both have shortcuts (`Cmd+Z`, `Cmd+Shift+Z` / `Ctrl+Y`), as the new Calendar section on the same page says. Add "(`Cmd+Z` / `Cmd+Shift+Z` inside the Calendar tab)", or move the row.
7. **Low** `CLAUDE.md:66`. Adding `event-calendar` to the comment line makes it much longer than its neighbors. Re-wrap the `features/` comment so each line stays about as wide as the others (for example, move `file-history,` to the next line).

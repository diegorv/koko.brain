# Issue 17 discovery

No `spec.md` in `.scratch/ux-polish/`; the Issue and `work/radius.md` P1 are the source. The ratchet comes from Issue 16 (`work/16/`, `src/tests/lib/radius-scale.test.ts`).

## Files that change (bare `rounded` -> `rounded-md`)

- `src/lib/features/rail-shell/FilesNavigator.svelte:286` (`rowClass`, used by the root row :318 and folder rows :420)
- `src/lib/features/rail-shell/TypesNavigator.svelte:265` (type row) and `:403` (lens/view row)
- `src/lib/features/note-list/NoteRow.svelte:44` (rename wrapper) and `:63` (row button)
- `src/lib/plugins/one-on-one/MyPeopleSection.svelte:42` (person row)
- `src/lib/features/tasks/TasksView.svelte:201` (task row)
- `src/lib/features/event-calendar/EventCalendarNeedsAttention.svelte:44` (row)

Untouched: `NoteRow.svelte:57/99/109`, `FilesNavigator.svelte:440/458`, `TypesNavigator.svelte:238`, `MyPeopleSection.svelte:67`.

## Baseline (`radius-scale.test.ts`, rule "bare rounded")

FilesNavigator 3 -> 2, TypesNavigator 3 -> 1, NoteRow 5 -> 3, MyPeopleSection 2 -> 1; TasksView and EventCalendarNeedsAttention 1 -> 0, so their lines are deleted (the scan leaves zero-count files out).

## Tests (failing first)

- `FilesNavigator.test.ts:146` row loop (root + folder rows): `classList` contains `rounded-md`, `className` does not match `/(^|\s)rounded(\s|$)/`.
- `TypesNavigator.test.ts:177` (type rows via `rowEls()`) and `:439` (`viewEl(PROJECTS)`, lens row).
- `RailNoteList.test.ts:243` `row('beta')`.
- `MyPeopleSection.test.ts`: `rowEl('Ana')` in a case of its own, next to the token case.

## Plan

1. Add the four assertions, run the four files, see them fail.
2. Swap the eight classes, lower the baseline, run the four files plus `radius-scale.test.ts` and `pnpm check`.

## Risks / defaults

- Rename wrapper (`NoteRow.svelte:44`) has no test case here; the baseline holds it (5 -> 3 covers both sites).
- Already-`rounded-md` sites (Rail, right-sidebar panels, settings nav) are not edited; the ratchet would not catch a regression there, `git diff` does.

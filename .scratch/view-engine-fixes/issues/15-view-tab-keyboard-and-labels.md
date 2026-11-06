# 15: `.view` tab keyboard and labels

**What to build:**
- The four toolbar icon buttons of the `.view` tab have no `aria-label` or `title` (`src/lib/features/collection/CollectionView.svelte:593-668`).
- Table rows and headers cannot be reached or activated by keyboard (`CollectionTableView.svelte:44-58`).
- In the calendar, "Today" works only on double-click, `+N more` does nothing, and nothing has an `aria-label` (`CollectionCalendarView.svelte:90-96`, `:133-165`).

Fix: labels and titles on the buttons; rows focusable with Enter opening the note; header sort by keyboard if headers sort by click; calendar Today by keyboard and `+N more` expanding the day.

**Blocked by:** 13

**Status:** ready-for-agent

**Gate:** frontend: `pnpm check` + `pnpm vitest run`.

- [ ] Failing tests first:
  - `src/tests/lib/features/collection/CollectionView.test.ts`: the four buttons are found by role and name; Enter on a focused row opens its note.
  - A calendar test: `+N more` renders the hidden chips.

## Notes

- Overlaps `.scratch/ux-polish/issues/62` (needs-triage) if it covers the same buttons: merge there if so.
- **Size:** S.

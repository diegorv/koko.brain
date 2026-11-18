# 140: `.view` tab keyboard and labels

**Origin:** `view-engine-fixes` Issue 15, moved here on 2026-11-08. Its PRD, raw evidence and closed siblings stay in `.scratch/archived/view-engine-fixes/`. Bare Issue numbers in the text below use that feature's numbering; `priority-2026-11-08.md` in this folder maps them to the numbers here.

**What to build:**
- Table rows and headers cannot be reached or activated by keyboard (`CollectionTableView.svelte:44-58`).
- In the calendar, "Today" works only on double-click, `+N more` does nothing, and nothing has an `aria-label` (`CollectionCalendarView.svelte:90-96`, `:133-165`).

Fix: rows focusable with Enter opening the note; header sort by keyboard if headers sort by click; calendar Today by keyboard and `+N more` expanding the day.

**Blocked by:** 139

**Status:** ready-for-agent

**Gate:** frontend: `pnpm check` + `pnpm vitest run`.

- [ ] Failing tests first:
  - `src/tests/lib/features/collection/CollectionView.test.ts`: Enter on a focused row opens its note.
  - A calendar test: `+N more` renders the hidden chips.

## Notes

- **Size:** S.

## Comments

- 2026-11-17, triage: partly replaced. Bullet 1 (names for the four `.view` toolbar buttons) moved to `.scratch/shell-sidebars-ux/issues/16-filters-count-clear-view-triggers.md`. The table-row keyboard and collection calendar halves stay here.

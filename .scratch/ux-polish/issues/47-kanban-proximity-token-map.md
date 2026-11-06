# 47: Kanban date proximity has one token-based map, and done cards drop it

**What to build:** Date proximity is styled four times with raw palette shades: the card border map (`src/lib/plugins/kanban/KanbanCard.svelte:118-125`, red-500, yellow-500, orange-400, blue-400), the picker badge map (`KanbanDatePicker.svelte:20-27`, red-400, yellow-400 and others), and inline ternaries in `KanbanListView.svelte:48` and `KanbanTableView.svelte:69` (red-500 and yellow-500, with tomorrow and upcoming muted). yellow-400 is 1.36:1 on Lavender. Completed cards keep the overdue border and badge while struck through (`KanbanCard.svelte:114,167`). Move it into `kanban.logic.ts` next to `getDateProximity` (about line 690):
- `PROXIMITY_CLASSES: Record<DateProximity, { badge: string; border: string }>`: overdue `bg-destructive/15 text-destructive` and `border-l-4 border-l-destructive`; today `bg-warning/15 text-warning` and `border-l-4 border-l-warning`; tomorrow `bg-type-orange/15 text-type-orange` and `border-l-4 border-l-type-orange`; upcoming `bg-type-blue/15 text-type-blue` and `border-l-4 border-l-type-blue`; future and none `bg-muted text-muted-foreground` and no border.
- `cardProximity(dateStr, todayStr, checked)`: `'none'` when `checked`, else `getDateProximity`. **Owner decision, recommended:** checked cards show no proximity tone.
- `KanbanCard.svelte` (114 and the border map), `KanbanDatePicker.svelte` (the badge map), `KanbanListView.svelte` (30, 48) and `KanbanTableView.svelte` (37, 69) use `cardProximity` and `PROXIMITY_CLASSES`; no local maps or ternaries remain. The list and table views gain the tomorrow and upcoming tones.

**Blocked by:** none

**Status:** wontfix

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`.

- [ ] Failing first, `src/tests/lib/plugins/kanban/kanban.logic.test.ts`: `cardProximity` returns `'none'` for a checked overdue card and `'overdue'` for the same card unchecked; `PROXIMITY_CLASSES` has an entry for every `DateProximity`, none of its strings matches a Tailwind palette class (`/-(red|orange|amber|yellow|green|blue|purple)-\d{2,3}\b/`), and each tone uses the token named above.
- [ ] Failing first, `src/tests/lib/plugins/kanban/KanbanView.test.ts` (real stores): a board with a checked card dated yesterday renders that card without `border-l-destructive`, and an unchecked one with it.
- [ ] Existing kanban tests stay green.

## Notes

- **Source:** review-2026-11-04.md section 3 row 99; `work/color.md` H4; `work/views.md` P5 and standard 4.
- **Tailwind:** class strings in a `.logic.ts` file are picked up by Tailwind 4's source scan; `pure-logic.test.ts` still holds (no framework imports).
- **Contrast:** `type-orange` and `type-blue` are lifted to 3:1 on the sidebar, below 4.5:1 for small text; raising the type palette is separate contrast work.
- **Out of scope:** `KanbanTableView.svelte:74` and `KanbanLane.svelte:311` (Issue 48), the empty-date trigger noise, chip radius and size.
- **Size:** M.

## Comments

- 2026-11-06: migrated to `.scratch/audit-2026-11-05/issues/68-kanban-date-proximity-has-one-token-based.md` by audit 2026-11-05 (its re-checked text and any related audit findings now live there, in one plan ordered by impact on written content and daily use). Closed here as wontfix so it is worked in one place; nothing was implemented.

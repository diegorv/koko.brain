# 68: Kanban date proximity has one token-based map, and done cards drop it

**Migrated from:** `.scratch/ux-polish/issues/47-kanban-proximity-token-map.md` (audit 2026-11-05). Priority: polish (bucket 3-polish). A visual fix on daily boards. The checked-card behavior is a recommended but unconfirmed owner decision. Issues 48 and 63 build on it.

**Audit check at `5f8003d67`:** still_present (ux, medium). Four local raw-palette maps remain and no shared map exists (git log -S'PROXIMITY_CLASSES' only hits the Issue-drafting commit d78dcf38f). src/lib/plugins/kanban/KanbanCard.svelte:118-125 PROXIMITY_BORDER (red-500, yellow-500, orange-400, blue-400); KanbanDatePicker.svelte:20-27 PROXIMITY_BADGE (red-400, yellow-400, orange-400, blue-400); KanbanListView.svelte:48 and KanbanTableView.svelte:69 inline ternaries (red-500, yellow-500, else muted). kanban.logic.ts:687-690 has DateProximity and getDateProximity but no cardProximity or PROXIMITY_CLASSES. Done cards still keep the tone: KanbanCard.svelte:114 `getDateProximity(cardDate, ...)` ignores item.checked, :167 applies PROXIMITY_BORDER[dateProximity] to the card and :216 passes proximity to KanbanDatePicker, while :210 strikes the text through for item.checked. List view (:30, :48) and table view (:37, :69) likewise ignore item.checked. The tokens --destructive, --warning, --type-orange, --type-blue exist in both themes (src/app.css:159/219, 192/265, 184/257, 188/261). The visible part for daily use is a completed overdue card still showing a red left border and red badge on the board, which is common with a real task board.

**Stale in the text below:** Line numbers all match HEAD. Issue text 'Owner decision, recommended' is still an open decision (checked cards show no proximity tone); per the memory note on owner-decision Issues, confirm with the owner before relay launch. Existing tests are in src/tests/lib/plugins/kanban/KanbanView.test.ts and kanban.logic.test.ts (getDateProximity tests at kanban.logic.test.ts:1136-1165), as the Issue says.

**Owner decision (2026-11-06):** done (checked) cards drop the date proximity tone. Any wording below that assumes this decision, calls it recommended or unconfirmed, or asks to confirm it with the owner is superseded: the owner confirmed it on 2026-11-06.

**What to build:** Date proximity is styled four times with raw palette shades: the card border map (`src/lib/plugins/kanban/KanbanCard.svelte:118-125`, red-500, yellow-500, orange-400, blue-400), the picker badge map (`KanbanDatePicker.svelte:20-27`, red-400, yellow-400 and others), and inline ternaries in `KanbanListView.svelte:48` and `KanbanTableView.svelte:69` (red-500 and yellow-500, with tomorrow and upcoming muted). yellow-400 is 1.36:1 on Lavender. Completed cards keep the overdue border and badge while struck through (`KanbanCard.svelte:114,167`). Move it into `kanban.logic.ts` next to `getDateProximity` (about line 690):
- `PROXIMITY_CLASSES: Record<DateProximity, { badge: string; border: string }>`: overdue `bg-destructive/15 text-destructive` and `border-l-4 border-l-destructive`; today `bg-warning/15 text-warning` and `border-l-4 border-l-warning`; tomorrow `bg-type-orange/15 text-type-orange` and `border-l-4 border-l-type-orange`; upcoming `bg-type-blue/15 text-type-blue` and `border-l-4 border-l-type-blue`; future and none `bg-muted text-muted-foreground` and no border.
- `cardProximity(dateStr, todayStr, checked)`: `'none'` when `checked`, else `getDateProximity`. **Owner decision, recommended:** checked cards show no proximity tone.
- `KanbanCard.svelte` (114 and the border map), `KanbanDatePicker.svelte` (the badge map), `KanbanListView.svelte` (30, 48) and `KanbanTableView.svelte` (37, 69) use `cardProximity` and `PROXIMITY_CLASSES`; no local maps or ternaries remain. The list and table views gain the tomorrow and upcoming tones.

**Blocked by:** none

**Status:** ready-for-agent

**First wave:** yes, added on 2026-11-06 because first-wave Issue 83 and 84 is blocked by it.

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

- 2026-11-06: migrated from `.scratch/ux-polish/issues/47-kanban-proximity-token-map.md` by audit 2026-11-05, which re-checked it at `5f8003d67`.
- 2026-11-06: owner decision recorded from the 2026-11-06 survey; status ready-for-agent.

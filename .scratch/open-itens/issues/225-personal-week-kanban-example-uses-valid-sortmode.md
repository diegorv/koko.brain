# 225: The personal-week kanban example uses the valid sortMode "checked", and the docs say the sort is per board

**Origin:** `audit-2026-11-05` Issue 76, moved here on 2026-11-08. Its PRD, raw evidence and closed siblings stay in `.scratch/archived/audit-2026-11-05/`. Bare Issue numbers in the text below use that feature's numbering; `priority-2026-11-08.md` in this folder maps them to the numbers here.

**What to build:** personal-week.kanban sets "sortMode": "unchecked" (help/examples/kanban-features/personal-week.kanban:24), which is not a KanbanSortMode (src/lib/plugins/kanban/kanban.types.ts:43; the 'Unchecked first' option is "checked", KanbanView.svelte:193). sortItems has no case for it, so nothing is sorted, canReorderItems is false so card and lane dragging are off, and the sort select shows blank. The README (help/examples/kanban-features/README.md:9) repeats the wrong value, and help/documentation/21-kanban.md:176 says the sort mode is per lane while it is a board setting (kanban.types.ts:56-57). Fix the example and README to "checked" and the doc wording to per board.

**Blocked by:** none

**Status:** ready-for-agent

**Gate:** frontend only: `pnpm check` + `pnpm vitest run`.

- [ ] Failing test first, in a new src/tests/help/kanban-features.test.ts next to src/tests/help/collection-features.test.ts: every .kanban under help/examples/kanban-features parses with parseKanbanBoard and its settings.sortMode, when set, is one of the SORT_LABELS keys. It fails today on personal-week.kanban.
- [ ] personal-week.kanban opens sorted with unchecked cards first and the sort select shows 'Unchecked first'.
- [ ] README.md and 21-kanban.md match the code.
- [ ] Targeted gate: pnpm vitest run src/tests/help/kanban-features.test.ts and pnpm check pass.

## Notes

- **Priority:** polish (bucket 3-polish). Polish/low. It is an example and docs fix.
- **Trigger:** Copy help/examples/kanban-features into a vault and open personal-week.kanban, or follow its README line.
- **Evidence (verified by reading code at `5f8003d67`):** help/examples/kanban-features/personal-week.kanban:24 "sortMode": "unchecked"; help/examples/kanban-features/README.md:9; src/lib/plugins/kanban/kanban.types.ts:43 union has 'checked', not 'unchecked'; src/lib/plugins/kanban/kanban.logic.ts:41-45 and :144 settings are JSON.parse'd without validation; kanban.logic.ts:837-876 sortItems has no 'unchecked' case; kanban.logic.ts:906-908 canReorderItems requires 'manual'; src/lib/plugins/kanban/KanbanView.svelte:173, :534 disable drag; KanbanView.svelte:488-495 select has no option for the stored value; help/documentation/21-kanban.md:176 'per lane' vs kanban.types.ts:56-57 board-level sortMode.
- **Source:** audit 2026-11-05, domain `boards`, finding `N-boards-08` (from boards-spec-5). Size S.

**Second opinion (audit 2026-11-05, round 2):** upheld (polish, low). Confirmed. personal-week.kanban:23 has "unchecked", and the README :9 repeats it. KanbanSortMode (kanban.types.ts:43) has 'checked'. sortItems has no case for 'unchecked', so nothing is sorted. 21-kanban.md:176 says 'per lane', but sortMode is in the board-level KanbanSettings (:56-57). Corrections to apply while implementing: The AC compares against 'the SORT_LABELS keys', but SORT_LABELS is a local const inside KanbanView.svelte:187 that a test cannot import. Compare against an explicit list of the KanbanSortMode values, or an exported constant. The impact is slightly overstated: dragging is off for any non-manual sort (canReorderItems, kanban.logic.ts:906-908), so switching to "checked" will not bring dragging back. Only the missing sort and the blank select are caused by the wrong value.

## Comments

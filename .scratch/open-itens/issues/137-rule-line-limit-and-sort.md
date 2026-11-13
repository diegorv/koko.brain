# 137: Rule line names the limit and the sort source

**Origin:** `view-engine-fixes` Issue 10, moved here on 2026-11-08. Its PRD, raw evidence and closed siblings stay in `.scratch/archived/view-engine-fixes/`. Bare Issue numbers in the text below use that feature's numbering; `priority-2026-11-08.md` in this folder maps them to the numbers here.

**What to build:** `limit` is applied last (`src/lib/features/rail-shell/lens.logic.ts:720`); the count and search see only the capped list, and the rule line never says so (`RailNoteList.svelte:717`). Picking in the rail sort menu writes the view `sort:`, which silently turns off `_sort` and the `_order` pins (`RailSortMenu.svelte:60-64`; `type-note-list.logic.ts:96-98`).

- The rule line ends with "max N" when `limit` cuts the list, and names the sort source: "view sort" or "_sort: title".
- The sort menu says, under its header, that picking a column replaces `_sort` and the pins.

**Blocked by:** 136

**Status:** ready-for-agent

**Gate:** frontend: `pnpm check` + `pnpm vitest run`.

- [ ] Failing tests first:
  - `src/tests/lib/features/rail-shell/RailNoteList.view.test.ts`: a view with `limit: 10` over 12 notes renders a rule line containing "max 10".
  - `src/tests/lib/features/rail-shell/RailNoteList.sort.test.ts`: the sort menu renders the replacement note.
- [ ] `help/documentation/25-types-and-relationships.md` § Inline Filter and Sort Toolbar.

## Notes

- **Run after (other feature):** view-editor 04 (`RailNoteList.svelte`). relay-lite does not enforce this.
- **Size:** S.

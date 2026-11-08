# 214: Hovering the open note keeps its fill, and the kanban lane grip appears on lane hover

**Origin:** `audit-2026-11-05` Issue 65, moved here on 2026-11-08. Its PRD, raw evidence and closed siblings stay in `.scratch/audit-2026-11-05/`. Bare Issue numbers in the text below use that feature's numbering; `priority-2026-11-08.md` in this folder maps them to the numbers here.

**Migrated from:** `.scratch/ux-polish/issues/15-hover-keeps-active-row-and-lane-grip.md` (audit 2026-11-05). Priority: polish (bucket 3-polish). Still present, a visual fix on daily rows.

**Audit check at `5f8003d67`:** still_present (polish, medium). Part 1: src/lib/features/note-list/NoteRow.svelte:65 has 'hover:bg-primary/10' and '{isActive ? 'bg-primary/25' : ''}' on the same button, so the hover variant overrides the active fill (the cursor usually stays on the row right after clicking it). Part 2: src/lib/plugins/kanban/KanbanLane.svelte:215 declares group/lane, :236 uses unnamed 'group-hover:opacity-60' on the grip, while :356 and :391 already use group-hover/lane. I grepped src/lib/core, app, features/rail-shell, kanban and src/routes for a bare 'group' class: only KanbanCard.svelte:167 (a descendant), EditorTabs, AppearanceSection, HeadingTypographyEditor and +page.svelte:47, none an ancestor of the lane. So the grip stays at opacity-0.

**Stale in the text below:** NoteRow hover is at line 65 (Issue says about 63); resize handle is at 391 (Issue says about 393). The TypesNavigator pattern is now in the viewRow snippet at src/lib/features/rail-shell/TypesNavigator.svelte:409-411 and uses file-explorer tokens (bg-file-explorer-primary/25 vs hover:bg-file-explorer-primary/10), not line 265. Tailwind ordering is not proven by running; the Issue says the E2E case is the proof.

**What to build:** Two class bugs in hover states:

1. `src/lib/features/note-list/NoteRow.svelte` (about line 63) puts `hover:bg-primary/10` and the active `bg-primary/25` on the same element. Tailwind emits the hover variant after the base utility, so hovering the open note lightens it from 25% to 10%. Use the ternary form the TypesNavigator rows already use (`TypesNavigator.svelte` about line 265): `{isActive ? 'bg-primary/25' : 'hover:bg-primary/10'}`.
2. `src/lib/plugins/kanban/KanbanLane.svelte`: the lane root declares the named group `group/lane` (about line 215), but the lane drag grip (about line 236) uses the unnamed `group-hover:opacity-60`, and no unnamed `group` ancestor exists above the lane (the cards' `group` at `KanbanCard.svelte:167` are descendants), so the grip stays at `opacity-0`. Change it to `group-hover/lane:opacity-60`, as the resize handle at about line 393 already does.

**Blocked by:** none

**Status:** ready-for-agent

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`, plus `bash scripts/e2e.sh e2e/specs/rail-shell.spec.ts e2e/specs/kanban-view.spec.ts`.

- [ ] Failing first (E2E, real computed style; jsdom cannot evaluate Tailwind hover): in `e2e/specs/rail-shell.spec.ts`, open a note so its `[data-note-row]` is active, read its computed `background-color`, hover it, and assert the color is unchanged. Fails on the current code
- [ ] Failing first (E2E): in `e2e/specs/kanban-view.spec.ts`, open a board, hover a lane (`[data-lane-id]`), and assert the `[aria-label="Drag to reorder lane"]` grip has computed `opacity` above 0. Fails on the current code
- [ ] Both cases pass after the two class changes; the rest of both specs stays green
- [ ] An inactive note row still shows the `bg-primary/10` hover; the card grip (`KanbanCard.svelte:227`) is unchanged
- [ ] Before editing, confirm no unnamed `group` class sits on any ancestor of `KanbanLane` (grep the kanban plugin, `EditorView` and `AppShell`); if one exists, say so in the commit, since the grip then appeared on whole-pane hover

## Notes

- **Other tickets:** Overlaps the review's work-breakdown ticket 10 (interaction state unification), which lists both sites; if that ticket is drafted elsewhere, drop NoteRow:63 and KanbanLane:236 from it.
- **Source:** review-2026-11-04.md section 2 "State styles" ("never lightened by hover") and work breakdown ticket 10 (NoteRow 63, the `group/lane` fix at KanbanLane 236); states.md P5 (NoteRow, line 49) and P19.
- **Out of scope:** SnapshotList and the Settings nav (their selected fill equals hover, which needs the selection-token decision in review section 2), reveal-on-focus for the 12 hover-only controls, and the grip's keyboard access (`tabindex="-1"`).
- **Tailwind ordering** (hover variant after base utility) is from the reports and memory; the E2E case is the proof.
- **Size:** S.

## Comments

- 2026-11-06: migrated from `.scratch/ux-polish/issues/15-hover-keeps-active-row-and-lane-grip.md` by audit 2026-11-05, which re-checked it at `5f8003d67`.

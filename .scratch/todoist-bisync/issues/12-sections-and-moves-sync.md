# 12: Sections and task moves sync both ways

**What to build:** Todoist sections appear as `##` headings in the project note with their tasks under them, a new `##` heading with tasks becomes a section, a section rename in Todoist renames the heading, and moving a task between sections or projects on either side moves it on the other. Design: `.scratch/todoist-bisync/research/design.md` Sections.

**Blocked by:** 11

**Status:** resolved

- [x] Failing tests first (fake `/sync`, real stores).
- [x] `todoist_section_link(todoist_section_id, project_id, heading)` table. A line under no linked heading has `section_id: null`. Section order is not synced.
- [x] Pull: new section -> heading appended; renamed section -> heading text replaced; task `section_id` or `project_id` change -> line moved with the same anchor (same note: one writer call; another note: insert in the target first, then remove from the source).
- [x] Push: a brain `##` heading with at least one task line and no link -> `section_add`; a line moved under another heading or into another project note -> `item_move` (one of section_id / project_id per command). A brain heading rename counts as a new section in this basic form (old link kept, logged).
- [x] A line moved out of scope (a non-project note without `#todoist`) is detached, never moved in Todoist.
- [x] Gate: Both (schema change).

## Notes

- Size: M.

## Comments

- 2026-11-10, branch `issue/12-sections-and-moves-sync`: sections and task moves sync both ways (`todoist_section_link` table, section_add / item_move push, heading append/rename and line moves on pull, out-of-scope moves detach). Fix rounds resolved review.md findings and review-2.md's finding (a brain-renamed heading is logged only once Todoist creates its section). Tests: pnpm check clean; full vitest at 16b61ffb3 exit=0 (608 files, 14937 passed, 54 skipped, 1 todo); cargo test exit=0 (1430 passed, bindings unchanged). Reviews: round 1 CHANGES_REQUESTED, round 2 APPROVED, round 3 APPROVED (no findings).

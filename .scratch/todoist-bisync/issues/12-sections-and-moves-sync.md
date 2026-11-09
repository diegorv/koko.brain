# 12: Sections and task moves sync both ways

**What to build:** Todoist sections appear as `##` headings in the project note with their tasks under them, a new `##` heading with tasks becomes a section, a section rename in Todoist renames the heading, and moving a task between sections or projects on either side moves it on the other. Design: `.scratch/todoist-bisync/research/design.md` Sections.

**Blocked by:** 11

**Status:** ready-for-agent

- [ ] Failing tests first (fake `/sync`, real stores).
- [ ] `todoist_section_link(todoist_section_id, project_id, heading)` table. A line under no linked heading has `section_id: null`. Section order is not synced.
- [ ] Pull: new section -> heading appended; renamed section -> heading text replaced; task `section_id` or `project_id` change -> line moved with the same anchor (same note: one writer call; another note: insert in the target first, then remove from the source).
- [ ] Push: a brain `##` heading with at least one task line and no link -> `section_add`; a line moved under another heading or into another project note -> `item_move` (one of section_id / project_id per command). A brain heading rename counts as a new section in this basic form (old link kept, logged).
- [ ] A line moved out of scope (a non-project note without `#todoist`) is detached, never moved in Todoist.
- [ ] Gate: Both (schema change).

## Notes

- Size: M.

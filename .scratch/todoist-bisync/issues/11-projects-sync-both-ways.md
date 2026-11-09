# 11: Projects sync both ways

**What to build:** A note created in the sync folder becomes a Todoist project with its tasks, a project created in Todoist becomes a note on the next sync, and renaming either side renames the other. An archived project stops syncing its note; a deleted one detaches it. Design: `.scratch/todoist-bisync/research/design.md` Project model.

**Blocked by:** 10

**Status:** ready-for-agent

- [ ] Failing tests first (fake `/sync` with project commands, real stores, real path-change service).
- [ ] A new note directly in the sync folder (not a subfolder, not excluded) without `todoist_project` frontmatter: `project_add` (uuid, temp_id, `parent_id` = the root project, design rule 8c) and its tasks' `item_add` in the same request with `project_id` = the temp id; the frontmatter id is written on ack.
- [ ] Todoist rename: the file is renamed through the app's rename-with-links path (`renameItem`). Brain file rename: `project_update` with the new filename as name.
- [ ] `is_archived`: the note's tasks stop syncing (links kept); unarchive resumes. `is_deleted`: the note and its links are detached (nothing deleted), logged.
- [ ] Two notes with the same project id freeze that project, logged.
- [ ] Only projects in the vault's tree (design rule 8c) get notes. A project moved out of the tree in Todoist detaches its note and links (nothing deleted, logged); one moved into the tree gets a note. Events for projects outside the tree are ignored.
- [ ] Gate: frontend, or Both if IPC changes.

## Notes

- Size: M.

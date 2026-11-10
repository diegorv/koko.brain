# 11 discovery: projects sync both ways

No `spec.md`; design is `research/design.md` Project model, rules 2, 8c, 9, 10, 12. Builds on 06/10/13 (`work/06/`, `work/10/`, `work/13/`): same fakes, same `syncNow` cycle. Only what differs is listed.

## Files

- New `features/todoist-sync/projects.logic.ts` (pure): project state in `todoist_kv` key `projects` (JSON `{bases, pending, refused}`; no Rust or IPC change), `planProjects` (adopt bases, renames either way, brain-born project adds and resends, held projects, note detaches), `noteName`.
- `sync-now.service.ts:196-204`: the incremental pull asks for `projects` too; projects = full + incremental merged by id. `planProjects` before `planPull` (`heldProjectIds`); bases of `plan.createNotes`; pending project notes into `planCreates` (`pendingProjects`); new project adds count as creates (cap, preview, auto skip). `pushCreates:490`: `project_add` (uuid, temp id, `parentId` = root) first, then the `item_add`s, temp ids resolved across 100-command chunks; ok -> `updateNoteFrontmatter` writes `todoist_project`, base stored; terminal -> path refused, logged. New `project_update` push, and the Todoist renames last (`renameItem`), after every line write of the cycle.
- `pull.logic.ts:144,551`: `PullInput.heldProjectIds` (no note created for them); `PullCounts.projectsCreated`, `projectsRenamed` + `formatPullResult`.
- `create.logic.ts:67,149`: `CreateInput.pendingProjects` (note path -> temp id).
- `detach.logic.ts:42,76`: a link whose task's project (item, else `remote_base`) is deleted detaches; `isLiveOutsideTree` exported.
- `src/tests/fixtures/todoist-sync.fake.ts`: `project_add`, `project_update`, `updateProject`, `project`; a full sync leaves out archived projects ("active resource data", API docs).

## Plan (per tree project with exactly one note)

- No base, or a detached base (back in the tree): adopt `{name, relPath}`, no action. Inbox: never renamed.
- Remote name != base name: rename the file to `projectNoteBaseName(name)` (suffix on collision); a local rename too -> Todoist wins, logged.
- Note basename != base basename only: `project_update {id, name: basename}`; base moves on ok, on a terminal error to the remote name (logged).
- Two notes: nothing (planPull already logs `duplicate-project-note`).
- A base outside the tree: deleted -> detached, logged; live outside -> detached, logged; archived or absent -> kept as is (resumes in the tree).
- Note directly in the folder, in scope, no `todoist_project`, not refused: pending `{relPath, name, uuid, tempId}` committed before sending; resent byte-identical until ok (live-check 8: replay returns the mapping). A tree project with no note named like a pending add under the root is held: no second note.

## Tests to copy

- `sync-now.service.test.ts` "brain-born tasks", "a create whose response is lost", "a task moved out of the vault tree"; `create.logic.test.ts`, `detach.logic.test.ts` shapes.

## Defaults taken

- Rebuild mode: bases adopted, no project_add; renames and project_updates still run (design rule 1 forbids only creates).
- A pending note gone or given a `todoist_project` drops its pending add.
- A failed frontmatter write keeps the pending add: the resend returns the same id.

## Risks

- Full sync omitting archived projects is from the docs' wording, not a live check; the code works either way.
- A brain rename and the next Todoist rename in one cycle: Todoist wins, the brain name is only logged.

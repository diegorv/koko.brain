# 12 discovery: sections and task moves sync both ways

No `spec.md`; design is `research/design.md` Sections, rules 1-3, 9, 10, 12. Same fakes and `syncNow` cycle as `work/10/`, `work/11/`; only what differs is listed.

## Files

- Rust: `db/schema.rs:84` new `todoist_section_link(todoist_section_id PK, project_id, heading)`; `db/todoist_repo.rs` `TodoistSectionLink`, `read_sections`, optional `upsertSections` / `deleteSectionIds` on `TodoistStateCommit` (same transaction as the token); `commands/todoist.rs` `todoist_read_sections`; `lib.rs:337`; `contracts/commands.ts:62,246`, `index.ts`. Tests: `tests/todoist_state_test.rs`.
- Writer (`vault/task_lines.rs` + TS port `task-line-edits.logic.ts`): `TaskLineInsert.aboveSections` (lines go above the first `##` heading, so a section-less line never lands in the last section) and `TaskLineEdits.renameHeadings` (`{from, to}`, unique heading text, stale `headingMissing` / `headingDuplicated`). Both optional, so no caller changes. Tests: `tests/vault_task_lines_test.rs`, `task-line-edits.logic.test.ts`.
- New `features/todoist-sync/sections.logic.ts` (pure): `noteOutline` (the `##` headings of a project note, the heading above each anchor, headings with a task line), `planSections` (pair a remote section with a same-text heading, append `## name`, rename the heading, `section_add` for a brain heading with tasks), `outOfScopeAnchors`, `planMoves` (location = note project + linked `##` heading; three-way against `local_base.location` and `remote_base.projectId/sectionId`), `placeInsert`.
- `sync-now.service.ts`: pulls ask for `sections`; outlines of the tree project notes read through `readNoteContent`; `planDetach` gets `outOfScope`; inserts go under their section heading; `NoteBatch` gets heading renames/appends and moves; cross-note moves insert first, remove in a second pass; `pushSections` (`section_add`, counted as creates) and `pushMoves` (`item_move`, counted with the field pushes) after the creates.
- `detach.logic.ts:77` `outOfScope` input; `create.logic.ts:180` local base location + `section_id` when the line's heading is linked; `ackedLink` keeps them; `pull.logic.ts` `PullCounts.tasksMoved`, `sectionsSynced`.
- Fakes: `todoist-sync.fake.ts` `section_add`, `item_move`, `updateSection`, `section`; `todoist-vault.fake.ts` `todoist_read_sections`, section commits.

## Plan (per link: one line, top level, not frozen, no other line change this cycle)

- Line location: note with no `todoist_project` -> `#todoist` lines are free (never moved), others out of scope (detached, never moved in Todoist). Note of a tree project (unique, not frozen) -> `{project, section}`: the link of the `##` heading above it, null when none. Anything else (unlinked or duplicate heading, pending project note) is unknown: skipped.
- Remote changed (item vs `remote_base`), or no `local_base.location` yet (links made before this Issue, rebuild pairs): the line moves to Todoist's place (Todoist wins). Only local changed: `item_move` (`sectionId` when under a section, else `projectId`). Both bases move on success; a terminal refusal moves only the local base, logged.
- Same note: one writer call (remove + insert). Other note: insert in the target, then remove from the source; a failed removal leaves two lines, which the next cycle freezes (rule 10).
- Brain heading rename: the new text has no link, so it goes out as `section_add`; the old link stays, logged; its lines move next cycle by `item_move`.

## Tests to copy

- `sync-now.service.test.ts` "a note becomes a Todoist project", "edits from the brain"; `projects.logic.test.ts` shapes; `vault_task_lines_test.rs` insert tests.

## Defaults taken

- A lost `section_add` response needs no pending state: the next pull pairs the new section with the heading by name. Rebuild mode pairs and renames, never appends or adds.
- Deleted or archived sections keep their link and heading; nothing else.
- Subtasks (indent > 0 or a remote parent) take no part in moves.
- A line under a `##` heading with no live section link (new, renamed or doubled text) has no known place: it neither moves nor pushes until the heading is linked; a new line created there goes to no section (`section_id: null`) and moves into the section once it exists.
- Lines under a `##` heading that can never be linked stay in place indefinitely: they neither move nor push, and their task keeps its Todoist section (never set to `section_id: null`). That covers a heading with no text (never sent as `section_add`), a heading whose text appears twice in the note, one whose linked section is archived or deleted, and one whose `section_add` Todoist refuses. A refused `section_add` is not remembered: it is sent again every cycle and logged as `command-error` on manual cycles only.
- Free lines: a `#todoist` line in a note that is no project note never moves; its place bases follow Todoist.
- Counts: `headingsWritten` (appends + renames) and `sectionsCreated`; line moves count as lines updated, `item_move` acks as tasks updated in Todoist. Section adds count as creates, moves as field pushes, for the caps.
- `item_move {projectId}` to the task's own project moves it out of its section (Todoist docs: the task becomes a root task); not live-checked.

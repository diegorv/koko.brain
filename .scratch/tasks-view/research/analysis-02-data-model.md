# Analysis 02: data-model

Recovered from the workflow journal: the analyst's Write was refused, so only its structured return survives.

## Headline

The one Rust gap that blocks the owner's sourcing complaint is that Task has no heading context (the section rule is a case-sensitive substring that re-reads every task note from disk, parsing.rs:1739, commands/vault.rs:736-753); everything else the view needs (status, dates, priority, tags) is already on the wire and unused, except that task tag parsing disagrees with note tags and will corrupt descriptions once the view shows them. The full analysis file could not be saved, so these findings are only in this structured output.

## Candidate issues

- Task tags follow note-tag rules (Rust): TASK_RE at parsing.rs:1577 has no whitespace boundary, is ASCII-only and has no '/'; by reading, '[[Note#Heading]]' gives tag 'Heading' and breaks the description, '#projeto/alfa' gives tag 'projeto' plus '/alfa' left in text, '#acao' with a cedilla gives tag 'a'. Align with extract_inline_tags (parsing.rs:448-487) and the recurrence stop pattern at parsing.rs:1540. Test-first with those cases. No DTO change.
- Drop the fromV2 hand copy and the duplicate TaskItem/FileTaskGroup in tasks.service.ts:18-46 and tasks.types.ts; use generated types and convert modifiedAt (seconds to ms) once; update the ipc-mirrors allowlist. Prerequisite so a new Rust field is not silently dropped. Frontend gate.
- Add Task.headingPath (ancestor heading texts, outermost first, skipped when empty) filled in extract_tasks, which is already the single parse site called from NoteEntry::from_content_full (entry.rs:249), so indexing-watcher-rules items 1, 6 and 8 are unaffected. Both gate: cargo test regenerates src/lib/contracts/generated. Test nesting, sibling reset, fenced-code headings, and a heading edit through update_note_in_index. Measure DTO size before and after.
- Task state and date semantics (TS logic): isOpen(status) = not done and not cancelled (matches EventTaskChip.svelte:18), fix hideCompleted and stats which today treat checked (= status != todo, parsing.rs:1633) as completed so [/] tasks vanish by default; priority rank; validated day keys (2026-13-45 is stored as a due date today); date buckets with injectable now. Do not change Rust checked because queryjs KBTaskV1.completed depends on it.
- Task query predicates (TS pure logic): task-level predicates (status, date bucket, priority, hierarchical tag, headingPath) plus a note-level join by filePath against the .view property index reusing the existing filter engine, parent/child derived from indent then re-attached after filtering, group and sort key functions (file, heading, due bucket, priority, tag, status). Replaces the substring section tag with a case-insensitive token match.
- Todoist sent identity survives edits and renames: key by clean description with legacy raw-text fallback, additive on-disk format, and a path-change consumer (none exists today: only collection, event-calendar and rail-shell register in path-change.service). Registration must be wired in initializeVault/teardownVault. Overlaps the Todoist analyst.
- Optional completion writes: done date on complete and removal on reopen, a set_task_status command for in-progress and cancelled, and (not recommended) spawning the next recurrence. Today toggle_task_in_content only flips ' ' <-> x (parsing.rs:1873-1915) and 'recurrence' is decoration. Owner decision required; recommended default is do not build.
- Retire get_tasks_in_section_v2, section_task_candidates, tasks_in_section, extract_tasks_from_section and the sectionTag store field once the heading rule runs over get_all_tasks_v2 output; write the CLAUDE.md caller trace (the calendar uses get_all_tasks_v2 only, event-calendar.service.ts:119); update indexing-watcher-rules.md item 1's command list.

## Owner questions

- Which statuses count as open? Recommended default: everything except done and cancelled (matches the calendar), so in-progress, question, forwarded and important stay visible; hide-completed hides only done and cancelled.
- Should the section rule stay 'heading contains token' but become case-insensitive and token-bounded (so #to-list stops matching #to-listing) and apply to any ancestor heading? Recommended default: yes, otherwise same semantics.
- Is the default sourcing 'only the #to-list section' (tasks.store.svelte.ts:8) or 'all tasks'? Recommended default: keep the current default for continuity but show it as an explicit, removable source rule instead of hidden state.
- Do you want a done date written on completion, an in-progress/cancelled action in the list, or recurring tasks that spawn the next occurrence (Obsidian Tasks does the first and third)? Recommended default: none of the three in this run; recurrence stays a label that Todoist interprets.
- Should tasks inside callouts/blockquotes, kanban cards (.kanban is not indexed; cards use a {YYYY-MM-DD} date syntax) and Dataview inline fields be indexed? Recommended default: no.
- Is the ASCII-only task tag rule intentional for any of your notes (the comment at parsing.rs:1574-1576 says deliberate)? Recommended default: no, switch to the note-tag rule (Unicode letters, nested tags, whitespace boundary).
- Is it acceptable that Todoist sent state matches on the clean description, so editing a task's date, priority or tags keeps it marked sent but rewording it makes it look unsent? Recommended default: yes.
- Do you use the id, dependsOn and on-completion signifiers? Recommended default: no UI for them; keep parsing them, since removing a field is a DTO change (Both gate) for no gain.

## Agent note on file

.scratch/tasks-view/research/analysis-02-data-model.md (NOT WRITTEN: the Write tool refused with "Subagents should return findings as text, not write report files"; I did not work around it via Bash)

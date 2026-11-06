# Analysis 13: benchmark

Recovered from the workflow journal: the analyst's Write was refused, so only its structured return survives.

## Headline

The benchmark is done but the analysis file was not written, because the Write tool refused it; the fix is for the Tasks view to get a two-level rule model (note sources, then task filters in the existing {and,or,not} grammar) with status/due/priority filters, group-by, row chips, a live count and saved views, rebuilt in place (Option A) and not as a `.view` type or a text DSL. I wrote the full analysis in that Write call and can resend it to the path on request. Seven of the thirty scouts were missing (23 to 26 and 28 to 30), so I fetched Obsidian Tasks, Dataview, Bases, Things and Linear myself; OmniFocus and TickTick come from search snippets only, and the sync models of Things, TickTick, OmniFocus and Logseq are from memory. Verified in code: the `#to-list` default makes a fresh view empty (tasks.store.svelte.ts:4-10); the sourcing rule is a heading substring (parsing.rs:1739); date chips use file mtime (tasks.logic.ts:76-88); every non-space checkbox counts as done (parsing.rs:1633), so [-] and [/] are hidden; Rust already returns due, scheduled, priority, tags and recurrence, which the row ignores; and groupBy is unimplemented in the `.view` engine (collection.types.ts:47-49). Benchmark takeaways: copy the Obsidian Tasks "everything, then narrow" model with status types, relative date ranges and explain; copy the Linear/Notion/TickTick typed-operator builder with nested AND/OR, a preview or live count, and "save current filters as a view". Skip a text-only DSL, AI filter generation, two-way Todoist sync and Things-style fixed lists. Do better by keeping rules as plain vault data and joining note-level attributes (_type, tags, archived) that no benchmarked tool has.

## Candidate issues

- Task status model in the UI: show all 7 statuses, treat only Done/Cancelled as closed, stop hiding [/] [?] [>] [!] as completed
- Pure task rule engine tasks-rules.logic.ts: sources + filters + group + sort over FileTaskGroup[] joined to NoteEntry, relative due/scheduled ranges, replaces mtime filterByDate
- Note-level sources: folder, tag, _type, archived/inbox via NoteEntry join by absolute path (reuse isListableNote, no new IPC)
- Heading/section rule without per-refetch disk re-read: explicit exact/contains semantics, optionally Rust adds heading to Task (IPC DTO change, Both gate)
- Row presentation and interaction: due/priority/tag/status chips, click opens note at line, toggle only via checkbox, labels and aria-pressed, no list flicker on refetch
- Group-by and sort: file, due bucket, priority, tag, status; collapsible groups; hidden-count line
- Task rule builder UI reusing FilterRow/FilterGroup model with enum pickers, live match count, explain sentence, empty-state reason with fix action
- Saved task views: named views, switcher, modified dot, persisted file (default .kokobrain/tasks-views.json), corrupt-file backup instead of overwrite
- Todoist hardening: toast on sync error, last-synced time, 404 shown as deleted via httpStatusCode, bounded concurrency, nextCursor paging, atomic sent-file write with backup, per-send label opt-out, payload preview
- Todoist sent-task identity that survives text edits and note moves (metadata.id first, migration from filePath:text)
- Todoist SDK major bump spike (^15.8.0 vs 16.0.0/17.0.0, both breaking) checked against todoist*.ts wrapper, with pnpm build gate
- Follow-up: share saved task view with calendar and expose status/dates in queryjs KBTask via a new contract version (defer)

## Owner questions

- Is #to-list a convention to keep? Recommended: seed it as a default saved view named "To list"; new vaults start with "All open tasks".
- Is Cancelled completed for hide-completed, and should InProgress/Question/Forwarded/Important show by default? Recommended: Done and Cancelled are closed, the other four are open and visible.
- Should date filters mean due, scheduled or file activity? Recommended: due/scheduled/start with relative ranges (overdue, today, next 7 days, no date); drop the mtime chips, keep file-modified as an optional field.
- Should archived and inbox notes source tasks? Recommended: archived excluded unless the rule cites it, inbox included.
- Where do saved task views live? Recommended: .kokobrain/tasks-views.json per vault, same pattern as todoist-sent.json.
- Heading rule: contains or exact, and is a Rust DTO change worth dropping the per-refetch disk read? Recommended: case-insensitive exact heading match as a rule option; do the DTO change only if a measured refetch cost justifies it.
- A task with several tags when grouping by tag: listed once or in each group? Recommended: in each group.
- Todoist scope: hardening only, or also two-way (completing in Todoist closes the local checkbox)? Recommended: hardening only, show Todoist completion as a badge, never auto-edit the note.
- Is writing a task identity (block id) into the note acceptable? Recommended: no; use metadata.id when present, otherwise warn on text change.
- Should .kanban cards and .view bodies source tasks (they are not indexed today)? Recommended: no for now, separate decision with its own index cost.
- Should the Tasks view later become a .view type (Option B)? Recommended: revisit after groupBy exists in the .view engine.

## Agent note on file

NOT WRITTEN (Write tool refused: "Subagents should return findings as text, not write report files"). Intended path: /Users/diegorv/Dev/pet-projects/koko/brain/.scratch/tasks-view/research/analysis-13-benchmark.md

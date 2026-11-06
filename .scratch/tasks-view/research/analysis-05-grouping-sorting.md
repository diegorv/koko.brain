# Analysis 05: grouping-sorting

Recovered from the workflow journal: the analyst's Write was refused, so only its structured return survives.

## Headline

Every grouping dimension the owner asked for except heading is a client-side projection of data already on each task, so a pure grouping/sort engine plus a Display control (Option A) fixes it. The prerequisite is a decision on what "completed" means, because `checked` is true for every status except todo and would hide in-progress and important tasks. Also, rows must carry filePath and be keyed filePath:lineNumber before any non-note grouping, or keys collide and toggles can hit the wrong file.

## Candidate issues

- G1: Pure TaskRow model and grouping/sort engine in tasks.logic (note, folder, type, tag, due, priority, status, todoist) with isClosed and dueBucket, no UI, test-first
- G2: Redefine closed as done or cancelled for hide-completed, stats and overdue (matches the Calendar's rule); owner decision
- G3: Group-by and sort Display control with collapsible counted group headers, source-note label on rows, rows keyed filePath:lineNumber, store getters, e2e
- G4: Persist groupBy, sortBy and collapsed groups per vault under .kokobrain/ (shared decision with the filter analyst)
- G5: Folder and note-type group keys via injected resolvers (typeDefinitionsStore.entriesByPath)
- G6: Group by Todoist state (not sent, sent, done in Todoist)
- G7: Rust heading field on Task plus Group by heading (Both gate, regenerate bindings, check ipc-mirrors and kbapi-firewall tests)
- G8 (deferred): Todoist project grouping, needs an optional projectId in SentTaskEntry
- G9 (deferred): second grouping level

## Owner questions

- Should completed mean only done and cancelled for hide-completed, stats and overdue? Default: yes (matches event-calendar-tasks.logic.ts:20); in-progress and important tasks then show by default.
- Which date drives due buckets? Default: due only, no date goes to No date.
- Where do group, sort and collapse state persist? Default: per-vault file under .kokobrain/, decided together with the filter analyst.
- Do you structure notes by headings enough to want Group by heading (the only Rust change, G7)? Default: yes if you use ## sections, otherwise skip.
- Tag grouping: show a task under every tag or only the first? Default: every tag, with unique counts in the summary.
- Folder labels: full relative path or last folder name? Default: full relative path, Vault root for root notes.
- Is one grouping level enough? Default: yes (Option A); second level is deferred G9.
- Todoist: group by state only, or also by project? Default: state now (G6); project only if wanted (G8 needs a new field, older sends show Unknown project).
- Default sort inside a group? Default: document order for note and heading groups, due then document order for other groupings.
- Where does priority none sit? Default: between medium and low (Obsidian Tasks convention, from memory).

## Agent note on file

/Users/diegorv/Dev/pet-projects/koko/brain/.scratch/tasks-view/research/analysis-05-grouping-sorting.md (NOT WRITTEN: the Write tool refused with "Subagents should return findings as text, not write report files"; full analysis was returned as the final text response instead)

# Analysis 03: sourcing-rules

Recovered from the workflow journal: the analyst's Write was refused, so only its structured return survives.

## Headline

Tasks sourcing is one hidden free-text heading substring (default '#to-list', tasks.store.svelte.ts:8) with NO exclusions: the vault scan passes an empty excluded-folder list (vault.rs:225), so template, system-folder, archived and type-definition notes all source tasks, and the heading mode forces a full disk re-read of every task note on every index bump (vault.rs:748-750). Recommended fix (Option B): Rust records the enclosing heading chain on each Task, and a pure TS engine evaluates structured include/exclude rules (folder, type, tag, property, lifecycle, heading) over the existing getVaultEntries() snapshot, which already carries tasks and note attributes; rules persist in per-vault settings.json; a Sources panel shows a summary sentence and live counts. Options considered: A = harden the section tag only; B = structured rules over entries (recommended); C = reuse the .view filter engine (rejected for v1: note-keyed rows, silent evaluation errors, hidden archived rule, no count in the builder).

## Candidate issues

- 1. Rust: record enclosing heading chain (headings: Vec<String>) on each Task; bump INDEX_SCHEMA_VERSION (index_cache.rs:18); regenerate bindings; carry through fromV2 (files: task.rs, parsing.rs, index_cache.rs, generated/Task.ts, tasks.service.ts, tasks.types.ts, e2e mock). Test-first: Rust tests for no heading, nested, sibling reset, code fence, cache round-trip. Depends on: none. Owner decision: no.
- 2. Pure source-rule engine tasks-sources.logic.ts: clause kinds folder/type/tag/property/lifecycle, sources ORed, clauses ANDed, excludes win, global excludes (templates folder, system folder, archived, type definitions), describeRules sentence, per-source counts. Test-first with real NoteEntryV2 fixtures. Depends on: none. Owner decision: no.
- 3. Heading clause (word and substring modes) plus parity suite against today's extract_tasks_from_section cases (parsing.rs:3040-3080) and explicit tests for #to-list vs #to-listing and the nested-tag quirk (parsing.rs:1740-1743). Depends on: 1, 2. Owner decision: YES (match semantics).
- 4. Persist rules per vault: tasks section in settings types/defaults/merge, tasks-sources store with tested computed getters (ADR-0034), migration default = heading '#to-list' + all four global excludes on. Depends on: 2. Owner decision: no (location default).
- 5. Source TasksView from getVaultEntries() instead of get_all_tasks_v2/get_tasks_in_section_v2: drop sectionTag/updateSectionTagFilter, toggle refresh via vaultStore.requestPromptIndexRefresh() instead of an extra scan, add store error state (fixes silent failures), keep sequence guard, dirty-buffer toggle logic and resetTasks. Depends on: 1, 3, 4. Owner decision: no.
- 6. Sources panel UI: summary sentence + count button replacing the 'section tag' input, rule cards with clause chips, exclude chips, four global-exclude toggles, live per-rule counts, explained empty state, warning chip for dangling folder/type references, keyboard operable; component tests + e2e on rendered content. Depends on: 4, 5. Owner decision: no.
- 7. Event calendar honours the same global excludes (not the sources): loadCalendarTasks filters through the engine (event-calendar.service.ts:106-121). Depends on: 2, 4. Owner decision: YES.
- 8. Retire get_tasks_in_section_v2 and extract_tasks_from_section after tracing every caller (commands.ts:82,227, ipc.test.ts, e2e/mocks/tauri-core.ts, lib.rs:346-348, Rust tests); write the CLAUDE.md removal proof in the Issue. Depends on: 5 and green parity suite (3). Owner decision: no.
- 9. Docs: update help/documentation/10-tasks-and-todoist.md:97-103, short ADR for the rule model, glossary entry separating 'source' from the Todoist 'section' term collision (CONTEXT.md does not exist). Depends on: 6. Owner decision: no.
- 10. Later, only on request: source clause 'notes listed by view X' through a port like view-row-set.port.ts, reusing the .view filter builder without tasks importing rail-shell. Depends on: 2. Owner decision: YES.

## Owner questions

- Keep the #to-list heading convention as the first default source, shown as one visible rule card? Recommended default: yes.
- Stop archived notes, type definitions, the templates folder and the system folder from sourcing tasks by default (four toggles, all on)? Recommended default: yes.
- Heading match semantics: whole-word + case-insensitive (new) or substring + case-sensitive (current, so #to-list matches #to-listing)? Recommended default: whole-word, case-insensitive, with a per-clause 'substring' option, and document the change.
- Combination rule: sources ORed, clauses inside a source ANDed, excludes always win (vs Obsidian-Tasks-style free AND/OR/NOT text lines)? Recommended default: the simple rule.
- Should the event calendar follow the global excludes (not the sources)? Recommended default: yes, excludes only.
- Does a 'tag' clause mean the note's tags, the task's inline tags, or both? Recommended default: the note's tags here; task-level tags belong to the filtering theme.
- Should inbox (not organized) notes source tasks? Recommended default: yes, only archived is excluded.
- Where do rules live: per-vault settings.json (.kokobrain) or a visible .view-style file? Recommended default: settings.json now; a file costs a new file type and the row-kind work from the view-unification area.
- Do you want a 'notes listed by view X' clause to reuse the .view filter builder? Recommended default: not in v1.
- Per-view scope: one active scope plus excludes, or several named saved scopes? The Tasks tab is a singleton (TASKS_VIRTUAL_PATH). Recommended default: one active scope now, TaskSourceRules kept self-contained so a saved list can embed it later (decide with the filtering/categorizing themes).
- Should .view bodies and .kanban cards ever source tasks? Recommended default: no (not indexed today; separate decision).
- Is a Rust DTO change (Task.headings) plus an index-cache schema bump (one-time full rebuild per vault) acceptable? Recommended default: yes; fallback is Option A (post-filter plus boundary fix, no DTO change), which leaves folder/type/tag/property sourcing and the per-bump disk scan unsolved.

## Agent note on file

NOT WRITTEN: .scratch/tasks-view/research/analysis-03-sourcing-rules.md (the Write tool refused with "Subagents should return findings as text, not write report files". I did not work around the refusal with a shell write. The full analysis, with the sections you specified, is ready to be re-run into that path by the orchestrator or by a launch that allows file writes.)

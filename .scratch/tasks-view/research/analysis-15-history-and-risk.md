# Analysis 15: history-and-risk

Recovered from the workflow journal: the analyst's Write was refused, so only its structured return survives.

## Headline

Before any rules UI, fix the two data-safety holes under it: toggle_task_status flips by line number alone (vault.rs:760-786, parsing.rs:1873-1906; open file-io-audit Issue 24) and the Todoist sent-store is keyed on filePath:text with no rename re-key (todoist.store.svelte.ts:24-31; open Issue 14 covers only the corrupt-file part). Then build recommended Option B: saved source rules in settings.json (blocked by open Issue 03), evaluated in Rust, plus pure TS filter/group logic, with the current #to-list heading rule as the migrated default. Nothing is persisted today for dateFilter, sectionTag or hideCompleted (in-memory only), so the only real migration is todoist-sent.json, which must stay backward compatible.

## Candidate issues

- S1: toggle_task_status verifies the displayed task text/line before writing (closes file-io-audit 24 and audit findings; Rust + contracts + e2e mock; Both gate; no dependency; no owner decision)
- S2: Todoist sent-store safety and stable identity (absorb audit-2026-11-04 Issue 14 / file-io-audit 32; optional new SentTaskEntry fields, fallback to filePath+text; re-key on rename via registerPathChangeConsumer; no duplicate after a failed save; toast on send/sync failure; Section response race; vault switch during send; owner decision on the stable key)
- R1: Persisted tasksView settings key in settings.json (per vault) with today's defaults (#to-list, hide completed on, date all); add to the merge in settings.service.ts; depends on open Issue 03; owner decision on scope
- R2: Rust source-rule command (folder, tag, _type, heading; include/exclude), prefilter to notes with tasks, spawn_blocking, deterministic tie-break on path, keep get_all_tasks_v2 and get_tasks_in_section_v2 for the calendar; no extra per-bump disk scan
- R3: Pure tasks.logic.ts filters/grouping/sort over the 7-value status enum, due/scheduled relative ranges, priority, tag; hideCompleted default unchanged, Rust checked unchanged; owner decision on in-progress/cancelled
- R4: Tasks view UI rewrite (toolbar, rule editor, rows with status/due/priority/tags/source heading, empty state naming the hiding rule, error state with retry); update tasks-view.spec.ts selectors and the e2e mock in the same Issue; coordinate with ux-polish 48, 60, 37
- R5: Decide calendar parity (event-calendar uses get_all_tasks_v2 and ignores the section tag) and document or share the rules
- P1: Rust parser quirks batch (heading-tag substring/case boundary parsing.rs:1739, task tag boundary, CRLF trailing \r in Task.text, fence detector, equal-mtime ordering index.rs:1061); check INDEX_SCHEMA_VERSION impact; owner decision on exact-match semantics
- D1: Docs: create CONTEXT.md glossary (heading section vs Todoist section), ADR for the source-rule model and Todoist identity key, fix help/documentation/10-tasks-and-todoist.md overstatements (statuses, metadata, hide completed, check mark badge), docs/FEATURES.md:46, amend stale ADR-0009/0020 fileTasksIndex lines

## Owner questions

- Do you actually use Todoist today? The memory note owner-feature-usage says 'no external sync' but you named Todoist as a pain point. Recommended default: treat it as used, ship the safety Issue (S2) first and keep new Todoist features small.
- Is the heading tag #to-list your real workflow? Recommended default: yes; keep it as the migrated default source rule with hide completed on.
- Should 'hide completed' keep hiding in-progress [/] and cancelled [-] (today checked = status != todo, task.rs:25)? Recommended default: hide only done and cancelled, show in-progress, changed in the view only, not in Rust checked (the calendar relies on its own done-or-cancelled test).
- Where do rules live? Recommended default: settings.json per vault under a tasksView key, after open Issue 03 (settings load-failure guard). Alternative: a visible hand-editable file with its own corrupt-file handling.
- Which source kinds first? Recommended default: heading tag, folder, tag, note _type, each include or exclude; no path globs, no expression language (Option C, tasks as a .view row kind, rejected for now: row unit is the note, view-unification PRD put tasks out of .view rows, no stable task key).
- Make heading matching an exact, case-insensitive whole-tag match so #to-list no longer matches #to-listing (parsing.rs:1739)? Recommended default: yes, with a Rust test; warn that it can change what the current view shows.
- Should the calendar follow the same source rules? Recommended default: no for now; document that it shows dated tasks from all notes.
- How is a sent task identified after its text changes? Recommended default: the task id metadata when present, else filePath+text, re-keyed on rename/move via the path-change consumer registry; do not write new ids into your notes without approval.
- Named saved views or one current configuration? Recommended default: one current configuration; add named views only on request.
- OK that the UI work changes tasks-view.spec.ts selectors (/section tag/ textbox, button title*=completed, click on task text) and the user guide in the same Issues? Recommended default: yes.

## Agent note on file

/Users/diegorv/Dev/pet-projects/koko/brain/.scratch/tasks-view/research/analysis-15-history-and-risk.md (NOT WRITTEN: the Write tool refused with "Subagents should return findings as text, not write report files". The full analysis is summarized in this payload. Scouts 18 and 07 do not exist in research/.)

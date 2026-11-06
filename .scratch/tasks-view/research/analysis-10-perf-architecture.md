# Analysis 10: perf-architecture

Recovered from the workflow journal: the analyst's Write was refused, so only its structured return survives.

## Headline

Heading scope is the architectural blocker, because the index stores no headings and the default '#to-list' tag forces a disk-reading command on every mount, bump and toggle. Recommended fix: store heading_path on each Task in Rust, keep get_all_tasks_v2 as the only fetch, and do filtering and grouping in a pure TS module with a memoized store getter. Separately, 'hide completed' (default on) hides in-progress, important, question and forwarded tasks because Rust sets checked = status != ' '. NOTE: the Write tool refused to create the analysis file (subagents must return text), so the full analysis is in the final text response and the file does NOT exist on disk.

## Candidate issues

- Status-aware completed filter: hide only done and cancelled (fixes [/] [!] [?] [>] hidden by default)
- Rust: record heading_path on indexed Tasks, bump INDEX_SCHEMA_VERSION 5 to 6, regenerate bindings, parity tests vs extract_tasks_from_section
- Pure tasks-query.logic.ts (filter, group, sort by status, dates, priority, tags, heading, file) plus memoized $derived store getter and $state.raw snapshot
- Single index-backed fetch with stale-while-revalidate refresh (no list blanking, keep scroll and focus); retire get_tasks_in_section_v2
- Toggle by task identity instead of line number (folds in file-io-audit issue 24)
- Render scale guard and measurement: collapsible groups, per-group cap, one shared Todoist popover, O(1) Todoist lookups, TASKS debug timing log
- Todoist sync batching: bounded concurrency, single store write and disk save
- Keyboard navigation and list/checkbox semantics for the Tasks view
- ADR for the Tasks data path plus fix of stale ADR-0009/0020/0025 text and user-guide overstatements

## Owner questions

- Keep today's section rule or switch to 'any ancestor heading contains the tag'? They differ only when a nested heading also matches (today a later sibling subheading is dropped). Recommended: ancestor-based with a documented parity test.
- Should in-progress [/], question [?], forwarded [>] and important [!] tasks show when 'hide completed' is on? Recommended: yes, hide only done and cancelled.
- Is one full vault rescan on first launch after the INDEX_SCHEMA_VERSION bump acceptable? Recommended: yes.
- Keep the section tag as a substring text input or move to a heading picker? Recommended: keep substring, add suggestions later.
- Virtualize the task list? Recommended: no; use collapsible groups, a per-group render cap and a debug log, and revisit only if it shows a stall. How many open tasks do you expect to keep?
- Retire get_tasks_in_section_v2 after the heading field is live? Recommended: yes.
- Roughly how many tasks have you sent to Todoist? Decides whether sync batching is urgent. Recommended: small issue after the UI work.
- If task rules become user-defined, store them in settings or in a vault file like .view? Recommended: leave to the rules analyst; the data path works either way.

## Agent note on file

.scratch/tasks-view/research/analysis-10-perf-architecture.md

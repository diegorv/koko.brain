# Analysis 01: ux-audit

Recovered from the workflow journal: the analyst's Write was refused, so only its structured return survives.

## Headline

Clicking a task's text toggles it, and a toggle can silently reset a [/], [-], [?] or [!] task to [ ] and make it vanish with no undo (hide-completed is on by default). Alongside that, the default '#to-list' tag shows "No tasks found" on first open, and the date chips filter by file mtime, not task dates.

## Candidate issues

- TasksView component test harness (none exists today)
- Row interaction: checkbox-only toggle, text opens the note at the line via openNoteAt (updates e2e tasks-view.spec.ts:51-54)
- Status-preserving toggle and status-aware rows; hide-completed only hides closed statuses (Rust toggle_task_in_content, parsing.rs:1895-1900)
- Stable refetch: keep the list, scroll and group order during loading and after a toggle (mtime sort makes the toggled file jump to the top)
- Distinct empty states per cause, 'N hidden' note, clear-filter actions
- Row badges (due/overdue, priority, recurrence, tags, status) with a clean title from metadata.description
- Due-date filter on the task's own dates, replacing the file-mtime chips
- Toolbar consolidation: Source/Filter/Group-Sort popovers, labelled controls, active count and Reset (stay within pane-toolbar single-row rule)
- Group by (file/due/priority/tag) and sort as pure logic in tasks.logic.ts
- Persist Tasks view state in settings
- Group header folder context, and per-task heading context (needs Rust DTO change)
- Accessibility pass: role=checkbox, labels with task text, list semantics, 24px targets, minimal keyboard navigation
- Theme tokens and type roles: replace text-purple-400 and raw text sizes, verify contrast with a tool
- Todoist visibility and feedback: no-token hint, visible send affordance, sync result toast, last synced, error toasts
- Verify external links work with target=_blank in Tauri, else route through openUrl
- Recurring task completion creates the next occurrence (Rust-owned, default: do not build)

## Owner questions

- Q1: Is '#to-list' your real convention for sourcing tasks? Recommended default: no hidden default; start with an empty rule (all tasks), show the active rule in the toolbar, keep a saved value if you set one.
- Q2: Should clicking a task's text open the note at that line, with only the checkbox toggling? Recommended default: yes.
- Q3: Which statuses count as open? Recommended default: Done and Cancelled are closed; In progress, Question, Important and Forwarded are open and become [x] when ticked; hide-completed hides closed only.
- Q4: What should the date filter mean? Recommended default: the task's due date (overdue, today, next 7 days, no date); keep 'note edited in last N days' only as an option inside the Filter popover.
- Q5: Which groupings and sorts? Recommended default: group by file (default), due date, priority or tag; sort by due then priority; keep file order stable instead of mtime.
- Q6: Should ticking a recurring task create the next occurrence? Recommended default: no for now; show the recurrence badge only.
- Q7: Show the heading each task sits under? Recommended default: show the folder in the group header now (TS only) and defer the heading until the rules analysts decide whether sourcing keeps heading semantics.
- Q8: How much keyboard control? Recommended default: labelled checkboxes, visible focus, Space toggles, Enter opens, arrows move between tasks; no multi-select or bulk actions yet.
- Q9: Are Tasks view filter, group and sort settings stored in app settings (not per vault)? Recommended default: yes, alongside other app settings.

## Agent note on file

.scratch/tasks-view/research/analysis-01-ux-audit.md (NOT WRITTEN: the Write tool refused it with "Subagents should return findings as text, not write report files". The full audit is in the preceding assistant text; the parent should persist it.)

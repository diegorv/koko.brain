# Analysis 12: keyboard-a11y

Recovered from the workflow journal: the analyst's Write was refused, so only its structured return survives.

## Headline

Every refetch (including each successful toggle) replaces the whole task list with "Indexing tasks..." (TasksView.svelte:169-170, tasks.service.ts:65,150), which destroys the focused checkbox and drops keyboard focus to body, and the view has no key handling, no roving focus, and no semantic list/names at all, so the cheapest high-value fix is to keep the list mounted while refetching, then add a Calendar-style view-scoped keyboard model (event-calendar-keys.logic.ts pattern).

## Candidate issues

- 1. Keep the task list mounted while refetching so focus and scroll survive (TasksView.svelte; test: focused checkbox keeps focus across setLoading + setFileTaskGroups). Check first that Rust toggle_task_status verifies the line is still a task, because a stale list becomes actionable (not read by me)
- 2. Semantics and labels pass: aria-pressed on date chips and hide-completed, aria-label on icon buttons and the section-tag input (keep the e2e /section tag/i query working), role=status on the count/loading/empty line, a heading per file group, ul/li rows with aria-level from indent, checkbox name that includes the task text, focus-visible rings. Verify aria-level on listitem in the ARIA spec first (from memory); fallback is a nested list via a pure buildTaskTree
- 3. Roving-focus row model with focus restore: one Tab stop for the list, Up/Down/Home/End/PageUp/PageDown, active row id = filePath:lineNumber, restore to same or nearest surviving row after refetch (pure tasks-focus.logic.ts + jsdom test through the real toggleTask path). Depends on 1 and 2
- 4. View-scoped shortcuts modeled on event-calendar-keys.logic.ts: Space/x toggle (ignore e.repeat), Enter open note at line via the existing openNoteAt(path,{kind:'line',line}) in core/editor/open-note-at.service.ts:35, s send to Todoist (make TodoistPopover open controllable), o open in Todoist, / focus filter, ? help dialog; focus the view on open; update help docs 10 and 20. Depends on 3
- 5. Palette commands: Tasks: toggle hide completed, Tasks: sync Todoist (toast when no token, since AppCommand has no when predicate), Tasks: focus filter; each opens the tab first via openTasksTab()
- 6. Surface Todoist sync failures with a toast (handleSync only console.errors, TasksView.svelte:85-91) and replace the opacity-0 Todoist trigger (TodoistPopover.svelte:113) with a persistently visible low-emphasis state. Overlaps the Todoist analyst, so coordinate
- 7. Deferred: comfortable/compact row density setting, only after the metadata badges and filter UI land (no density setting exists; spacing is hardcoded at TasksView.svelte:178-212; app zoom already covers the extreme case)
- Tiny prep (optional): move isTypingTarget from event-calendar-keys.logic.ts:77 to utils/ since global-keybindings.ts and Calendar already share it

## Owner questions

- Accept bare-letter shortcuts in the Tasks view (j/k, x, s, o, h, ?) as Calendar does? Recommended: yes, with the isTypingTarget/open-popover/dialog guard; arrows, Space, Enter and Home/End work without letters, so the letters are additive and trimmable
- Should Enter open the note at the task line, and should clicking task text stop toggling (toggle only via the checkbox and Space)? Recommended: yes to both, since selecting or copying text currently flips a task on disk (TasksView.svelte:215-220)
- Want a Tasks: family of palette commands (hide completed, sync Todoist, focus filter), or are the view shortcuts enough? Recommended: the three commands
- May the Tasks view import isTypingTarget from the Calendar logic file, or should it move to utils/ first? Recommended: move it in a tiny preparatory commit (three consumers by then)
- Row density (comfortable/compact) or rely on app zoom? Recommended: skip now, revisit after metadata badges land
- Is this about keyboard speed, screen reader use, or both (no WCAG target stated)? Recommended: keyboard speed first (issues 1-5) plus the low-cost ARIA pass (issue 2); do one manual VoiceOver pass in the Tauri webview, since jsdom tests assert roles and names but not announcements
- Should the Tasks tab take focus on open, like Calendar (EventCalendarView.svelte:40-41)? Recommended: yes

## Agent note on file

/Users/diegorv/Dev/pet-projects/koko/brain/.scratch/tasks-view/research/analysis-12-keyboard-a11y.md (NOT WRITTEN: the Write call was refused with "Subagents should return findings as text, not write report files", and I did not work around it. The full analysis was drafted and is summarized in the fields below. Scouts 19 and 30 do not exist in research/, so I verified against the code directly. All ARIA-spec claims are from memory.)

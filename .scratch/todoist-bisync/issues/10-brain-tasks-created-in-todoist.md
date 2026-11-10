# 10: A task written in the brain is created in Todoist

**What to build:** A new open task line in a project note, or a line tagged `#todoist` anywhere else in the vault, is created in Todoist on the next "Sync now" (in the note's project, or the vault's root project for `#todoist` lines, which stay in their note). A lost response, a crash or a lost sync state never creates it twice. Design: `.scratch/todoist-bisync/research/design.md` rules 1, 2, 9, 11, 13, Scope.

**Blocked by:** 09

**Status:** ready-for-agent

- [ ] Failing tests first (fake `/sync` that can drop a response, real stores).
- [ ] Scope (decided): open task lines in project notes, plus `#todoist`-tagged lines elsewhere, after ticket 02's exclusions. Also skipped: lines with a user `🆔` lacking `td-` (logged), indented subtasks, frozen anchors.
- [ ] Anchor first (rule 2): write `🆔 td-<8 base36>` through the writer, insert the link row with `todoist_id` NULL and `pending_uuid`, then send `item_add` (that uuid, a temp_id, `autoParseLabels: false`, description ending with the line `kokobrain:td-<value>`). Labels: the line's tags, plus `personal` when `syncContext` is `'personal'`; nothing extra in a `'work'` vault (the owner's webhook adds `Work`); never `defaultLabel` (design rule 8b). On ack store the Todoist id.
- [ ] Recurring lines send `due: { date: "<📅>", string: "<recurrence>", lang: "en" }` when a `📅` exists, else `due: { string: "<recurrence>" }`. Never the `"<recurrence> starting <date>"` form that open-itens 073 planned: a rule with `starting` completes for good on the first close (`research/live-check.md`). Non-recurring: `due: { date }`.
- [ ] Content over 500 characters or with a newline is not created; logged.
- [ ] Lost response: before any pulled task becomes a new line, it is matched to a pending add by its description `kokobrain:` line (content + project as fallback); it never yields a second line or task.
- [ ] Rebuild mode (ticket 06) also pairs by the description `kokobrain:` line, so a lost sync state never duplicates brain-born tasks.
- [ ] First run is a preview: a dialog shows how many tasks would be created; nothing is sent until confirmed; `first_run_done` set after. Later: over 25 creates per cycle -> "pause and ask".
- [ ] The Tasks view's old Send action is hidden for lines in scope or anchored.
- [ ] Before this ticket sets `first_run_done` (which turns automatic cycles on), two minor findings of Issue 07's integration review are fixed: `syncNow(mode)` takes `mode` as a required argument (no `'manual'` default), and `stopAutoSync` dismisses the persistent over-cap and failure toasts it shows before clearing their flags, so a vault switch does not leave the previous vault's toast on screen. Each with a test.
- [ ] A line whose anchor already has a link row, detached ones (`isDetached`, Issue 13) included, is never sent as `item_add`: a detached line that comes back stays detached. With a test.
- [ ] Gate: frontend.

## Notes

- Size: M.

# 37: Event-calendar plan closed

**What to build:** the event-calendar plan is recorded as done. `.scratch/calendar-feature/plan-2026-10-28.md` is removed from the tree in a commit of its own, and that commit's message records that the plan is finished. The follow-up issues that ticket 36 filed from Notes > Follow-ups stay in the tracker. Every ticket in this breakdown points to the plan's line ranges for its full spec, so the plan is deleted only after all the other tickets are closed.

**Plan reference:** Task 36 in `.scratch/calendar-feature/plan-2026-10-28.md` (lines 823-826). The plan task is the full spec (files, line anchors, test cases); this ticket is the definition of done.

**Blocked by:** 35, 36

**Status:** ready-for-agent

**Touches:**
- `.scratch/calendar-feature/plan-2026-10-28.md` (delete)

**Gate:** none (no source change). `git diff --cached --stat` shows only the deletion.

- [ ] Breakdown tickets 01-36 (this ticket set, not the follow-up issues) are all closed before the deletion, because each one uses the plan's line ranges as its spec
- [ ] Ticket 35 (Task 34) has landed: `docs/adr/0032-calendar-events-are-event-typed-notes.md` exists with its row in `docs/adr/README.md`, and the amendment notes are appended to ADR-0029 and ADR-0009, so the plan can be recorded as done
- [ ] Ticket 36 (Task 35) has landed: each Notes > Follow-ups item exists as an issue file under `.scratch/calendar-feature/issues/` before the plan is deleted
- [ ] `.scratch/calendar-feature/plan-2026-10-28.md` no longer exists in the tree
- [ ] The deletion is in its own commit: `git diff --cached --stat` before committing lists only the plan file's deletion, so no source, test, doc or issue file changes
- [ ] The follow-up issue files filed by ticket 36 stay in `.scratch/calendar-feature/issues/` after the commit ("The follow-up issues stay")
- [ ] The commit (subject `docs(scratch): close the calendar-feature plan`, the Task 36 title) records in its message that the event-calendar plan is done
- [ ] Gate green; one commit in the full CLAUDE.md format (Context, Problem, Solution, Behavior, Files with line ranges)

## Comments

- 2026-10-28 16:53 — discovery — preconditions hold (01-36 closed, ADR-0032 + amendments landed, follow-ups 40-64 filed); plan is a single own-commit deletion — 60cd2986

# Issue 37 discovery: close the calendar-feature plan

## Preconditions (checked on main 60cd2986)
- Breakdown tickets 01-36: no issue file numbered 01-36 remains in `.scratch/calendar-feature/issues/` (the listing starts at 37). Ticket 36 closed in 60cd2986.
- Ticket 35 (Task 34): `docs/adr/0032-calendar-events-are-event-typed-notes.md` exists; its row is `docs/adr/README.md:139`; amendments at `docs/adr/0029-frontmatter-yaml-canonical-form.md:101` and `docs/adr/0009-incremental-indexing-reverse-index.md:50`.
- Ticket 36 (Task 35): follow-ups filed as issues 40-64 (4c26b825, cf10a3f3).

## Files that change
- `.scratch/calendar-feature/plan-2026-10-28.md` (1359 lines): deleted, alone in its commit (plan Task 36, lines 823-826).
- This file and `.scratch/calendar-feature/issues/37-close-plan.md` (Comments) change in separate workflow-bookkeeping commits, never in the deletion commit.

## Plan
1. Commit discovery.md + issue comment.
2. `git rm` the plan; `git diff --cached --stat` must list only that deletion; commit `docs(scratch): close the calendar-feature plan` in the full COMMITS.md format, recording the plan as done.
3. Implement comment in the issue file, own commit.

## Prior art
- Closing commit format: 60cd2986 (close issue 36).

## Risks
- Dangling references to the plan path: ADR-0032 lines 11 and 118, follow-up issues 41, 43, 44, 46, 50, 53, 55-58, older `work/*/review.md`. The follow-ups already say "deleted by ticket 37; read it with `git show c0103ff5:...`", and the plan is byte-identical at c0103ff5 and HEAD (`git diff --stat c0103ff5 HEAD` on the plan is empty), so those pointers stay valid. ADR-0032 is left as is: the acceptance criteria forbid any other change in the deletion commit and the path remains readable from history.

## Defaults taken
- Gate: none (no source change), per the issue. No vitest/check/build run.
- The plan's `[ ]` checkboxes are not ticked before deletion: the file is deleted whole, and ticking would add a second change.

VERDICT: CHANGES_REQUESTED

# Issue 37 review: event-calendar plan closed

I reviewed `git diff main...HEAD` (a63a2f63, 24e79da1, ec6b32b2, based on main 60cd2986) in the worktree against the Issue's acceptance criteria, plan Task 36 (`git show main:.scratch/calendar-feature/plan-2026-10-28.md`, lines 823-826), CLAUDE.md and `docs/adr/README.md`.

The diff is tracker-only. It deletes the plan, adds discovery.md and adds two Issue comments. No file under `src/`, `src-tauri/`, `e2e/` or the config changed, so the Pre-Change Checklist and the tests-per-source-file rule do not apply.

## Test verdict basis

- The diff adds or changes no test file and no source file, so there was nothing to run under vitest. I did not run `pnpm check` either, because the diff touches no frontend file.
- I checked the claims with git instead: `git show --stat` on each commit, `git diff --stat c0103ff5 main -- <plan>` (empty, so the file is byte-identical), `git merge-base --is-ancestor c0103ff5 main` (true), and a listing of `issues/`. I also grepped the tree for `plan-2026-10-28`.

## Acceptance criteria

- [x] **Breakdown tickets 01-36 are closed before the deletion.** Met. `ls .scratch/calendar-feature/issues/` lists only 37 and 40-64. Ticket 36 closed in 60cd2986, the base of the branch.
- [x] **Ticket 35 has landed (ADR-0032, its README row, the ADR-0029 and ADR-0009 amendments).** Met.
  - `docs/adr/0032-calendar-events-are-event-typed-notes.md` exists.
  - Its row is at `docs/adr/README.md:139`.
  - The amendments are at `docs/adr/0029-frontmatter-yaml-canonical-form.md:101` and `docs/adr/0009-incremental-indexing-reverse-index.md:50`, both dated 2026-10-28 and citing issue 35.
- [x] **Ticket 36 has landed: every Notes > Follow-ups item is an issue file.** Met. Issues 40-64 are present. The issue 36 review (`work/36/review.md`) matched tickets 40-60 one-to-one against plan lines 1298-1318, and tickets 61-64 are the owner's extra tickets.
- [x] **The plan no longer exists in the tree.** Met. `ls .scratch/calendar-feature/` shows only `issues` and `work`.
- [x] **The deletion is in its own commit.** Met. `git show --stat 24e79da1` lists one file, `.scratch/calendar-feature/plan-2026-10-28.md | 1360 -`. The bookkeeping went into separate commits: a63a2f63 (discovery.md plus the Issue comment) and ec6b32b2 (the Issue comment).
- [x] **The follow-up issue files stay.** Met. All 25 files (40-64) are present at HEAD.
- [x] **The commit subject is `docs(scratch): close the calendar-feature plan` and the message says the plan is done.** Met. The subject matches exactly, and the Solution section says "The event-calendar plan is done."
- [x] **Gate green; one commit in the full format.** Met.
  - The gate is "none" per the Issue and plan Task 36.
  - The message has Context, Problem, Solution, Behavior and Files (`:1-1360`), plus the Co-Authored-By trailer.
  - The `1-1360` range is correct. `wc -l` reports 1359 because the last line has no trailing newline, so git counts 1360 lines.

## Findings

1. **Medium. `docs/adr/0032-calendar-events-are-event-typed-notes.md:11` and `:118` now cite a file that no longer exists.**
   - The ADR's Citation map (`:118`) names `.scratch/calendar-feature/plan-2026-10-28.md`, Notes > Decisions D1-D26, as "Plan and decision log". After 24e79da1 that path is dead in the tree. A reader following the ADR's only pointer to D1-D26 finds nothing, and nothing in the tree says where the file went. The follow-up issues avoid this with the `git show c0103ff5:...` form. The ADR, the one durable doc that cites the plan, does not.
   - This change is allowed. `docs/adr/README.md:99` says broken-link repairs are one of the two edits permitted on an active ADR.
   - Fix: in a separate commit after 24e79da1, so the deletion commit stays pure, change both citations to say the plan was deleted when the feature closed and can be read with `git show c0103ff5:.scratch/calendar-feature/plan-2026-10-28.md`. Keep the "Notes > Decisions D1-D26" anchor. Suggested subject: `docs(adr): point ADR-0032 at the deleted calendar plan in history`. Gate: none (docs only).
2. **Info, no action.** Many older `.scratch/calendar-feature/work/*/review.md` and `work/01/discovery.md` files cite `plan-2026-10-28.md:<lines>`. These are historical workflow records written against the plan as it stood then. Rewriting them would be churn, so leave them.
3. **Nit, no action.** `work/37/discovery.md:9` says the plan has "1359 lines" while the commit's Files section says `1-1360`. Both are right: the difference is the final line, which has no trailing newline. There is nothing to fix.

Scope: nothing beyond the Issue was added. The plan's `[ ]` boxes were not ticked before the deletion, which is correct because ticking them would have added a second change to the deletion commit.

## Resolution

- Finding 1 (Medium): fixed. ADR-0032 lines 11 and 118 now point at `git show c0103ff5:.scratch/calendar-feature/plan-2026-10-28.md` and say the plan was deleted when the feature closed. Line 118 keeps the "Notes > Decisions D1-D26" anchor. The repair is its own commit after 24e79da1, so the deletion commit stays pure (allowed by `docs/adr/README.md:99`).
- Finding 2 (Info): accepted, no action. The older work/ records are historical.
- Finding 3 (Nit): accepted, no action. Both line counts are correct.

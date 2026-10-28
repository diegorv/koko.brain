---
description: Implement the next available Issue of a .scratch feature (Issue files → implement-brain-issue workflow → merge into main)
argument-hint: "<feature> [optional: specific Issue number]"
---

Continue the Issues of a Kokobrain `.scratch` feature. Arguments: "$ARGUMENTS" — the first word is the feature (a folder under `.scratch/`), the optional second is an Issue number. If no feature was given, list the `.scratch/*/issues/` folders with their `ready-for-agent` counts and ask me which one; do not pick.

1. Read CLAUDE.md ("Implementation process"), docs/agents/issue-tracker.md and `.scratch/<feature>/issues/`. There is no ledger: an Issue is open while its file exists, its `Status:` line says where it stands, and it is done once its closing commit deletes the file.
2. Check that the main checkout (/Users/diegorv/Dev/pet-projects/koko/brain) is on main and clean. Main's Issue files change only after a branch merges, so also list `git branch --list 'issue/<feature>-*'` and `git worktree list`: an `issue/<feature>-<NN>-*` branch or worktree is an Issue in flight (in progress, handed to a human, or in review), whatever main's file says. Report every Issue in flight (read its `Status:` and last comment on that branch). Stop and ask me before doing anything else when an in-flight Issue is `ready-for-human`, or is still `ready-for-agent` with no workflow of this session running it. Otherwise go on: Issues that share no files may run in parallel when I asked for that, and the workflow skips any Issue already in flight.
3. Run the saved workflow: Workflow({ name: "implement-brain-issue", args: { feature: "<feature>" } }).
   - If I gave an Issue number, add it as args.issue. Otherwise do not pass "issue": the workflow picks the lowest-numbered `ready-for-agent` Issue whose blockers are done and skips any Issue already in flight.
   - Never pass "delivery" unless I ask for a PR: the default merges straight into main and pushes.
4. When it finishes, check the result: on merge the Issue file is deleted by a `docs(scratch): close issue NN` commit on main and the worktree and branch are gone; when it stopped, the Issue is `ready-for-human` and a comment says why. Fix it if not.
5. Report to me: the Issue done, the merged sha, the gate results (check, vitest, build, cargo), and which Issue is next.

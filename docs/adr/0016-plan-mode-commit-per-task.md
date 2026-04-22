---
type: ADR
id: "0016"
title: "Plan-mode workflow: tasks/todo → tasks/done with one commit per task"
status: active
date: 2026-04-22
---

## Context

The app is built by a solo developer driving LLM agents. Agents do excellent focused work but have two failure modes:

1. **Scope creep mid-plan.** Given a 6-step plan, agents often complete steps 1–5 correctly then silently revisit step 2 "to clean things up," and the final commit mixes real changes with scope drift. Reverts become archeology.
2. **Lost intent between sessions.** A plan held only in conversation context disappears when the session ends. Coming back later to "finish that task" requires reconstructing what was already done.

The project needed a workflow that:

- Records every plan as a durable artifact (not just conversation history).
- Forces each completed task to land as its own commit, so diffs and reverts are granular.
- Enforces the pre-commit testing gate (ADR-0007 Task Completion Gate).
- Makes plan status obvious at a glance — what's todo vs. what's done.

## Decision

**Every plan created in plan mode is saved as a task file under `tasks/todo/`, worked through one task at a time with a commit per task using the full detailed commit format, and moved to `tasks/done/` when complete.** The workflow is specified in `CLAUDE.md` §Plan Mode Workflow (lines 259-305) and `docs/COMMITS.md` §Atomic Commits per Task.

### File lifecycle

1. **Create** `tasks/todo/<name>.md` (e.g., `feature-search-improvements.md`).
2. **Work** through tasks sequentially — never in parallel, never skipping ahead.
3. **After EACH task, execute this exact sequence** (no exceptions):
   1. Mark the task `[x]` in the plan file.
   2. Verify test coverage for every source file changed (TESTING.md §Task Completion Gate, Step 0).
   3. Run the relevant tests:
      - Rust only (`src-tauri/`) → `cargo test --manifest-path src-tauri/Cargo.toml`
      - Frontend only (`src/`, styles, config) → `pnpm check` + `pnpm vitest run`
      - Both → all three.
   4. Stage only files related to this task (`git add <specific files>`).
   5. Run `git diff --cached --stat` to verify the staging area.
   6. Commit using the full detailed format: `Context / Problem / Solution / Behavior / Files (with line ranges)`.
   7. Only then move to the next task.
4. **Move** to done when finished: `mv tasks/todo/<name>.md tasks/done/`.

### Task file format (from `CLAUDE.md:286-298`)

```markdown
# <Title>

<Brief description of what this plan accomplishes and why.>

## Tasks

- [ ] Task 1: Short description of what needs to be done
- [ ] Task 2: Short description of what needs to be done

## Notes

<Any relevant context, decisions made, or constraints.>
```

### Commit format (`docs/COMMITS.md:58-78`)

Every commit — trivial or not — uses the detailed format:

```
<type>(<scope>): <short summary>

Context: Why this change was needed.
Problem: What was broken, missing, or suboptimal.
Solution: What was done, and why this approach over alternatives.
Behavior: What changed from the user/developer perspective (before vs after).
Files:
  - path/to/file.ts:L-L: What changed in this file and why
```

### Hard rules (`CLAUDE.md:300-305`)

- **One task at a time.** No parallel tasks, no skipping ahead.
- **Commit after EVERY task.** Never batch multiple tasks into one commit. Never proceed to the next task without committing the current one.
- **Update the plan file immediately.** The file in `tasks/todo/` must always reflect actual progress.
- **Never leave stale files** in `tasks/todo/`. Abandoned plans move to `tasks/done/` with a note or are deleted.
- **Task granularity.** Each task is a concrete, completable unit of work, not a vague goal.

## Alternatives considered

- **Plans in conversation history only**: works within one session, evaporates afterward. Rejected — cross-session continuity is a core requirement for an LLM-assisted workflow.
- **One big commit per plan**: simplest but loses granularity; reverting task 3 means reverting tasks 4–6 too. Rejected.
- **Use GitHub issues as the task store**: requires network, couples workflow to a hosting provider, and hurts offline-first. Rejected as the primary mechanism; issues stay optional for public tracking.
- **Squash-merge PRs (condensed history at merge time)**: hides the per-task granularity we deliberately create. Rejected for this repo's workflow.
- **Free-form commit messages**: fine for throwaway projects; for a project with a single reviewer who may not remember context six months later, the Context/Problem/Solution/Behavior/Files template is cheap insurance.

## Consequences

- History is intentionally verbose. `git log --oneline` is long; `git log` is self-explanatory. The trade-off is made in favor of future-archaeology speed.
- Agents are guided by the plan file and by `CLAUDE.md` during execution; deviations require a plan-file update, not silent improvisation.
- The testing gate is the per-commit hurdle, which means a commit that touches backlinks must update `backlinks.service.test.ts` (or prove it's a test-free `.svelte`/trivial util). CLAUDE.md Quick Reference rule 11 restates this.
- `tasks/done/` accumulates a historical log of how the app was built. It is checked into the repo deliberately — searching it answers "why did we do X?" for many cases.
- The workflow's biggest overhead is on trivial multi-task plans: six tiny commits vs one. The team has concluded that's the correct trade-off; reverting tiny changes is cheap, reverting bundled changes is not.
- Re-evaluation triggers: the workflow noticeably slows down work it should not (e.g., 30-task doc-only plans produce too much commit noise — batch carefully); a project management system obviates the file-based plans (unlikely given offline-first); Conventional Commits + automated changelog tooling makes looser commit messages safe again.

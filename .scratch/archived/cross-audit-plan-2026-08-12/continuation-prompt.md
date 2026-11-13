# Cross-audit continuation orchestrator (issues 25-42, 46-50) — criticality order

You are the ORCHESTRATOR for the remaining issues in
`.scratch/cross-audit-plan-2026-08-12/issues/`. This is an explicit opt-in to
multi-agent orchestration: use the Workflow tool for every issue.

Issues 14-24 are already done and merged (closing commits `fc06fef7`,
`69f9cb37`, `5f4c0675`, `c8273857`, `94aac0b5`, `d8650958`, `7f5f07f9`,
`d15eb043`, `7d433d98`, `731ab6e2`, `3562871c`). Do not redo them; absent
issue files mean done (tracker convention).

## Your role — orchestrate only, never implement

The main session NEVER reads code deeply, edits source, runs gates, or
commits. Every stage below runs as EXACTLY ONE sub-agent inside a Workflow —
discovery, implementation, and review are each their own single sub-agent per
commit-step, never work done in the main session. Your job each cycle: pick
the next issue from the priority order, read its issue file, author/launch
the per-issue workflow, read the compact structured result, integrate the
branch, post a one-line status, repeat. Keep your context lean.

## Read before the first issue

- `.scratch/cross-audit-plan-2026-08-12/issues/CLAUDE.md` — execution playbook.
- `.scratch/cross-audit-plan-2026-08-12/plan-2026-08-12.md` — cluster
  resolutions and corrected ranges. Issue file wins over the plan; surface
  discrepancies in the issue's Comments.
- Root `CLAUDE.md` — gate rule 6, commit format, tabs, removal checklist.

## Priority order (STRICT — criticality-first, from the 2026-08-18 triage)

Run strictly serially, one issue at a time, in this order:

1. **46** (CRITICAL bug: buildIndex pendingRebuild reruns with stale vaultPath — cross-vault data shown)
2. **48** (HIGH bug: eq/neq filter values serialize unquoted — residual half of LB7)
3. **26** (low itself, but prerequisite toll for 28: pays fs test churn)
4. **28** (HIGH bug: forgetNote — closes LB6)
5. **27** (low itself, prerequisite toll for 29: path helpers)
6. **29** (HIGH: applyNoteChange — closes M08)
7. **34** (low itself, prerequisite toll for 35: dead Rust vault commands)
8. **35** (CRITICAL: collection producer + removeRecord wiring — closes M12 + M08 fully)
9. **36** (HIGH: version-keyed vault-entries memo — wrong-vault completion window)
10. **47**, **49**, **50** (MEDIUM bugs/perf, all small, no deps)
11. **30**, **37**, **38** (MEDIUM, small, no deps)
12. **31** → **32** → **33** (settings chain; 33 is the actual bug fix, gated on 31+32)
13. **25** (typed openNoteAt)
14. **39** (applyPathChange — needs 29 and 34 already landed)
15. **40**, **41**, **42** (LOW cleanups — do these last)

Skip + report: **43** (blocked on the external freeze investigation), **44**
(ready-for-human), **45** (wontfix ledger). If an issue fails, its dependents
are skipped + reported; continue with independent issues.

### Issues 46-50 (formally `needs-triage`)

These are UNVERIFIED bug reports triaged for severity on 2026-08-18. For each:
the discovery agent must first VERIFY the bug is real (reproduce it with a red
test or a concrete code-path proof). If verified: flip `Status:` to
`ready-for-agent` in the same branch and proceed. If REFUTED: do not
implement — append a Comments entry with the refutation evidence, flip to
`wontfix`, commit that annotation, and report. Never implement an unverified
report.

## Worktree isolation — one worktree per issue

All implementation happens in `git worktree add .claude/worktrees/issue-NN -b
issue-NN main` + `pnpm install --prefer-offline` inside it. Do NOT use the
Workflow `isolation: 'worktree'` option — create the worktree explicitly and
pass its absolute path in every agent prompt so discovery → implement →
review → commit all see the same tree. The main checkout stays pristine.

Integrate after each issue, from the main checkout, checking exit codes
directly (NEVER pipe `git merge` through `tail`/anything — a masked exit code
once removed a worktree after a failed merge):

1. Verify `git status` clean.
2. If `git merge-base main issue-NN` != `git rev-parse main`, main moved:
   `git rebase main issue-NN` first (user-approved standing policy — issue
   branches are local-only, so rebase is safe; note that close-commit
   messages then record pre-rebase SHAs).
3. `git merge --ff-only issue-NN`, `git worktree remove
   .claude/worktrees/issue-NN`, `git branch -d issue-NN`.

Before every workflow launch: main checkout clean AND `git worktree list`
shows no leftover `issue-*` worktree. Otherwise stop and investigate.

## Per-issue workflow shape (Workflow tool, ≤16 agents per workflow)

Model policy (standing): discovery, implementer and committer agents run
`model: 'opus'`; every adversarial reviewer runs `model: 'fable'`. Each stage
is ONE sub-agent.

For each commit-step of the issue (multi-step issues = one commit per step,
review before EVERY commit), all inside the issue's worktree:

1. **Discovery agent** (`opus`, 1 agent): reads the issue file, the playbook,
   the plan sections it cites, and every file the step touches; traces
   callers per the root CLAUDE.md removal checklist; for bug fixes, designs
   the red-first regression test and verifies the bug actually reproduces;
   returns a structured scope brief (files, callers, test plan, risks,
   verified/refuted for 46-50). If discovery refutes the step's premise,
   the workflow stops the step and reports instead of implementing.
2. **Implement agent** (`opus`, 1 agent): receives the scope brief; writes
   the regression test FIRST and proves it red where the step fixes behavior
   (pure deletions substitute a repo-wide caller trace); implements the
   minimal change; updates/deletes test collateral; runs the gate matched to
   the surface (Rust → `cargo test --manifest-path src-tauri/Cargo.toml`;
   frontend → `pnpm check` + `pnpm vitest run` + `pnpm build`; both → all
   four; e2e via `bash scripts/e2e.sh` ONLY if e2e collateral changed).
   Plain `pnpm`, never npx/npm; tabs; no commits.
3. **Adversarial review agent** (`fable`, 1 agent): HARD read-only — no
   Edit/Write, no state-changing git. Stance: PRESUMED FLAWED. Attacks:
   missed callers, behavior parity, store/reactive-chain breakage, test
   vacuity, collateral completeness, diff hygiene, gate honesty. Returns
   blocker/major/minor findings or an explicit "could not refute".
4. **Fix round** (max 2): fresh implement agent applies blocker/major
   findings + re-runs the gate; fresh reviewer re-reviews the delta.
5. **Commit agent** (`opus`, 1 agent): audits `git status` (abort on
   anything outside the step's files); stages only the step's files;
   verifies `git diff --cached --stat`; commits on `issue-NN` in the full
   repo format. NEVER amend. If a commit agent dies on a transient API error
   (529/server error), retry it ONCE with a "check whether the commit
   already exists / files already staged" preamble before invoking the
   failure policy — transient infra errors are not implementation failures.

After the last step: the closing `## Comments` entry (red-green evidence,
review verdicts, resolving SHAs, minor findings worth follow-up) rides the
final fix commit; then a separate `chore(issues)` commit `git rm`s the issue
file. Then integrate (above).

Split issues with more than ~4 commit-steps into sequential workflows over
the SAME worktree/branch, all but the last launched in a no-close mode (no
closing Comments, no issue-file deletion); pass earlier parts' SHAs into the
final part so the closing entry is complete. Stay in the loop between
workflows: read each result before launching the next.

## Failure policy

If a step's review cannot converge after 2 fix rounds, or its gate cannot go
green: discard the step's uncommitted changes (git restore; delete only
untracked files the step created), append a Comments entry (what was tried,
what failed, open findings), flip `Status:` to `ready-for-human`, commit that
annotation as `chore(issues)`, integrate whatever IS committed (ff-only per
the policy above), remove the worktree, return `failed`. Skip dependents,
continue with independent issues. Never leave residue between issues.

## Reporting

- After each issue: one line — issue, outcome, SHAs.
- Final report: table of every issue attempted → outcome (`done` + SHAs /
  `skipped` + reason / `failed` + reason / `refuted` for 46-50 refutations),
  the skipped 43/44/45, and every follow-up candidate the reviewers surfaced
  (carry forward the open list from the 2026-08-18 session: stale Tags-panel
  help docs; docs/LIVE-PREVIEW.md block-plugin template; isExternalEdit /
  isTabSwitching latch try/finally hardening; settingsKey vs registry-key
  drift; watcher external-delete not clearing the view parse cache).

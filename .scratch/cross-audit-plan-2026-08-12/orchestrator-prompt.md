# Cross-audit issue orchestrator (issues 14-45)

You are the ORCHESTRATOR for executing the remaining issues in
`.scratch/cross-audit-plan-2026-08-12/issues/`. This is an explicit opt-in to
multi-agent orchestration: use the Workflow tool for every issue.

## Your role — orchestrate only, never implement

You (the main session) never edit source files, never run gates, never commit.
All implementation, review, and committing happens inside Workflow sub-agents.
Your job each cycle:

1. Pick the next runnable issue.
2. Read its issue file fully, decide the commit-step breakdown.
3. Author and launch a per-issue workflow (see shape below).
4. Read the workflow's structured result, post a one-line status to the user.
5. Repeat until no runnable issue remains, then produce the final report.

Keep your own context lean: workflow agents return compact structured
summaries, never full diffs or file dumps.

## Read these before the first issue

- `.scratch/cross-audit-plan-2026-08-12/issues/CLAUDE.md` — the execution
  playbook (read fully → red test where applicable → minimal fix → gate →
  adversarial review → commit → done+delete). Every workflow agent prompt must
  carry the parts of this playbook it needs.
- `.scratch/cross-audit-plan-2026-08-12/plan-2026-08-12.md` — cluster
  resolutions, corrected line ranges, and track ordering. When an issue and the
  plan disagree, the issue file wins (it encodes the later correction), but
  surface the discrepancy in the issue's Comments entry.
- Root `CLAUDE.md` — gate rule 6, commit format, tabs, store/test rules.

## Scope and eligibility

- Issues 14-45 only. 46-50 are `needs-triage` — out of scope, list them in the
  final report as untriaged.
- Only `Status: ready-for-agent` issues run. Skip and report the rest:
  43 (`needs-info`), 44 (`ready-for-human`), 45 (`wontfix`). Do not delete
  skipped issue files.

## Ordering — strictly serial

- ONE issue at a time, ONE workflow at a time. Never parallelize across
  issues: commits are a serial resource and issues share files.
- `Blocked by:` resolution: a blocker naming an issue file that is ABSENT from
  the issues folder is satisfied (done issues are deleted on close — that is
  the tracker convention). A blocker file still present must be executed
  first. External/human blockers (e.g. issue 43's freeze investigation, issue
  44's branch decision) cannot be satisfied by this run → skip + report.
- When several issues are runnable, prefer the track ordering in
  plan-2026-08-12.md (P2 deletions before P3 refactors; C06/C07/C08/C09 track
  orders). Deletions-first is the plan's core sequencing rule.
- If an issue fails (see failure policy), its dependents become blocked →
  skipped + reported. Continue with independent issues.

## Per-issue workflow shape (Workflow tool, ≤16 agents per workflow)

Model policy (standing user policy): implementer and committer agents run
`model: 'opus'`; every adversarial reviewer runs `model: 'fable'`.

For each commit-step of the issue (many issues are multi-commit — one commit
per step, review before EVERY commit):

1. **Implement agent** (`opus`): reads the issue file, the playbook, and every
   file the step touches; traces callers per the root CLAUDE.md removal
   checklist; writes the regression test FIRST and proves it red where the
   step fixes behavior (pure dead-code deletions substitute a repo-wide caller
   trace for the red test); implements the minimal change; updates/deletes
   test collateral; runs the gate matched to the surface (Rust →
   `cargo test --manifest-path src-tauri/Cargo.toml`; frontend →
   `pnpm check` + `pnpm vitest run` + `pnpm build`; both → all four; e2e via
   `bash scripts/e2e.sh` ONLY if e2e collateral changed). Returns a structured
   summary: files touched, gate results, red-green evidence, notes.
2. **Adversarial review agent** (`fable`): HARD CONSTRAINT read-only — no
   Edit/Write, no state-changing git. Stance: the implementation is PRESUMED
   FLAWED until it fails to refute it. Attacks: missed callers, behavior
   parity, store/reactive-chain breakage, test vacuity (would tests fail if
   the change were reverted?), collateral completeness (docs, mocks, ADRs,
   CLAUDE.md), diff hygiene. Returns findings with severity + file:line, or
   an explicit "could not refute" with the attack list.
3. **Fix round** (max 2): if the review has material findings, a fresh
   implement agent applies them + re-runs the gate, then a fresh reviewer
   re-reviews the delta.
4. **Commit agent** (`opus`): audits `git status` first (a crashed reviewer
   may have left mutations — abort and report if the tree contains anything
   outside the step's files); stages ONLY the step's files; verifies with
   `git diff --cached --stat`; commits in the repo's full format (Context,
   Problem, Solution, Behavior, Files with line ranges). Plain `pnpm`, never
   npx/npm. NEVER amend: main syncs with origin fast — history rewrites are
   forbidden in this run.

After the last step: the closing `## Comments` entry (red-green evidence,
discoveries, review verdicts, resolving SHAs) rides the final fix commit; then
a separate `chore(issues)` commit `git rm`s the issue file recording "done,
resolved by <sha(s)>".

You may encode all steps of one issue in a single workflow script (stages in
sequence) or run one workflow per step for large issues — keep each workflow
≤16 agents. Between workflows, you stay in the loop: read the result before
launching the next.

## Failure policy (keeps the run moving)

If a step's review cannot converge after 2 fix rounds, or its gate cannot be
made green, the workflow must:

1. Discard ONLY that step's uncommitted changes (`git restore` of the touched
   files — committed work from earlier steps stays).
2. Append a Comments entry to the issue file explaining what was attempted,
   what failed, and the reviewer's open findings; flip `Status:` to
   `ready-for-human`.
3. Commit only that issue-file edit as `chore(issues)`.
4. Return a `failed` result. You then skip its dependents and continue.

Never leave the tree dirty between issues. Audit `git status` before every
workflow launch; if it is not clean, stop and investigate before proceeding.

## Reporting

- After each issue: one line to the user — issue, outcome, SHAs.
- Final report: a table of every issue 14-45 → outcome (`done` + resolving
  SHAs / `skipped` + reason / `failed` + reason), plus the untriaged 46-50
  list, plus anything discovered that should become a new issue.

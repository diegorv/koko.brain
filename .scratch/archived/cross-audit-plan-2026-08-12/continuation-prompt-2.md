# Cross-audit continuation orchestrator, part 2 (issues 51-52 + test-health + follow-ups)

You are the ORCHESTRATOR for the remaining work in
`.scratch/cross-audit-plan-2026-08-12/`. This is an explicit opt-in to multi-agent
orchestration: use the Workflow tool for every work item.

The previous session (2026-08-19) closed all 23 executable issues of the original
program: 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 46,
47, 48, 49, 50. Do NOT redo any of them. Absent issue files mean done; that is the
tracker convention. Its final record, including everything below in more detail, is
`.scratch/cross-audit-plan-2026-08-12/RUN-STATE-2026-08-19.md`. Read it first.

## Your role: orchestrate only, never implement

The main session NEVER reads code deeply, edits source, runs gates, or commits.
Every stage runs as exactly ONE sub-agent inside a Workflow: discovery,
implementation and review are each their own sub-agent per commit-step, plus a
mechanical commit agent. Your job each cycle: pick the next item, read its issue
file, author and launch the per-item workflow, read the compact structured result,
integrate the branch, post a one-line status, repeat. Keep your context lean.

Model policy: discovery, implementer, fix and commit agents run `model: 'opus'`;
every adversarial reviewer runs `model: 'fable'`, except where an item is genuinely
mechanical, where opus may review instead.

## Read before starting

- `.scratch/cross-audit-plan-2026-08-12/RUN-STATE-2026-08-19.md` (the handoff record)
- `.scratch/cross-audit-plan-2026-08-12/issues/CLAUDE.md` (the execution playbook)
- Root `CLAUDE.md` (gate rule 6, commit format, tabs, the removal checklist)

Four corrections to those documents, learned the hard way last session. Carry them:

1. The playbook's step 2 claims this repo has no component-rendering tooling. STALE.
   `vitest.config.ts` sets `conditions: ['browser']` precisely so `mount()` and
   `flushSync()` work, and several suites already mount real components. Real
   mount-based red tests are available to you.
2. `$effect.root` never fires under vitest's node environment. Any suite touching
   the settings persistence owner needs `// @vitest-environment jsdom`, or unrelated
   assertions pass through side channels and prove nothing.
3. Issue and plan line numbers are stale everywhere after 34 commits. Anchor by
   symbol, never by line number, and say so in every agent prompt.
4. Runes do not compile in plain `.ts`. Anything rune-based lives in `.svelte` or
   `.svelte.ts`.

## Work items, in priority order

### 1. Issue 51 (HIGH, real user-facing bug, `ready-for-agent`)

`.scratch/cross-audit-plan-2026-08-12/issues/51-depends-on-comma-space-regex.md`

`DEPENDS_ON_RE` in `src-tauri/src/vault/parsing.rs` drops every dependency id after
the first when the user writes comma+space, AND leaks the dropped ids into the task
title, because the removed span is shorter than the matched text. Already reproduced
twice independently against regex 1.13.1 in a scratch crate, so the premise is
verified; the discovery agent should still re-derive it rather than trust the file.
The issue names the suggested pattern. Rust surface, so the gate is
`cargo test --manifest-path src-tauri/Cargo.toml`; add the frontend gate only if a
TS-visible type or mock changes. Red test first: the existing unit tests cover
`id1,id2,id3` and a single id but never comma+space, which is exactly why the bug
survived.

### 2. Issue 52 (LOW, documentation hygiene, `needs-triage`)

`.scratch/cross-audit-plan-2026-08-12/issues/52-parsing-rs-stale-tasks-logic-citations.md`

12 comments in `parsing.rs` cite `tasks.logic.ts::` symbols that no longer exist.
Being `needs-triage`, discovery must first VERIFY each of the 12 is genuinely dead
(the surviving `tasks.logic.ts` exports are `hasUncheckedDescendants`,
`filterCompletedTasks`, `filterCompleted`, `filterByDate`, `computeTaskStats`), then
flip `Status:` to `ready-for-agent` in the same branch and proceed. If any citation
turns out to be live, do not rewrite it; record the refutation. Comment-only change,
so the gate is `cargo test` to prove nothing broke syntactically.

Group 51 and 52 into ONE worktree: both edit `parsing.rs`, so separate worktrees
would guarantee a rebase conflict. Two commits, 51 first.

### 3. Test-health: `parsers/table.test.ts` non-determinism (do this, it gates trust)

NOT an issue file yet; file one as issue 53 as part of the work.

`src/tests/lib/core/markdown-editor/extensions/live-preview/parsers/table.test.ts`,
case `findAllTables > finds multiple tables`, returned 1 table instead of 2 on an
UNTOUCHED tree at commit `ed1a7b38`, while other runs at the same commit were green.
This is NOT a wall-clock flake: the assertion is a count, not a timing. The leading
hypothesis is state pollution or order dependence, possibly via the view parse cache.

Two sibling problems, lower severity, same theme:
- `src/tests/lib/features/type-definitions/TypeNoteList.perf.test.ts` asserts a hard
  1500 ms ceiling and failed at 1637 ms under concurrent load. Make it
  load-independent (assert on work done, for example scan counts, not on wall time)
  or the next parallel run reproduces the false red.
- `live-preview/inline/pipeline-dom.test.ts` failed then passed on an untouched tree.

Why this ranks above the follow-ups: a non-deterministic baseline undermines every
"gate green" claim any future agent makes. Have the discovery agent try to reproduce
by running the file in isolation, then under `--sequence.shuffle`, then as part of
the full suite, and report which reproduces.

### 4. Correctness follow-ups surfaced by reviewers (file each as an issue first)

Do NOT implement these straight from this prompt. For each, have a discovery agent
verify it against current code and write a proper issue file, then execute the ones
that survive. Numbering continues from 53.

- **Stale post-teardown index events.** A `vault-index-updated` event arriving after
  teardown still writes the old vault's data into `typeDefinitionsStore`,
  `refreshArchivedPaths` and `fsStore.contentOrder`. Issue 36's memo invalidation
  explicitly does NOT close this; it needs a vault-scoped guard. The listener's
  `cancelled` flag never trips on a vault switch because `+layout.svelte` never
  re-runs its `$effect`. Highest-value item in this group.
- **`buildIndex` swallows IPC errors**, so `markIndexReady()` stays optimistic after
  a failed scan: the app asserts readiness for an index that was never built.
- **`teardownVault()` racing a live scan** clears `isBuilding` and `pendingRebuild`
  mid-flight, so a queued caller resolves without its index being built and a fresh
  `buildIndex` can start a second concurrent scan.
- **`loadVaultTagMap`** (`src/lib/features/search/search.service.ts`) keeps a direct
  invoke on a rationale that only fits `loadVaultContentMap`. It reads only
  `entry.tags` and issues no batch read, so it could route through the issue 36 memo.

Carried from the 2026-08-18 session, still unverified: stale Tags-panel help docs;
`docs/LIVE-PREVIEW.md` block-plugin template; `isExternalEdit` / `isTabSwitching`
latch try/finally hardening; `settingsKey` vs registry-key drift; watcher
external-delete not clearing the view parse cache.

## Out of scope, do not touch

- 43 (blocked on an external freeze investigation), 44 (ready-for-human, needs a
  branch decision), 45 (wontfix ledger). Leave the files in place, list them in the
  final report.
- `.scratch/kimi-3-tauri-audit/` and `.scratch/p2p-sync-review/` belong to other
  workstreams.

## Worktree isolation

One worktree per work item:
`git worktree add .claude/worktrees/<slug> -b <slug> main`, then inside it
`pnpm install --prefer-offline` and `pnpm exec svelte-kit sync` (without the sync,
vitest fails at startup on a fresh worktree). Do NOT use the Workflow
`isolation: 'worktree'` option; it creates a fresh worktree per agent and breaks the
discovery to implement to review to commit chain. Pass the absolute worktree path in
every agent prompt.

You may run several worktrees in PARALLEL when their file surfaces are disjoint, but
verify disjointness by actually listing the files each item touches. Last session
lost a rebase to an unchecked assumption: two items both edited
`tauri-listeners.service.ts`. Merges stay strictly serial regardless. Cap concurrency
at about 4; beyond that, concurrent vitest runs start tripping wall-clock assertions.

Integrate after each item, from the main checkout, checking exit codes directly and
NEVER piping `git merge` through `tail` or anything else:

1. Verify `git status` is clean.
2. If `git merge-base main <slug>` differs from `git rev-parse main`, main moved:
   `git rebase main <slug>` first. Issue branches are local-only, so rebase is safe.
3. `git merge --ff-only <slug>`, then `git worktree remove .claude/worktrees/<slug>`,
   then `git branch -d <slug>`.

The user commits to main during runs, so expect to rebase on nearly every
integration. If a rebase conflicts, do NOT resolve it in the main session: hand it to
a sub-agent, and have a second read-only agent prove no test case was dropped by
diffing the `it(` title multisets of both pre-rebase versions against the resolution.

## Per-item workflow shape

Per commit-step, all inside the item's worktree:

1. **Discovery** (`opus`): run the gate on the UNTOUCHED worktree first to establish
   a green baseline and report anything red without fixing it. Read the issue file,
   the playbook, and every file the step touches. Apply the root CLAUDE.md removal
   checklist: grep every call site of every touched symbol and state the impact.
   Trace the reactive chain. Design the red-first test and name any side channel that
   could make it pass against broken code. For `needs-triage`, VERIFY the report is
   real before anything else; if refuted, annotate, flip to `wontfix`, commit that,
   and stop. Return a structured scope brief and the commit-step breakdown. The
   `chore(issues)` close commit is NOT a step.
2. **Implement** (`opus`): regression test FIRST, proven red for the right reason.
   Pure deletions substitute an exhaustive repo-wide caller trace. Minimal change, no
   adjacent refactors. Update the collateral your change orphans. Run the gate matched
   to the surface and report REAL results. Plain `pnpm`, never npx/npm. No commits.
3. **Adversarial review** (`fable`): HARD read-only, no Edit/Write, no state-changing
   git. Stance: PRESUMED FLAWED. Attack missed callers, behavior parity, reactive
   chain breakage, test vacuity (would it fail if the fix were reverted?), collateral
   completeness, diff hygiene, gate honesty. Return findings with file:line and a
   concrete failure scenario, or an explicit "could not refute" with the attack list.
4. **Fix round** (max 2), then **commit** (`opus`): audit `git status`, stage only the
   step's files, verify `git diff --cached --stat`, commit in the repo's full format
   (Context, Problem, Solution, Behavior, Files with line ranges). NEVER amend.

After an issue's last step: the closing `## Comments` entry rides the final fix
commit, then a separate `chore(issues)` commit `git rm`s the issue file.

Two operational rules that cost the last session real time:

- **A null agent return is usually a transient infrastructure error** (529, server
  error, session limit), NOT an implementation failure. Retry the agent ONCE with a
  preamble telling it partial edits may already be on disk and to read `git status`,
  `git diff` and `git diff --cached` before continuing. Only invoke the failure
  policy if the retry also fails.
- **Minor review findings that are trivial convention fixes** (import grouping,
  em-dashes, tabs, an inaccurate sentence you wrote) should be applied by the commit
  agent before staging, rather than shipped as permanent violations.

## Failure policy

If a step's review cannot converge after 2 fix rounds, or its gate cannot go green:
park the step's uncommitted work as a stash COMMIT (`git stash push`, then record the
resulting SHA, not `stash@{0}`, which concurrent worktrees shuffle) so it stays
recoverable; append a Comments entry saying what was tried, what failed and what a
human must decide; flip `Status:` to `ready-for-human`; commit that annotation as
`chore(issues)`; integrate whatever IS committed; return `failed`. Skip dependents,
continue with independent items. Never leave residue between items.

## Reporting

- After each item: one line to the user, naming the item, the outcome and the SHAs.
- Final report: a table of every item attempted with its outcome, the untouched
  43/44/45, every new issue filed, and every follow-up the reviewers surfaced that
  was not executed.

## Starting state

main is at `7882e7ea`, all four gates green: `pnpm check` 191 files 0 errors;
`pnpm vitest run` 292 files / 6476 passed + 1 todo; `pnpm build` exit 0;
`cargo test` 984 passed / 0 failed / 4 ignored. Re-verify before starting, since the
user commits to main between sessions.

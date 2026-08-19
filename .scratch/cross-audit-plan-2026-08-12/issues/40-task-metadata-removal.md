# Issue 40: Delete the superseded task-metadata parser

Status: ready-for-human
Phase: P4
Source: PONY #3 — plan-2026-08-12.md §P4 — Worth-exploring variants and heavy-collateral PARTIALs

Blocked by: none

## What

The TS task-metadata parser was superseded by the Rust parser in `src-tauri/src/vault/parsing.rs`.
Deleting it removes the source plus its own 388-line test file, but it is also the only tracked
anchor for a real regex bug, so that bug must be re-filed before the anchor disappears.

## How

- Delete the parser **source plus its own test file** (388 lines).
- Patch `makeTask` in `tasks.logic.test.ts` so the surviving suite still compiles.
- **Rewrite the 8 `parsing.rs` parity citations** — they currently point at the deleted TS parser.
- **Before deleting, RE-FILE the `dependsOn` regex bug against `src-tauri/src/vault/parsing.rs:1310-1316`.**
  The deleted test file is its only tracked anchor. Record the re-filed bug in this issue's Comments
  section (or as its own tracker entry) — the deletion must not land while the bug is untracked.
- **Keep `task-metadata.types.ts`** — the types survive the parser.
- Test collateral rides the same commit: the `makeTask` patch and the citation rewrites.

## Gate

- Frontend surface: `pnpm check` + `pnpm vitest run` + `pnpm build`. If the citation rewrites touch
  Rust files, also `cargo test --manifest-path src-tauri/Cargo.toml`.
- Stage only this change's files (`git add <specific files>`), verify with `git diff --cached --stat`.
- One commit for the deletion + collateral, full commit format (Context, Problem, Solution,
  Behavior, Files with line ranges). The bug re-filing happens first, as its own tracker write.

## Comments

### 2026-08-19 - handed back to human (implement step never landed)

**What was attempted.** The precondition landed cleanly and is already on `issue-40-50`: the
`dependsOn` comma-space regex bug is tracked as issue 51
(`51-depends-on-comma-space-regex.md`, commit `4c697f99`), together with issue 52
(`52-parsing-rs-stale-tasks-logic-citations.md`) for the 12 further stale `tasks.logic.ts`
citations in `parsing.rs`; commit `83fa9580` then recorded the pre-issue-40 line-number baseline
in both. So the bug is anchored independently of this deletion and issue 40 is no longer
blocking it.

The deletion step itself (`refactor(tasks): delete the superseded TS task-metadata parser`) then
produced a full working-tree change but **never landed**: the implement agent returned no result
(null) before the commit was made, so nothing was reviewed and nothing was committed.

**What failed.** Not a gate failure - no gate output exists to quote, and no reviewer findings
exist either. The agent process ended without returning, mid-step. The work it left behind was
uncommitted and unverified by this run's review pipeline, so it was not landed.

**The abandoned diff is recoverable, not deleted.** It was parked as a stash commit rather than
discarded:

```
git show b56e8c9eae9ce0bb0ffab8f1b11439ca358c4d0b            # the whole change
git stash apply b56e8c9eae9ce0bb0ffab8f1b11439ca358c4d0b     # to resume it
```

(Use the SHA, not `stash@{0}` - concurrent worktrees push the stash stack around.) Its contents,
142 insertions / 653 deletions across 5 files:

- `src/lib/features/tasks/task-metadata.logic.ts` deleted (241 lines).
- `src/tests/lib/features/tasks/task-metadata.logic.test.ts` deleted (388 lines).
- `src/tests/lib/features/tasks/tasks.logic.test.ts` - `makeTask` builds `metadata` as a literal
  instead of calling the deleted parser (1 insertion, 2 deletions).
- `src-tauri/src/vault/parsing.rs` - the 8 parity citations rewritten (49 lines touched).
- this issue file - a 114-line self-report from the agent, which the stash also carries.

That self-report claims a green gate (`pnpm check` 0 errors; `pnpm vitest run` 283 files /
6286 passed; `pnpm build` exit 0; `cargo test` 997 passed) and a mutation check on the patched
`tasks.logic.test.ts`. **None of that is verified** - it is the abandoned agent's own account,
recorded here only so a human knows what to re-check, never as evidence the change is sound.

**What a human needs to decide.**

1. Whether to resume the parked diff (apply the stash, re-run the four gate commands, review it,
   commit it) or re-run issue 40 from scratch against a clean tree.
2. Whether the parity-citation rewrites in `parsing.rs` are the right call at all: the parked diff
   rewrites 8 citations and leaves 12 equally stale ones to issue 52. Doing all 20 in one pass, and
   closing 52 with it, may be the cleaner shape than the split `## How` currently prescribes.
3. Whether `isOverdue`, `isDueToday` and `isDueSoon` should really leave the tree. `## How` frames
   this issue as deleting "the parser", but those three helpers ride along in the same module and
   have **no Rust counterpart**. They appear to be dead, but that claim is part of the unverified
   report above and needs confirming before the deletion lands.
4. A cite error in the scoping, independent of all the above: `## How` and `plan-2026-08-12.md:153`
   both point the dependsOn re-file at `parsing.rs:1310-1316`, which is `map_checkbox_char` and
   unrelated to depends-on. Issue 51 already records the correct anchors (`DEPENDS_ON_RE` and its
   consumer) and the discrepancy; locate by symbol, not by line.

Nothing from the failed step is on the branch. `issue-40-50` carries only the three tracker commits
(`4c697f99`, `83fa9580`, and this one) and is fast-forward mergeable.

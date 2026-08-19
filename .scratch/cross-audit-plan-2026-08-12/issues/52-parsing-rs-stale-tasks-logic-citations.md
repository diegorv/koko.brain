# Issue 52: `parsing.rs` cites 12 `tasks.logic.ts` symbols that no longer exist

Status: needs-triage
Phase: unplanned
Source: issue 40 (2026-08-19) - discovered while rewriting the 8 `task-metadata.logic.ts` parity
citations; out of that issue's `## How` scope, filed rather than folded into its diff

Blocked by: none

## What

`src-tauri/src/vault/parsing.rs` carries 12 `Mirrors ... tasks.logic.ts::<symbol>` comments whose
target symbols were deleted from `src/lib/features/tasks/tasks.logic.ts` long ago (Audit Tier 4 #16,
2026-04-29 - the removal is tombstoned in that file's own header at
`src/lib/features/tasks/tasks.logic.ts:3-10`). The file's only remaining symbols are
`hasUncheckedDescendants:16`, `filterCompletedTasks:33`, `filterCompleted:58`, `filterByDate:75`,
`computeTaskStats:90` - none of which any of these comments name.

| parsing.rs line | cited symbol | exists in tasks.logic.ts |
|---|---|---|
| 1145 | `extractTasks` | no |
| 1146 | `extractTasksFromSection` | no |
| 1147 | `toggleTaskInContent` | no |
| 1159 | `TASK_RE` | no |
| 1165 | `ORDERED_TASK_RE` | no |
| 1171 | `HEADING_RE` | no |
| 1325 | `calculateIndent` | no |
| 1341 | `parseTaskLine` | no |
| 1385 | `CODE_FENCE_RE` | no |
| 1399 | `extractTasks` | no |
| 1428 | `extractTasksFromSection` | no |
| 1588 | `toggleTaskInContent` | no |

Comment-only, so nothing is broken at runtime. The cost is that a reader (human or agent) chasing a
parity question is sent to a file that has not owned task parsing since Phase 7.6 - Rust is the sole
implementation now.

Issue 40 rewrites the 8 sibling `task-metadata.logic.ts::` citations (lines 1148, 1149, 1178, 1199,
1256, 1296, 1309, 1479) because that file is being deleted. Fixing those 8 and leaving these 12 is
inconsistent, but widening issue 40's diff would break its scope contract, so they are tracked here.

## How

- Rewrite each comment so it documents the Rust behaviour on its own terms instead of pointing at a
  deleted TS symbol. Keep the substance that is Rust's own contract, not TS parity trivia:
  - 1151-1155 (the header's parity paragraph): the recurrence lookahead-stop list and the
    `#([A-Za-z0-9_][A-Za-z0-9_-]*)` ASCII rationale explain live Rust behaviour - keep them, drop
    only the "mirrors TS" framing.
  - The regex doc comments (1159, 1165, 1171, 1385) already inline the pattern; the citation adds
    nothing once the TS side is gone.
- Comment text only. No behaviour change, no test change expected.
- Sequence after issue 40 lands, so the two comment rewrites do not conflict in the same hunks
  (1145-1149 sit in one block).

## Gate

- Rust surface: `cargo test --manifest-path src-tauri/Cargo.toml` (comment edits can only regress it
  by accidental syntax damage, so the gate is cheap insurance).
- Stage only the files related to this issue, verify with `git diff --cached --stat`.
- One commit, full commit format (Context, Problem, Solution, Behavior, Files with line ranges).

## Comments

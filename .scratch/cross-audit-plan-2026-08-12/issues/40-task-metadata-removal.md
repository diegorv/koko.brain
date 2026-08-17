# Issue 40: Delete the superseded task-metadata parser

Status: ready-for-agent
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

# Issue 39: applyPathChange — the path-change owner

Status: ready-for-agent
Phase: P4 (last of the filesystem track)
Source: ARCH 0.0 — plan-2026-08-12.md §P4 — Worth-exploring variants and heavy-collateral PARTIALs

Blocked by: 29-apply-note-change, 34-dead-vault-commands

## What

"A note's path changed" (delete, rename, move, restore) has no owning module — four hand-picked
consumer subsets drift apart. Introduce `applyPathChange({from, to, isDirectory})` as the single
owner of ordering and fan-out, and give it the Rust half for folder re-keying.

## How

- `applyPathChange({from, to, isDirectory})` owns the **ordering**, via a **disk-op callback** so
  `deleteItem` keeps `closeTabsForDeletedPath` **before** `moveToTrash`. The callback exists exactly
  to preserve that per-operation ordering — do not flatten it.
- Do the **folder-prefix walk once**, inside the owner, instead of per consumer.
- Wire the icon / calendar / collection **per-path removals built by issue 29** (`applyNoteChange`) —
  they already exist by the time this lands; do not write new ones.
- Rust `rename_note` must be **written against the post-issue-34 `index.rs`** (the dead-command cuts
  land first), per ADR-0025.
- **Amend ADR-0009 and ADR-0025** in this same commit series.
- Test collateral in the same commit: the fs-service ordering pattern (failing-first audit tests
  pinning "tabs close before trash move" and its siblings) extended to each operation, plus a
  folder-rename case asserting every path-keyed consumer was re-keyed.

## Gate

- Both surfaces: `cargo test --manifest-path src-tauri/Cargo.toml` **and** `pnpm check` +
  `pnpm vitest run` + `pnpm build`.
- Stage only this change's files (`git add <specific files>`), verify with `git diff --cached --stat`.
- Commit per step (TS owner + wiring; Rust `rename_note`), each with its tests and the ADR
  amendments, full commit format (Context, Problem, Solution, Behavior, Files with line ranges).

## Comments

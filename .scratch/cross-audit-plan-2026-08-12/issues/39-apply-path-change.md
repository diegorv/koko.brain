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


### Follow-up candidates deferred out of the Rust step

- `NoteEntry::with_path` has no direct unit test in `entry.rs`'s own `mod tests`; it is exercised
  only transitively through `vault_file_ops_test.rs::rename_note_inner_*`, which assert the `title`
  recompute and the path swap but not the "every other field is preserved" half of the contract.
  Adding that assertion grows the step's diff past its scope contract, so it is recorded here rather
  than applied: a future edit that reset a field inside `with_path` would still pass the suite.
- `rename_note_inner` re-keys a child whose lowercase stem is shared with a note OUTSIDE the renamed
  subtree without reclaiming the `by_path` slot that `remove_entry`'s promotion pass handed to the
  duplicate. Documented in the command's doc comment; a full rebuild can land on the same end state,
  so it is a wart rather than a divergence. Fixing it would mean re-pointing `by_path[stem]` at the
  new path when it pointed at the old one before removal.

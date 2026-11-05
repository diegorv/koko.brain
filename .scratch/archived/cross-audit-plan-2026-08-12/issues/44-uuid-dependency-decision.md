# Issue 44: cargo `uuid` removal — blocked on the p2p-sync branch decision

Status: ready-for-human
Phase: P5
Source: PONY #67 — plan-2026-08-12.md §P5 — Deferred / not applied

Blocked by: the `feature/p2p-sync` branch decision (human)

## What

The cargo `uuid` dependency is dead on `main`. It is **not** dead on the pushed, unmerged
`feature/p2p-sync` branch (tip `4b64de7`), which calls `Uuid::new_v4()` and inherits its
`Cargo.toml` line from `main`. Deleting on `main` strands that branch compile-broken at merge time.
This needs a human decision before any code change.

## How

- **HUMAN DECISION NEEDED.** Two acceptable resolutions:
  1. Merge or abandon `feature/p2p-sync` first, then delete the dependency on `main`; or
  2. Delete now on `main` and accept that the branch must re-add the `Cargo.toml` line itself.
- Do **not** delete the dependency before that decision is recorded here.
- Once decided, the removal itself is trivial: a **one-line `Cargo.toml` edit** plus the regenerated
  `Cargo.lock`.
- No source changes, no test collateral — the dependency has no callers on `main`.

## Gate

1. Record the decision (merge/abandon first, or delete-and-let-the-branch-re-add) in Comments below.
2. Then: one-line `Cargo.toml` edit + regenerated `Cargo.lock` + `cargo test --manifest-path
   src-tauri/Cargo.toml`.
3. Stage only `Cargo.toml` and `Cargo.lock` (`git add <specific files>`), verify with
   `git diff --cached --stat`, and land as one commit using the repo's full commit format (Context,
   Problem, Solution, Behavior, Files with line ranges).

## Comments

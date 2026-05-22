# Audit 2026-05-22 — Rust src-tauri bugs

Fixes for the 4 issues filed after the src-tauri audit on 2026-05-22.
GitHub issues: #121, #122, #123, #124.

## Tasks

- [x] Task 1 (#124): Treat embedder dimension mismatch as fatal. Pin `dimensions` at construction from the `ManagedModel` registry; return `Err` from `run_inference` when the model's output dim differs.
- [x] Task 2 (#122): Fix UTF-8 corruption in terminal PTY reader. Buffer incomplete trailing UTF-8 bytes between 4096-byte reads.
- [x] Task 3 (#123): Repair `by_path` after `remove_entry` stem collision. On remove, repopulate the slot with a surviving same-stem entry if any.
- [x] Task 4 (#121): Reconcile vault watcher + scan hidden-directory filter. Policy adopted: watcher matches scan — any dot-prefixed segment at any depth is filtered. `contains_nested_noise` + `NESTED_NOISE_SEGMENTS` removed (subsumed by broader rule).

## Notes

- One task per commit. Run `cargo test --manifest-path src-tauri/Cargo.toml` before each commit; add `pnpm check` + `pnpm vitest run` only if the change touches frontend code (none of these do).
- Order chosen by user: #124 first, then 122 / 123 in any order. #121 deferred until policy direction is set.
- Issue #121 policy candidates: (a) scan adopts watcher's first-segment + nested-noise rule, allowing nested user `.archive`/`.draft` dirs to index; (b) watcher adopts scan's any-depth dot-prefix block.

# Dependency Update — Round 2 (majors)

Land each remaining major bump in its own branch + PR so risk is isolated and easy to revert. Order chosen by blast radius (smallest first).

## Tasks

- [x] Task 1: Rust `tokenizers` 0.22 → 0.23. Branch `claude/deps-round-2-tokenizers`. Used only in `src-tauri/src/semantic/embedder.rs`.
- [~] Task 2: Rust `sysinfo` 0.38 → 0.39. **Deferred** — sysinfo 0.39 requires Rust 1.95 (MSRV bump) and the local toolchain is on 1.93. Revisit after `rustup update`. New APIs (operational_state, cgroup_limits) are not used by this project.
- [x] Task 3: Rust `sha2` 0.10 → 0.11. Branch `claude/deps-round-2-sha2`. `digest 0.11` switched `Sha256::digest` return type from `GenericArray` (which impl'd `LowerHex`) to `Array` (which doesn't), so two `format!("{:x}", …)` call sites were inlined to `iter().map(|b| format!("{:02x}", b)).collect()` (same byte-by-byte hex pattern already used elsewhere in the codebase).
- [x] Task 4: NPM `marked` 17 → 18. Branch `claude/deps-round-2-marked`. Markdown HTML rendering library — verify CHANGELOG.
- [ ] Task 5: NPM unify lucide family on 1.x (`lucide-svelte`, `@lucide/svelte`, `lucide-static`). Branch `claude/deps-round-2-lucide`. Touches every icon import site — mechanical but wide.
- [ ] Task 6: NPM `@doist/todoist-sdk` 9 → 10. Branch `claude/deps-round-2-todoist`. Affects the Todoist plugin only.

## Process per task

1. Branch off latest `main` (`git fetch && git checkout -b <branch> origin/main`).
2. Bump the dep, fix any compilation/type/test breakage.
3. Run the relevant test command (rust-only → `cargo test`; npm-only → `pnpm check` + `pnpm vitest run`).
4. Commit with the full Conventional Commits format.
5. Push branch and open a PR — let CI confirm. User merges when green.
6. After merge, sync `main` locally before starting the next task.

## Notes

- Each task is independent. If one fails CI, leave the branch open and move on.
- Don't batch multiple majors into a single PR — defeats the purpose of isolating risk.

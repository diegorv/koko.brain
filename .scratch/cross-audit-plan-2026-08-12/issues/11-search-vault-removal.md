# Issue 11: Remove dead `search_vault` / `text_search` surface

Status: ready-for-agent
Phase: P2
Source: PONY #7 + #33 (paired) — plan-2026-08-12.md §P2 — Safe deletion batch (Rust one-liners)
Blocked by: none

## What

Delete the unused `search_vault` / `text_search` Rust surface together with its TypeScript mirror.
The two findings are executed as one paired change per §Sequencing constraints honored ("Pairs kept:
#7+#33"), because the Rust cut and the TS type removal break each other's gates if split.

## How

- Delete `search_vault` and `text_search` on the Rust side.
- Delete the **306-line Rust test file** that covers them in the same commit — the crate does not
  compile otherwise.
- Delete the **four module declaration lines** that referenced the removed modules.
- Amend **`docs/adr/0011-*.md:41`**, which enumerates the removed command — the doc edit rides this
  commit, not a follow-up.
- Then delete the **`VaultSearchMatch` TypeScript mirror**.
- **Leave the e2e mock's own copy of `VaultSearchMatch` alone** — it is a separate local declaration,
  not the mirror, and removing it breaks the e2e harness.

## Gate

Both surfaces are touched, so all four commands: `cargo test --manifest-path src-tauri/Cargo.toml`,
`pnpm check`, `pnpm vitest run`, `pnpm build`. Stage only the related files, verify with
`git diff --cached --stat`, and commit with the repo's full commit format (Context, Problem, Solution,
Behavior, Files with line ranges).

## Comments

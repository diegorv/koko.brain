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

**2026-08-18 — resolved.** Pure deletion, so no red-green cycle; the deadness proof replaced it:
`search_vault` (commands/search.rs:16) was registered only at lib.rs:316 with zero
`invoke('search_vault')` sites in `src/`; `text_search` members (search_in_content,
build_lower_to_orig_map, SearchMatch) had no users outside the two deleted source files and the
306-line test file; `VaultSearchMatch` (fs.types.ts:40) was exported but imported nowhere (all 19
fs.types import sites take other types; no barrel exists). Deleted commands/search.rs,
search/text_search.rs, tests/commands/search_test.rs, the four declaration/registration lines,
the ADR-0011:41 enumeration entry, and the TS mirror. E2E mocks left untouched per scope
(virtual-fs.ts's VaultSearchMatch is a file-local declaration; nothing in e2e/ imports fs.types.ts).
Gate: cargo test green, pnpm check 0 errors, vitest 6716 passed (290 files), pnpm build green.
Adversarial review (Fable 5, read-only): could not refute — confirmed capabilities JSONs clean, no
dynamic command-name construction, no lost coverage (validate_vault_path / is_markdown_filename have
dedicated tests in utils_fs_test.rs:272-386), diff scope exact.

# 20: A root note renamed into a nested note's stem keeps its links

**What to build:** Renaming a note at the vault root to a stem that a nested note already owns (`/v/Old.md` -> `/v/Other.md` with `/v/B/Other.md` present) rewrites `[[Old]]` to `[[Other.md]]`, and both the TS resolver (`findExactFile`, wikilink-resolution.logic.ts:31-38) and Rust `find_exact_file` (index.rs:118-119) send that to `/v/B/Other.md`, the first `by_file_name` candidate. No link form reaches the root note today. The owner decides whether to add one, for example a root-anchored `[[/Other.md]]` that both resolvers map to the vault root, which needs a resolver change in TS and Rust.

**Blocked by:** none

**Status:** wontfix

**Gate:** Both: `cargo test --manifest-path src-tauri/Cargo.toml` + `pnpm check` + `pnpm vitest run` + `pnpm build`.

- [ ] Owner decision recorded in Notes: add a root-anchored form (which syntax), or accept the limit and close as wontfix.
- [ ] If a form is added: the logic test "cannot keep a root note on itself when a nested note owns the new stem" in src/tests/lib/core/filesystem/link-updater.logic.test.ts is changed to expect the new form, and that form resolves to `/v/Other.md` in `resolveWikilinkCached`.
- [ ] If a form is added: a Rust test next to `rename_note_inner_into_a_taken_stem_resolves_the_vault_relative_path_form` (src-tauri/tests/vault_file_ops_test.rs) asserts `idx.resolve(form) == Some("/v/Other.md")`.

## Notes

- **Source:** review of Issue 15 (`.scratch/audit-2026-11-04/work/15/review.md`, finding 1). Not a regression: before Issue 15 the rewrite wrote `[[Other]]`, which is equally wrong.
- Issue 15's owner decision D4 (a) ruled out resolver changes there, so this needs its own decision.

## Comments

- 2026-11-05: closed as wontfix by the owner. The case needs a rare name collision (a root note renamed onto a stem a nested note owns) and is not worth a new link syntax in both resolvers. The limit stays documented in the replaceWikilinks doc comment and pinned by the logic test.

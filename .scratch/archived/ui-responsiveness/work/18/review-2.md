VERDICT: APPROVED

## Previous findings

| # | Finding | Status | Evidence |
|---|---------|--------|----------|
| 1 | Stale "`by_path` keyed by stem" wording in `rename_note_inner` doc, `get_outgoing_links_v2` doc and `OutgoingLink.resolved_path` | resolved | commands/vault.rs:1080-1085 now names `by_path` (stem) and `by_file_name` (file name) and says a directory-naming target is re-credited by the retro scan in `update_entry`; vault.rs:507 and entry.rs:61 say "resolution caches". The regenerated `src/lib/contracts/generated/OutgoingLink.ts` is committed and the worktree stays clean after `cargo test`, so the bindings are fresh. |
| 2 | e2e mock resolves without a vault root | resolved | e2e/mocks/vault-index.ts:330 and :346 pass `'/test-vault'` as the third argument of `resolveWikilinkCached(target, cache, vaultRoot?)` (wikilink-resolution.logic.ts:108). The mock's root is `/test-vault` (e2e/mocks/tauri-core.ts:282). `pnpm check` passes. |
| 3 | Retro scan builds a resolved set for every entry | resolved | index.rs:656-675: the `filter` keeps a source only when `src != new_path` and `any` link resolves to `new_path`; the `map` then builds the set excluding `src_path`. Since `src != new_path`, "the set excluding src contains new_path" is the same as "some link resolves to new_path", so the selected sources and their sets are identical to before. |

## Acceptance criteria re-checked

- [met] Failing first: a Rust test where `[[foo.png]]` with `a/foo.md` before `b/foo.png` credits `b/foo.png` — `target_with_extension_credits_the_file_it_names` passes in vault_index_test (124 passed, 2 ignored); the fixes do not touch it.
- [met] Bare `[[foo]]` still credits `foo.md`; existing index tests stay green — vault_index_test 124 passed, commands_test 83 passed, ipc_contracts_test 8 passed, `--lib vault::` 369 passed, all exit 0 after the retro-scan refactor.
- [met] Failing first: a Rust test where `[[b/foo.png]]` with `x/b/foo.png` before `b/foo.png` credits `b/foo.png` — `path_style_target_takes_the_vault_relative_path_first` and `scans_resolve_a_path_style_link_at_its_vault_relative_path` pass.
- [met] The Rust doc comment on `resolve_with_cache` still describes the TS mirror correctly — the fixes do not touch index.rs:132-143; the mock now uses the same vault-root argument the doc describes.

## Findings

None open or new. The fixes are doc wording, a one-argument mock change and an equivalent iterator rewrite; no test was weakened or deleted, and nothing outside the Issue's scope changed.

## Checks run by this review

- `cargo test --manifest-path src-tauri/Cargo.toml --test vault_index_test --test commands_test --test ipc_contracts_test`: exit 0.
- `cargo test --manifest-path src-tauri/Cargo.toml --lib vault::`: exit 0, 369 passed.
- `pnpm check`: exit 0, 0 errors, 0 warnings.
- `git status --short` after cargo test: clean (ts-rs bindings fresh).
- Not run: the e2e suite against the changed mock, and the full suite (deliver's).

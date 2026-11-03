VERDICT: APPROVED

## Acceptance criteria

- [met] Failing first: a Rust test where `[[foo.png]]` with `a/foo.md` before `b/foo.png` credits `b/foo.png` — `target_with_extension_credits_the_file_it_names` (src-tauri/tests/vault_index_test.rs) asserts `resolve("foo.png") == /v/b/foo.png` and backlinks on `b/foo.png` only. On main, `resolve_with_cache` misses `foo.png` in `by_path` and falls back to the basename `foo`, which is `/v/a/foo.md` (first wins), so this assertion fails there. The test also uses `build`, which exists on main, so it is red by behavior and not only by compile. Passes on the branch.
- [met] Bare `[[foo]]` still credits `foo.md`; existing index tests stay green — `bare_target_still_credits_the_note` passes. The exact step is gated on the last segment having an extension (`note_name_from_target(file_name) != file_name`, index.rs:153), which matches TS `exactTarget`. vault_index_test: 124 passed, 2 ignored; lib `vault::` unit tests (with the updated `resolve_with_cache_*` tests): 369 passed; commands_test: 83 passed.
- [met] Failing first: a Rust test where `[[b/foo.png]]` with `x/b/foo.png` before `b/foo.png` credits `b/foo.png` — `path_style_target_takes_the_vault_relative_path_first` uses `build_with_root("/v", ...)` and asserts that `b/foo.png` holds the only backlink. On main it is red (no `build_with_root`, and the basename fallback picks `/v/x/b/foo.png`). The production wiring is covered by `scans_resolve_a_path_style_link_at_its_vault_relative_path` (tests/commands/vault_test.rs), which runs the full scan, the cached full scan and a cache hit over a real temp vault.
- [met] The Rust doc comment on `resolve_with_cache` still describes the TS mirror correctly — index.rs:132-143 now names `resolveWikilinkCached`, puts `vault_root` in the role of `vaultRoot` and lists the exact step, then the note-name step, then the basename fallback. `find_exact_file` (index.rs:110-129) names `findExactFile`. I compared it line by line with `src/lib/core/filesystem/wikilink-resolution.logic.ts`: vault-relative path first when there is a root and the target has a `/`, then the first `/{exact}` suffix match, and for a bare target the first candidate with that file name. Same order and case folding.

## Findings

1. minor — src-tauri/src/commands/vault.rs:1079-1086 (`rename_note_inner` doc): this comment is now wrong. It says resolution among renamed children "cannot break" because "wikilink resolution goes through `by_path`, which is keyed by lowercase stem rather than by directory". After this change, a path-style target with an extension resolves by directory first (vault-relative path, then suffix). I traced a folder rename by hand (`[[dir/foo.md]]` inside a renamed `dir/`), and the new `regained` re-credit plus the retro step still reach the full-rebuild end state. So the behavior is fine and only the stated reason is stale. Fix: reword the comment so it names the resolution caches and says why the incremental steps still converge. The same stale wording appears at commands/vault.rs:507 ("resolved against the managed `VaultIndex.by_path` cache") and in src-tauri/src/vault/entry.rs:61 (`OutgoingLink.resolved_path` "via the `by_path` cache"). `OutgoingLink` is `#[ts(export)]`, so editing that one means committing the regenerated binding in `src/lib/contracts/generated/`.
2. minor — e2e/mocks/vault-index.ts:323-346: the Issue's goal says the e2e mock "matches Rust again". The mock now matches Rust for `[[foo.png]]`, through the shared `byFileName` cache. It still calls `resolveWikilinkCached(link.target, cache)` without a vault root, while Rust now tries the vault-relative path first. A path-style target with a deeper same-named decoy earlier in the tree still differs between the mock and Rust. The mock's vault root is the fixed `/test-vault` (e2e/mocks/tauri-core.ts:282), so passing it is a one-argument change. The build report states this gap, and no acceptance criterion requires the change. Fix: pass `'/test-vault'` to both `resolveWikilinkCached` calls, or record the gap in a follow-up.
3. nit — src-tauri/src/vault/index.rs:661-668: the retro scan in `update_entry` used to stop early with `any(...)`. It now builds a `BTreeSet` of resolved targets for every other entry on every new-note insert, and then `stale` walks the whole `backlinks` map once per insert. That is still O(N·L) and only runs on new paths, so it costs extra allocations, not a new complexity class. Fix (optional): use `any` first to find the retro sources, and compute the resolved set only for those.

## Checks run by this review

- `cargo test --manifest-path src-tauri/Cargo.toml --test vault_index_test --test commands_test --test vault_cache_test --test ipc_contracts_test`: exit 0. The counts were 124 passed (2 ignored), 83, 8 and 8.
- `cargo test --manifest-path src-tauri/Cargo.toml --lib vault::`: exit 0, 369 passed. This target includes the `resolve_with_cache_*` unit tests in index.rs.
- `cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets --locked -- -D warnings`: exit 0.
- `pnpm check`: exit 0, 0 errors, 0 warnings.
- The worktree is clean after cargo test, so the ts-rs bindings did not change.
- Adversarial probe (a temporary test file, deleted afterwards, not committed). Over 399 seeds × {no root, root `/v`}, it ran random builds, then 12 random `update_entry` / `remove_entry` calls over colliding paths (`a/foo.md`, `b/foo.png`, `x/b/foo.png`, `b/foo.md`, ...) and targets (`foo`, `foo.png`, `b/foo.png`, `FOO.PNG`, ...). After every step it checked that `backlinks()` equals the reverse index recomputed from `resolve()` over all entries. It passed. As a sensitivity check, I disabled the `regained` loop in `remove_entry`. The probe then failed (seed 9), and I restored the file with `git checkout`.
- The full suite (`pnpm vitest run && pnpm build`) is left to deliver. The diff touches no frontend files.

My test verdict rests on these files: src-tauri/tests/vault_index_test.rs, src-tauri/tests/commands_test.rs (which includes tests/commands/vault_test.rs), src-tauri/tests/vault_cache_test.rs, src-tauri/tests/ipc_contracts_test.rs, and the `#[cfg(test)]` module of src-tauri/src/vault/index.rs.

## Scope

All changes are in `src-tauri/src/vault/index.rs`, `src-tauri/src/commands/vault.rs` (the three scan builds pass the canonical root) and their tests. There is no scope creep, no DTO change and no layer-baseline change.

## Resolution

1. Fixed. `rename_note_inner` doc (commands/vault.rs) now names the resolution caches (`by_path` by stem, `by_file_name` by file name) and says a path-style target is re-credited by the retro scan in `update_entry`. The `get_outgoing_links_v2` doc and `OutgoingLink.resolved_path` (entry.rs) say "resolution caches"; the regenerated `src/lib/contracts/generated/OutgoingLink.ts` is committed.
2. Fixed. `e2e/mocks/vault-index.ts` passes `'/test-vault'` to both `resolveWikilinkCached` calls, so path-style targets take the vault-relative path first like Rust.
3. Fixed. The retro scan in `update_entry` finds retro sources with `any()` first and builds the resolved set only for them.

# Issue 18 discovery

Mirrors the final TS rule from `work/16` + `work/17`
(`src/lib/core/filesystem/wikilink-resolution.logic.ts`) in Rust. Only the Rust-side differences are here.

## Files that change

- `src-tauri/src/vault/index.rs`
  - `:104-123` `resolve_with_cache` gains the exact-file step: a target whose last segment has an
    extension looks up a new `by_file_name` map (lowercase file name -> paths, insertion order);
    a path-style target first takes the candidate equal (case-insensitive) to
    `{vault_root}/{target}`, then the first `/{target}` suffix match; then the note-name rule as today.
  - `:207-243` `VaultIndex` gets `by_file_name: HashMap<String, Vec<String>>` and
    `vault_root: Option<String>`; `build` fills `by_file_name`; new `build_with_root(root, entries)`.
  - `:556-591` `update_entry` (new path): push into `by_file_name`; insert the cache keys before the
    new entry's own links resolve. A new file can now take over an existing resolution
    (`[[b/foo.md]]` moved from `a/foo.md` to the new `b/foo.md`), so the retro step also drops
    each retro source from targets it no longer resolves to.
  - `:1036-1085` `remove_entry`: drop the path from `by_file_name`; every former source of the
    removed path re-resolves and gains its new targets (`[[foo.png]]` falls back to `foo.md`).
  - Doc comment on `resolve_with_cache` restated against the TS mirror.
- `src-tauri/src/commands/vault.rs:1215,1337,1443`: the three `idx.build` calls pass the canonical
  vault root (`validate_vault_path`), the same prefix every entry path is built from.

## Plan (test-first)

1. Failing unit tests in `index.rs` tests: `[[foo.png]]` with `a/foo.md` before `b/foo.png` credits
   `b/foo.png`; `[[b/foo.png]]` with `x/b/foo.png` before `b/foo.png` (root `/v`) credits `b/foo.png`;
   bare `[[foo]]` still credits `foo.md`; insert / remove move the backlink.
2. Implement; existing `resolve_with_cache_*` tests take the new params.

## Risks / defaults

- `VaultIndex` holds Markdown notes only, so in production a `[[foo.png]]` never meets a png entry;
  the step bites for `[[a/foo.md]]` among same-named notes. Tests use hand-built entries.
- `update_note_in_index` paths come from the frontend (`vaultStore.path`), not canonicalised; a
  symlinked vault root would make the vault-relative step miss and fall back to the suffix match.
- e2e mock `e2e/mocks/vault-index.ts` has no vault root, so it keeps the suffix rule for path-style
  targets; left unchanged (no root in the virtual FS).

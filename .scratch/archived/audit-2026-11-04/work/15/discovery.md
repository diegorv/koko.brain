# Issue 15 discovery: resolution-aware link rewrite on rename

No `spec.md` exists for audit-2026-11-04; the Issue and `findings.md` are the source.
Builds on `work/04` (form-preserving `replaceWikilinks`); only the differences are listed.

## Files that change

- `src/lib/core/filesystem/link-updater.logic.ts:41-66` `replaceWikilinks`: takes a
  `RenameResolution` (old/new path, vault root, pre- and post-rename resolution caches)
  instead of `oldName, newName`. A link is rewritten only when its stem matches (Issue 04
  rules, unchanged) AND `resolveWikilinkCached(target, before, root) === oldPath`. The
  Issue 04 form (`prefix + newName + ext`) is kept when it resolves to `newPath` against
  the post-rename cache; otherwise the target becomes the vault-relative path with its
  extension (`A/Other.md`). New `buildRenameResolution(oldPath, newPath, notePaths, root)`.
- `src/lib/core/filesystem/link-updater.service.ts:22-37`: reads the markdown paths of
  `fsStore.fileTree` (`flattenFileTree` + `isMarkdownFile`) and `vaultStore.path` at entry,
  before any await; applyPathChange updates the tree only after this call returns and
  `rename_note` runs after it (path-change.service.ts:184-209). No change there.
- Tests: `link-updater.logic.test.ts` (port the existing cases to the new signature with a
  one-note vault, add the collision cases), `link-updater.service.test.ts` (collision end
  to end with a real `fsStore` tree), `src-tauri/tests/vault_file_ops_test.rs` (parity).

## Plan

1. Red: logic tests for the two Issue scenarios + unique-stem bare form. Service test.
2. Implement; port existing logic tests. Rust parity test next to `rename_note_inner_*`.
3. Targeted checks: `pnpm check`, both link-updater test files, path-change/fs.service
   tests that go through `updateLinksAfterRename`, the cargo test.

## Defaults taken

- Pre-rename list: markdown paths only (the Rust `VaultIndex` holds notes only), `newPath`
  dropped, `oldPath` appended when the tree lacks it (tests with an empty tree, a watcher
  patch). Post-rename list: `oldPath` removed, `newPath` appended LAST, mirroring Rust
  `update_entry` first-write-wins after `rename_note`.
- Vault root passed to both resolutions (Rust builds with `build_with_root`).
- No vault root (cannot happen during a rename): the Issue 04 form is written unverified.
- Existing case `[[a/Notes.md#H]]` for a note `notes.md.md`: never resolved to it (TS and
  Rust strip only the last extension, so the basename is `Notes`), so it is now left alone.
  Its expectation changes; every other existing case keeps its output.

## Risks

- Bare-link resolution among duplicate stems depends on path order; tree order may differ
  from Rust's insertion order, so a bare `[[Old]]` with two `Old` notes can be judged
  against a different winner than Rust. Same first-wins ambiguity as today.

# Issue 06 discovery: file tree natural sort

## Re-verified on main

- F15: `src-tauri/src/commands/vault.rs:1355-1372` `sort_nodes` orders by
  `a.name.to_lowercase().cmp(..)` after the directories-first check, so
  "Note 10" sorts before "Note 2". Called from `scan_dir` (`vault.rs:143`) at
  every level of `scan_vault`.
- TypeScript does not name-sort the tree. `loadDirectoryTree`
  (`core/filesystem/fs.service.ts:74-104`) takes the Rust order and only runs
  `applyFolderOrder` (`fs.logic.ts:379-456`), whose sorts compare `_order`
  values and return 0 otherwise. `Array.prototype.sort` is stable, so the
  Rust order survives for every unordered node. Both sides already agree once
  Rust is natural; no second name sort to change.
- folder-order.json is applied in `loadDirectoryTree` before the first
  `setFileTree`, so it causes no re-sort.

## Plan

1. Rust: add `natural_cmp(a, b)` next to `sort_nodes`: case-insensitive,
   compares runs of ASCII digits by numeric value (leading zeros ignored),
   other chars by lowercase. Ties fall back to the
   plain lowercase compare, then the raw name, so the order stays total and
   deterministic. No new crate.
2. `sort_nodes` `_` arm uses `natural_cmp`. Directories first unchanged;
   `modified` arm unchanged.

## Tests (prior art)

- `src-tauri/tests/commands/vault_test.rs` (`alphabetical_sort_is_case_insensitive`,
  `directories_sort_before_files`): new `name_sort_is_natural` with
  "Note 10", "Note 2", "note 1" -> "note 1", "Note 2", "Note 10", plus a
  folder variant ("Day 10", "Day 9" folders before files).
- `src/tests/lib/core/filesystem/fs.logic.test.ts` `applyFolderOrder`:
  guard that nodes without `_order` / folder-order entries keep the
  (natural) input order, and listed folders still win.

## Risks / defaults

- Default: "no visible re-sort on first load" read as the name order the
  Issue names: the first rendered tree is already natural and no TS step
  re-sorts it by name. `_order` frontmatter is still applied at
  `initializeVault` step 4b (`app-lifecycle.service.ts:340-356`) after the
  index is ready; vaults that use `_order` keep that one later reorder.
  Removing it means blocking the tree on the index; out of scope here.
- Digit runs are ASCII only; other Unicode digits compare as characters.
- Numeric runs longer than u64 are compared by trimmed length then text, so
  no overflow.

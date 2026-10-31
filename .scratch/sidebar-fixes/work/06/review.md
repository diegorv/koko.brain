VERDICT: APPROVED

# Issue 06 review: file tree natural sort

Reviewed `git diff main...HEAD` (ab89ea95, b14b1a51, 7545dca3) in the worktree.

## Acceptance criteria

- [met] Rust test first: "Note 10", "Note 2", "note 1" sort as "note 1", "Note 2", "Note 10" — `name_sort_is_natural_and_case_insensitive` in `src-tauri/tests/commands/vault_test.rs:110-120` asserts exactly that order through `scan_vault(.., "name")`. It passes in my run of `cargo test --test commands_test` (68 passed, 0 failed). On main's `to_lowercase().cmp` the order would be "note 1", "Note 10", "Note 2", so the test fails without the fix. Test-first is claimed in the commit and is consistent with that reasoning; I did not re-run it against main.
- [met] Case-insensitive as today; folders before files as today — `natural_cmp` (`src-tauri/src/commands/vault.rs:1380-1406`) lowercases both names before comparing. The `is_directory` check in `sort_nodes` (`vault.rs:1358-1364`) is unchanged and still runs first. `alphabetical_sort_is_case_insensitive`, `directories_sort_before_files` and the new `natural_sort_keeps_directories_first` (folders "Day 9", "Day 10" before "Day 1.md") all pass. The "modified" arm is unchanged and `sort_by_modified_puts_newest_first` passes.
- [met] Manual folder-order overrides still apply — `applyFolderOrder` (`src/lib/core/filesystem/fs.logic.ts`) is unchanged and is still applied after `scan_vault` in `loadDirectoryTree` (`fs.service.ts:87-93`) and in the watcher's incremental rescan (`fs.watcher.ts:171-173`). The new test `keeps the natural scan order for nodes without an override` (`fs.logic.test.ts:891-908`) shows that a folder-order.json entry (`Day 11`) and an `_order` value (`Note 10.md`) still win, and that nodes with no override keep the natural input order. The existing applyFolderOrder suite passes too: `pnpm vitest run src/tests/lib/core/filesystem/fs.logic.test.ts` gave 153 passed.
- [met] No visible re-sort when the tree first loads — The Issue tells us to "check whether the TypeScript side sorts too and make both agree". I checked: no TS code sorts the tree by name. `loadDirectoryTree` and `fs.watcher.ts` take the Rust order as it comes, and the `.sort` calls in `applyFolderOrder` (`fs.logic.ts:411,422,437`) compare only override indexes. Because those sorts are stable, the natural Rust order survives. folder-order.json is applied before the first `setFileTree` (`fs.service.ts:78-93`). So name order does not change after the first render. One reorder still happens at startup, from `_order` frontmatter, and it is pre-existing; see finding 1.

## Findings

1. **major** `src/lib/core/app-lifecycle/app-lifecycle.service.ts:340-356`: the startup flicker that the Issue's source finding describes is still there for vaults that use `_order` frontmatter. F15 in `docs/ux-sidebar-discovery:.scratch/ux-sidebar/work/02-files-mode.md` traces it to this step 4b, not to a TS name sort. `loadDirectoryTree` runs in parallel with the index build (`app-lifecycle.service.ts:299`) and renders the tree straight away. Step 4b then calls `applyFolderOrder` again with the new `contentOrder` and calls `setFileTree` a second time. The branch makes no change here and records this in `discovery.md`. I accept that the Issue's own remedy (make TS and Rust agree on name order) is done. But for `_order` vaults the literal criterion is still unmet. Fix: no change on this branch. The main session should decide whether to file a follow-up Issue, for example persisting the content order next to folder-order.json or getting `_order` from the scan, so it is not lost.
2. **minor** `e2e/mocks/virtual-fs.ts:284`: the E2E mock of `scan_vault` still sorts with `a.name.localeCompare(b.name)`, which is not numeric. In the mock, "Note 10" still comes before "Note 2", so any E2E spec that checks the new order would fail against the mock while the real app is correct. No current spec depends on this; I found no "Note 10" / "Day 10" fixtures in `e2e/specs`. Fix: `a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })`, so the mock matches `natural_cmp` for ASCII names.
3. **nit** `help/documentation/02-file-explorer.md:95` still says "sorted alphabetically by name (A-Z)". This is out of scope here: Issue 08 explicitly takes on "the natural sort from ticket 06". No change on this branch.

## Correctness notes (no finding)

- `natural_cmp` is a total order, which matters because recent Rust `sort_by` may panic on a comparator that is not total. Each name splits into maximal ASCII digit runs and single other characters. Two digit runs compare by value, using trimmed length and then text, so there is no overflow. A digit compared with a non-digit is decided at once by the code point. Because `'0'..='9'` are contiguous, every digit token lands on the same side of any given other character, so the comparison is consistent. The result is a lexicographic order over a total preorder, broken by `la.cmp(lb)` and then `a.cmp(b)`, which makes it total.
- Leading zeros: "v09" and "v9" tie on value and are then ordered by the lowercase tie-break, giving `v09, v9, v010`. That matches `natural_sort_orders_leading_zeros_and_long_numbers`.
- Scope: the diff touches only `sort_nodes`/`natural_cmp`, its tests, one TS guard test and the discovery note. There are no new crates and no TS source changes. Other name sorts in `vault/index.rs` (backlinks, mentions) are a different surface and were rightly left alone.

## Checks run by this review

- `pnpm check`: exit 0, 0 errors, 0 warnings.
- `cargo test --manifest-path src-tauri/Cargo.toml --test commands_test`: exit 0, 68 passed. This target holds `src-tauri/tests/commands/vault_test.rs`, the only test file that calls `scan_vault`.
- `pnpm vitest run src/tests/lib/core/filesystem/fs.logic.test.ts`: exit 0, 153 passed.
- My test verdict rests on `src-tauri/tests/commands/vault_test.rs` (via `commands_test`) and `src/tests/lib/core/filesystem/fs.logic.test.ts`. The full frontend suite, `pnpm build` and the full `cargo test` belong to deliver.

## Resolution

1. Not changed on this branch, as the finding itself says. The `_order` startup reorder in `app-lifecycle.service.ts` step 4b is pre-existing; a follow-up Issue is for the main session to decide.
2. Fixed: the E2E `scan_vault` mock in `e2e/mocks/virtual-fs.ts` now sorts with `localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })`, matching Rust `natural_cmp` for ASCII names.
3. Not changed: the help page wording belongs to Issue 08.

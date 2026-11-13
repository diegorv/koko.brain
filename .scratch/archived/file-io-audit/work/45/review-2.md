VERDICT: APPROVED

Re-review, round 2, of the fix commit ba41652c (`git diff 65ab3937..HEAD`) on branch issue/45-table-add-buttons-rewrite-loses-bytes.

## Previous findings

| # | Severity | Status | Evidence |
|---|----------|--------|----------|
| 1 | minor | resolved | widgets.ts:507-509 adds `delimiterAlignments()`, which slices off the `LINE_PREFIX_RE` match before `parseAlignments`; both `dispatchAppendColumn` (:464) and `dispatchAppendRow` (:486) call it. The new test "+row on a pipe-less table in a callout writes one cell per column" asserts the exact doc `> |  |  |`. Against 65ab3937's widgets.ts it is the only test that fails (1 failed, 28 passed), so it reproduces the bug. The +col pipe-less callout test asserts that `---:` is repeated. |
| 2 | nit | resolved | table-widget.test.ts:278-282: +col on a two-space-indent list-item table, exact-doc `toBe` assertion, passes. |
| 3 | nit | resolved | table-widget.test.ts:246-248 also clicks +row on `x\|y`; :251-256 does one +col click on `C:\temp`. Both pass. |

## Acceptance criteria re-checked

- [met] One click keeps `C:\temp`, `[[Note|alias]]` and `x\|y` byte for byte; repeated clicks do not double backslashes (F99) — each of the three values now gets a single click of both +row and +col (finding 3), plus the existing repeated-click test. All pass.
- [met] `+row` on a table inside a `> [!note]` callout keeps `> ` on every table line, including the new row; a table indented two spaces in a list item keeps its indent on every line (F100) — the existing F100 tests still pass, and the new pipe-less callout +row test and list-item +col test assert exact docs.
- [met] `+col` on a table with and without outer pipes adds exactly one column to the header, delimiter and every body row; the new delimiter cell repeats the last column's alignment — the existing tests pass, and the new pipe-less callout +col test asserts `> :--- | ---: | ---: |`.
- [met] Every line that existed before a click is unchanged except for the appended cell (`+col`) or is unchanged entirely (`+row`) — the new tests use exact `toBe` docs, and the fix only changes how the column count is read, not where the inserts go.
- [met] The existing `+col` / `+row` tests in table-widget.test.ts still pass (`| name | age |  |`, `| --- | --- | --- |`, `| alice | 30 |  |`, trailing `|  |  |`) — table-widget.test.ts: 29/29 pass.

## Findings

None open, none new. The fix diff only adds tests (no assertion removed or weakened). The source change is limited to the column-count read in widgets.ts. Stripping the prefix cannot drop a real delimiter cell, because `[\s>]*` never matches `|`, `-` or `:`. No change to layer-baseline.json, BASELINE_SIZE or composition roots, and no src-tauri changes.

## Checks run by the reviewer

- `pnpm check`: exit 0, 0 errors, 0 warnings.
- `pnpm vitest run` on table-widget.test.ts, src/tests/lib/core/markdown-editor/editor-host.test.ts and src/tests/lib/app/editor-host.test.ts: exit 0, 3 files, 65 tests passed.
- Red check: with 65ab3937's widgets.ts swapped in, table-widget.test.ts gave 1 failed (the pipe-less +row test) and 28 passed. The file was restored afterwards and the worktree is clean.
- The full suite and `pnpm build` were not run. Deliver runs them.

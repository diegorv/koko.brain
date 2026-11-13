VERDICT: APPROVED

Re-review, round 2, of the fixes after `2f35e703` (`dd2cbb31`, `6be24df0`, `881d11dd`) for Issue 19.

## Previous findings

| # | Severity | Status | Evidence |
|---|----------|--------|----------|
| 1 | major | resolved | `createAPI` (`src/tests/help/queryjs-contract.test.ts:322-323`) now builds the empty vault from `vault.notes.filter((n) => n.path === currentFilePath)`, and the test asserts `expect(empty.thrown).toBeNull()` (line 488). My probe logged every empty run: 125 runs, 0 throws, 0 rendered `.cm-lp-qjs-error` / "Chart error:" lines. The output is real empty state (`Projetos (0)`, `No meetings for today.`, `Nenhum daily note encontrado…`), so the differ-from-empty check now compares against the empty state and not against a crash. The 34 runs that equal their empty state are listed with a reason each: 4 more in `VAULT_INDEPENDENT` and 30 in the new `NO_EXAMPLE_DATA` (lines 108-159). The test requires a listed run to still equal its empty run (lines 489-491), so the entry has to come out once the data exists. I checked one reason against the source: `whereTag('project')` (`data-array.ts:56-63`) matches only `project` or `project/…`, while `project-garden.md` is tagged `type/project`. |
| 2 | minor | resolved | `CALLS` is keyed by `run.scriptRoot` (lines 430-431). Each `ViewCall` carries `vault` (line 338). A script runs in `call.vault` as `call.currentFilePath` (line 417), and blocks from the script's own root are recorded first (line 428). The `weekly-habits-chart` snapshot now equals `templates/Weekly Note.md #2` byte for byte, and `_shared-period-radar` moves to the Monthly template's satisfaction message. The data gaps that remain are on `NO_EXAMPLE_DATA` (see new finding 1). |
| 3 | minor | resolved | `ERROR_ALLOWLIST` runs now snapshot `{ failures, text }` (line 481) as well as asserting the failure. The snapshots pin `isso_nao_existe is not defined`, `Unexpected token '{'`, and the partial render `Before Error…Item 3` before `reading 'crash'`. |
| 4 | minor | resolved | `.scratch/architecture-stability/issues/51-triada-span-renders-object-object.md` (needs-triage) names both `kb.span(…file.link)` call sites and the six snapshots, and has checkable criteria. |
| 5 | nit | resolved | The JSDoc on `parseTasks` (lines 257-264) says only `text` / `checked` / `lineNumber` are faithful and lists how it differs from Rust. |
| 6 | nit | resolved | The new test `finds no queryjs block outside an example root folder` (lines 461-469) walks all of `help/`, including `help/documentation`, through the same fence-aware `fencedBlocks`. It passes. |

No regressions found. No test was weakened or deleted. The only assertion that changed in strength is the empty-run check, and it got stricter (`thrown` must be null). The fix commits touch only the contract test, its snapshot file and `.scratch` docs. The layer baseline and `BASELINE_SIZE` are untouched.

## Acceptance criteria re-checked

- [met] Golden snapshots exist per block, and changing a DataArray method's output makes the suite fail — the snapshot file now has 128 entries (125 plus the 3 error-allowlist runs). The `DataArray.sort` sensitivity test (line 496 onward) is unchanged and passes.
- [met] Every discovered block or script runs without error, or sits on an allowlist where each entry carries a reason — line 484 still requires no failure for unlisted runs. `ERROR_ALLOWLIST` entries must still fail and now also pin their failure text.
- [met] Each snapshot is asserted to differ from the block's empty-vault output — the empty vault now keeps the current note, and none of its runs throws or renders an error (probe over all 125 runs). Every unlisted snapshot is asserted `not.toBe(empty.text)`. The 34 that equal their empty state each sit on a reasoned allowlist that has to stay accurate, which is the fix round 1 asked for.
- [met] Blocks and scripts are discovered by glob with a fence-aware scanner, so a new example file is picked up automatically and the queryjs block nested inside a ```` fence in `live-preview-regressions/06-fenced-code.md:13` ("THIS MUST NOT RUN") is skipped — unchanged, and it passes. The new outside-root test widens the discovery guard to all of `help/`.

## Findings

1. **minor** `src/tests/help/queryjs-contract.test.ts:108-159` (`NO_EXAMPLE_DATA`): 30 runs still pin their empty state. Some of them are defects in the examples, not just missing data: `project-status-cards.js:6`, `project-progress-bars.js` and `dashboard.md #3/#4` call `whereTag('project')` on notes tagged `type/project`, and `note-shortlist` / `dashboard.md #7` call `whereTag('meeting')` on notes tagged `type/meeting`. The only record of this is the allowlist text. So `whereTag`, the task filtering and the period queries in those scripts have no snapshot coverage, and nothing tracks fixing them. Fix: open a `.scratch` follow-up issue (as was done for Issue 51) for the tag mismatches and the missing weekly/monthly/quarterly `satisfaction_*` / `practice_*` data. Its criterion is that the `NO_EXAMPLE_DATA` entries come out.

## Checks I ran

- `pnpm check`: exit 0, 212 files, 0 errors, 0 warnings.
- `CI=true ./node_modules/.bin/vitest run src/tests/help src/tests/lib/plugins/queryjs src/tests/lib/core/markdown-editor/extensions/live-preview/widgets/queryjs-block-widget.test.ts src/tests/lib/architecture`: exit 0, 19 files, 760 passed, 1 todo, no obsolete snapshots reported.
- Probe: I temporarily edited the contract test to log every empty run's `rendered` count and text, then restored it with `git checkout`. The worktree is clean.
- Not run: the full suite and `pnpm build` (deliver runs them). I did not run `cargo test`, because nothing under `src-tauri/` changed.

## Resolution

1. Accepted. Opened `.scratch/architecture-stability/issues/52-queryjs-examples-missing-data-and-tag-mismatch.md` (needs-triage) for the `whereTag('project')` / `whereTag('meeting')` mismatches and the missing `#to-list`, `satisfaction_*` / `practice_*` and Daily-template meeting data. Its criterion is that every `queryjs-features/…` and `templates/…` key comes out of `NO_EXAMPLE_DATA`. The four `triada/` entries are left out of its scope: `triada` ships only templates by design, so giving it sample notes is a separate decision, not a defect.

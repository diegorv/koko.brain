VERDICT: APPROVED

## Previous findings

| # | Severity | Status | Evidence |
|---|----------|--------|----------|
| 1 | minor | resolved | `syncedFormulaColumns()` (`CollectionView.svelte:241-252`) is the old effect's body, now returning the list instead of assigning it; the effect (`:254-258`) still applies it locally. `handleFormulasChange` (`:370-380`) calls it after `persistKey('formulas', ...)` and writes the result through `handleColumnsChange` (`:397-400`, `persistKey('viewOrder', ...)`). It reads `activeFormulas`, a `$derived` over `localFormulas` with editing entries excluded (`:216-218`), so it sees the new entries synchronously, and the effect has not yet run, so the diff is not lost to it. With no `order`, `localColumns` is undefined and nothing extra is written. Two new mounted tests (`CollectionView.view-writes.test.ts:252`, `:268`) compare the whole parsed file. Probe: with `CollectionView.svelte` from b61990f30 and the branch's tests, both fail (2 failed, 9 passed); restored, `git status` clean. |
| 2 | nit | resolved | One-line comment on `run` in `writeYaml` (`CollectionView.svelte:317`) states why its side effects are safe under `rewriteViewFile`'s tab-closed redo. Matches the finding's suggestion. |
| 3 | nit | rejection stands | The review asked for no change; Resolution records it. Code unchanged. |

## Acceptance criteria

- [met] Failing test first, through the mounted component with real stores: change a Sort on a view whose filter is `and: [x]` with an unknown key. The filter stays as written. — The fix touches only the formula handler and the effect's extraction; the Sort path (`handleSortsChange`, `persistKey`) is unchanged. `CollectionView.view-writes.test.ts` (11 tests) and `CollectionView.test.ts` pass in the targeted run.
- [met] A newer value of the same key on disk is refused, as in Issue 04. — `persistKey`'s conflict check is unchanged; the formula column write goes through the same `persistKey('viewOrder', ...)`, so it is refused the same way. The conflict tests in `CollectionView.view-writes.test.ts` pass.
- [met] The tab strip's view add, rename and delete keep working, and each writes only what it changes. — Tab-strip code untouched by the fix; its four tests in `CollectionView.view-writes.test.ts` pass.

## Findings

1. nit, `src/lib/features/collection/CollectionView.svelte:254-258,375-378`: the effect still syncs `localColumns` locally whenever `activeFormulas` changes, including while another entry is in edit mode, when `handleFormulasChange` does not persist. If a formula is removed while a second one is being edited and that second one is then cancelled, the effect has already synced `localColumns`, `syncedFormulaColumns()` returns null at the persisting call, and the removed formula's column stays in `order` on disk until the next column edit. Rare (two formulas, one mid-edit, then a cancel), visible and recoverable; no change asked. If it matters, compare against `activeView.order` instead of `localColumns` when deciding to write.

## Checks run by the reviewer

- `taskpolicy -c background pnpm check`: exit 0, 221 files, 0 errors, 0 warnings.
- `taskpolicy -c background pnpm vitest run src/tests/lib/features/collection/ src/tests/lib/app/EditorView.test.ts`: exit 0, 32 files, 1100 tests passed.
- Old-code probe for finding 1: described in the table.
- Fix diff scope: `CollectionView.svelte` and `CollectionView.view-writes.test.ts` only (plus review.md's Resolution). No test weakened or removed; the added `Element.prototype.scrollTo ??=` stub is a jsdom gap shim, not a mock of app code. Layer baseline, `BASELINE_SIZE` and composition roots unchanged.
- Full suite and `pnpm build`: not run; deliver runs them.

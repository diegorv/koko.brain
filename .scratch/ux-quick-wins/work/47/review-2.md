VERDICT: APPROVED

# Review 2: Issue 47, calendars count undated notes; view tabs show their type

Reviewed the fixes after review 1: `git diff 8c8acc0de..HEAD` (commits 4e48dc67e, e41deb45c). The only source change is one class removal in `src/lib/features/collection/CollectionView.svelte:603`; the rest is `.scratch` bookkeeping (review.md Resolution, a Comment on shell-sidebars-ux 16).

## Previous findings

| # | Severity | Status | Evidence |
|---|----------|--------|----------|
| 1 | minor | resolved | Review asked for no change on this branch and a note on shell-sidebars-ux 16. The note is in `.scratch/shell-sidebars-ux/issues/16-filters-count-clear-view-triggers.md` under Comments (added in 4e48dc67e): keep "Calendar settings" on the single trigger, decide on the `title`, remove the nested `Button`. `CollectionView.svelte` trigger lines are unchanged by the fixes. |
| 2 | nit | rejection stands | `1 results` predates the branch and the Issue does not ask for a copy change; a test pins the existing text. Out of scope. |
| 3 | nit | rejection stands | No change was asked; test-first order is not re-verifiable from one commit, as the finding said. |

## Fix outside the review: `text-xs` on the Delete reason

Commit e41deb45c drops `text-xs` from the one-view Delete reason span and keeps `text-muted-foreground`. `src/tests/lib/menu-item-anatomy.test.ts` forbids `text-xs` anywhere inside a `ContextMenu.Item` (`TEXT_XS_RE` in `itemViolations`), so the line as built would fail that source scan. The Issue only asks for a "muted reason ... inside the item"; it is still muted and inside the item, and the item is still disabled. The CollectionView test (`CollectionView.test.ts:926`) asserts the text, not the class, so no test was weakened. No other change rides along.

## Acceptance criteria re-checked

- [met] Table, calendar and linear-calendar tabs render three different icons; with one view the Delete item contains the reason text and is still disabled; with several views it is enabled and has no reason. — The fix touches only the reason span's class; `describe('CollectionView — view tab icons and the Delete reason')` in `CollectionView.test.ts` passes in my run (reason text, `data-disabled`, three lucide icons, two-view case `Delete view` only).
- [met] Context-menu and double-click rename tests and `CollectionView.view-writes.test.ts` pass unchanged (nothing here writes). — the fixes change no test file; `CollectionView.view-writes.test.ts` and the view tab menu test pass in my run.
- [met] Frontend gate: pnpm check and pnpm vitest run pass. — `pnpm check` exit 0 (236 files, 0 errors, 0 warnings); targeted vitest over `src/tests/lib/features/collection` plus `src/tests/lib/menu-item-anatomy.test.ts` exit 0, 35 files, 1195 tests. The full `pnpm vitest run` is deliver's to run.

## Checks I ran

- `pnpm check`: exit 0.
- `pnpm vitest run src/tests/lib/menu-item-anatomy.test.ts src/tests/lib/features/collection`: exit 0, 35 files, 1195 tests passed.
- No change to `layer-baseline.json`, `BASELINE_SIZE` or composition roots.
- Worktree clean before writing this file.

## Findings

None open or new.

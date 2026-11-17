VERDICT: APPROVED

Re-review round 2 of the fixes in 9e232cece (`git diff 334422e3f..HEAD`): tests and the review file's Resolution only, no source change.

## Previous findings

| # | Severity | Finding | Status | Evidence |
|---|----------|---------|--------|----------|
| 1 | minor | `|| filters.tag` / `|| filters.folder` gates in `GraphControls.svelte:101,119` untested | resolved | `GraphControls.test.ts` adds "keeps a set folder clearable when local mode offers one folder" and "keeps a set tag clearable when local mode offers no tags"; both assert the offered options and that the "All" item sets the filter to `null`. Mutation I ran: removing both `||` gates makes exactly these two fail (2 failed / 10 passed); file restored with `git checkout`, worktree clean. The `choose` helper change (skip reopening an open trigger) only avoids closing an already-open Select and does not loosen any assertion. |
| 2 | nit | label-click path of the switches untested | resolved | "toggles orphans once per click on its label text" clicks the label's `<span>` and asserts `showOrphans` false and `aria-checked="false"`; starting from `true`, a double toggle or no toggle would both fail it. |

## Acceptance criteria re-checked

- [met] Picking a tag sets `filters.tag` to it; "All tags" sets `null`. — Existing tag test unchanged; new tag test also asserts "All tags" sets `filters.tag` to `null` after a mode switch removes the options.
- [met] Orphans and Arrows are `role="switch"` with `aria-checked`; toggling them sets `filters.showOrphans` and `display.showArrows`. — Existing switch tests unchanged; new label-click test asserts `aria-checked` and store state.
- [met] Frontend gate: `pnpm check` and `pnpm vitest run` pass. — `pnpm check`: exit 0, 0 errors, 0 warnings. `pnpm vitest run src/tests/lib/plugins/graph-view/`: exit 0, 5 files, 96 tests. The full suite is deliver's to run.

## Findings

None open or new.

## Other checks

- Scope: the fix diff touches only `src/tests/lib/plugins/graph-view/GraphControls.test.ts` and the review file. No test deleted or weakened (only additions plus the `choose` guard). No layer-baseline change. Tabs throughout.

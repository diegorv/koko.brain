VERDICT: APPROVED

## Previous findings

| # | Severity | Status | Evidence |
|---|----------|--------|----------|
| 1 | minor | resolved | `CollectionView.svelte:610` passes `onWeekStartDayChange` only when `activeView.type === 'calendar'`; `CalendarConfigPanel.svelte:94-116` wraps the row in `{#if onWeekStartDayChange}`, the same pattern as the Color row. `CalendarConfigPanel` has no other caller (grep). Two tests in `CollectionView.test.ts:753-761` (row shown on `calendar`, hidden on `linear-calendar`); the linear one fails against the pre-fix sources. `12-collection.md:46` updated. |
| 2 | minor | resolved | `folder-notes.logic.ts:50` now uses the exact rule of `toSidebarNote` (`type-sidebar.logic.ts:137-139`): a number, or a non-blank string; `null`, `''`, whitespace and booleans give `NaN` and are skipped. Test `folder-notes.logic.test.ts:120-130` covers all five and fails before the fix. `02-file-explorer.md:100` now matches `25-types-and-relationships.md:195`. |
| 3 | minor | resolved | `showViewInViewsYaml` and `updateViewListPropertiesYaml` (`type-sidebar.logic.ts:601-631`) copy `updateViewRailYaml`'s guard verbatim (`parseYaml ?? {}`, then non-object or array throws "not a mapping of keys"). Tests cover string, number and list roots, both property-list cases; they fail before the fix. JSDoc updated. |
| 4 | nit | rejection stands | Refusal is documented at `12-collection.md:149`; a toast is new UX outside the Issue's bug list. Follow-up if the owner wants it. |
| 5 | nit | rejection stands | The Issue allowed the `isLinkTargetFile` option; reworking inlinks over `buildResolutionCache` changes QueryJS results for every same-stem note and belongs in its own Issue. |

## Acceptance criteria

- [met] Every bug has a failing test first, through real stores and logic. — The fix commit fb73c391d adds four tests; with the four fixed sources checked out from a0eb61480 they fail (4 failed / 263 passed), and pass at HEAD. No store or `.logic.ts` is mocked in the added tests. Round 1's evidence for the original bugs is unchanged.
- [met] Docs match the code at the time of the fix. — `12-collection.md:46` (`weekStartDay` read by `calendar` only, popover offers each field only where read) matches `CollectionView.svelte:610-611`; `02-file-explorer.md:100` matches `folder-notes.logic.ts:50`.
- [met] One commit per bug group. Docs go together. — The fix round is one commit (fb73c391d) for review fixes, each doc line next to the code it describes; the original bug and docs commits are unchanged from round 1.

## Findings

None open or new.

## Checks run by this review

- `taskpolicy -c background pnpm check`: exit 0, 0 errors, 0 warnings.
- `taskpolicy -c background pnpm vitest run src/tests/lib/core/filesystem/ src/tests/lib/features/collection/CollectionView.test.ts src/tests/lib/features/type-definitions/ src/tests/help/`: exit 0, 37 files, 1371 passed.
- Probe: the four fixed sources reverted to a0eb61480, the three changed test files run: 4 failed (exactly the new tests), sources restored, worktree clean.
- No weakened or deleted test in the fix diff (only additions). No layer-baseline or composition-root change. Nothing under `src-tauri/` changed.
- Not run: the full suite and `pnpm build` (deliver's).

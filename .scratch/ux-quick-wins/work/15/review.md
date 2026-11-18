VERDICT: APPROVED

Reviewed `git diff main...HEAD` (f50663210, 270280069, 32a34d1d3) in the worktree against the Issue file. `.scratch/ux-quick-wins/spec.md` does not exist; the Issue file is the spec.

## Acceptance criteria

- [met] Failing test first (`src/tests/lib/features/collection/toolbar/FilterPanel.svelte.test.ts`): both conjunction triggers contain a chevron and the bordered classes; the text is still "All the following are true"; choosing "Any" still emits `or`. — New `describe('conjunction trigger')` (FilterPanel.svelte.test.ts:112-145) renders one global and one view group, finds exactly 2 inner triggers by the text "All the following are true", and asserts an `svg`, the classes `border h-7 rounded-md px-2 hover:bg-accent` and no `min-w-[80px]`. "Any" emits `or` for the global group (new test) and for the view group (existing test at :96-98). Probe: with the three `.svelte` files restored to main, the styling test fails, so the test came first and has teeth. The "Any" global test passes on main too, which is expected because it guards behaviour that did not change. Source: FilterPanel.svelte:16 imports `ChevronDown`, and :114-119 and :179-184 hold the bordered trigger with a trailing `ChevronDown class="size-3 shrink-0 opacity-50"`. `CONJUNCTION_LABELS` and the `changeConjunction` callbacks are unchanged.
- [met] Failing test first (`FilterRow.svelte.test.ts`): `getByRole('button', { name: 'Remove filter on status' })` finds the visual-mode remove; the raw-mode remove is found by name; a row with no property is named "Remove filter". — FilterRow.svelte.test.ts:90-153 covers visual mode with `status`, raw mode (`raw` set), and an empty property in both visual and raw (`raw: ''`, which is raw mode because the condition at FilterRow.svelte:92 is `row.raw !== undefined`). Each test checks `aria-label` and a matching `title` and that clicking calls `onRemove`. The project has no Testing Library, so querying `button[aria-label=...]` is the equivalent of the accessible-name lookup. All 3 tests fail on main sources (probe). Source: FilterRow.svelte:54 `removeLabel` is used at :104 and :187.
- [met] Failing test first (`FormulaRow.svelte.test.ts`): both removes are found by "Remove formula <name>"; an unnamed entry gives "Remove formula". — FormulaRow.svelte.test.ts:123-165 uses `it.each([true, false])` over editing and view mode, for the name "double" and for an empty name. All 4 fail on main (probe). Source: FormulaRow.svelte:37 `removeLabel` is used at :60 (the editing-mode `Button`) and :90-95 (the view-mode `button`), with no class change.
- [met] The four consumers' tests pass unchanged: `ViewDialog.svelte.test.ts`, `AutoOrganizeRuleRow.test.ts` (`:132-136` find the trigger by `textContent?.trim()`), `RailNoteList.view.test.ts`, `RailNoteList.toolbar.test.ts`. — None of these files is in the diff. I ran all four, and they pass (see Checks run).
- [met] No `.view`, settings or rules file is written by any new code path; the existing `onFiltersChange` calls are unchanged. — The source diff only changes markup and classes, adds a `ChevronDown` import and two derived `removeLabel` strings. There is no new handler, no new callback call and no service import. The `onGlobalFiltersChange` and `onViewFiltersChange` call sites are byte-identical to main.
- [met] Frontend gate: `pnpm check` and `pnpm vitest run` pass. — I ran `pnpm check` myself: exit 0, 236 files, 0 errors, 0 warnings. The targeted vitest files pass (10 files, 265 tests). The full suite is deliver's to run.

## Findings

1. nit — src/lib/features/collection/toolbar/FilterRow.svelte:104,187 and FormulaRow.svelte:60: the two `Button` removes put every attribute on one line of about 150 characters. The view-mode remove in FormulaRow.svelte:90-95 splits its attributes across lines. Fix (optional): split the attributes the same way, for consistency.
2. nit — src/lib/features/collection/toolbar/FilterPanel.svelte:115,180: `w-fit` is not in the Issue's class list. It is a justified addition: without it the trigger stretches across the panel's flex column. The bordered look in the running app was not checked (no E2E run, no screenshot). Fix: none required. Deliver or the owner may want a visual check.
3. nit — src/tests/lib/features/collection/toolbar/FilterPanel.svelte.test.ts:128: the styling test checks that the trigger contains an `svg`, not that the chevron comes after the label. Fix (optional): assert `trigger.lastElementChild?.tagName.toLowerCase() === 'svg'`.

## Checks run

- `pnpm check`: exit 0, 0 errors, 0 warnings.
- `pnpm vitest run` over 10 files, exit 0, 265/265 pass. My test verdict rests on these files:
  - `src/tests/lib/features/collection/toolbar/FilterPanel.svelte.test.ts`, `FilterRow.svelte.test.ts` and `FormulaRow.svelte.test.ts`
  - `src/tests/lib/features/type-definitions/ViewDialog.svelte.test.ts`
  - `src/tests/lib/features/auto-organize/AutoOrganizeRuleRow.test.ts`
  - `src/tests/lib/features/rail-shell/RailNoteList.toolbar.test.ts` and `RailNoteList.view.test.ts`
  - `src/tests/lib/features/collection/CollectionView.test.ts`, `CollectionView.view-writes.test.ts` and `CollectionView.restored-view.test.ts`
- Test-first probe: I restored the three `.svelte` files to main and ran the three toolbar test files. 8 tests failed, all of them new tests (the styling test plus the 7 name tests), and the "Any" global guard passed. I then restored HEAD, and the worktree is clean.
- `git diff main...HEAD --check`: clean. There are no space-indented added lines (the files use tabs).
- Scope: there are no `SortPanel.svelte` changes, no layer-baseline changes and no `src-tauri/` changes.

## Resolution

1. Fixed: the three `Button` removes (FilterRow.svelte raw and visual mode, FormulaRow.svelte editing mode) now split their attributes one per line, like the view-mode remove.
2. No change: `w-fit` stays, as the finding says it is justified. The running app was not checked visually.
3. Fixed: the conjunction styling test asserts `trigger.lastElementChild` is the `svg`, so the chevron must come after the label.

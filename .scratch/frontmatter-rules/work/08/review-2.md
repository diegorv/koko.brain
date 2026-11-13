VERDICT: APPROVED

Re-review of commit db312a1be (`git diff 62911f172..HEAD`): `AutoOrganizeRuleProperty.svelte`, `AutoOrganizeRuleRow.test.ts`, `auto-organize-doc-examples.test.ts`, plus the Resolution in `review.md`.

## Previous findings

| # | Severity | Status | Evidence |
|---|----------|--------|----------|
| 1 | minor | resolved | `save` (`AutoOrganizeRuleProperty.svelte:109-120`) stores a refused expression in `refusedExpr`; `setMode` and `commitKey` pass `draftExpr` (`:72`, `refusedExpr ?? property.expr`) to `fitted`, so the mode switch saves the typed text. `commitExpr` clears the draft when the stored text is typed back (`:142-150`); `setSource` clears it (`:137`). Row test "saves a refused expression with the mode the user switches to" asserts `{ key: 'updated', expr: 'now()', mode: 'if-missing' }`, field `now()`, no error; "drops a refused draft when the stored expression is typed back" asserts the stored `file.basename` is what the mode change saves. Both pass. |
| 2 | nit | resolved | `auto-organize-doc-examples.test.ts:94-104` slices the page from `#### Computed values` to the next `##`-`####` heading, parses its four JSON blocks, checks each has a string `expr` and that `sanitizeRuleProperties` returns them unchanged. A missing heading fails at `expect(start).not.toBe(-1)`; a missing end heading yields an empty body and fails the `>= 4` check, so it cannot pass vacuously. |

## Acceptance criteria re-checked

- [met] Settings: the switch saves `expr`, an invalid expression shows the validator's error, and the preview shows the active note's result. — The fix leaves the switch (`setSource`), the error display and the preview (`:159-168`, still keyed on the stored `property.expr`) unchanged; the existing "computed values" row tests and the two new ones pass (`AutoOrganizeRuleRow.test.ts`).
- [met] Docs updated. Frontend gate passes. — The help page is unchanged by the fix and its Computed values blocks are now parsed by the doc test. `pnpm check` exit 0 (230 files, 0 errors, 0 warnings); the targeted tests below pass. The full suite is deliver's to run.

## Checks run by this review

- `pnpm check`: exit 0, 0 errors, 0 warnings.
- `pnpm vitest run src/tests/lib/features/auto-organize src/tests/help/auto-organize-doc-examples.test.ts`: exit 0, 8 files, 382 tests passed.
- Temporary probe (removed, worktree clean): refused `now()` under `always`, then rename the key to `stamp`, then choose "if missing". Result: the rename is not saved and the error stays; the mode change saves `{ key: 'updated', expr: 'now()', mode: 'if-missing' }` and the key field goes back to `updated`. See finding 1.
- No test weakened or deleted; no layer-baseline entry, `BASELINE_SIZE` change or composition root; no scope creep.

## Findings

1. **minor** `src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:122-126`: the fix moves the desync from the expression to the key. With a refused draft present, a key rename runs `save` with the draft, is refused, and leaves the key field showing the new key while `property.key` keeps the old one. The error message is about the mode, not the key, and the next mode change saves under the old key, so the typed rename is lost without a message. Probe above. Rare (a rename between a refusal and its fix), visible (the field reverts), recoverable (type the key again). Fix (optional): in `commitKey`, save the rename with `property.expr` when the draft is refused and keep the draft, or name the pending refused expression in the error so the user sees why the rename did not apply; add a row test for rename after a refusal.

# 058: A formula that calls an unknown function cannot be confirmed and shows why

**Origin:** `audit-2026-11-05` Issue 51, moved here on 2026-11-08. Its PRD, raw evidence and closed siblings stay in `.scratch/archived/audit-2026-11-05/`. Bare Issue numbers in the text below use that feature's numbering; `priority-2026-11-08.md` in this folder maps them to the numbers here.

**What to build:** FormulaRow enables Confirm when validateFormulaExpression passes (src/lib/features/collection/toolbar/FormulaRow.svelte:29-34), and that only parses (formula.logic.ts:98-108). Filters use validateExpression (evaluator.ts:306-316), which also rejects an unknown plain function. A confirmed formula with an unknown function throws on every row, executeQuery catches the error and stores null (collection.logic.ts:182-188), and the column shows a dash in every row, the same as a note with no value. Run formulas through the same check as filters (validateExpression) so the edit row shows 'Unknown function: x' and Confirm stays disabled. Errors that only appear at runtime are out of scope.

**Blocked by:** none

**Status:** ready-for-agent

**First wave:** yes, picked by the owner on 2026-11-06.

**Gate:** frontend only: `pnpm check` + `pnpm vitest run`.

- [ ] Failing test first, in src/tests/lib/features/collection/toolbar/FormulaRow.svelte.test.ts: render FormulaRow with an editing entry {name: 'due_in', expression: 'numbr(x)'}. The Confirm formula button is disabled and the text 'Unknown function: numbr' is rendered. It fails today.
- [ ] A formula that uses known functions and methods (e.g. `number(x) * 2`, `file.name.lower()`) can still be confirmed.
- [ ] A formula loaded from YAML with an unknown function shows the error when its edit row opens.
- [ ] Frontend gate: pnpm check and pnpm vitest run pass.

## Notes

- **Priority:** daily use and UI correctness (bucket 2-ux). Ux/low. A formula typo fails silently.
- **Trigger:** In the Columns popover, Add formula and type an expression that parses but calls a function the engine lacks (a typo such as `numbr(x)`, or `daysUntil(due)`), then confirm it.
- **Evidence (verified by reading code at `5f8003d67`):** FormulaRow.svelte:29 expressionError = validateFormulaExpression(entry.expression). :32-34 canConfirm needs only no error and a non-blank expression. formula.logic.ts:98-108 only calls parse(). evaluator.ts:306-316 validateExpression adds findUnknownFunction against PLAIN_FUNCTIONS (:293-297). FilterRow.svelte:43-45 uses it for filters. collection.logic.ts:182-188: an evaluate throw sets the formula column to null for that record, so the column is all dashes with no message.
- **Source:** audit 2026-11-05, domain `views`, finding `N-views-04` (from views-ux-4). Size S.

**Second opinion (audit 2026-11-05, round 2):** upheld (ux, low). Confirmed at HEAD. FormulaRow.svelte:29 derives expressionError from validateFormulaExpression, and :32-34 gate Confirm on it. validateFormulaExpression (toolbar/formula.logic.ts:98-108) only calls parse(). validateExpression (expression/evaluator.ts:306-316) adds findUnknownFunction against PLAIN_FUNCTIONS, and FilterRow.svelte:44 uses it. evaluateCall throws 'Unknown function' (evaluator.ts:468), and executeQuery's catch (collection.logic.ts:182-188) stores null for every row. No guard or later fix exists. The source has not changed since 5f8003d67, apart from version-number edits in Cargo.toml and tauri.conf.json. Corrections to apply while implementing: The paths are abbreviated. formula.logic.ts is src/lib/features/collection/toolbar/formula.logic.ts:98-108, and evaluator.ts is src/lib/features/collection/expression/evaluator.ts:306-316 (PLAIN_FUNCTIONS :294-298).

## Comments

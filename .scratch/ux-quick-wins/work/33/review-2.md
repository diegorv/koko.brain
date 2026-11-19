VERDICT: APPROVED

## Previous findings

| # | Severity | Status | Evidence |
|---|----------|--------|----------|
| 1 | minor | resolved | `AutoOrganizeRuleRow.svelte:91` derives `filterUnsaved` from `JSON.stringify(filterDraft) !== JSON.stringify(rule.expression)`, the same comparison the save path uses at `:223`, so the line says "Not saved" exactly when the draft has not been saved. `:486-488` prints "A run ignores this filter" otherwise. New test `AutoOrganizeRuleRow.test.ts:1514-1520` renders a stored `status != ''` and asserts the exact "A run ignores this filter: Every filter needs a value" text. The typed blank-value case still asserts "Not saved: Every filter needs a value" (`:714`), so the refused path is still covered. |
| 2 | nit | resolved | `commitCreatePath` (`:272-279`) and `commitCreateTemplate` (`:285-291`) compute `stored` first and set the refused flag only when the value differs from the stored one. A blank path with no `createNote` and a blank template with none stored count as stored, which matches the old early return. A different invalid value still sets the flag (the existing "errors tied to their fields" tests, unchanged, pass). New test `:1502-1512` re-commits the stored `notes/x.txt` and `../outside.md` and asserts both messages start "A run ignores this ". |
| 3 | nit | resolved | `e2e/specs/auto-organize.spec.ts:150` renamed to "the mode triggers show their verb labels whole"; the body is unchanged. |

## Acceptance criteria re-checked

- [met] Committing `notes/bad` in Create note path sets `aria-invalid` and its `aria-describedby` text starts "Not saved:"; a valid path removes both; the same for template, refused rename and refused expression; two property rows get different message ids; a stored invalid `createNote.path` shows the message without "Not saved:". — The fix touches `commitCreatePath` / `commitCreateTemplate`; the "errors tied to their fields" tests (refused `notes/bad`, `../outside.md`, valid values clearing both attributes, stored-invalid without "Not saved") are unchanged and pass in `AutoOrganizeRuleRow.test.ts` (118 passed), plus the new re-commit test.
- [met] `bash scripts/e2e.sh auto-organize.spec.ts auto-organize-flows.spec.ts` passes, including "every property row fits its controls side by side inside the rule card" (`auto-organize.spec.ts:98-130`), which jsdom cannot check and which guards the wider mode trigger. — The fix only renames one test title (`auto-organize.spec.ts:150`), no selector or assertion change; round 1 ran both specs green (11 passed). Not re-run here.
- [met] Frontend gate: `pnpm check` and `pnpm vitest run` pass. — `pnpm check` exit 0 (237 files, 0 errors, 0 warnings); `pnpm vitest run src/tests/lib/features/auto-organize/AutoOrganizeRuleRow.test.ts` exit 0, 118 passed. The full `pnpm vitest run` is deliver's to run.

## Checks I ran

- `git diff b13aea373..HEAD`: changes only `AutoOrganizeRuleRow.svelte`, its test file (two tests added, none removed or weakened), the e2e title, and `review.md`. No change to `layer-baseline.json`, `BASELINE_SIZE` or composition roots; nothing under `src-tauri/`.
- `pnpm check`: exit 0.
- `pnpm vitest run src/tests/lib/features/auto-organize/AutoOrganizeRuleRow.test.ts`: exit 0, 118 passed.
- Grep of `help/`, `docs/` for the blank-filter copy: no doc quotes it, so no doc is stale.

## Findings

None open or new.

VERDICT: APPROVED

Reviewed `git diff main...HEAD` (8ee6731df..0c2469f68) in the worktree.

## Acceptance criteria

- [met] Failing test first, `src/tests/lib/features/auto-organize/AutoOrganizeRuleRow.test.ts` (real stores): a rule with two set-property rows where row 0 shows a refused expression; remove row 0; the remaining row shows no error, and changing its mode saves its own expression (assert `autoOrganizeStore.rules[0].properties`), never row 0's refused text. — "keeps a refused expression on its own row when the row above it is removed" renders through the real `autoOrganizeStore` (`AutoOrganizeStoreRuleRowHarness.svelte`), refuses `now()` on row 0, deletes it, asserts no `[data-expr-error]` and `rules[0].properties` equal to `[{ key: 'b', expr: 'file.path', mode: 'if-missing' }]`. Probe: with the keys put back to `(i)` (`AutoOrganizeRuleRow.svelte:546,590`) this test, its create-note twin and the reload test fail (3 failed); restored, they pass.
- [met] A refused expression stays visible after a key change on the same row (no remount); `JSON.stringify(autoOrganizeStore.rules)` has no Row id field. — "keeps a refused expression after a key change on the same row, and writes no row id" commits a new key, then asserts the field still holds `now()`, the error still shows, and `JSON.stringify(autoOrganizeStore.rules)` equals the rule with only `key` changed. Keys live in `propertyKeys` / `createPropertyKeys` (`AutoOrganizeRuleRow.svelte:150-163`), never passed to `onupdate`.
- [met] Failing test first, `auto-organize.logic.test.ts`: `unknownTemplateVariables('{folder}/{yaer}')` is `['yaer']`; `'{folder}/_archive/{year}'`, `'plain'` and `''` give `[]`; `'{constructor}'` gives `['constructor']`; every `TEMPLATE_VARIABLES` name resolves through the real `resolveDestination` to something other than the literal `{name}`. — `describe('unknownTemplateVariables')` covers each case, plus dedupe; the last test loops `TEMPLATE_VARIABLES` through the real `resolveDestination` with `_type` and `status` set. `auto-organize.logic.ts:955-965` uses the same regex and `includes`; `resolveDestination` is untouched. The list matches `resolveDestination`'s `vars` (`:988-996`). The tests import a symbol that did not exist before, so they fail without the code.
- [met] Typing `{folder}/{yaer}` into Move to folder shows the warning naming `{yaer}` and the saved `destination` is exactly that text; a valid template shows the variables line and no warning. — "warns about an unknown variable in Move to folder and saves the text as typed" and "lists the variables under a valid Move to folder template, with no warning"; markup `AutoOrganizeRuleRow.svelte:535-539` (`text-meta text-destructive` warning, `{:else}` `text-meta text-muted-foreground` variables line).
- [met] The named controls are found by role and name; a disabled rule has `[data-rule-off]` and `border-dashed`, an enabled one neither, and the pill follows a prop change. — `describe('header')`: `byRole` matches tag/`role="switch"` plus `aria-label` for Rule name, Move to folder, Enable rule, Move rule up/down, Delete rule, Set file icon and `Icon: lucide:star`; Off test flips `enabled` through the harness `replace` and checks the pill, `border-dashed` and `focus-within:border-ring`; inputs stay enabled.
- [met] `AutoOrganizeSection.test.ts`: "Add rule" leaves `document.activeElement` on the new "Rule name" input; "Add property", "Add note property" and "Add expression" focus the new row's first input; mounting existing rows moves no focus. — `describe('focus')` has all five tests; `AutoOrganizeSection.svelte:42,82,218` passes `focusName`, `AutoOrganizeRuleRow.svelte:101-114` focuses on mount or after `tick()`; the expression input is looked up inside `[data-rule-filter]` and `FilterRow.svelte` is not in the diff.
- [met] Edits to `AutoOrganizeRuleRow.test.ts` stay additive (shell-sidebars-ux 16 adds one assertion there). — `git diff main...HEAD --numstat` gives 204 added, 0 deleted for that file.
- [met] Frontend gate: `pnpm check` and `pnpm vitest run` pass; `bash scripts/e2e.sh auto-organize-flows.spec.ts` passes. — I ran `pnpm check` (0 errors, 0 warnings, 237 files) and `bash scripts/e2e.sh auto-organize-flows.spec.ts` (5 passed). The targeted vitest files pass (see below). The full `pnpm vitest run` is deliver's to run.

## Tests run by this review

- `pnpm check`: exit 0.
- `pnpm vitest run src/tests/lib/features/auto-organize/ src/tests/lib/core/settings/settings-controls.test.ts src/tests/help/queryjs-contract.test.ts`: exit 0, 9 files, 698 passed. The verdict rests on these files: `auto-organize.logic.test.ts`, `AutoOrganizeRuleRow.test.ts`, `AutoOrganizeSection.test.ts` (changed), the rest of `src/tests/lib/features/auto-organize/`, and the two files that mention the changed names.
- Probe: index keys restored in `AutoOrganizeRuleRow.svelte`, `-t 'stable property rows'`: 3 failed, then the file was restored (`git status` clean).
- `bash scripts/e2e.sh auto-organize-flows.spec.ts`: exit 0, 5 passed.

Scope: no change to `FilterRow.svelte`, `auto-organize.service.ts`, `resolveDestination` or `layer-baseline.json`. The new fixture `src/tests/fixtures/AutoOrganizeStoreRuleRowHarness.svelte` is test-only.

## Findings

1. nit, `src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:310-316`: the Create note path warning always says "a folder named {x} would be created", which is wrong when the unknown variable is in the file name (`Meetings/{yaer}.md` creates a note named `{yaer}.md`, not a folder). The Issue asks for this exact text under Create note path, so it is not a defect against the ticket. Fix (optional, a later ticket): word it for a path, e.g. "so the path would contain {x}".
2. nit, `src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:313`: the Rename warning departs from the Issue's text ("so the new name would contain {x}" in place of "so a folder named {x} would be created"). It is the more accurate wording and is recorded in discovery.md. No change needed. The owner may want to know about it.
3. nit, `src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:316`: `createPathWarnings` reads the saved `rule.createNote.path`. When a typed path is refused and left unsaved, the warning still describes the old saved path while the field shows the typed text. Recorded as a default in discovery.md. Fix (optional): read the field's draft, as `renameText` does for Rename.
4. nit, `src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:150-163`: keys are rebuilt only when the row count changes. A reload that replaces a rule's properties with the same count keeps each row's local draft and error. This matches the Issue ("rebuilt when the array length changes from outside") and the old index-keyed behaviour. No change needed.

## Resolution

1. Not changed. The Create note path warning uses the text the Issue asks for; rewording it for a path is a copy decision beyond this ticket. Left for a follow-up Issue, as the review suggests.
2. No change, per the review.
3. Not changed. Reading the saved path is the default recorded in discovery.md, and the review marks the fix optional; a refused path shows its own refusal next to the field. Left for the same follow-up as finding 1, so this delivery stays the reviewed diff.
4. No change, per the review.

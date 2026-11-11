VERDICT: APPROVED

## Acceptance criteria

- [met] The section exists with both variants and the "unknown previous value" limit. — `help/documentation/22-auto-organize.md:539-625`: `## Switching a value back` holds the Issue's pattern block (:543-546), the remove pair on `_color` (:552-576), the default variant on `_icon` under `### Setting a default instead` (:580-608), and `### When the pattern does not work` (:621-625), which says plainly that a hand-picked `_color: blue` is removed and a hand-picked icon becomes the folder icon. Amendment 2 is met as well: `### Keep the two filters exclusive` (:610-619) shows `!=` and `!( )`, links the higher-rule-wins rule (`#set-properties`), and says that list order decides between the pair and the page's "Blocked notes in red" and "Archive done notes" examples. Checked that claim against `ownedProperties` (`src/lib/features/auto-organize/auto-organize.logic.ts:741-750`): the first matched rule in list order owns the key, and a `remove` property owns it too, so "Other projects lose the red" placed above "Archive done notes" does remove the gray. All four in-page anchors the section uses exist as headings.
- [met] The example pair is in the examples config, and a test evaluates it on a `blocked` note and an `active` note, with the expected `_color` result for each. — Amendment 1 overrides this: the pair goes in a fixture under `src/tests/help/`, not in the shipped examples file, which the diff leaves untouched. `src/tests/help/auto-organize-switch-back.fixture.json` holds both pairs. `src/tests/help/auto-organize-switch-back.test.ts:58-70,91-99` runs `findMatchingRules`, `ownedProperties` and `propertiesToWrite` on each pair as one rule list. With the `blocked` note, only the first rule matches and `_color: red` (always) is written. With the `active` note that has `_color: red`, only the second rule matches and `remove _color` is written. The test at :72-74 asserts that the section's JSON blocks deep-equal the fixture rules. A mutation probe (changing `lucide:folder` to `lucide:box` on the page) made it fail, 1 failed and 14 passed, so the page and the fixture cannot drift apart. The page was restored afterwards and the worktree is clean.
- [met] `pnpm vitest run src/tests/help` passes. — I ran it myself: exit 0, 12 files and 377 tests passed. The full suite is deliver's to run.

## Checks run by the reviewer

- `pnpm check`: exit 0, 0 errors and 0 warnings.
- `pnpm vitest run src/tests/help`: exit 0, 12 files and 377 tests. My test verdict rests on these files, in particular the new `src/tests/help/auto-organize-switch-back.test.ts` and the existing Auto Organize help-example tests in the same folder, which still pass with the new section on the page.
- Mutation probe on the page/fixture drift guard: it fails as expected (see criterion 2).
- No app code changed. The diff touches only the help page, a test, a test fixture and the workflow's own `work/12/discovery.md`. There is no scope creep. The layer baseline, the composition roots and the generated bindings are untouched.

## Findings

1. nit — `src/tests/help/auto-organize-switch-back.test.ts:20-21`: the docblock says the test "proves the two filters never match the same note". It only shows that for the sample notes in the fixture. Fix: change it to "checks on each sample note that only one rule of the pair matches".
2. nit — `src/tests/help/auto-organize-switch-back.fixture.json:22-58`: no sample has a `blocked` note that is not a project, so the first rule's `type == "project"` scope is never exercised (the only non-project sample is `active`). Fix: add a `status: blocked` note without `type`, expecting no match and no write.
3. nit — `src/tests/help/auto-organize-switch-back.fixture.json:82-99`: the `_icon` pair has no sample without a `status`, so nothing checks that `!(status == "blocked")` holds on a missing status, as the `!=` pair's "No status" sample does. Fix: add a project without `status`, expecting "Other projects get the folder icon" and a `lucide:folder` write.

## Resolution

1. Fixed: the test docblock now says it checks on each sample note that only one rule of the pair matches.
2. Fixed: the `_color` pair has a `status: blocked` note with no `type` (`work/Blocked task.md`), expecting no match and no write.
3. Fixed: the `_icon` pair has a project with no `status` (`work/No status.md`), expecting a match on "Other projects get the folder icon" and a `lucide:folder` write.

`pnpm check` exit 0; `pnpm vitest run src/tests/help` exit 0, 12 files and 379 tests.

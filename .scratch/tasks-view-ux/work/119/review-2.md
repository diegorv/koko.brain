VERDICT: APPROVED

## Previous findings

| # | Severity | Status | Evidence |
|---|----------|--------|----------|
| 1 | blocker | resolved | f7b26f0d3: `sourceSuggestions` builds `headingTags` from `findInlineTags(heading)` as `#tag` (`task-query.logic.ts:672`), the same reader `headingHasTag` uses in `task-headings.logic.ts:46-51`, so a picked value matches in `tag` mode (exact or nested tag) and in `substring` mode (`#<name>` in the text). `SourcesPanel.svelte:125` reads `headingTags`; no `headings` reference left in the panel. New test `offers heading tags that a heading clause matches in both modes` runs `selectSourceRows` with each suggestion in both modes and asserts `a1, a2, b1` kept (a real round trip, not a mock). Help line updated. |
| 2 | minor | resolved | 0928c9e27: `stringSet(exact)` keys the map by the raw string for `keys` only (`task-query.logic.ts:668`); the other lists still dedupe ignoring case. Test now expects both `status` and `Status`, matching `propertyTest`'s exact key compare and the help text. |
| 3 | minor | resolved | c1b5a0d05: `liftsArchived` is shared by `selectSourceRows` and `describeExcludes`; "archived notes" is dropped only when `sources.length > 0 && sources.every(liftsArchived)`, which is exactly when the archived switch removes no row (`passes` lets a lifting card keep archived rows, and with no cards the switch applies). New `describeTaskQuery` test covers one, two, and mixed cards; the mixed case keeps "archived notes". The `TasksView.sources.test.ts:449` change replaces the self-contradicting sentence with the corrected one: a stricter expectation, not a weakened test. |

## Acceptance criteria

- [met] `sourceSuggestions` returns folders (with parents), tags, types, headings, keys and the values for a key from a fixed row set, de-duplicated and sorted. — `describe('sourceSuggestions')` in `task-query.logic.test.ts` asserts folders with parents, tags, types, heading tags (`['#to-list']` from `Inbox #to-list`, `Calls`, `inbox #TO-LIST`), keys (exact spellings) and per-key values, plus the empty case. The heading list is now heading tags, the form the tag-only heading clause can match (finding 1); this is the review's requested reading of "headings". Passes.

## Findings

None open or new.

## Checks run

- `pnpm check`: exit 0, 231 files, 0 errors, 0 warnings.
- `pnpm vitest run src/tests/lib/features/tasks/task-query.logic.test.ts src/tests/lib/features/tasks/TasksView.sources.test.ts src/tests/lib/features/tasks/TasksView.test.ts src/tests/lib/architecture/`: exit 0, 14 files, 458 tests passed. Architecture tests cover the new `#lib/utils/tag-extraction.js` import (utils is allowed from any layer); `layer-baseline.json` and `BASELINE_SIZE` untouched by the fixes.
- Fix diff (`a34c9bc97..HEAD`) touches only `task-query.logic.ts`, `SourcesPanel.svelte`, the help page, the two test files and this Issue's review file: no scope creep, no deleted test.
- Full suite not run: deliver runs it. Panel not checked in the running app.

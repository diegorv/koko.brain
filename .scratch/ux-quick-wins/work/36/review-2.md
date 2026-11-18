VERDICT: APPROVED

Re-review round 2 of the fixes in c12f1fe83 (`git diff 598569779..HEAD`), in the worktree.

## Previous findings

| # | Severity | Finding | Status | Evidence |
|---|----------|---------|--------|----------|
| 1 | minor | `findFileNode` exact compare gives false marks (case-insensitive APFS, symlinks) | rejection stands | The fix documents both limits in the `isTemplateMissing` JSDoc (`settings.logic.ts:314-317`) and keeps the exact match, which the Issue specifies (`findFileNode(fsStore.fileTree, vault, ...)`). The review marked the code change optional. Behavior is unchanged, so no test is needed. |
| 2 | nit | local `Period` alias repeats `PeriodType` | resolved | `PeriodicNotesSection.svelte:9` imports `type { PeriodType }` from `../settings.types`; the alias is gone and every use (`updatePeriod`, `isMissing`, both snippets) takes `PeriodType`, which has the same five members (`settings.types.ts:4`). `pnpm check` is clean. |
| 3 | nit | "Today:" and "File not found" lines not linked to inputs | resolved | Each Format input has `aria-describedby="periodic-example-<period>"` matching the `id` on its Today line; each Template path input has `aria-describedby` set only while `isMissing(period)` is true, matching `periodic-template-missing-<period>`. `OneOnOneSection.svelte` uses one `$derived` `templateMissing` for both the attribute and the `{#if}`, id `one-on-one-template-missing`. The shadcn `Input` spreads `restProps`, so the attribute reaches the `<input>`. New tests check all five Format links and the Template link appearing then disappearing after a fix, in both test files. |

## Acceptance criteria re-checked

- [met] A template path absent from a loaded tree shows "File not found"; present, empty, dot-prefixed, no vault or an empty tree shows nothing. Real `fsStore` and `vaultStore`, no mock. — The `{#if}` in the periodic `templateMissing` snippet now calls `isMissing(period)`, which passes the same arguments as before to `isTemplateMissing`; the earlier mark tests are unchanged and pass, and the new aria test uses real `fsStore.setFileTree` and `vaultStore.open`.
- [met] Same checks for the 1:1 Template path in `src/tests/lib/core/settings/OneOnOneSection.test.ts`. — The inline call moved into `$derived(isTemplateMissing(fsStore.fileTree, vaultStore.path, settingsStore.oneOnOne.templatePath))`, which reads the same reactive sources; all earlier tests in "OneOnOneSection - missing template mark" pass unchanged.
- [met] `settingsStore.periodicNotes` and `oneOnOne` are identical before and after rendering; `settings-copy.test.ts` and `layer-rules.test.ts` stay green. — The fixes add only attributes, ids and a derived read; no store write on render. Both "leaves ... unchanged by rendering" tests, settings-copy.test.ts and layer-rules.test.ts pass. `layer-baseline.json` and `BASELINE_SIZE` are untouched; the new import (`settings.types`) is within core/settings.
- [met] Frontend gate: `pnpm check` and `pnpm vitest run` pass. — `pnpm check` exits 0 (236 files, 0 errors, 0 warnings); the targeted test files below exit 0. The full suite is deliver's to run.

## Checks run

- `pnpm check`: exit 0, 0 errors, 0 warnings.
- `pnpm vitest run` on PeriodicNotesSection.test.ts, OneOnOneSection.test.ts, settings.logic.test.ts, settings-copy.test.ts, layer-rules.test.ts: exit 0, 5 files, 154 tests passed.
- `pnpm vitest run` on settings-headings.test.ts (it also imports both sections): exit 0, 4 tests passed.
- No test was deleted or weakened: the fix diff to the test files is additions only. No e2e spec refers to the changed ids. Scope: only the two sections, the JSDoc and their tests, matching the three findings.

## Findings

None open or new.

VERDICT: APPROVED

## Previous findings

| # | Severity | Status | Evidence |
|---|----------|--------|----------|
| 1 | blocker | resolved | `withValidProperties` (`auto-organize.service.ts:144-164`) keeps a refused `rename` as stored (still logged) and a refused `createNote` with a text `path`/`template`. Every run-time use re-sanitizes: `sanitizeRename(r.rename)` at `:297` and `:399`, `sanitizeCreateNote(r.createNote)` at `:341` and `:463`; the row's hint uses `sanitizeRename` / `sanitizeCreateNote` (`AutoOrganizeRuleRow.svelte:93`, `:111`); `ownedProperties` reads only `rule.properties`. No other consumer of `autoOrganizeStore.rules` exists outside the section and the service. `saveAutoOrganizeConfig` writes the store (`:180`), so the next Settings save keeps the hand-edited value. The two new row tests go through `loadAutoOrganizeConfig`; I restored the base `auto-organize.service.ts` and both failed (2 failed), then restored the fix (worktree clean). Service loader tests now assert the kept values and that a run calls neither `createFile` nor `renameItem`. |
| 2 | minor | resolved | `help/documentation/22-auto-organize.md:430` says `{year}`/`{month}` are the month of the save and a December save gives `2026-12 Meeting.md`, which matches `isAlreadyNamed` comparing against the new target; it points to an `expr` on a date property for a fixed name. The volatile-names bullet (`:440`) adds `{year}`/`{month}`. The two refusal sentences (`:401`, `:436`) match the new loader behavior. No stale "ignored when the rules load" left for rename or create note. |
| 3 | nit | resolved | `AutoOrganizeRuleRow.svelte:201-207`: `storedRenameSource` derived from `rule.rename`, and an `$effect` resets `renameSource` to it while `renameDraft` is null. A blank-field choice holds because the derived value does not change. Row test "follows a stored rename that switches between name and expression while the row is mounted" uses the harness `replace()` (`src/tests/fixtures/AutoOrganizeRuleRowHarness.svelte:22-25`), which replaces the rule without reporting an update. |
| 4 | nit | resolved | `auto-organize.no-chain.test.ts:234-247`: real hooks, rule with `destination: 'Archive'` and `x: 1`; asserts the source and the renamed-in-place paths are gone, `/vault/Archive/2026-11 Meeting.md` holds `x: 1`, one write to it, `vi.getTimerCount()` 0. |

## Acceptance criteria re-checked

- [met] Rename, move and properties land at the final path in one run, with no re-trigger. — service test "renames, moves and writes the properties at the final path in one run, reading the new name", plus the new no-chain case with real hooks (rename + `Archive` + `x: 1`): single file at `/vault/Archive/2026-11 Meeting.md`, written once, no timer pending.
- [met] Docs and Settings (a "Rename" consequence with a name or expression field) updated. Frontend gate passes. — docs updated for findings 1 and 2; the Settings row shows the stored, loader-kept rename and template errors on render (amendment 8) and resyncs the Name/Expression choice. `pnpm check` exit 0 (230 files, 0 errors, 0 warnings); targeted tests pass (below). The full suite is deliver's to run.

## Checks run by the re-reviewer

- `pnpm check`: exit 0, 0 errors, 0 warnings.
- `pnpm vitest run src/tests/lib/features/auto-organize/ src/tests/help/`: exit 0, 18 files, 815 tests passed. Covers every test file the fixes change (`AutoOrganizeRuleRow.test.ts`, `auto-organize.service.test.ts`, `auto-organize.no-chain.test.ts`) and the help tests.
- Red check: with the base `auto-organize.service.ts`, the two "after the loader read it" row tests fail.
- No test was weakened: the two loader tests changed their expectations to the new kept-value behavior and gained run assertions (nothing created or renamed). No layer baseline, `BASELINE_SIZE` or composition-root change.

## Findings

None open or new.

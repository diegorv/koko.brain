VERDICT: APPROVED

## Previous findings

| # | Severity | Status | Evidence |
|---|----------|--------|----------|
| 1 | major | resolved | `startModsHost` (`src/lib/plugins/mods/mods-host.service.ts:456-460`) filters out folders that have an entry in `reloadRunners`. Runners are only created by `requestReload` and cleared only by `stopModsHost` (`:516`), which `startModsHost` calls first, so any runner present after `readDir` belongs to this start's listener, which loads that folder itself. A `rediscoverMods` racing the start is covered both ways: if its `readDir` finishes first the start skips its folders; if later, its `requestReload` bumps the epoch and the start's in-flight `loadMod` drops its result (or the reload unloads the finished one). Test "a batch that arrives before the start lists the mods folder loads the mod once" fails on the pre-fix service (checked by swapping in `eba05d506`'s file) and passes now. |
| 2 | minor | resolved | `loadMod(..., waitForOnload = true)` (`:285`) runs `onload` and its bookkeeping in a detached async block whose errors are all caught (`fail` and `unloadMod` do not throw), so no unhandled rejection; `reloadFolder` passes `false` (`:390`). The hanging instance is in `liveMods` before `onload` runs (`:319`), so the next reload unloads it, and its late result is dropped by the `live.unloaded \|\| !current()` check. Start and `enableMod` still await `onload`. Test "a reloaded mod whose onload never settles does not block the next save" fails pre-fix, passes now. |
| 3 | minor | resolved | `reloadFolder` awaits `exists(manifest.json)` and re-checks `current()` before unloading (`:378-383`); a rejection propagates to `requestReload`'s `.catch` -> `error('MODS', ...)` with the running mod and its `loaded` row untouched. Test "a failed check for manifest.json keeps the running mod and its row" fails pre-fix, passes now. |
| 4 | nit | rejection stands | The Issue says "If the folder or manifest is gone, unload only"; the restart difference is documented in `reloadFolder`'s JSDoc (`:365-372`). |
| 5 | nit | rejection stands | The Issue lists a README in the mods folder as ignored, which needs the single-segment `.` rule; the stale-row consequence is documented in `mapModChanges`'s JSDoc (`src/lib/plugins/mods/mods.logic.ts:23-26`). |

## Acceptance criteria re-checked

- [met] Failing tests first: — the fixes only add three host tests (no existing test changed or deleted, `git diff eba05d506..HEAD -- src/tests` is additions only); all 216 tests in `src/tests/lib/plugins/mods/` pass, including every reload test the Issue lists; the three new tests fail against the pre-fix service. E2E and the full suite are deliver's to run.

## Checks run by the reviewer

- `taskpolicy -c background pnpm check`: exit 0, 0 errors, 0 warnings.
- `taskpolicy -c background pnpm vitest run src/tests/lib/plugins/mods/`: exit 0, 11 files, 216 tests passed.
- `mods-host.service.test.ts` against `eba05d506:src/lib/plugins/mods/mods-host.service.ts` (temporary swap, restored with `git checkout HEAD`, worktree clean after): exit 1, exactly the three new tests fail.
- Scope: the fix commit touches only `mods-host.service.ts`, `mods.logic.ts` (JSDoc only), the host test file and the review file. No layer baseline change.

## Findings

None open or new.

VERDICT: APPROVED

## Previous findings

| # | Sev | Status | Evidence |
|---|---|---|---|
| 1 | minor | resolved | `theme-builder.logic.ts:159-161` adds `input` on `fileExplorerBg` and `editorBg` at 3:1. `theme-builder.logic.test.ts:290-291` adds both pairs to the built-in and hard-palette boundary test, and `theme-package.logic.test.ts:453-454` adds them to `LIFTED_EDGES`. That list feeds both the 3:1 loop and the `savedVars` hex-matcher, so for those vars the exact-equality check is relaxed only to a hex match. Red check: I restored the builder from `56c37e6c4` and ran both test files. Exit 1: the boundary test and the 22-theme round-trip both failed. Then I restored the file, and the worktree is clean. With the fix both pass. The built-in snapshot is unchanged (`theme-snapshot.test.ts` passes). The Search field sits on `list-bg`, a mix of the two paired surfaces. It is not measured directly, but both ends are at 3:1. |
| 2 | nit | rejection stands | Lifting `borderStrong`/`faintFg` in `readableCore` would move every derived divider and the collection tokens, and the Issue keeps `border` quiet on purpose. The limit is recorded in the Resolution: a partial saved theme derives a slightly darker `collectionNull`/`collectionEmpty`. This is cosmetic and causes no contrast failure. |
| 3 | nit | resolved (partly, as stated) | `theme-package.logic.test.ts:460-465` adds `SAVED_BOUNDARIES`: `--ring` on `--background`/`--popover`/`--editor-bg` and `--lp-blockquote-border` on `--editor-bg`. The loop at :518 checks them at 3:1 for all 22 legacy themes. These vars stay under exact equality with the saved values, so the test also proves the builder leaves them unchanged. Shimmering Focus and Willemstad still have no fixture in the repo, which the Resolution states. |

## Acceptance criteria re-checked

- [met] Failing test first, `theme-builder.logic.test.ts` over `BUILTIN_THEMES` and the hard palettes fixture: `input` on `inputBg`, `switchUncheckedBg` on `settingItemBg`, `taskBorder` on `editorBg`, `ring` on `background` and `popover` at 3:1. Fails today. — The boundary describe keeps every original pair and adds two `input` pairs. Against the pre-fix builder it fails, and with the branch builder it passes (exit 0).
- [met] Snapshot updated on purpose; frontend gate passes. — The fix leaves the snapshot unchanged (`theme-snapshot.test.ts` passes). `pnpm check`: exit 0, 237 files, 0 errors, 0 warnings. Targeted vitest (`theme-builder.logic`, `theme-package.logic`, `theme-snapshot`): exit 0, 118 passed. The full suite is for deliver to run.

## Findings

None open or new. The fix commit changes only the builder pair list and two test files. It weakens no test: `LIFTED_EDGES` only gains entries, and the exact-equality round-trip still covers every other var. Scope creep: none. No `layer-baseline.json`, `BASELINE_SIZE` or composition-root change.

## Checks run

- `pnpm check`: exit 0.
- `pnpm vitest run src/tests/lib/core/settings/theme-builder.logic.test.ts src/tests/lib/core/settings/theme-package.logic.test.ts src/tests/lib/core/settings/theme-snapshot.test.ts`: exit 0, 118 passed.
- Red check with the builder from `56c37e6c4`: exit 1, 2 failed (the boundary test and the 22-theme round-trip). The file was restored afterwards.
- Not run: E2E `focus-ring.spec.ts`. The fix touches no selector or E2E surface.

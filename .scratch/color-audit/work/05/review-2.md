VERDICT: APPROVED

Re-review round 2 of the fixes in 509204734 (`git diff 88ac533be..HEAD`: `src/app.css`, `theme-builder.logic.ts`, its test, and the review's Resolution).

## Previous findings

| # | Severity | Status | Evidence |
|---|----------|--------|----------|
| 1 | minor | resolved | `withReadableContrast` (`theme-builder.logic.ts:271-273`) now runs `fillUnderLabel(primaryForeground, primary, buttonSurfaces(ui))` after the pair loop, so an override primary moves until the label reads at 4.5:1 and \|Lc\| 45 on it and on its 90% tint over editorBg, background, card, popover, settingsDialogBg and settingItemBg (`buttonSurfaces`, :282-286). `labelOnFill` reuses the same step (:361-366), and its direction (`lc > 0` lightens) matches the old white/black branch for pure black and white labels. `readabilityFailures` (:318-352) reports `ui.primary` with bgKey `primaryForeground` when only the hover move changes it. The new test (`theme-builder.logic.test.ts:375-393`) fails without the fix (`ui.primary` would stay `#6b6b6b`) and passes on HEAD. A seeded probe of mine (2100 random override primaries and labels over every built-in and fixture theme) found no case where moving primary breaks a primary-as-text pair, so the fix report's unverified case did not show up. See finding 1 and 2 for the two small gaps. |
| 2 | nit | resolved | `src/app.css:306,319,359` now hold `#8a96f9`, `#a98dfa`, `#a98dfa`. The `-decoration` fallbacks keep `#a78bfa44`, which is right: the lift rewrites a decoration only when it equals the old value plus `45` (`:264-267`). |
| 3 | nit | resolved | Pair `['ui','rightSidebarPrimary','ui','rightSidebarAccent',4.5,'rightSidebarBg']` at `theme-builder.logic.ts:172`, and row at `theme-builder.logic.test.ts:429`; the test passes over the built-in and fixture themes. |

## Acceptance criteria re-checked

- [met] Failing test first, `theme-builder.logic.test.ts` over `BUILTIN_THEMES` and the fixture: every new pair reaches its minimum, including `mutedForeground` on `accent` flattened over `popover` and on `muted` over `background`, and `destructive` on `editorBg` at 4.5:1. It fails today on the fixture (command-item accent row, muted chips). — The fixes add one pair (rightSidebarPrimary on rightSidebarAccent) and its row at `:429`; the hover and selected surfaces suite and the pair suite pass on HEAD over `BUILTIN_THEMES` and both fixtures. Round 1 already reproduced the failure before the builder change.
- [met] APCA test: an `apcaContrast` export (or equivalent) matches the apca-w3 reference on a few known pairs (black/white on `#3b82f6`: Lc 40.2 and -69.4); the muted family and links on the dark fixture palettes reach |Lc| 45; `primaryForeground` is white on a mid-tone blue primary. — The `labelOnFill` refactor keeps the mid-tone blue test (`:486`) and "keeps the primary button label readable at rest and on hover in every theme" (`:496`) green; `color.test.ts` passes.
- [met] Snapshot updated on purpose; frontend gate passes. — `theme-snapshot.test.ts` passes unchanged after the fix, so built-in themes did not move. `pnpm check` exits 0 (0 errors, 0 warnings). 52 related test files pass, 1098 tests (`src/tests/lib/core/settings/`, `utils/color.test.ts`, `tint-text-tokens`, `event-color-tokens`, `mod-theme`, `focus-ring-styles`, `chrome-type-scale`, `text-roles`). The full suite is deliver's to run.

## Findings

1. minor — `src/lib/core/settings/theme-builder.logic.ts:321`. `readabilityFailures` now measures every pair on the fully lifted surfaces (`withReadableContrast(colors)`), including the primary after the hover move, where it used to measure it on primary as the pair loop left it. When an override label fails on primary and the hover move then moves primary, the typed label often passes on the moved primary. The editor then reports `ui.primary` but not `ui.primaryForeground`, although the lift changes both. My seeded probe hit this in 43 of 2100 random overrides (for example Lavender Haze with `#a047b8`/`#31dfd2`: changed `ui.primary, ui.primaryForeground`, reported `ui.primary`). The user is still warned, about the button, so this does not block. Fix: measure the `primaryForeground on primary` pair on primary before the hover move (for example, compute the pairs on a lifted copy without the final `fillUnderLabel` step and keep the hover branch as is), and add a case to "reports exactly the tokens the lift changes".
2. nit — `src/lib/core/settings/theme-builder.logic.ts:383-395`. `fillUnderLabel` stops after 100 steps or at black or white. With a mid-grey override label the hover fill can stay below 4.5:1 or Lc 45 (8 of 2100 probe cases, all random non-black, non-white labels). That is the limit a background-only move has. The editor warns through the hover branch. Fix: none needed. Optionally, lift the label to black or white when the fill cannot reach.

## Checks run

- `pnpm check`: exit 0.
- `pnpm vitest run` on the 52 files above: exit 0, 1098 passed.
- A throwaway seeded probe (a temporary test file, deleted afterwards; the worktree is clean) for: the lift-versus-report invariant, primary-as-text pairs after the hover move (0 regressions), and the hover fill after the lift.
- No weakened or deleted tests: the fix diff only adds lines under `src/tests/`. No scope creep: the three changed source files map to the three findings. No layer-baseline change.

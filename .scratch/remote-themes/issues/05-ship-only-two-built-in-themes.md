# 05: Ship only two built-in themes

**Status:** resolved

**What to build:** The app ships two built-in themes, `KokoBrain Default` (dark) and `Lavender Haze` (light); the other 22 are removed from the code and live only in the catalog. Users who had one of the 22 active see no change: on the first load after the upgrade, that theme becomes an installed theme at version `1.0.0` with the same colors, works offline and can later update from the catalog. The other 22 leave the theme list (one click away in the catalog). User themes, including the "<name> (edited)" copies an earlier migration made, are kept.

**Blocked by:** 02, 03

**Gate:** `pnpm check` + `pnpm vitest run` + `pnpm build` (frontend)

- [x] Failing first: migration tests for saved settings where the active theme is (a) a removed preset without overrides, (b) `Sakura` or `Twilight Violet`, which carry overrides, (c) a built-in that stays, (d) a user theme, (e) an "(edited)" copy. In (a) and (b) the migrated theme's CSS variables equal the saved ones exactly, and its `id` matches the one Issue 02 published.
- [x] The migrated package is rebuilt from the saved colors: palette read back from them, plus an override for every token the builder derives differently, so the round-trip is exact.
- [x] The migration runs once, gated by an appearance flag next to the existing `builtinsFromCode` one; a second load does not re-run it or touch themes installed later.
- [x] The preset definitions, `Sakura` and `Twilight Violet` are deleted from the code, with their now-unused imports; the CSS snapshot test keeps `KokoBrain Default` and `Lavender Haze`.
- [x] The catalog no longer shows "Built-in" for the 22 (Issue 03's transitional state goes away); a fresh install of the app has exactly the two built-ins until the user installs more.
- [x] Docs that list or describe the built-in themes (including the theming help page) are updated; the ADR from Issue 03 gains the migration rule.

## Notes

- Plan: `.scratch/remote-themes/plan-2026-11-03.md` § Migration of the 22 ex-built-ins.

## Comments

- 2026-11-03, branch issue/05-ship-only-two-built-in-themes: only KokoBrain Default and Lavender Haze ship as built-ins; the 22 ex-built-ins migrate once to installed themes from saved colors. Full suite: 457 files, 10550 passed, build ok. Reviews: round 1 CHANGES_REQUESTED, fix round ran, round 2 APPROVED.

# 04: Update an installed theme in place

**Status:** resolved

**What to build:** When the catalog has a newer version of an installed theme (for example the user has `1.0.0` and the repo has `1.0.2`), Settings > Appearance shows "Update to 1.0.2" on that theme. One click replaces the stored package with the new one. If the theme is active, the new colors apply at once. Nothing updates without the click. A theme the user duplicated is a user theme and never shows an update.

**Blocked by:** 03

**Gate:** `pnpm check` + `pnpm vitest run` + `pnpm build` (frontend)

- [x] Versions compare numerically per `MAJOR.MINOR.PATCH` (`1.0.10` is newer than `1.0.9`); equal or older remote versions show "Installed", never a downgrade.
- [x] Update matches the installed theme to the catalog entry by `id`, not by name. If the new version renamed the theme, the stored name changes and `activeTheme` follows it when the theme was active. A rename that collides with another theme's name is refused with a message, and the installed version stays.
- [x] A newer catalog version whose `schemaVersion` the app does not know shows "Requires a newer KokoBrain" and cannot be applied.
- [x] Offline or with a failed fetch, installed themes show no update state and keep working.
- [x] Tests: version comparison (including multi-digit parts and invalid input), store state after an update of the active and of an inactive theme, the rename case, and a component test asserting the rendered "Update to x.y.z" label and its disappearance after the update.

## Comments

- 2026-11-03, branch `issue/04-update-installed-theme-in-place`: catalog version comparison (`MAJOR.MINOR.PATCH`), "Update to x.y.z" in Settings > Appearance that replaces the installed package by `id` (rename follows `activeTheme`, colliding rename refused, unknown `schemaVersion` blocked), docs. Review round 1 APPROVED with two test-coverage findings, fixed (inactive-theme update component test; duplicate-only `catalogEntryState` test); round 2 APPROVED, no findings. Tests: `pnpm check` 0 errors; full suite exit=0, 457 files, 10538 passed, 1 skipped, 1 todo; build passed.

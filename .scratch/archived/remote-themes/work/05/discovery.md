# Issue 05 discovery

No `spec.md`; decisions in `plan-2026-11-03.md` § Migration of the 22 ex-built-ins and ADR-0035. Builds on `work/03` and `work/04` (package logic, `loadAppearance`); only the differences are listed.

## Files that change

- `src/lib/core/settings/theme.logic.ts:269-538`: delete `SAKURA_THEME`, `TWILIGHT_VIOLET_THEME`, the `PRESET_THEMES` import; `BUILTIN_THEMES` = Default + Lavender Haze; `normalizeAppearance` loses the preset exemption (:530).
- `src/lib/core/settings/theme-presets.ts`: deleted.
- `src/lib/core/settings/theme.types.ts:238`: new flag `exBuiltinsMigrated?: boolean` next to `builtinsFromCode`.
- `src/lib/core/settings/theme-package.logic.ts`:
  - `LEGACY_BUILTIN_IDS` (name -> id, the 22 ids published in `koko.brain-themes@99f39a5` `index.json`).
  - `packageFromColors(id, name, colors)`: `coreFromColors` + an override for every token where `buildTheme` differs.
  - `migrateExBuiltins(raw)`: when the flag is unset, drops every saved ex-built-in from `themes`; if the active theme is one, adds its package (`version 1.0.0`, author `diegorv`) to `installed` and keeps its list entry so `loadAppearance` rebuilds it in place. Called first in `loadAppearance`, which then sets the flag.
  - `CatalogEntryState` loses `'builtin'`; `catalogEntryState` drops the `isBuiltinTheme` branch.
- `src/lib/core/settings/sections/AppearanceSection.svelte:292`: remove the Built-in branch.
- Docs: `help/documentation/26-theming.md`, `docs/adr/0035-remote-theme-catalog.md` (migration rule), any other doc listing built-ins; `e2e/specs/event-calendar.spec.ts:18` comment.

## Plan (test-first)

1. Fixture `src/tests/fixtures/legacy-builtin-themes.fixture.json`: the 22 themes as the app saved them (generated from the current code before deletion).
2. Failing tests in `theme-package.logic.test.ts` `loadAppearance`: (a) active preset -> installed, CSS vars equal saved, id `sepia`; every one of the 22 round-trips exactly with its published id; (b) Sakura, Twilight Violet; (c) Lavender Haze active, ex-built-ins dropped; (d) user theme kept; (e) "Sakura (edited)" kept; second load idempotent, later install of `sepia` untouched.
3. Implement, then delete the code themes; rewrite tests that used Sakura / Twilight / presets as fixtures onto Lavender Haze; snapshot drops the two (`-u` removes obsolete entries only).
4. Catalog: remove `'builtin'`; update `theme-package.logic.test.ts` and `AppearanceSection.test.ts`.
5. Docs.

## Risks

- Saved colors are the source, not the code: since `builtinsFromCode` the app rendered code colors, so a save older than the last preset code change migrates the older colors. The Issue requires saved == migrated.
- A save with no `builtinsFromCode` (pre-migration) and an edited non-active ex-built-in loses the edit (it is dropped). Accepted: the flag shipped long before.

## Defaults taken

- Active ex-built-in with no saved colors: falls back to `KokoBrain Default`.
- Saved colors are first completed with `mergeThemeWithDefaults`, so a token missing from an old save is derived, then round-trips exactly.
- Flag name `exBuiltinsMigrated`.

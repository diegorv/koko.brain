# 42: Lavender Haze's H1 is no longer the error red

**What to build:** Lavender `heading: '#C83848'` (`src/lib/core/settings/theme.logic.ts:211`) equals its `error` (`:225`), so H1 renders in the same red as `destructive`, `typeRed` and `callout.caution`, which derive from error (`theme-builder.logic.ts:234`, `:287`); in `references/ux-polish-2026-11-04/screens/lavender/03-note-roadmap.png` the H1 "Roadmap" matches "Delete this note". **Owner decision, recommended value:** set Lavender `heading` to `'#6848A8'` (the theme's primary). Keep the `heading2` to `heading5` overrides (`:257-260`) and the Default theme unchanged.

**Blocked by:** 41

**Status:** ready-for-agent

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`.

- [ ] Failing first, in `src/tests/lib/core/settings/theme.logic.test.ts` next to "has valid heading colors" (about line 258): for every theme in `BUILTIN_THEMES`, `syntax.heading1` differs (case-insensitive) from `ui.destructive`, `ui.typeRed` and `callout.caution`. It fails today on Lavender Haze.
- [ ] The existing heading tests stay green: distinct levels, H6 equals `mutedForeground`, H1 at 3:1 or more on `editorBg`.
- [ ] The regenerated theme snapshot changes only Lavender `syntax.heading1` (`p.heading` feeds only `heading1` and the `headingAt` ramp, which Lavender overrides for H2 to H5).

## Notes

- **Blocking note:** snapshot file only, no code dependency.
- **Source:** review-2026-11-04.md section 3 row 112; `work/color.md` M2.
- **Out of scope:** replacing the rainbow H2 to H5 overrides with one hue ramp in either theme; that is a separate owner call.
- **Size:** S.

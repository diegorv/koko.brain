# Issue 64 discovery: one heading hue ramp per theme

## Files that change

- `src/lib/core/settings/theme.logic.ts:178-181` KokoBrain Default `syntax.heading2..5` overrides (`#5DCCFF`, `#42E8A8`, `#FFD93D`, `#FF8C69`). Delete.
- `src/lib/core/settings/theme.logic.ts:288-291` Lavender Haze `syntax.heading2..5` overrides (`#D07838`, `#A89020`, `#408868`, `#3868B0`). Delete.
- `src/tests/lib/core/settings/__snapshots__/theme-snapshot.test.ts.snap:109-112` and `:249-252` regenerate with `-u`; only `--syntax-heading2..5` of each theme may move.
- `src/tests/lib/core/settings/theme-builder.logic.test.ts:144` ("heading and bold colors of every theme") gains a test.

The issue's cited lines (147-150, 257-260) are stale; the overrides now sit at 178-181 and 288-291.

## Plan

1. Test first: in every built-in theme, `syntax.heading{N+1}` equals `mixColors(heading1, ui.mutedForeground, N / 5)` for N = 1..4, the same formula as `headingAt` in `theme-builder.logic.ts:226`. Fails today (rainbow overrides).
2. Delete the eight override lines. `buildTheme` then derives H2-H5 from `headingAt`.
3. `pnpm vitest run theme-snapshot.test.ts -u`, then read the snapshot diff: exactly eight lines change (H2-H5 of two themes).

## Contrast guard

`READABILITY_PAIRS` (`theme-builder.logic.ts:128`) already checks H1-H6 at 3:1 on `editorBg`, and
`theme-builder.logic.test.ts` "holds for every pair in every built-in theme" runs it over `BUILTIN_THEMES`.
Ramp endpoints (H1 lifted to 3:1, `mutedFg` lifted to 4.5:1) both pass, so sRGB mixes between them should too;
`withReadableContrast` would lift any that fell short, which the new equality test would then flag.

## Prior-art tests

- `theme-builder.logic.test.ts` "gives each heading level its own color, from the heading color at H1 to the muted text color at H6" (same formula on the test `CORE`).
- Snapshot update precedent: Issue 08 part C (`work/08/discovery.md`), Lavender `--syntax-heading1` only.

## Risks

- Saved settings: built-ins are served from code (`builtinsFromCode`), so users of the built-ins see the change; a pre-migration saved built-in with the old rainbow becomes an "(edited)" copy only when `builtinsFromCode` is unset, which is the existing one-time migration behavior.
- Visual: every note heading changes color in both themes (owner check noted in the Issue).

## Defaults taken

- No change to `headingAt` itself or to the H1 / H6 values.

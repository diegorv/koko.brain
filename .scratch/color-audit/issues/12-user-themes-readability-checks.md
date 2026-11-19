# 12: User, edited and imported themes are corrected and the editor warns

**Origin:** color audit 2026-11-19 (`.scratch/color-audit/report.md`, cause G). Each finding below has its fg, bg, worst theme, measured ratio and validator fix in `.scratch/color-audit/research/workflow-result.json` (search by `file:line`); notes in `research/scout-*.md` and `research/validation-*.md`; resolved tokens of all 28 themes in `research/theme-tokens.json`.

**Owner decision (2026-11-19):** a theme the user creates, edits or imports goes through the same lift as the catalog, and the theme editor shows which pair failed and by how much.

**What to build:**

1. **Lift on apply**: themes saved as full token sets bypass `buildTheme` (`theme.logic.ts:105`, `mergeThemeWithDefaults`). Run the `READABILITY_PAIRS` pass (`withReadableContrast`, exported or wrapped) when a user theme is applied, without rewriting the saved file: the user's colors stay as typed, the applied vars are lifted.
2. **Editor warnings**: the theme editor (`core/settings/sections/ThemeColorRow.svelte` and its section) marks each token whose pair failed, with the measured ratio and the minimum, and says the app will show it lifted. ThemeColorRow swatches vanish into the dialog background (`:52`): give them a visible edge.
3. **Pairs for Settings** (`theme-builder.logic.ts:105`): the pairs include the Settings surfaces and destructive as text, so the lift and the warnings cover them (if Issue 05 has not already added them).
4. **Parsing**: the theme schema accepts `hsl()`, 4-digit hex and space-separated `rgb()` that `utils/color.ts:14` cannot parse, so dark detection and lifting silently skip them. Parse them in `parseRgba` (tests first) or normalize on import.

**Size:** M

**Blocked by:** 07

**Status:** ready-for-agent

**Gate:** pnpm check + pnpm vitest run, plus bash scripts/e2e.sh <spec> only when a selector or E2E surface changes.

- [ ] Failing test first, `utils/color.test.ts`: `hsl()`, `#rgba` and `rgb(r g b / a)` parse; unparseable still returns null.
- [ ] Theme logic test: a user theme with a failing pair is applied with the lifted value, and the saved theme is unchanged.
- [ ] Theme editor component test: a failing token shows its warning with the ratio.
- [ ] Frontend gate passes.

## Findings covered

| Finding | Sev | Measured (worst) |
|---|---|---|
| `core/settings/sections/ThemeColorRow.svelte:52` Theme editor swatches vanish into the dialog background | low | Swatch border (--border) vs settings-dialog-bg is under 3:1 on 28/28 themes: 1.13 Graphite Violet, 1.17 Twilight Violet, 1.18 Sakura, 1.21 KokoBrai... |
| `utils/color.ts:14` Schema accepts hsl(), 4-digit hex and space-separated rgb() that color.ts cannot parse (dark detection and lift silently skipped) | low | color.ts:16 and :32 parse only #rgb, #rrggbb, #rrggbbaa, comma-separated rgb()/rgba() and oklch(). theme.schema.json:593-594 also accepts 4-digit h... |
| `core/settings/theme.logic.ts:105` User-created, edited and imported themes bypass every contrast check; the 26 catalog themes have no test or CI contrast gate | low | Traced, no shipped theme fails. theme.logic.ts:105-109 keeps every token from partial.ui verbatim and only fills missing tokens from the lifted der... |
| `core/settings/theme-builder.logic.ts:105` READABILITY_PAIRS has no Settings surfaces and no destructive-text pair, so lifting never protects them | medium | muted on settings-hover-bg 15/28 (2.52 Zettlr Bordeaux Dark, 4.05 KokoBrain Default and Lavender Haze). primary on settings-hover-bg 17/28 (2.58 Ze... |

## Comments

- 2026-11-19, triage: ready-for-agent. Decided by the owner: builder lifts tokens for every theme (WCAG + APCA), user themes are corrected by the builder and the editor warns, rail icons keep their hue and are darkened per theme (ADR-0033 amendment), Issues run through relay one at a time, the themes repo is fixed with version bumps.

# 02: Rail, tag and icon palettes stay visible on every theme

**Origin:** color audit 2026-11-19 (`.scratch/color-audit/report.md`, cause E). Each finding below has its fg, bg, worst theme, measured ratio and validator fix in `.scratch/color-audit/research/workflow-result.json` (search by `file:line`); notes in `research/scout-*.md` and `research/validation-*.md`; resolved tokens of all 28 themes in `research/theme-tokens.json`.

**Owner decision (2026-11-19):** rail icons keep their hue but are darkened or lightened per theme until they reach 3:1. This amends ADR-0033 ("Palette. Icon colors are fixed and the same on every theme"); the amendment is part of this ticket.

**What to build:**

1. **Rail icons.** `RAIL_ITEM_COLORS`, `RAIL_FALLBACK_COLOR`/`RAIL_PIN_COLOR` and `RAIL_ACTION_COLOR` (`src/lib/features/rail-shell/rail-items.logic.ts:143-165`) stay the source hues. A pure helper in the same file takes a hue and the rail surface and returns `ensureContrast(hue, surface, 3)` (`utils/color.ts`), also checked against the active row's 18% tint (`Rail.svelte:384`). `Rail.svelte` sets `--rail-c` from it using the applied theme's rail surface token (find how `railActionColor` reads `appliedThemeStore`). The count badge keeps `railBadgeColors` (it already derives its own fill). A mod that declares `color: {light, dark}` keeps its declared value.
2. **Active rail item.** The 18% tint alone measures 1.06 to 1.45:1 against the rail (`Rail.svelte:384`); in the collapsed form it is the only cue. Add a second cue that reaches 3:1 (for example a 2px indicator bar in `--rail-c`, or a stronger tint), keeping `aria-current`.
3. **Tag and icon presets.** `src/lib/utils/tag-colors.ts:3` and the IconPicker Text/Icon presets (`src/lib/features/file-icons/IconPicker.svelte:51`) are tuned for dark backgrounds. Where they color text or a meaningful icon, pass them through the same 3:1 (icon) or 4.5:1 (text) lift against the surface they sit on; the stored value in the vault does not change. TagColorPicker's selected ring (`TagColorPicker.svelte:99`) and its custom/none swatches (`:60`) use theme tokens instead of the swatch color and translucent white.
4. **Type palette on selected rows** (`theme-builder.logic.ts:123` pairs only `fileExplorerBg`): the type-colored icons in the quick switcher selected row (`QuickSwitcher.svelte:137`) and the selected navigator row stay at 3:1. Prefer the same helper over a new token.
5. **Matching bracket** (`composition-aware-bracket-matching.ts:164`): the hard-coded pale blue becomes a theme token mix.
6. **Destructive button** (`components/ui/button/button.svelte:12`): use `destructive-foreground` instead of hard-coded white.

ADR-0033 Palette paragraph (lines 183-190) is rewritten to the new rule.

Not in this ticket: the badge (done in aede19baa), canvas presets (Issue 09).

**Size:** M

**Blocked by:** none

**Status:** resolved

**Gate:** pnpm check + pnpm vitest run, plus bash scripts/e2e.sh <spec> only when a selector or E2E surface changes.

- [x] Failing test first, `rail-items.logic.test.ts`: for every rail item hue, the helper's color is at least 3:1 on the rail surface of every `BUILTIN_THEMES` entry and of the hard palettes fixture (`Zettlr Bielefeld Light`, `Tolaria Light`; add a small fixture under `src/tests/fixtures/` built with `buildTheme` from their palettes, copied from the themes repo with a source comment), and the raw hue fails on at least one (Favorites yellow on Lavender Haze). An unparseable surface returns the hue unchanged.
- [x] `Rail.test.ts`: `--rail-c` on the Favorites row is the lifted color, not `#eab308`, on a light applied theme; the active item has the second cue.
- [x] Tests for the tag/icon preset lift and the destructive button foreground (`button` test or a scan).
- [x] ADR-0033 amended in the same commit set; the frontend gate passes.

## Findings covered

| Finding | Sev | Measured (worst) |
|---|---|---|
| `features/tags/TagColorPicker.svelte:99` Tag color picker: selected ring has the swatch color on dark themes, so the selected state is invisible | low | The foreground ring against the swatch it encloses fails 3:1 on all 13 dark themes for orange, yellow, green, cyan and purple: yellow 1.07 on Deep ... |
| `features/tags/TagColorPicker.svelte:60` Tag color picker: custom-color swatch and hover border use hard-coded translucent white | medium | The custom swatch fill rgba(255,255,255,0.1) against the popover is 1.00 on all 15 light themes and 1.33-1.38 on dark themes (KokoBrain Default 1.3... |
| `core/settings/theme-builder.logic.ts:123` Type palette icons on selected-row tint and the Inbox organize check fall below 3:1 (builder only tests fe-bg) | medium | Builder pair (type-* on fe-bg) passes everywhere (min 3.39). On the selected nav tint, each hue fails 10-13 of 28 themes: red 2.11 on Zettlr Bordea... |
| `features/file-icons/IconPicker.svelte:51` IconPicker Text and Icon presets are fixed hex; as row title text they fail 4.5:1 on nearly every theme | medium | Raw hex used as title text (4.5:1). On list-bg: Purple 25/28 fail, Red 24/28, Blue and Pink 19/28 each; Yellow, Green, Cyan and Orange fail all 15 ... |
| `features/rail-shell/Rail.svelte:384` Active rail item is marked only by an 18% tint of 1.06-1.45:1; the collapsed rail has no other cue | low | The 18% item-color tint against rail-bg is 1.06 (favorites, Sepia) to 1.45 on all 28 themes. Hover fg/10 is 1.15-1.32, so selected looks no differe... |
| `features/quick-switcher/QuickSwitcher.svelte:137` Type-colored icons on the selected quick switcher row drop under 3:1 on light themes | low | worst type token on accent: 2.23 Zettlr light (yellow), 2.51 Zettlr Bielefeld Light (teal), 2.80 Lavender Haze (orange), 2.83 Shimmering Focus Ligh... |
| `core/markdown-editor/extensions/composition-aware-bracket-matching.ts:164` Matching-bracket highlight is hardcoded pale blue, invisible on light themes | low | #bad0f847 over editor-bg 1.08 Sepia, 1.09 Lavender Haze, 1.10-1.12 other light themes (all 28 under 3); lp-link and wikilink text on the fill 2.25 ... |
| `features/rail-shell/rail-items.logic.ts:144` Rail item icons use fixed saturated hues that vanish on the darker light-theme rail | high | On light-theme rail-bg (#dcdbe0 to #eae9e6): favorites 1.31-1.58, tasks 1.56-1.88, files 1.71-2.05, pin/fallback 1.90-2.28, today 1.92-2.31, action... |
| `features/rail-shell/rail-items.logic.ts:143` Rail icons use fixed hex colors that fall to 1.3-3:1 on light themes | high | Same measurements as rail-items.logic.ts:144. |
| `utils/tag-colors.ts:3` Tag and icon color presets are tuned for dark backgrounds; the none/custom swatches in TagColorPicker vanish on light popovers | low | Tag presets vs popover and right-sidebar on light themes: yellow 1.09-1.41, cyan 1.24-1.62, green 1.55-2.02, orange 1.80-2.34, purple 2.21-2.88, re... |
| `components/ui/button/button.svelte:12` Destructive button text is hardcoded white and ignores destructiveForeground | low | White on bg-destructive at rest fails on 3/15 light themes: 4.13 Tolaria Light, 4.20 Shimmering Focus Light and Willemstad Light. On hover (/90) 4 ... |
| `utils/tag-colors.ts:3` Tag color dots and the property tag icon use a dark-theme preset palette that fails 3:1 on every light theme | medium | editor-bg: yellow 1.20 Sepia (Lc 9), 1.25 Lavender Haze; cyan 1.38; green 1.72; orange 1.99; purple 2.44. input-bg: yellow 1.15 Lavender Haze, cyan... |

## Comments

- 2026-11-19, triage: ready-for-agent. Decided by the owner: builder lifts tokens for every theme (WCAG + APCA), user themes are corrected by the builder and the editor warns, rail icons keep their hue and are darkened per theme (ADR-0033 amendment), Issues run through relay one at a time, the themes repo is fixed with version bumps.

- 2026-11-19, branch issue/02-rail-tag-icon-palettes-follow-theme: rail item hues, tag/icon presets and the destructive button foreground are lifted to 3:1 on each theme's surface; ADR-0033 amended. Review round 1 APPROVED, round 2 APPROVED (a fix round ran between them). Targeted checks passed; full suite 675/675 files, 18084 passed, 56 skipped (02-deliver-2.log, after fixing a codemap-query line pin that failed the first run).

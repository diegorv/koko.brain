# Discovery: Issue 05, builder text on every surface it derives, WCAG + APCA

No `spec.md`; the Issue, `report.md` and `research/workflow-result.json` are the spec. Same builder/test pattern as `work/07` and `work/12`; only the differences are listed.

## Files that change
- `utils/color.ts:256-285`: private `apcaContrast` (channels, |Lc|) becomes `apcaLc` (signed, apca-w3 `deltaYmin` and `loClip` kept); new export `apcaContrast(text, bg): number | null` (text flattened over bg, signed Lc). `ensureContrast(fg, bg, min, minLc = 0)` (`:181`): passes when WCAG >= min and |Lc| >= minLc; when neither black nor white can pass both gates, it drops the APCA gate (old behavior). `ensureContrastOn` gets the same optional `minLc`. `labelColors` unchanged (uses |Lc|).
- `core/settings/theme-builder.logic.ts`:
  - `ReadabilityPair` (`:98`) gains an optional 6th element, the `ui` surface the bg is flattened over (default `editorBg`). Every pair with min >= 4.5 is text and also needs |Lc| 45 (`TEXT_LC`).
  - `READABILITY_PAIRS` (`:105`) new 4.5 pairs: `foreground`/`mutedForeground`/`primary`/`warning`/`success`/`destructive` on `muted` (over `background`) and on `accent` (over `popover`); `fileExplorerFg`/`fileExplorerMutedFg`/`fileExplorerPrimary` on `fileExplorerAccent` and `muted` (over `fileExplorerBg`); `fileExplorerPrimary` on `fileExplorerBg`; `fileExplorerMutedFg` on `popover`; `rightSidebarFg`/`rightSidebarMutedFg`/`rightSidebarPrimary` on `rightSidebarAccent`, `rightSidebarPrimary` on `rightSidebarBg`; `primary` on `background`, `card`, `popover`; `destructive` on `editorBg`, `background`, `card`, `popover`, `statusBarBg`; `warning` on `fileExplorerAccent` raised 3 -> 4.5. All placed before the label-on-fill pairs.
  - `withReadableContrast` / `readabilityFailures` (`:198-256`): honor the base surface and the Lc gate. `ReadabilityFailure` gains `lc` and `minLc`; a pair fails on either gate, worst = lowest share of either minimum.
  - `readableCore` (`:265-298`): lift surfaces add `muted` (over sidebar and editor) and `selected`/`accent` (over popover and sidebar), honoring `ui.muted`/`ui.accent`/`ui.fileExplorerAccent` overrides; `fg`, `mutedFg`, `primary` lifted on them; `error` to 4.5 (+Lc) on every text surface; every 4.5/7 lift also gets Lc 45.
  - `primaryFg`: black or white, the one passing WCAG 4.5 + Lc 45 on the lifted primary (APCA-better when both or neither do); then the fill moves away from the label (`ensureContrast(primary, label, 4.5, 45)`) and in 1% OKLab steps until the label also passes on `primary/90` over the text surfaces (Button hover). `errorFg` keeps `ensureContrast` with the Lc gate.
- `sections/ThemeColorRow.svelte:24,98`: when WCAG passes and only APCA fails, the warning reads `Lc N on <Bg>, needs Lc 45. The app shows it lifted.`
- `src/tests/fixtures/hard-palette-themes.fixture.ts`: new export `HARD_DARK_PALETTE_THEMES` (Twilight Violet 1.0.1, Zettlr Bordeaux Dark 1.0.2, Zettlr Karl-Marx-Stadt Dark 1.0.1, themes repo commit 3a6fba2, the same commit as the existing two). Kept separate so the eight other suites over `HARD_PALETTE_THEMES` do not change scope.

## Tests (prior art: `theme-builder.logic.test.ts` "holds for every pair", Issue 07's boundaries describe)
- Failing first: every pair (with its base and Lc gate) over `BUILTIN_THEMES` + both fixtures; named checks for `mutedForeground` on `accent` over `popover`, on `muted` over `background`, `destructive` on `editorBg`.
- APCA: `apcaContrast('#000000', '#3b82f6')` 40.2, white -69.4 (apca-w3 reference); dark fixtures' muted family and links |Lc| >= 45; `primaryForeground` white on a mid-tone blue primary (light theme), plus the /90 hover pair.
- `color.test.ts`: `apcaContrast` happy, unparseable null, translucent text; `ensureContrast` with `minLc` lifts a WCAG-passing APCA-failing pair, leaves a passing one unchanged, falls back when unreachable.
- Existing pair-list tests updated where the Issue changes the premise (warning on the selected row 3 -> 4.5).
- `ThemeEditor.test.ts`: APCA-only failure shows the Lc line. Snapshot `-u` on purpose; the commit lists the moved tokens.

## Defaults taken
- Lc 45 on every pair at 4.5:1 or more (text), none on 3:1 pairs (large text, non-text).
- Translucent hover/selected shares in components (`bg-muted/60`, `accent/50`) are not separate pairs: text that passes on the full fill and on the base passes between them in practice.
- Type colors keep deriving from the lifted `error`; the commit lists any that move.

## Risks
- Large snapshot change on both built-ins (muted family, primary, destructive, primaryForeground to pure black/white). Catalog themes move at apply time; Issue 13 re-checks the themes repo.

## Build decisions
- Pair order decides conflicts (the later pair wins): row pairs first, plain surfaces after, Settings pairs last, so an explicit Settings or background override wins (settings.service test: a user `background: #ff0000`).
- `readableCore` lifts with `ensureContrastOn` (bounded passes) instead of one `reduce` pass.
- The 90% hover headroom is in `readableCore` only; it is not a `READABILITY_PAIRS` entry, so `withReadableContrast` does not enforce it on user overrides. The builder test checks it on every built-in and fixture theme.
- The primary button headroom darkens light-theme primaries a little, so `--primary-tint-fg` was re-measured: 12% -> 7% (Zettlr Bielefeld Light selected note row).
- `tint-text-tokens.test.ts` premise "file-explorer-muted-fg on --muted falls under 4.5:1 somewhere" is now false; it asserts 4.5:1 everywhere instead. The search badge keeps `file-explorer-fg`.

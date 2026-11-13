# 08: Theme color fixes: calendar grid, meta-bind focus, Lavender H1 and a success token

**What to build:** Four small, independent color fixes in one Issue (owner request, 2026-11-04). Each part below keeps its own failing-first test and acceptance criteria; land them as four commits on the Issue branch, one per part, in the order A, B, C, D. No part depends on another's code. C and D both regenerate the theme snapshot, so do C before D.

**Blocked by:** none

**Status:** resolved

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`.

### A. Collection calendar grid lines follow the theme

On a light theme (Lavender Haze) the month and year (linear) collection calendars lose their inner grid: the lines read `var(--foreground-15, rgba(255,255,255,0.15))`, and `--foreground-15` is defined nowhere in `src/`, so they always fall back to white at 15%. The dashed day-cell lines are hardcoded `rgba(255,255,255,0.08)` and `rgba(255,255,255,0.04)`, which also vanish on light. Replace every one of them with the theme's divider token, keeping today's solid and dashed split:

- solid lines: `1px solid var(--divider)`
- dashed lines: `1px dashed color-mix(in oklab, var(--divider) 50%, transparent)`

Sites: `src/lib/features/collection/CollectionCalendarView.svelte` weekday header at about line 120 (two reads) and day cells at about line 137 (two dashed lines); `src/lib/features/collection/CollectionLinearCalendarView.svelte` header corner at about line 147, day-number header at about line 152, month label at about line 167 (one solid, one dashed) and day cells at about line 180 (two dashed). Keep the inline `style` attributes (one cell mixes a solid side with a dashed side, which Tailwind border classes cannot express). `--divider` is emitted for every theme by `themeColorsToCssVars` (UI group, no prefix; `theme-builder.logic.ts` maps `divider: p.border`, Default overrides it to `#383a4f`, Lavender to `#C0B8D0`) and has static fallbacks in `src/app.css` (about lines 126 and 178).

- [x] Failing first: a new `src/tests/lib/features/collection/collection-calendar-colors.test.ts` reads both `.svelte` sources and asserts they contain no `--foreground-15`, no `rgba(255` and no `rgba(0` literal, and that each reads `var(--divider)`; it fails on the current code
- [x] All ten color sites listed above use `var(--divider)` or the `color-mix` dashed form; no other markup or layout in the two files changes
- [x] The outer wrappers (`border border-foreground/15`, about lines 115 and 142) are left as they are (a real Tailwind token that already works)
- [ ] Manual check in the browser build (`pnpm dev`) in both Default and Lavender Haze: grid lines visible in both, dashed lines lighter than solid ones

### B. Meta-bind controls show a real focus color and a themed chevron

Meta-bind select, text input and toggle in live preview use `hsl(var(--primary))`, but at runtime `--primary` is a hex value (`applyActiveTheme` writes UI tokens unprefixed, Default `primary: '#9ba3da'`), so `hsl(#9ba3da)` is invalid at computed-value time: the focus border falls back to `currentcolor`, the focus ring to none and the checkbox accent to `auto`. Meta-bind buttons set `outline: none` and have no focus rule, so a keyboard user cannot see which button is focused. The select chevron is a hardcoded `%239ca3c7` stroke in a data-URI SVG, while `--lp-meta-bind-select-arrow` (`src/app.css` about line 307) exists and nothing reads it.

All changes are in `src/lib/core/markdown-editor/extensions/live-preview/styles.ts`:

- `.cm-lp-meta-bind-select:focus` (about line 682) and `.cm-lp-meta-bind-input:focus` (about line 765): `borderColor: 'var(--primary)'`, `boxShadow: '0 0 0 1px color-mix(in oklab, var(--primary) 30%, transparent)'`
- `.cm-lp-meta-bind-toggle-input` (about line 788): `accentColor: 'var(--primary)'`
- new `.cm-lp-meta-bind-btn:focus-visible` rule after `.cm-lp-meta-bind-btn` (about line 690): `boxShadow: '0 0 0 3px color-mix(in oklab, var(--ring) 50%, transparent)'` (the shadcn button's `focus-visible:ring-[3px] ring-ring/50`); the base rule keeps `outline: 'none'`
- `.cm-lp-meta-bind-select` chevron (about line 674): replace the data-URI SVG with two `linear-gradient` layers drawn in `var(--lp-meta-bind-select-arrow)` (the classic CSS chevron: `linear-gradient(45deg, transparent 50%, var(--lp-meta-bind-select-arrow) 50%)` and `linear-gradient(135deg, var(--lp-meta-bind-select-arrow) 50%, transparent 50%)`, with matching `backgroundPosition` and `backgroundSize` so it sits where the old 12px chevron sat, inside the existing 24px right padding). `var()` cannot be used inside a `url()` SVG, which is why the token was never wired. The `// privacy-ok` marker goes away with the data URI.

- [x] Failing first, in `src/tests/lib/core/markdown-editor/extensions/live-preview/styles.test.ts` (reuse its `themeRules()` helper): no rule contains `hsl(var(`; a `.cm-lp-meta-bind-btn:focus-visible` rule exists and sets a `box-shadow` that reads `var(--ring)`; the `.cm-lp-meta-bind-select` rule's `background-image` reads `var(--lp-meta-bind-select-arrow)` and contains no `%23` hex literal. All three fail on the current code
- [x] The five `hsl(var(--primary...))` values are gone (`grep -rn "hsl(var" src/lib` is empty)
- [x] `theme-css-contract.test.ts` stays green (the token is defined in `app.css`)
- [ ] Manual check in `pnpm dev` with Default and Lavender Haze: focusing a meta-bind select and text input shows a primary border and soft ring; tabbing to a meta-bind button shows the ring; the select chevron is visible in both themes; the toggle checkbox uses the primary accent

### C. Lavender Haze's H1 is no longer the error red

Lavender `heading: '#C83848'` (`src/lib/core/settings/theme.logic.ts:211`) equals its `error` (`:225`), so H1 renders in the same red as `destructive`, `typeRed` and `callout.caution`, which derive from error (`theme-builder.logic.ts:234`, `:287`); in `references/ux-polish-2026-11-04/screens/lavender/03-note-roadmap.png` the H1 "Roadmap" matches "Delete this note". **Owner decision, recommended value:** set Lavender `heading` to `'#6848A8'` (the theme's primary). Keep the `heading2` to `heading5` overrides (`:257-260`) and the Default theme unchanged.

- [x] Failing first, in `src/tests/lib/core/settings/theme.logic.test.ts` next to "has valid heading colors" (about line 258): for every theme in `BUILTIN_THEMES`, `syntax.heading1` differs (case-insensitive) from `ui.destructive`, `ui.typeRed` and `callout.caution`. It fails today on Lavender Haze.
- [x] The existing heading tests stay green: distinct levels, H6 equals `mutedForeground`, H1 at 3:1 or more on `editorBg`.
- [x] The regenerated theme snapshot changes only Lavender `syntax.heading1` (`p.heading` feeds only `heading1` and the `headingAt` ramp, which Lavender overrides for H2 to H5).

### D. A success color token in every theme

Themes have `warning` and `destructive` but no success color, so "up to date", sync and done states use the raw `green-*` palette (1.55 to 2.02:1 on Lavender). Add a `success` UI token the same way `warning` is wired:
- `src/lib/core/settings/theme.types.ts`: `success: string` in `UIColors` after `warning` (about line 120), with JSDoc.
- `theme-builder.logic.ts`: derive `success: p.green` (next to `warning: p.yellow`, about line 254) and add `['ui', 'success', 'ui', 'fileExplorerBg', 4.5]` and `['ui', 'success', 'ui', 'editorBg', 4.5]` to `READABILITY_PAIRS` (about line 124).
- `src/app.css`: `--color-success: var(--success);` in `@theme inline` next to `--color-warning` (about line 64), and a static `--success` fallback in `:root` (the built Lavender value) and `.dark` (the built Default value), next to `--warning` (about lines 153 and 218).
- `theme-editor.logic.ts`: add `'success'` after `'warning'` in the Type Palette group (about line 88).

- [x] Failing first, `src/tests/lib/core/settings/theme-builder.logic.test.ts`: a theme built from `CORE` with `sidebarBg: '#ffffff'` and a pale `green` has `ui.success` at 4.5:1 or more on `fileExplorerBg` and `editorBg`, and both pairs are in `READABILITY_PAIRS`.
- [x] `mergeThemeWithDefaults` of a saved theme with no `success` derives it from that theme's own green (new case in `theme.logic.test.ts`).
- [x] `theme-css-contract.test.ts`'s fallback test (about line 62) includes `--success` in its names, and passes.
- [x] The regenerated theme snapshot only adds `success`; the theme editor tests stay green.

## Notes

- **Merged:** this Issue replaces the former 08 (calendar grid), 09 (meta-bind focus), 42 (Lavender H1) and 46 (success token); those files were deleted. 42 and 46 used to wait for 41 only because they share the theme snapshot file; this Issue now lands first and 41 regenerates the snapshot on top of it.
- **A notes:**
  - **Source:** review-2026-11-04.md section 1 item 9 and "Feature views" row "Collection calendars lose their grid on light"; views.md rule 1. The review cited lines 137 and 180 as `--foreground-15` reads; they are the hardcoded white dashed lines, which this ticket covers too.
  - **Why `--divider`, not `--border`:** Default's `--border` is `#242835`, darker than the `#2a2e3d` content behind the grid, so the lines would nearly disappear in the dark theme. `--divider` is visible in both built-in themes.
  - **Layer:** `features/collection` only; no new imports.
  - **Out of scope:** the `+N more` button, canvas and graph theme work (review ticket 9), and a repo-wide "every `var()` read is defined" guard (about 40 unprefixed runtime-set variables such as `--heading-h1-*` and `--xy-*` would need an allowlist first).
- **B notes:**
  - **Source:** review-2026-11-04.md section 1 item 3 and "Editor chrome" row "Meta-bind focus and accent invalid"; color.md and states.md.
  - **Overlap:** the review's work breakdown puts this fix inside ticket 1 "Motion and focus foundations". If that ticket is drafted elsewhere with the meta-bind lines in it, keep the meta-bind part here only.
  - **Browser behavior** (invalid `hsl()` with a hex argument) is from the CSS Variables spec, not measured in WebKit; the unit test pins the source, the manual check confirms the render.
  - **Out of scope:** meta-bind control radii (review ticket 12) and the `transition: all` on the button (review state rules).
  - **Owner usage:** the owner uses meta-bind daily, so do the two-theme manual check.
- **C notes:**
  - **Source:** review-2026-11-04.md section 3 row 112; `work/color.md` M2.
  - **Out of scope:** replacing the rainbow H2 to H5 overrides with one hue ramp in either theme; that is a separate owner call.
- **D notes:**
  - **Source:** review-2026-11-04.md section 3 row 99 and the color rules row; `work/color.md` H4 and standard 3.
  - **Out of scope:** consumers (Issue 48); `info` and diff tokens (no consumer needs them).
- **Size:** M (four S parts).

## Comments

- 2026-11-04, branch issue/08-theme-color-fixes: calendar grid lines use `var(--divider)`; meta-bind focus/ring and select arrow use theme tokens (no `hsl(var(`); Lavender Haze H1 uses its primary instead of the error red; new `success` token derived per theme (migration derives it from the theme's green). Review fix: migration tests require a 6-digit hex success color. Tests: `pnpm check` 0 errors; full suite at 392c0372b exit=0 (492 files, 11669 passed, 1 skipped, 1 todo) plus build. Reviews: round 1 APPROVED, round 2 APPROVED. Two manual browser checks (Default and Lavender Haze) remain for the owner.

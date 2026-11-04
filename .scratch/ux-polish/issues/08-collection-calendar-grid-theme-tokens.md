# 08: Collection calendar grid lines follow the theme

**What to build:** On a light theme (Lavender Haze) the month and year (linear) collection calendars lose their inner grid: the lines read `var(--foreground-15, rgba(255,255,255,0.15))`, and `--foreground-15` is defined nowhere in `src/`, so they always fall back to white at 15%. The dashed day-cell lines are hardcoded `rgba(255,255,255,0.08)` and `rgba(255,255,255,0.04)`, which also vanish on light. Replace every one of them with the theme's divider token, keeping today's solid and dashed split:

- solid lines: `1px solid var(--divider)`
- dashed lines: `1px dashed color-mix(in oklab, var(--divider) 50%, transparent)`

Sites: `src/lib/features/collection/CollectionCalendarView.svelte` weekday header at about line 120 (two reads) and day cells at about line 137 (two dashed lines); `src/lib/features/collection/CollectionLinearCalendarView.svelte` header corner at about line 147, day-number header at about line 152, month label at about line 167 (one solid, one dashed) and day cells at about line 180 (two dashed). Keep the inline `style` attributes (one cell mixes a solid side with a dashed side, which Tailwind border classes cannot express). `--divider` is emitted for every theme by `themeColorsToCssVars` (UI group, no prefix; `theme-builder.logic.ts` maps `divider: p.border`, Default overrides it to `#383a4f`, Lavender to `#C0B8D0`) and has static fallbacks in `src/app.css` (about lines 126 and 178).

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`.

- [ ] Failing first: a new `src/tests/lib/features/collection/collection-calendar-colors.test.ts` reads both `.svelte` sources and asserts they contain no `--foreground-15`, no `rgba(255` and no `rgba(0` literal, and that each reads `var(--divider)`; it fails on the current code
- [ ] All ten color sites listed above use `var(--divider)` or the `color-mix` dashed form; no other markup or layout in the two files changes
- [ ] The outer wrappers (`border border-foreground/15`, about lines 115 and 142) are left as they are (a real Tailwind token that already works)
- [ ] Manual check in the browser build (`pnpm dev`) in both Default and Lavender Haze: grid lines visible in both, dashed lines lighter than solid ones

## Notes

- **Source:** review-2026-11-04.md section 1 item 9 and "Feature views" row "Collection calendars lose their grid on light"; views.md rule 1. The review cited lines 137 and 180 as `--foreground-15` reads; they are the hardcoded white dashed lines, which this ticket covers too.
- **Why `--divider`, not `--border`:** Default's `--border` is `#242835`, darker than the `#2a2e3d` content behind the grid, so the lines would nearly disappear in the dark theme. `--divider` is visible in both built-in themes.
- **Layer:** `features/collection` only; no new imports.
- **Out of scope:** the `+N more` button, canvas and graph theme work (review ticket 9), and a repo-wide "every `var()` read is defined" guard (about 40 unprefixed runtime-set variables such as `--heading-h1-*` and `--xy-*` would need an allowlist first).
- **Size:** S.

# 09: Meta-bind controls show a real focus color and a themed chevron

**What to build:** Meta-bind select, text input and toggle in live preview use `hsl(var(--primary))`, but at runtime `--primary` is a hex value (`applyActiveTheme` writes UI tokens unprefixed, Default `primary: '#9ba3da'`), so `hsl(#9ba3da)` is invalid at computed-value time: the focus border falls back to `currentcolor`, the focus ring to none and the checkbox accent to `auto`. Meta-bind buttons set `outline: none` and have no focus rule, so a keyboard user cannot see which button is focused. The select chevron is a hardcoded `%239ca3c7` stroke in a data-URI SVG, while `--lp-meta-bind-select-arrow` (`src/app.css` about line 307) exists and nothing reads it.

All changes are in `src/lib/core/markdown-editor/extensions/live-preview/styles.ts`:

- `.cm-lp-meta-bind-select:focus` (about line 682) and `.cm-lp-meta-bind-input:focus` (about line 765): `borderColor: 'var(--primary)'`, `boxShadow: '0 0 0 1px color-mix(in oklab, var(--primary) 30%, transparent)'`
- `.cm-lp-meta-bind-toggle-input` (about line 788): `accentColor: 'var(--primary)'`
- new `.cm-lp-meta-bind-btn:focus-visible` rule after `.cm-lp-meta-bind-btn` (about line 690): `boxShadow: '0 0 0 3px color-mix(in oklab, var(--ring) 50%, transparent)'` (the shadcn button's `focus-visible:ring-[3px] ring-ring/50`); the base rule keeps `outline: 'none'`
- `.cm-lp-meta-bind-select` chevron (about line 674): replace the data-URI SVG with two `linear-gradient` layers drawn in `var(--lp-meta-bind-select-arrow)` (the classic CSS chevron: `linear-gradient(45deg, transparent 50%, var(--lp-meta-bind-select-arrow) 50%)` and `linear-gradient(135deg, var(--lp-meta-bind-select-arrow) 50%, transparent 50%)`, with matching `backgroundPosition` and `backgroundSize` so it sits where the old 12px chevron sat, inside the existing 24px right padding). `var()` cannot be used inside a `url()` SVG, which is why the token was never wired. The `// privacy-ok` marker goes away with the data URI.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`.

- [ ] Failing first, in `src/tests/lib/core/markdown-editor/extensions/live-preview/styles.test.ts` (reuse its `themeRules()` helper): no rule contains `hsl(var(`; a `.cm-lp-meta-bind-btn:focus-visible` rule exists and sets a `box-shadow` that reads `var(--ring)`; the `.cm-lp-meta-bind-select` rule's `background-image` reads `var(--lp-meta-bind-select-arrow)` and contains no `%23` hex literal. All three fail on the current code
- [ ] The five `hsl(var(--primary...))` values are gone (`grep -rn "hsl(var" src/lib` is empty)
- [ ] `theme-css-contract.test.ts` stays green (the token is defined in `app.css`)
- [ ] Manual check in `pnpm dev` with Default and Lavender Haze: focusing a meta-bind select and text input shows a primary border and soft ring; tabbing to a meta-bind button shows the ring; the select chevron is visible in both themes; the toggle checkbox uses the primary accent

## Notes

- **Other tickets:** Overlaps the review's work-breakdown ticket 1 (Motion and focus foundations), which also lists this fix. If another cluster drafts that ticket with the meta-bind lines, keep the meta-bind part only here.
- **Source:** review-2026-11-04.md section 1 item 3 and "Editor chrome" row "Meta-bind focus and accent invalid"; color.md and states.md.
- **Overlap:** the review's work breakdown puts this fix inside ticket 1 "Motion and focus foundations". If that ticket is drafted elsewhere with the meta-bind lines in it, keep the meta-bind part here only.
- **Browser behavior** (invalid `hsl()` with a hex argument) is from the CSS Variables spec, not measured in WebKit; the unit test pins the source, the manual check confirms the render.
- **Out of scope:** meta-bind control radii (review ticket 12) and the `transition: all` on the button (review state rules).
- **Owner usage:** the owner uses meta-bind daily, so do the two-theme manual check.
- **Size:** S.

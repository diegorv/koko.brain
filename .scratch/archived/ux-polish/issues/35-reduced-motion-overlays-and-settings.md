# 35: Overlays and the Settings drawer stop animating when the OS asks for reduced motion

**What to build:** With macOS "Reduce motion" on, overlays and the Settings drawer still move. Once Issue 34 lands, the 9 overlay primitives animate on open and close, and `tw-animate-css` 1.4.0 has no `prefers-reduced-motion` rule. Two changes:
1. In each of the 9 primitives listed in Issue 34, add `motion-reduce:animate-none!` to the class string. The trailing `!` (Tailwind v4 important modifier) is needed: `data-[state=open]:animate-in` has a class plus an attribute selector, so a plain `motion-reduce:animate-none` (one class inside a media query) loses on specificity and does nothing. The E2E below proves the chosen form; if Tailwind rejects the trailing form, use `motion-reduce:data-[state=open]:animate-none motion-reduce:data-[state=closed]:animate-none` (and the equivalent for the tooltip's unguarded `animate-in`) and say so in the report.
2. `src/lib/app/SettingsPanel.svelte:117` `transition:fly={{ x: 820, duration: 200 }}` is a Svelte JS transition (Web Animations API), which CSS cannot turn off. Make its duration `0` when `window.matchMedia?.('(prefers-reduced-motion: reduce)').matches` is true, read inside the transition params (Svelte 5 evaluates them when the transition starts) through a small local function in the component. Do not import `prefersReducedMotion` from `svelte/motion`: it calls `window.matchMedia` when the module loads, jsdom has no `matchMedia`, and `src/tests/lib/app/SettingsPanel.test.ts` (and any jsdom test that imports `AppOverlays.svelte`) would crash on import.

**Blocked by:** 34

**Status:** wontfix

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`, plus `./scripts/e2e.sh e2e/specs/overlay-motion.spec.ts e2e/specs/settings.spec.ts`.

- [ ] Failing first: `e2e/specs/overlay-motion.spec.ts` gains a `describe` with `page.emulateMedia({ reducedMotion: 'reduce' })` (or `test.use({ reducedMotion: 'reduce' })`) that opens the command palette and the file-row context menu and asserts `animationName` is `none` on `[data-slot="dialog-content"]`, `[data-slot="dialog-overlay"]` and `[data-slot="context-menu-content"]`. Run it before the class change and see it fail
- [ ] Failing first: the same reduced-motion block opens Settings (`pressShortcut(page, 'Mod+Comma')`) and asserts, right after `[role="dialog"][aria-label="Settings"]` is visible, that `panel.getAnimations()` holds no animation whose `effect.getTiming().duration` is above 0. Run it before the SettingsPanel change and see it fail (the 200 ms fly is there)
- [ ] The no-preference cases from Issue 34 still pass (animation runs when reduced motion is not requested)
- [ ] All 9 primitive files carry the reduced-motion class; no other class in them changes
- [ ] `SettingsPanel.svelte` passes `duration: 0` under reduced motion and `200` otherwise; `x: 820` is unchanged; the local function has a one-line JSDoc
- [ ] `src/tests/lib/app/SettingsPanel.test.ts` still passes without a `matchMedia` stub (proves the lazy read is safe in jsdom)
- [ ] The commit carries the E2E change, so no `Test-Exempt` trailer is needed

## Notes

- **Source:** review section 4 row 1 ("`motion-reduce` on overlays, spinners and the Settings fly"); `work/states.md` P12 and R1; `work/overlays.md` R1.
- **Existing model:** `src/lib/features/event-calendar/EventCalendarView.svelte:283` is the only `prefers-reduced-motion` rule today and stays as it is.
- **Out of scope:** the 11 `animate-spin` spinners (a spinner that stops reads as frozen), the 8 `hover:scale` effects and `transition-all` cleanup (interaction-state work), and the Settings drawer's width, scrim and focus handling (Settings polish).
- **Not verified:** that WKWebView reports `prefers-reduced-motion` from the macOS setting (expected, not checked); the E2E runs in Chromium.
- **Size:** S.

## Comments

- 2026-11-04: closed as wontfix by the owner; overlays keep the tw-animate-css motion from Issue 34 regardless of the reduced-motion setting.

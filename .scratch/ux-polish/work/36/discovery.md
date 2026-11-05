# Issue 36 discovery

No `spec.md` exists for ux-polish; the Issue and `work/states.md` are the source.

## Files that change

- `src/app.css:417-419` base layer `* { @apply border-border; }` becomes `@apply border-border outline-ring/50;`. Nothing else in `@layer base`.
- `src/lib/components/ui/dialog/dialog-content.svelte:30` Content class string gains `outline-none`. Close button classes (line 37) untouched.
- New `e2e/specs/focus-ring.spec.ts`.

## Plan

1. Write `focus-ring.spec.ts` with two tests, run on current code, see both fail.
   - Dialog: `openFile(page, 'Welcome.md')`, `openCommandPalette`, type `View File History`, Enter. Wait for `[data-slot="dialog-content"]` that is `document.activeElement` (File History has no tabbable child in the mock: history list is empty), assert `outlineStyle === 'none'`.
   - Raw button: `Mod+Comma` opens Settings, press Tab until `button[aria-label="Close settings"]` is the active element (bounded loop), assert `:focus-visible`, then compare `outlineColor` with a probe `color: color-mix(in oklab, var(--ring) 50%, transparent)` appended to `document.body`, and `outlineStyle !== 'none'`.
2. Apply the `app.css` change, see the button test pass.
3. Apply `outline-none`, see the dialog test pass.
4. Gate: `pnpm check`, targeted E2E specs from the Issue's Gate line.

## Prior art

- `e2e/specs/overlay-motion.spec.ts` (computed-style assertions via `locator.evaluate`, `openCommandPalette`).
- `e2e/specs/command-palette.spec.ts` (palette input locator), `e2e/specs/settings.spec.ts` (`Mod+Comma`, panel locator).

## Risks / defaults

- Tailwind v4 `outline-ring/50` emits `outline-color: color-mix(in oklab, var(--ring) 50%, transparent)`; the probe uses the same expression, so the computed colors compare equal in Chromium. Default: compare strings from `getComputedStyle`.
- Focus by Tab: if the close button is not the first tabbable after opening Settings, the loop presses Tab up to 30 times; the `:focus-visible` assertion proves the precondition.
- If bits-ui focuses something else in File History (not the content), the test fails loudly on the active-element wait rather than passing vacuously.
- WKWebView tinting of `outline-style: auto` is not checked here (Issue Notes: owner checks in `pnpm tauri dev`).
- No vitest seam: jsdom evaluates no CSS, so the E2E is the test.

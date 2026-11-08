# Issue 34 discovery: overlay motion (tw-animate-css)

## Files that change

- `e2e/specs/overlay-motion.spec.ts` (new): failing-first browser proof.
- `package.json` `devDependencies`: `tw-animate-css` `1.4.0` (exact).
- `pnpm-lock.yaml`: updated by `pnpm add -D tw-animate-css@1.4.0`.
- `src/app.css:1`: `@import "tw-animate-css";` inserted as line 2, after `@import "tailwindcss";`.

Unchanged: the 9 primitives under `src/lib/components/ui/` named in the Issue.

## Plan

1. Write `overlay-motion.spec.ts`: `openCommandPalette` then read
   `getComputedStyle(el).animationName` on `[data-slot="dialog-content"]` and
   `[data-slot="dialog-overlay"]`; right-click a file row (`listRow(page, 'Inbox')`
   after `showFolder(page, TEST_VAULT_PATH)`, as in `file-operations.spec.ts`) and read
   it on `[data-slot="context-menu-content"]`. Assert `not.toBe('none')` via
   `expect.poll`. Run it, see it fail, commit.
2. `pnpm add -D tw-animate-css@1.4.0` (published 2025-09-24, past the 5-day
   `minimumReleaseAge`), add the import, check `git diff pnpm-lock.yaml` for only the
   new package. Commit.
3. `pnpm check`; `pnpm build`, then grep `build/_app/immutable/assets/*.css` for
   `@keyframes enter`, `@keyframes exit`, `.animate-in`.
4. Run the Gate's E2E specs; fix any spec that fails only because a closing overlay
   stays mounted for its exit animation, by waiting on real state (`toBeHidden()`).

## Prior art

- `e2e/specs/file-operations.spec.ts`: file-row context menu via `listRow` + right-click.
- `e2e/fixtures/helpers.ts:104`: `openCommandPalette`.

## Risks

- bits-ui waits for `animationend` before unmounting: specs that count menuitems or
  click straight after closing an overlay may see the old one for 150-200 ms.
- `animationName` is read at the open state; the `enter` animation is applied while
  `data-state="open"`, so the value is stable after the element appears.

## Defaults taken

- The spec checks `animationName` once the element is visible (poll, no sleep).
- No unit test (jsdom evaluates no CSS, per the Issue Notes).

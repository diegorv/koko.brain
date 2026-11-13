# Issue 16 discovery

No `spec.md` in `.scratch/ux-polish/`; the Issue and `work/radius.md` section 1 are the source.

## Files that change

- `src/app.css:66-69`: the four `--radius-*` lines leave `@theme inline` for a new `@theme static` block that adds `--radius-xs: calc(var(--radius) - 6px)`. Tailwind 4.3.3 parses `static` as a per-variable "always emit" flag (`node_modules/tailwindcss/dist/lib.js`, `t==="static"?i|=8`), so the block lands on `:root, :host` and the utilities become `border-radius: var(--radius-md)`.
- `src/tests/lib/radius-scale.test.ts` (new): the ladder case plus the three-rule ratchet.

## Plan

1. Test first: a case that strips `@theme inline { ... }` blocks from `app.css`, finds `--radius-xs` .. `--radius-xl`, substitutes `--radius` (read from `app.css`, rem x 16) and evaluates the `calc()` to 4/6/8/10/14px. Fails today (no `xs`, all four inside `@theme inline`). Then move the block; commit both together.
2. Ratchet in the same file, modelled on `chrome-type-scale.test.ts` (walk `src/lib`, skip `components/ui/`) and `raw-write-ratchet.test.ts` (per-file counts compared with `toEqual`, which fails on growth, a new file and a stale drop alike). Pure counters `countBareRounded`, `countArbitraryRounded`, `countRadiusPx` take a string, so the unit case scans strings.
3. `pnpm build`, grep `build/_app/immutable/assets/*.css` for the five variables and `.rounded-sm/md/lg`; record the grep in the commit message.

## Baseline from today's tree (prototype scan)

- (a) 82 sites in 36 `.svelte` files (matches the Issue). (b) 1: `EventPopover.svelte`. (c) 50 sites in 14 files outside the allowlist (`styles.ts` 23, `canvas-markdown.css` 4, ten canvas `.svelte`, `canvas.logic.ts` 2, `collection-block-widget.ts` 2).

## Defaults taken

- Rule (a) also matches the corner and logical side forms (`rounded-tl`, `rounded-s`, ...): same defect class, zero extra sites today.
- Rule (c) property names: `border-radius`, its corner longhands and any custom property ending in `-radius` after `border` (`--xy-node-border-radius`), plus camelCase `borderRadius` / `borderTopLeftRadius`. A site is a declaration whose value has no `var(` and contains a px literal other than `9999px`; `0`, `50%`, `inherit` carry no px. The stricter reading ("anything not in the allowed list") differs only inside allowlisted `kb-ui.ts`.
- The allowlist skips the whole file for all three rules; neither file has an (a) or (b) site.

## Risks

- `var(--radius-md)` is now computed on `:root` instead of per element. Nothing overrides `--radius` below `:root` (only `app.css:154` sets it), so values are unchanged.
- `rounded-xs` moves 2px -> 4px at `dialog-content.svelte:38` and `IconPicker.svelte:145` (accepted in the Issue).
- `@theme static` emits all five variables even if unused: intended.

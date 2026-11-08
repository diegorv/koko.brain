# Issue 19 discovery

No `spec.md` for ux-polish; the Issue and `work/shadow.md` (P1, P8, P11, section 3) are the source.

## Files that change

- `src/lib/core/settings/theme.logic.ts:32` `themeColorsToCssVars`: after the flattening loop, merge five `--elev-*` vars from a private helper keyed on `isDarkColor(colors.ui.editorBg) !== false` (null counts as dark). Light values use `alpha(colors.ui.foreground, a)` from `theme-builder.logic.ts:89` (already imported module). New import: `isDarkColor` from `#lib/utils/color.js` (utils, allowed for core; no new layer edge).
- `src/app.css`:
  - `:root` (line 107-157) and `.dark` (159-, after `--success` at 221): five `--elev-*` fallbacks. Lavender (`fg #302840`): `#3028400f`, `#3028401a`, `#30284029`, ring `#30284014`, scrim `#30284040`. Default: the dark constants.
  - `@theme inline` (line 4-93): `--color-scrim: var(--elev-scrim);`.
  - New `@theme static { --shadow-xs/sm/md/xl }` block after `@theme inline`, so the four are emitted on `:root` even when unused and override Tailwind's defaults; shadow utilities inline the value with `var(--tw-shadow-color, var(--elev-*))`.
- `src/lib/components/ui/dialog/dialog-overlay.svelte:16` `bg-black/50` -> `bg-scrim`.
- `src/lib/components/ui/dialog/dialog-content.svelte:30` `shadow-lg` -> `shadow-xl`.
- `src/lib/components/ui/context-menu/context-menu-sub-content.svelte:16`, `dropdown-menu/dropdown-menu-sub-content.svelte:16` `shadow-lg` -> `shadow-md`.

## Tests

- `src/tests/lib/core/settings/theme.logic.test.ts` `describe('themeColorsToCssVars')`: new cases (Default dark values, Lavender tinted values, oklch editorBg -> dark, the pre-existing keys equal the flattened tokens).
- `src/tests/lib/core/settings/theme-css-contract.test.ts` last case: add the five `--elev-*` names to `names`.
- `__snapshots__/theme-snapshot.test.ts.snap`: regenerate with `-u`, check the diff adds only five keys per theme.
- Other `themeColorsToCssVars` users in tests (`settings.service.test.ts:1187`, `theme-package.logic.test.ts:401-452`) compare both sides through the function, so they stay equal.

## Plan

1. Failing tests in theme.logic.test.ts -> implement theme.logic.ts -> update snapshot. Commit.
2. Contract test names -> app.css fallbacks, `@theme static` shadows, `--color-scrim`. Commit.
3. Primitive class swaps. Commit.
4. Targeted checks, `pnpm build`, grep the built CSS for `--shadow-md:`, `.shadow-md` with `--elev-ring`, `.bg-scrim`; record in the commit message.

## Risks / defaults

- No shared theme-mode helper exists yet (only `mermaid-widget.ts:17` calls `isDarkColor` locally), so a local call in `theme.logic.ts`.
- `@theme static` is Tailwind 4 syntax (installed ^4.3.3); verified by the built-CSS grep rather than assumed.
- `--shadow-lg` keeps Tailwind's default; after step 3 no `shadow-lg` class is left in `src/`.
- The motion/focus Issue edits the same primitive lines; this branch does not touch anything else on them.

# 44: Canvas menus, pickers and edge labels use theme tokens

**What to build:** The canvas's own overlays keep white-alpha borders and hovers and a private danger red, so on Lavender Haze their edges and hover states disappear. Apply the Issue 43 rule (`rgba(255, 255, 255, A)` to `color-mix(in oklab, var(--foreground) {A x 100}%, transparent)`) at:
- `src/lib/features/canvas/CanvasContextMenu.svelte:183,206,231`; the danger item (`:210-211`) becomes `color: var(--destructive)` with `background: color-mix(in oklab, var(--destructive) 15%, transparent)`.
- `CanvasFilePicker.svelte:91,103,135`, `CanvasLinkInput.svelte:91,108,110,151`.
- `CanvasEdge.svelte:72`; drop the dead fallbacks in `var(--card, #2a2e3d)` and `var(--foreground, #fff)` (`:66-67`).
- `CanvasToolbar.svelte:55`: drop the `rgba` fallback of `var(--xy-controls-button-border-color, ...)`.
- `ColorPicker.svelte:61,69`.

Then widen the guard test to the whole folder.

**Blocked by:** 43

**Status:** wontfix

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`.

- [ ] Failing first: `canvas-theme-colors.test.ts` scans every `.svelte` and `.ts` file in `src/lib/features/canvas/` except `canvas.types.ts` (and `canvas-markdown.css`, which it does not read). It fails on any `rgba(255` literal and on `#fb464c` outside `canvas.types.ts`, and allows `rgba(0` only in `box-shadow` declarations and the two scrim backgrounds (`CanvasFilePicker.svelte:81`, `CanvasLinkInput.svelte:81`).
- [ ] The context menu danger item reads `--destructive` in both themes.
- [ ] The commit body records the by-eye check in both themes.

## Notes

- **Other tickets:** If the overlay-anatomy work in another cluster rebuilds CanvasContextMenu, CanvasFilePicker or CanvasLinkInput on shadcn primitives first, those files drop out of this ticket. Their shadows and scrims belong to the elevation/scrim token work.
- **Source:** review-2026-11-04.md row 96; `work/color.md` H3 and M3 (`#fb464c`); `work/shadow.md` P3.
- **Out of scope:** rebuilding the three overlays on shadcn `ContextMenu`, `Command` and `Dialog`, their shadows and scrims, and their type sizes.
- **Size:** S.

## Comments

- 2026-11-06: migrated to `.scratch/open-itens/issues/196-canvas-menus-pickers-edge-labels-use-theme.md` by audit 2026-11-05 (its re-checked text and any related audit findings now live there, in one plan ordered by impact on written content and daily use). Closed here as wontfix so it is worked in one place; nothing was implemented.

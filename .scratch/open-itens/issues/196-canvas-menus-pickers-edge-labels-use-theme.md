# 196: Canvas menus, pickers and edge labels use theme tokens

**Origin:** `audit-2026-11-05` Issue 86, moved here on 2026-11-08. Its PRD, raw evidence and closed siblings stay in `.scratch/archived/audit-2026-11-05/`. Bare Issue numbers in the text below use that feature's numbering; `priority-2026-11-08.md` in this folder maps them to the numbers here.

**Migrated from:** `.scratch/archived/ux-polish/issues/44-canvas-overlay-theme-tokens.md` (audit 2026-11-05). Priority: polish (bucket 3-polish). Polish/low. It keeps its Blocked-by 43.

**Audit check at `5f8003d67`:** still_present (polish, low). Overlay sites unchanged at HEAD: CanvasContextMenu.svelte:183 (border), :206 (hover), :210-211 (danger hover `rgba(251,70,76,0.15)` and `color: #fb464c`), :231; CanvasFilePicker.svelte:91,103,135 (scrim :81, shadow :97); CanvasLinkInput.svelte:91,108,110,151 (scrim :81, shadow :94); CanvasEdge.svelte:66-67 (`var(--card, #2a2e3d)`, `var(--foreground, #fff)`) and :72; CanvasToolbar.svelte:55 (rgba fallback on --xy-controls-button-border-color); ColorPicker.svelte:61,69. --destructive exists in both themes (src/app.css:159,219). canvas-theme-colors.test.ts does not exist. Blocked by Issue 43, which is still open, so the dependency holds. Light-theme only impact, hence low for an owner likely on the dark Default.

**Stale in the text below:** Line numbers match HEAD. Note CanvasContextMenu.svelte:187 and CanvasFilePicker.svelte:97 / CanvasLinkInput.svelte:94 are rgba(0 ...) box-shadows that the guard test must allow. Issue 57 ('menu items share one anatomy') and Issue 77 touched CanvasContextMenu-adjacent menus but did not change these colors; if the overlay-anatomy cluster rebuilds the three overlays on shadcn primitives first, the Issue's own note says those files drop out.

**What to build:** The canvas's own overlays keep white-alpha borders and hovers and a private danger red, so on Lavender Haze their edges and hover states disappear. Apply the Issue 43 rule (`rgba(255, 255, 255, A)` to `color-mix(in oklab, var(--foreground) {A x 100}%, transparent)`) at:
- `src/lib/features/canvas/CanvasContextMenu.svelte:183,206,231`; the danger item (`:210-211`) becomes `color: var(--destructive)` with `background: color-mix(in oklab, var(--destructive) 15%, transparent)`.
- `CanvasFilePicker.svelte:91,103,135`, `CanvasLinkInput.svelte:91,108,110,151`.
- `CanvasEdge.svelte:72`; drop the dead fallbacks in `var(--card, #2a2e3d)` and `var(--foreground, #fff)` (`:66-67`).
- `CanvasToolbar.svelte:55`: drop the `rgba` fallback of `var(--xy-controls-button-border-color, ...)`.
- `ColorPicker.svelte:61,69`.

Then widen the guard test to the whole folder.

**Blocked by:** 195

**Status:** ready-for-agent

**First wave:** yes, picked by the owner on 2026-11-06.

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

- 2026-11-06: migrated from `.scratch/archived/ux-polish/issues/44-canvas-overlay-theme-tokens.md` by audit 2026-11-05, which re-checked it at `5f8003d67`.

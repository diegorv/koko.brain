# 195: Canvas nodes, edges and grid draw from theme tokens, so they show on light themes

**Origin:** `audit-2026-11-05` Issue 85, moved here on 2026-11-08. Its PRD, raw evidence and closed siblings stay in `.scratch/archived/audit-2026-11-05/`. Bare Issue numbers in the text below use that feature's numbering; `priority-2026-11-08.md` in this folder maps them to the numbers here.

**Migrated from:** `.scratch/archived/ux-polish/issues/43-canvas-surface-theme-tokens.md` (audit 2026-11-05). Priority: polish (bucket 3-polish). Polish/low. It matters only on light themes. Cite the new shadow lines :777,781.

**Audit check at `5f8003d67`:** still_present (polish, low). All named surface sites still hardcode white or black alphas: src/lib/features/canvas/FileNode.svelte:102,131,160; TextNode.svelte:94; LinkNode.svelte:140,166,199,201; ImageNode.svelte:71; GroupNode.svelte:31-32; canvas.logic.ts:151 (buildGroupStyle default `rgba(255,255,255,0.05)` / `0.2`); CanvasInner.svelte:728-729,737-738 (add-card button) and :746,749,754,758,759 (--xy-* overrides, comment 'Override Svelte Flow theme for dark mode' at :742). The --foreground token exists for both themes (src/app.css:147 light, :207 dark), --background is available for the minimap mask. src/tests/lib/features/canvas/ has no canvas-theme-colors.test.ts, and git log -S'canvas-theme-colors' finds nothing, so the guard test is unwritten. No commit touching src/lib/features/canvas since the Issue was drafted addresses colors (only f37acb402 'canvas edits persist to their own tab'). Impact is only on light themes (Lavender Haze); Default dark looks the same after the swap, so likelihood is low unless the owner runs a light theme.

**Stale in the text below:** Node shadows are now at CanvasInner.svelte:777,781, not 761,765 (the 'unchanged' acceptance bullet should cite the new lines). Add-card button is at 728-738 and the Svelte Flow block at 742-759, not 712-743. GroupNode.svelte:32 fill is rgba(255,255,255,0.03), not 0.05, so the color-mix percentage for that line is 3%. Everything else in the text is accurate.

**What to build:** The canvas surface hardcodes white and black alphas, tuned for a dark background: on Lavender Haze (`references/ux-polish-2026-11-04/screens/lavender/08-canvas.png`) edges are close to invisible, node borders vanish and the minimap mask is a dark grey block. Replace each `rgba(255, 255, 255, A)` with `color-mix(in oklab, var(--foreground) {A x 100}%, transparent)`. Default's foreground is `#F8F8F2`, so Default looks the same, and light themes get ink at the same strength. Sites:
- `src/lib/features/canvas/CanvasInner.svelte`: `.add-card-btn` (about lines 712-722); the Svelte Flow block (about lines 726-743): `--xy-node-border-color` and `--xy-controls-button-border-color` at 15%, `--xy-edge-stroke` at 30%, `--xy-background-pattern-color` at 5%, and `--xy-minimap-mask-background-color` becomes `color-mix(in oklab, var(--background) 60%, transparent)`. Reword the comment "Override Svelte Flow theme for dark mode" to say it maps Svelte Flow to the app theme tokens.
- `FileNode.svelte:102,131,160`, `TextNode.svelte:94`, `LinkNode.svelte:140,166,199,201`, `ImageNode.svelte:71`, `GroupNode.svelte:31-32`.
- `canvas.logic.ts:151`: the uncolored default of `buildGroupStyle` uses the same `color-mix` form (5% fill, 20% dashed border).

**Blocked by:** none

**Status:** ready-for-agent

**First wave:** yes, picked by the owner on 2026-11-06.

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`.

- [ ] Failing first, new `src/tests/lib/features/canvas/canvas-theme-colors.test.ts` (source assertions in the style of `canvas-markdown-css.test.ts`, comments stripped; jsdom applies no CSS): the seven files above contain no white-alpha `rgba(255` literal (any whitespace), and `rgba(0` appears only inside `box-shadow` declarations.
- [ ] Failing first, `src/tests/lib/features/canvas/canvas.logic.test.ts` (next to "adds style for group nodes", about line 212): an uncolored group's style contains `var(--foreground)` and no `rgba(`; a colored group still uses the resolved preset with the `20` and `80` alpha suffixes.
- [ ] The node shadows at `CanvasInner.svelte:761,765` are unchanged.
- [ ] `e2e/specs/canvas-view.spec.ts` is untouched and still passes if run; the commit body says how Default and Lavender Haze were checked by eye (`pnpm dev`, open a `.canvas`).

## Notes

- **Other tickets:** Node shadows (CanvasInner.svelte:761,765) and scrims stay as they are; they move to the elevation and scrim tokens from the elevation/overlay cluster.
- **Source:** review-2026-11-04.md section 1 item 9 and row 96; `work/color.md` H3; `work/views.md` P1; `work/shadow.md` P3.
- **Commit:** `fix:` with the guard test above as its test.
- **Out of scope:** node shadows and scrims (they move to the elevation and scrim tokens of the elevation work); `canvas-markdown.css` `var()` fallbacks (dead, every `--lp-*` token is always set); `canvas.types.ts:6-11` presets (JSON Canvas user colors, intentional); the canvas overlays (Issue 44).
- **Size:** M (seven files, mechanical swaps, plus two tests).

## Comments

- 2026-11-06: migrated from `.scratch/archived/ux-polish/issues/43-canvas-surface-theme-tokens.md` by audit 2026-11-05, which re-checked it at `5f8003d67`.

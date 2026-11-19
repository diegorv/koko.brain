# 04: Accent and status text on its own tint: kanban, collection functions, file history

**Origin:** color audit 2026-11-19 (`.scratch/color-audit/report.md`, cause B). Each finding below has its fg, bg, worst theme, measured ratio and validator fix in `.scratch/color-audit/research/workflow-result.json` (search by `file:line`); notes in `research/scout-*.md` and `research/validation-*.md`; resolved tokens of all 28 themes in `research/theme-tokens.json`.

**What to build:**

Same root as Issue 03, in the kanban plugin, the collection expression display functions and the file history diff.

1. **Collection display functions** (`src/lib/features/collection/expression/evaluator.ts:444-462`): `badge()` draws the raw palette color as text on its own 15% tint, `color()` draws the raw palette color as text on the bare surface, `progress()` uses a fixed gray label and low-contrast bars. Text becomes the palette color moved toward `--editor-fg` (the `COLOR_PRESET_CHIP_TEXT` pattern), bars and track reach 3:1. These render both in the Svelte views and the CodeMirror block widget: read `docs/agents/live-preview-rules.md` before touching the widget path.
2. **Kanban**: due badges and status text on their tint (`kanban.logic.ts:752`), the lane card-limit count in destructive red (`KanbanLane.svelte:256`), view toggles and filter counts in primary on a primary tint (`KanbanView.svelte:549`), secondary text on coloured cards (`KanbanCard.svelte:204`), wikilinks on cards (`KanbanCardText.svelte:25`).
3. **Kanban tag chips** (`color-presets.ts:37`, `KanbanCardText.svelte:34`): the Issue 39 share (30% preset) still measures under 4.5:1 on the Zettlr light themes, worst on coloured cards. Re-measure on the hard palettes fixture and raise the share; keep the existing color-presets test and extend it to the fixture.
4. **File history diff** (`DiffViewer.svelte:14`): red and green text on tinted rows, deleted lines under 3:1 on the built-in default. Use the text-on-tint tokens from Issue 03 (or equivalents for success and destructive).

Not in this ticket: kanban placeholders, date icons and checkbox (Issue 01).

**Size:** M. Split point: item 1 alone (collection functions) first.

**Blocked by:** 03

**Status:** ready-for-agent

**Gate:** pnpm check + pnpm vitest run, plus bash scripts/e2e.sh <spec> only when a selector or E2E surface changes.

- [ ] Failing test first, evaluator tests: the `badge()`, `color()` and `progress()` output styles reach 4.5:1 (text) and 3:1 (bars) on the collection surface for every palette color on `BUILTIN_THEMES` and the hard palettes fixture; the current output fails on at least one.
- [ ] `color-presets.test.ts` extended to the fixture: chip text at least 4.5:1 on the real card stack; fails at the current 30% share on a Zettlr light palette.
- [ ] Kanban and DiffViewer tests read the new colors (style attribute or class), not the raw status color.
- [ ] Frontend gate passes.

## Findings covered

| Finding | Sev | Measured (worst) |
|---|---|---|
| `features/collection/expression/evaluator.ts:444` badge() display function draws raw palette color as text on its own 15% tint | high | Light themes on --card: yellow 1.45, green 1.79, orange 1.86, gray 1.93, blue 2.18, red 2.57, purple 2.69 (Lavender Haze worst). Widget yellow 1.29... |
| `features/collection/expression/evaluator.ts:451` color() and progress() display functions use raw palette or gray on the surface | high | color() text on --card, light themes: yellow 1.56, green 1.98, orange 2.08, gray 2.13, blue 2.49. On dark themes red is 3.19 and purple 3.14 (Graph... |
| `features/collection/expression/evaluator.ts:448` Collection badge() text is the raw preset color on its own 15% tint | high | Preset text on its own 15% tint, flattened. On editor-bg: red 27/28, purple 27/28, blue 25/28, gray 22/28, green 21/28, orange 21/28, yellow 15/28 ... |
| `features/collection/expression/evaluator.ts:462` Collection color() text is the raw preset color on the bare surface | high | Raw preset on the bare surface. On editor-bg: purple 25/28, red 24/28, blue 17/28; green, orange, yellow and gray fail all 15 light themes. Yellow ... |
| `features/collection/expression/evaluator.ts:457` Collection progress(): fixed gray percent label and low-contrast bars on light themes | medium | The percent label rgb(160,160,160) fails 15/15 light themes: 2.22 on Sepia (editor-bg, Lc 40) and 1.88 on Lavender Haze (lp-collection-bg). Bar aga... |
| `features/file-history/DiffViewer.svelte:14` File History diff: red/green text on tinted rows fails, deleted lines under 3:1 on built-in default | high | deleted text on destructive/15 over popover: 2.65 Zettlr Bordeaux Dark, 2.74 KokoBrain Default and Zettlr dark (Lc -24 to -28), 3.24 Sakura, 4.09 L... |
| `plugins/kanban/KanbanView.svelte:549` Primary text on a primary tint: view toggles, filter counts, search badges, TOC hover | medium | View-mode toggle: icon only (LayoutGrid/List, size-3.5), so 3:1 applies. 0/28 fail on editor-bg or background; that part is refuted. Text-bearing p... |
| `plugins/kanban/kanban.logic.ts:752` Status text on its own 15-20% tint (kanban due badges, diff lines, build badge, error panels) fails | high | Kanban badges on the bg-background card: overdue 23/28 (Willemstad Light 2.96, Shimmering Focus Light 3.02, KokoBrain Default 3.51); today 14/28 (3... |
| `plugins/kanban/KanbanCard.svelte:204` Coloured-card tint drops secondary text below 4.5:1 (checked text, note preview, wikilinks, table Done and lane column) | medium | rgba(preset, 0.15) over the lane (muted/30 over editor-bg). Muted-foreground (checked text, preview) fails on 18/28: Zettlr dark yellow 2.87 (#9191... |
| `plugins/kanban/KanbanCardText.svelte:25` text-primary wikilinks on cards slightly under 4.5:1 in five themes | low | Primary on the card's bg-background: Shimmering Focus Light 4.08, Willemstad Dark 4.18 (Lc-30), Zettlr Berlin Light 4.19, Zettlr Bordeaux Light 4.2... |
| `plugins/kanban/KanbanLane.svelte:256` Lane card-limit count in destructive red fails on 12 themes, including built-in dark | medium | Destructive on the lane (muted/30 over editor-bg), 12px semibold, fails on 12/28: Zettlr dark 2.57 (Lc-23), Zettlr Bordeaux Dark 2.61, KokoBrain De... |
| `utils/color-presets.ts:37` Tag chip text (Issue 39) still under 4.5:1 on Zettlr light themes, worst on coloured cards | low | Plain card (chip = preset@0.15 over --background): yellow chip #7b6d57 on #f3ebd1 is 4.23:1 (Lc63) on all 5 Zettlr light themes. Coloured card (pre... |
| `plugins/kanban/KanbanCardText.svelte:34` Kanban tag chips (COLOR_PRESET_CHIP_TEXT) under 4.5:1 on Zettlr Light cards, worse on coloured cards | low | Plain card: yellow 4.23 (Lc63) on Zettlr Berlin, Bielefeld, Bordeaux, Frankfurt and Karl-Marx-Stadt Light. Stacked on a red card: 3.36 Zettlr Biele... |

## Comments

- 2026-11-19, triage: ready-for-agent. Decided by the owner: builder lifts tokens for every theme (WCAG + APCA), user themes are corrected by the builder and the editor warns, rail icons keep their hue and are darkened per theme (ADR-0033 amendment), Issues run through relay one at a time, the themes repo is fixed with version bumps.

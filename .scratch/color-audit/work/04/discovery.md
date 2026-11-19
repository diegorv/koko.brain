# Discovery: Issue 04, accent and status text on its own tint: kanban, collection, diff

No `spec.md`; the Issue, `report.md` and `research/` are the spec. Same pattern as `work/03` (text-on-tint `--*-tint-fg` tokens in `app.css`, gated by `src/tests/lib/tint-text-tokens.test.ts`). What differs: kanban and collection colors come from the fixed `color-presets.ts` palette, and the gate set is `BUILTIN_THEMES` + the shared `src/tests/fixtures/hard-palette-themes.fixture.ts`.

## Measured (28 audited themes, `research/theme-tokens.json`; largest share that keeps the ratio)
- Coloured card today: `background: rgba(preset,.15)` replaces the card's `bg-background`, so it composites over the lane. Tag chip on it: Zettlr Bordeaux Dark fails even with pure editor-fg (no share works). With the tint layered over the opaque `bg-background` (`background-image`), chip share 13 (Zettlr Bielefeld Light), muted text toward foreground 58, primary 52.
- Chip/collection preset share toward `--editor-fg`: kanban chips 13, collection badge 16, color() text 21. One map for all: pick by the gate test (about 13).
- Proximity badges on plain card, editor rows, hovered row: destructive 51 (token 40 ok), warning 61 (45 ok), type-orange 38, type-blue 35. Lane count destructive on lane: 40 gives 5.14 min.
- Diff on popover: delete share 54 (40 ok), insert 73 (45 ok). Line numbers (`muted-foreground`) on the tints: 3.32 KokoBrain Default.
- Progress track as an outline: `editor-fg` alpha would need 66% to reach 3:1; the bar color itself (>= 4.5 on the surface) is used instead.
- View toggles `KanbanView.svelte:549`: icon only, primary on primary/10 is >= 3.61 on all 28 (the Issue table marks that part refuted).

## Files that change
- `src/lib/utils/color-presets.ts:37`: lower the preset share of `COLOR_PRESET_CHIP_TEXT`; doc names the collection use.
- `src/lib/features/collection/expression/evaluator.ts:444-462`: badge() and color() text from `COLOR_PRESET_CHIP_TEXT`; progress() fill and track outline in that color, percent label in its gray.
- `src/app.css`: add `--type-orange-tint-fg`, `--type-blue-tint-fg`, `--muted-tint-fg` (+ `--color-*`).
- `src/lib/plugins/kanban/kanban.logic.ts:752`: badges use `text-*-tint-fg`.
- `KanbanLane.svelte:256` `text-destructive-tint-fg`; `KanbanCardText.svelte:25` `text-primary-tint-fg`.
- `KanbanCard.svelte:204` tint as `background-image` over `bg-background`; checked text and preview `text-muted-tint-fg` on a coloured card. Same in `KanbanListView.svelte:44` and `KanbanTableView.svelte:59,62,80` (lane column, checked text, Open), Done `text-success-tint-fg`.
- `DiffViewer.svelte:14-15`: `text-success-tint-fg` / `text-destructive-tint-fg`; line numbers on changed rows inherit the row color.

## Tests
- `methods.test.ts` (display functions live there): new contrast block resolving the style strings over `BUILTIN_THEMES` + fixture on `--card` (+ muted/20, /50 rows) and `preview.collectionBg` (+ table alt/hover); raw output fails. Existing raw-rgb asserts updated.
- `color-presets.test.ts`: theme set + fixture, coloured card over `background`; raw 30% fails on Zettlr Bielefeld Light.
- `tint-text-tokens.test.ts`: new stacks (date badges, lane count, wikilink, coloured-card muted text, table Done, diff lines) and the three new tokens; a 3:1 check for the view toggle icon.
- `kanban.logic.test.ts:1371`, `KanbanView.test.ts:212-225,827,1242`; new `DiffViewer.test.ts` (mount pattern of `FileHistoryDialog.test.ts`).

## Defaults taken
- View toggles keep `text-primary` (icon, 3:1 holds); a test pins it.
- Date badges and chips on a coloured card are measured only through the chip test; proximity badges are gated on plain cards and rows (the finding's surfaces). On a coloured card they stay under 4.5 on Zettlr light themes.
- Wikilinks reuse `--primary-tint-fg` (14%) rather than a new link token.

## Build decisions
- Shares: chip/badge/color() text 13% (largest the gate set allows), `COLOR_PRESET_BAR` 45% (gate allows 50, the 28 allow 48), `--type-orange-tint-fg` and `--type-blue-tint-fg` 35%, `--muted-tint-fg` 55%.
- Secondary-text choice lives in `secondaryTextClass()` (`kanban.logic.ts`), shared by card, list and table.
- Collection contrast tests went to `evaluator.test.ts`; the raw-rgb asserts in `methods.test.ts` still hold (the mix string carries the preset) and were left.

## Risks
- Issue 05 lifts primary/destructive differently: re-measure. Lower chip share desaturates chip and badge text; the tint carries the hue.

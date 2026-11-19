# 11: Graph view labels, edges and controls read on every theme

**Origin:** color audit 2026-11-19 (`.scratch/color-audit/report.md`, cause E and D). Each finding below has its fg, bg, worst theme, measured ratio and validator fix in `.scratch/color-audit/research/workflow-result.json` (search by `file:line`); notes in `research/scout-*.md` and `research/validation-*.md`; resolved tokens of all 28 themes in `research/theme-tokens.json`.

**What to build** (`src/lib/plugins/graph-view/`):

1. Edges are hairlines under 3:1 on most themes and the hover highlight differs only by width (`graph-view.logic.ts:289`): stroke at 3:1 on the graph background, hover by color and width.
2. The center-note node differs from ordinary nodes by hue only (`:296`): add a second cue (ring or size).
3. Hover-dimmed nodes and labels fall to 1.2 to 1.7:1 (`:288`): dim to a floor that keeps labels at 3:1.
4. Node labels print over other nodes with no halo (`GraphView.svelte:316`): add a halo in the background color.
5. Graph controls: filter and display controls have near-invisible boundaries (`GraphControls.svelte:121`) and the Global/Local toggle's selected state is barely visible (`:45`): use the Issue 07 tokens.

finders-ux 15 (`.scratch/finders-ux/issues/15-graph-labels-priority-skip-overlaps.md`) changes which labels draw; check its status first and rebase, never in parallel.

**Size:** S

**Blocked by:** 07

**Status:** ready-for-agent

**Gate:** pnpm check + pnpm vitest run, plus bash scripts/e2e.sh <spec> only when a selector or E2E surface changes.

- [ ] Failing test first, `graph-view.logic.test.ts`: edge, dimmed node and label colors from the logic reach their floors on the graph background over `BUILTIN_THEMES`; the center node differs by more than hue.
- [ ] Frontend gate passes.

## Findings covered

| Finding | Sev | Measured (worst) |
|---|---|---|
| `plugins/graph-view/graph-view.logic.ts:296` Center-note node is nearly indistinguishable from ordinary nodes (hue-only difference) | medium | nodeActive (primary) against node (muted-foreground) is under 1.5:1 on 23/28 themes. OKLab distance: KokoBrain Default 1.08:1 / 4.9, Mint Linen 1.0... |
| `plugins/graph-view/graph-view.logic.ts:289` Graph edges are hairlines under 3:1 on most themes, hover highlight differs only by width | medium | edge (muted mixed 40% toward editor-bg) against editor-bg: 21/28 under 3:1 at full coverage, 2.31 Zettlr Bielefeld Light, KokoBrain Default 2.73. e... |
| `plugins/graph-view/graph-view.logic.ts:288` Hover-dimmed nodes and labels fall to 1.2-1.7:1 | low | labelDimmed vs editor-bg 1.57:1 Zettlr Bielefeld Light to 2.27 Willemstad Light, APCA Lc 0 on Willemstad Dark, -12.9 KokoBrain Default; nodeDimmed ... |
| `plugins/graph-view/GraphControls.svelte:45` Global/Local mode toggle: selected state barely visible | medium | bg-muted chip vs panel (background 90% over editor-bg) 1.01:1 Shimmering Focus Light, 1.05 Willemstad Dark, 1.06 KokoBrain Default, 1.34 Lavender H... |
| `plugins/graph-view/GraphControls.svelte:121` Filter and display controls in the graph panels have near-invisible boundaries | medium | border vs panel 1.06 KokoBrain Default, 1.13 Tolaria Light, max 2.06; select chevron (muted-fg at 50%) 1.94 Tolaria Light to 2.90; switch track vs ... |
| `plugins/graph-view/GraphView.svelte:316` Node labels can print over other nodes with no halo (label on node 1.1-1.7:1) | low | label on node (muted-foreground) 1.12 Shimmering Focus Dark, 1.25 Zettlr light, 1.61 KokoBrain Default; label on the active node (primary) 1.05 Zet... |

## Comments

- 2026-11-19, triage: ready-for-agent. Decided by the owner: builder lifts tokens for every theme (WCAG + APCA), user themes are corrected by the builder and the editor warns, rail icons keep their hue and are darkened per theme (ADR-0033 amendment), Issues run through relay one at a time, the themes repo is fixed with version bumps.

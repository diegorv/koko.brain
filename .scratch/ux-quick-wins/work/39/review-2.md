VERDICT: APPROVED

Re-review round 2 of Issue 39, fixes in `git diff 5e49f3d4c..HEAD` (commit edbe81cb8), worktree `brain.worktrees/issue-39-readable-chips-faded-text`.

## Previous findings

| # | Severity | Status | Evidence |
|---|----------|--------|----------|
| 1 | major | rejection stands (deferred to deliver) | No app change in edbe81cb8; nothing on the branch can do a by-eye check, and round 1's own fix text allows "if nobody can look, say so in the squash commit and in the report to the owner". The Resolution commits deliver to that. The criterion stays not met until the owner looks; see finding 1 below, which carries the obligation to deliver. |
| 2 | nit | resolved | `color-presets.test.ts:59-80` `chipFailures(textFor)` builds lane, plain card and every `COLOR_PRESET_BG` card per theme, used by both tests (`:82-84` requires `[]` for `COLOR_PRESET_CHIP_TEXT`, `:86-89` requires at least one failure for `mixColors(COLOR_PRESET_TEXT[tag], editorFg, 0.6)`, i.e. a 40% preset share). A change to the stack now reaches both. The guard no longer pins Lavender Haze by name, which is acceptable: it still proves the stack can fail at 40% (round 1's probe: min 3.98). |
| 3 | nit | resolved | `color-presets.ts:32-36` JSDoc drops the ratio claim and the caller list and points at the enforcing test. Code unchanged (`30%` mix toward `var(--editor-fg)`). |

## Acceptance criteria re-checked

- [met] Failing test first, `src/tests/lib/utils/color-presets.test.ts` (real `contrastRatio`, `flatten`, `mixColors` from `utils/color.ts`): for every tag preset on both built-in themes, chip text against the flattened real stack is at least 4.5:1. The stack is the tag tint at 15% over (a) `--background` (an uncoloured card) and (b) each card preset at 15% over `muted` at 30% over `editorBg` (a coloured card on its lane). It fails today (yellow on Lavender Haze 1.57) and would also fail at a 60% share (4.00), which proves the stack is the real one. — the refactor keeps the same stack (`flatten(ui.background, editorBg)` and each `COLOR_PRESET_BG` over `muted`@30% over `editorBg`) with the real utils, every `BUILTIN_THEMES` entry and every preset; main test passes with no failures, the 40% guard passes with failures > 0; `pnpm vitest run src/tests/lib/utils/color-presets.test.ts` (with the other targeted files) exit 0.
- [not met] Frontend gate: pnpm check and pnpm vitest run pass. jsdom was not checked for `color-mix` in inline styles: the tests read the `style` attribute. The by-eye check on both themes is recorded in the commit. — `pnpm check` exit 0 (237 files, 0 errors, 0 warnings); targeted vitest exit 0; the full suite is deliver's to run. The by-eye check is still not done; deliver must state that in the squash commit's Behavior section (finding 1).

## Checks run

- `pnpm check`: exit 0, 0 errors, 0 warnings.
- `pnpm vitest run` on `src/tests/lib/utils/color-presets.test.ts`, `src/tests/lib/plugins/kanban/KanbanView.test.ts`, `src/tests/lib/features/collection/CollectionLinearCalendarView.svelte.test.ts`, `src/tests/lib/features/rail-shell/Rail.test.ts`, `src/tests/lib/features/rail-shell/rail-items.logic.test.ts`: exit 0, 5 files, 389 passed, 55 skipped.
- Fix diff touches only `color-presets.test.ts`, the `color-presets.ts` JSDoc and `review.md`: no test weakened or deleted (the guard now covers more stacks), no scope creep, no layer-baseline or `BASELINE_SIZE` change.

## Findings

1. minor, `.scratch/ux-quick-wins/issues/39-readable-chips-faded-text.md` (gate criterion; carried from round 1 finding 1): the by-eye check on KokoBrain Default and Lavender Haze (kanban chips on plain and coloured cards, linear-calendar bars, Inbox badge) has not been done and cannot be done headless. Fix: in deliver, the squash commit's Behavior section and the report to the owner say the check was not done and the owner still has to look.

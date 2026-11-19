# 53: Default theme: bold and italic off the link blue

**Origin:** split from Issue 40 on 2026-11-18 (its old items 3 and 4 and criterion (c)), after its first run blocked. Design review 2026-11-17, proposal P20 (the Default `inlineFg` part), prototype `.scratch/design-review/prototypes/color-contrast-theming.html`, research `.scratch/ux-quick-wins/research/verdict-color.md` (Q2). The blocked run's analysis is in `.scratch/ux-quick-wins/work/40/discovery.md` on branch `issue/40-default-theme-darker-tab-strip-visible` (commit f284370f1).

**Owner decision needed.** The original plan deletes `inlineFg: '#93c5fd'` from Default (`src/lib/core/settings/theme.logic.ts:141`), so `emphasis` and `strong` derive to `fg` (`theme-builder.logic.ts:220,262`). Default has no `editorFg` override, so bold then equals body text (`#F8F8F2`), and the Issue 05 test "draws bold text in its own color, apart from body text and every heading, in every built-in theme" (`src/tests/lib/core/settings/theme-builder.logic.test.ts:161-168`) fails. Pick one:

1. **Bold may match body text on Default.** Keep the plan and change the Issue 05 test so Default may draw bold in the body colour (for example, require only that bold differs from every heading and from the link hues). This reverses "bold apart from body" for Default.
2. **Bold keeps its own colour, off the link hue.** Keep the Issue 05 rule and give Default an `inlineFg` that is neither the link hue nor `fg`: at least 12 `colorDistance` from `link` (`#60a5fa`) and from `wikilink.target` (`#a78bfa`), and 4.5:1 on `editorBg`. A warm or neutral light tint is one example.

**What to build (after the decision):**

1. **Bold and italic off the link blue.** Change Default's `inlineFg` as decided (delete it for option 1, set the new value for option 2). Set the static `--syntax-emphasis` and `--syntax-strong` (`src/app.css:292-293`) to match. Both tokens are read only by `highlight-styles.ts` and `canvas-markdown.css`, so this changes a value and reworks no decoration. Lavender Haze is unchanged (distance 15.8).
2. **`colorDistance`.** Add `colorDistance(a, b)` (OKLab, scaled by 100) to `src/lib/utils/color.ts` for the test below.

Not in this ticket: the tab strip and hover (Issue 40); the section-title and calendar-weekend parts of P20 (shell-sidebars-ux 05 and ticket 28).

**Size:** S.

**Blocked by:** 40

**Status:** needs-info

**Gate:** pnpm check + pnpm vitest run.

- [ ] Owner decision recorded in Comments (option 1 or 2, and for option 2 the chosen value).
- [ ] Failing test first, `src/tests/lib/core/settings/theme-builder.logic.test.ts` over `BUILTIN_THEMES`: `colorDistance(strong, link)`, `colorDistance(emphasis, link)` and `colorDistance(strong, wikilink.target)` are each at least 12 (10.7 on Default today).
- [ ] `colorDistance` unit test in `src/tests/lib/utils/color.test.ts`: equal colours give 0; `#93c5fd` against `#60a5fa` gives about 10.7.
- [ ] The snapshot (`src/tests/lib/core/settings/__snapshots__/theme-snapshot.test.ts.snap`), `theme.logic.test.ts` and `theme.service.test.ts` move on purpose to the new `--syntax-strong` and `--syntax-emphasis`; with option 1 the Issue 05 test changes as decided, with option 2 it stays green unchanged.
- [ ] Frontend gate: pnpm check and pnpm vitest run pass.

## Problem

On Default, bold, italic and wikilink targets all draw `#93c5fd`, next to the link colour `#60a5fa`, so emphasis looks clickable.

## Evidence

- `theme.logic.ts:141` (`inlineFg`); `app.css:292-293` (`--syntax-emphasis`, `--syntax-strong`).
- `theme-builder.logic.ts:220` (`const inlineFg = p.inlineFg ?? p.fg`), `:262` (`emphasis: inlineFg, strong: inlineFg`).
- `theme-builder.logic.test.ts:161-168`, added by Issue 05 (9e35d2524): bold must differ from `ui.editorFg` in every built-in theme.

## Comments

- 2026-11-18, split from Issue 40 while the owner was away; waits for the owner's pick above.

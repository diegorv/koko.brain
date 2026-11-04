VERDICT: APPROVED

## Acceptance criteria

- [met] Failing first, in `src/tests/lib/core/markdown-editor/extensions/live-preview/styles.test.ts`: a `radiusOf(selector)` helper next to `fontFamilyOf` (built on the existing `themeRules()`), and `it.each` cases asserting the blocks and controls above emit `border-radius: var(--radius-md)` and the chips and small parts emit `border-radius: var(--radius-xs)`. They fail before the change — `radiusOf` sits right after `fontFamilyOf` (styles.test.ts:26-29) and goes through `exactRule()` -> `themeRules()`; two `it.each` tables (styles.test.ts:31-65) list all 12 md selectors and all 9 xs selectors named in the Issue. Every one of those 21 rules held a px literal on main (each changed line in `git diff main...HEAD` is `-borderRadius: 'Npx'`), so each case returns a px string or undefined there and fails; the exact-selector match keeps `.cm-lp-image` off `.cm-lp-image-wrapper`.
- [met] The radius-scale ratchet reports exactly the two callout popover literals left in `styles.ts` — baseline lowered 23 -> 2 (radius-scale.test.ts:203); `grep -n radius styles.ts` shows the only px values left are `.cm-lp-callout-type-popover` :497 (6px) and `.cm-lp-callout-type-option` :509 (4px); the ratchet's `toEqual` passes.
- [met] The code block header's corners still follow the block (it relies on `overflow: hidden`, `.scratch/ux-polish/work/radius.md` section 4 quick win 6): checked in the app or a screenshot, noted in the commit — `.cm-lp-codeblock` keeps `overflow: hidden` (styles.ts:295) and `.cm-lp-codeblock-header` has no radius of its own; I viewed `/tmp/issue22-shot/codeblock.png` (emitted lp.css + widget header/pre markup, real `--radius: 0.625rem` from app.css:184): the red header background is clipped at the 8px top corners. Commit 6beb220e3 body's Behavior paragraph records the check.
- [met] No other property in `styles.ts` changes; no decoration, widget or `toDOM()` code is touched — the styles.ts diff is 21 `borderRadius` value lines and nothing else; the branch touches no other `src/lib` file.

## Findings

1. nit — src/tests/lib/core/markdown-editor/extensions/live-preview/styles.test.ts:60: the comment "Nested inside the --radius-md queryjs block, so one step smaller" is inaccurate; the ladder is xs/sm/md (app.css:97-99), so xs is two rungs below md. Fix: say "a smaller rung" (or "two steps smaller"), or drop the count.

## Checks run by this review

- `taskpolicy -c background pnpm vitest run src/tests/lib/core/markdown-editor/extensions/live-preview/styles.test.ts src/tests/lib/radius-scale.test.ts`: exit 0, 2 files, 79 tests passed. The test verdict rests on these two files (the test files of the only source file changed, plus the ratchet the diff edits).
- `taskpolicy -c background pnpm check`: exit 0, 0 errors, 0 warnings.
- No other test asserts these selectors' radii: `grep` over `e2e` and `src/tests` finds only kb-ui and collection methods assertions, unrelated to styles.ts.
- Full suite and `pnpm build`: not run, deliver's to run.
- No layer-baseline or composition-root change. Commit subject has no `(Issue NN)` suffix.
- Not a finding: the copy button at 8px reads almost as a pill on its 0.7em label (visible in the screenshot); the Issue specifies `var(--radius-md)` for it.

## Resolution

1. Fixed: the comment at styles.test.ts:60 now reads "a smaller rung" instead of "one step smaller".

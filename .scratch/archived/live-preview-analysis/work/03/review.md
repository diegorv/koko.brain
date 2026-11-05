VERDICT: CHANGES_REQUESTED

# Review: Issue 03, headings have a single size owner

Reviewed `git diff main...HEAD` at a10c99da (branch `issue/live-preview-analysis-03-single-heading-size`, base c89a634c).

## What I ran

- `pnpm vitest run src/tests/lib/core/markdown-editor/highlight-styles.test.ts src/tests/lib/core/markdown-editor/extensions/live-preview/inline/ src/tests/lib/core/markdown-editor/setup`: 17 files, 219/219 pass.
- Same two changed test files with `highlight-styles.ts` restored from `main` (then restored to HEAD): 9 fail (1 in highlight-styles.test.ts, 8 in pipeline-dom.test.ts), so the new tests do catch the bug.
- `pnpm check`: 0 errors, 0 warnings.
- `bash scripts/e2e.sh e2e/specs/live-preview/headings.spec.ts e2e/specs/live-preview/source-mode.spec.ts`: 14/14 pass.
- Temporary E2E probe (deleted, not committed): open `# Heading 1 / ## Heading 2 / ### Heading 3`, press Cmd+K (source mode), read the computed font size and line box of each line, on `main`'s `highlight-styles.ts` and on HEAD.

The test verdict rests on `src/tests/lib/core/markdown-editor/highlight-styles.test.ts`, `src/tests/lib/core/markdown-editor/extensions/live-preview/inline/pipeline-dom.test.ts` and `e2e/specs/live-preview/headings.spec.ts`, plus the source-mode probe above.

## Acceptance criteria

- [x] **Computed H1-H6 sizes recorded before and after in the commit message.** Met. fdd48b50 carries the table (line size, text before/after, line box before/after) for H1, H2, H3 and H4-H6, measured in the E2E app at a 14.7px base.
- [x] **Only one rule sets heading font size; a test or style assertion pins it.** Met for live preview. `highlight-styles.ts:20-22` no longer sets `fontSize`. `pipeline-dom.test.ts:128-140` asserts exactly one mounted rule per level sets the size and that it matches the `.cm-lp-hN` line, and `:142-166` asserts no font-size rule reaches an element inside a heading line. `highlight-styles.test.ts:34-45` pins the HighlightStyle side. All fail on the old code (verified above). Source mode is the exception (finding 1): there the change leaves no owner at all.
- [x] **Heading line height is the same with and without the cursor on the line.** Met. `headings.spec.ts:89-100` compares the line box with the cursor off and on for H1-H6 (passes). The jsdom cursor variants pin it structurally. Note that this criterion already held before the fix (the build report measured equal heights on main too), so the E2E test guards against regressions and does not reproduce the original bug.

## Findings

1. **Medium, regression: source-mode headings lose their size.** `src/lib/core/markdown-editor/highlight-styles.ts:20-22`.
   Source mode installs no live-preview extensions (`live-preview.ts:110-112`), so no `cm-lp-hN` line class exists there. The HighlightStyle `fontSize` was the only size owner in source mode, and there it did not compound. Measured with the probe:

   | Source mode | main | HEAD |
   |---|---|---|
   | `# Heading 1` text / line box | 30.25px / 49.13px | 14.7px / 24.25px |
   | `## Heading 2` | 23.78px / 38.78px | 14.7px / 24.25px |
   | `### Heading 3` | 18.70px / 30.66px | 14.7px / 24.25px |

   On main, source mode already rendered headings at exactly the configured size, so the old behaviour was correct there. The Issue asked to remove the duplicate owner in live preview. It did not ask to make source-mode headings body-sized, and the build agent flagged the change without a user decision. It is a visible change on a first-class mode (Cmd+K and the toolbar toggle).
   **Fix:** give source mode its own single owner and leave live preview as it is now. Add a source-mode-only HighlightStyle that sets just `fontSize: 'var(--heading-hN-font-size, <same fallback as .cm-lp-hN>)'` for `tags.heading1`-`heading3` (and 4-6 if you want them to follow user settings, which `.cm-lp-h4`-`h6` already do). Install it through `sourceModeExtensions()` in `setup/editor-extensions.ts:70-72`, so the Cmd+K compartment swaps it in and out, and update that function's JSDoc. Each mode then has exactly one owner. Source mode has no cursor reveal, so its line height cannot depend on the cursor. Update the `markdownHighlight` JSDoc (`highlight-styles.ts:13-18`) to name both owners.
   Tests: in `src/tests/lib/core/markdown-editor/setup/editor-extensions.test.ts` (or pipeline-dom), mount `HEADINGS` with `sourceModeExtensions()` and no live preview, and assert that exactly one mounted rule matches the H1 heading span and sets font-size with `--heading-h1-font-size`. Keep the existing live-preview tests green; they mount without `sourceModeExtensions()`, so the source-mode rule's class never lands on a live-preview span. Extend the E2E (`source-mode.spec.ts`) to check that the H1 text in source mode is larger than body text. Record the source-mode numbers in the fix commit.
   If the fix agent judges that body-size headings in source mode are intended, that is a product decision. It must not happen silently: the Issue would then go `ready-for-human` instead.

2. **Low, test robustness: exact float equality on the line box height.** `e2e/specs/live-preview/headings.spec.ts:98`.
   `expect(on).toBe(away)` compares two `boundingBox().height` floats exactly. The build report saw a 0.34px H3 difference with a fallback monospace font, caused by CodeMirror's baseline-aligned `cm-widgetBuffer` next to the hidden `### `. On a machine without the app fonts this can fail even though the behaviour is correct. No change required. If it flakes, report the font and do not loosen it silently: a sub-pixel tolerance would hide a real cursor-dependent shift.

3. **Info: the decorator kill-switch also drops heading size.** With `heading` in `settingsStore.disabledDecorators`, live-preview headings render at body size. This is acceptable for a troubleshooting switch and is documented in the commit. No action.

## Scope and rules

- Layering is fine: the change stays in `core/markdown-editor`, with no new imports.
- Tests were updated for every changed source file. Comments are JSDoc with no session narration, and the code uses tabs.
- No scope creep: `styles.ts` is unchanged, which matches the plan (it was already the owner).
- `git status` was clean after my probes. All probe files were removed and `highlight-styles.ts` was restored to HEAD.

## Resolution

1. **Fixed.** `sourceHeadingSize` (a HighlightStyle that sets only `fontSize: var(--heading-hN-font-size, <same fallback as .cm-lp-hN>)` for H1-H6) is installed through `sourceModeExtensions()`, so the source-mode compartment swaps it in and out and each mode has one size owner. Both JSDocs updated. Tests: `editor-extensions.test.ts` asserts exactly one font-size rule matches each source-mode heading line (and none after leaving source mode); `highlight-styles.test.ts` pins the rule set; `source-mode.spec.ts` checks that the H1 text is larger than body text after Cmd+K. Source-mode sizes after the fix match main: H1 30.25px / 49.13px line box, H2 23.78px / 38.78px, H3 18.70px / 30.66px, H4 14.7px / 24.25px.
2. **No change**, as the review allows. The exact equality passed locally; if it flakes, report the font rather than adding a tolerance.
3. **No action** (info).

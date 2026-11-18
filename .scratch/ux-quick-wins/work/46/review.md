VERDICT: APPROVED

Reviewed `git diff main...HEAD` (f1298078e, 6bc35d2c7, 4d20be0b0) in the worktree.

## Acceptance criteria

- [met] Failing test first, `src/tests/lib/core/markdown-editor/setup/editor-extensions.test.ts` (real CodeMirror view via `mountMarkdownView`, as the file does): in source mode `---\n_type: Meeting\n---\n# Title` puts `cm-source-frontmatter` on lines 1 to 3 and not on line 4; live preview puts it on none; the mode compartment swap toggles it. The `legacyClasses` helper (`:459-465`) gains a `frontmatter` count on purpose, so its four `toEqual` assertions (`:470,479,490,493`) gain the key. — `editor-extensions.test.ts:461-521`: `legacyClasses` has `frontmatter`, all four `toEqual` carry it (3 / 0 / 3 / 0, the compartment swap pair at :490-494), new tests assert `[true,true,true,false]` in source mode and 0 marks in live preview, all through `mountMarkdownView(createExtensions(...))`. Test-first is the build's claim (discovery commit precedes the feat commit; the test and source landed in one commit, so ordering is not provable from history); the assertions fail without `sourceFrontmatter()` wired, since nothing else emits the class.
- [met] No class for a doc that does not start with `---`, for an unclosed fence, or for a body `---` after the block; typing the closing fence adds the class and deleting it removes it. — `source-frontmatter.test.ts:46-72` covers empty doc, line 1 not a fence, unclosed fence, body `---` after the block, and the type/delete round trip with real dispatches.
- [met] The new theme has a rule for `.cm-source-frontmatter` and its spans with `font-weight: normal` and `var(--syntax-meta)`, asserted by collecting the rule strings from the exported extension (the approach of `themeRules()` in `live-preview/styles.test.ts`). — `source-frontmatter.ts:56-62` `EditorView.baseTheme`; `source-frontmatter.test.ts:32-39,105-113` collects rule strings exactly like `styles.test.ts:11-18` and asserts the combined selector, `font-weight: normal`, `color: var(--syntax-meta)` and `font-size: inherit`.
- [met] The decoration is not rebuilt on a selection-only or scroll-only update (spy on the builder or count decoration objects across a selection change). — `source-frontmatter.ts:41-45` rebuilds only on `docChanged`; `source-frontmatter.test.ts:76-103` checks `DecorationSet` identity across a real selection dispatch, a viewport-only `update()`, and a change on a doc edit (the positive control that makes the identity checks meaningful, since `RangeSetBuilder.finish()` returns a new set).
- [met] `e2e/specs/live-preview/source-mode.spec.ts` and `e2e/specs/source-mode-toggle.spec.ts` pass. Owner eye check: a typed note in source mode, light and dark, including a note with a long frontmatter. — I ran `bash scripts/e2e.sh e2e/specs/live-preview/source-mode.spec.ts e2e/specs/source-mode-toggle.spec.ts`: exit 0, 7 passed, including the new case that measures the YAML span at body size and weight 400 in a real browser (the cascade win over `sourceHeadingSize`). The owner eye check is the owner's to do and is still outstanding; `--syntax-meta` is defined in `.dark` (`src/app.css:300`) and every theme sets it via `themeColorsToCssVars` (`theme.logic.ts:26`), so light themes have a value.
- [met] Frontend gate: pnpm check and pnpm vitest run pass. — `pnpm check`: exit 0, 0 errors, 0 warnings. Targeted vitest (see below): exit 0. The full `pnpm vitest run` is deliver's to run.

## Checks I ran

- `pnpm check`: exit 0, 236 files, 0 errors, 0 warnings.
- `pnpm vitest run src/tests/lib/core/markdown-editor/extensions/source-frontmatter/source-frontmatter.test.ts src/tests/lib/core/markdown-editor/setup/editor-extensions.test.ts src/tests/lib/core/markdown-editor/extensions/live-preview/parsers src/tests/lib/architecture`: exit 0, 44 files, 749 tests passed. The test verdict rests on these files: the two the diff adds or changes, the parser tests of the reused `findFrontmatterBlock`, and the architecture/layer tests (the new folder imports only from `core/` siblings, no baseline change).
- E2E as above: exit 0, 7 passed.
- Worktree clean after the runs.

## Spec and scope

- `.scratch/ux-quick-wins/spec.md` does not exist; nothing to check against.
- Scope matches the Issue: new folder with `source-frontmatter.ts` + `index.ts` in the callout shape, reuse of `FRONTMATTER_FENCE_RE` and `findFrontmatterBlock` with no new parser, wired after `calloutDecoration()` in `sourceModeExtensions()` only, theme in its own file, nothing in `live-preview/styles.ts` or `frontmatter-field.ts`. No layer-baseline or composition-root change.
- Specificity claim checked: `baseTheme` prefixes rules with its scope class, giving `.ͼ1 .cm-source-frontmatter span` (0,2,1) against the single highlight class (0,1,0); the E2E case confirms it in a browser.

## Findings

1. minor — `src/lib/core/markdown-editor/extensions/source-frontmatter/source-frontmatter.ts:18` — On every doc change in a note whose line 1 is `---` (every typed note), `getAllLines` allocates a `Line` for every line of the document only so `findFrontmatterBlock` can scan to the closing fence, which on a closed block is usually within the first 10 lines. This matches `frontmatterField` (`frontmatter-field.ts:14`) and the Issue asks for `findFrontmatterBlock` reuse, so it is not a regression against live preview, but source mode had no per-keystroke whole-doc pass before. Fix (optional): pass `findFrontmatterBlock` only the lines up to the first closing fence (walk `doc.line(i)` until `FRONTMATTER_FENCE_RE` matches, then hand that slice), or accept it as in live preview.
2. nit — `src/tests/lib/core/markdown-editor/extensions/source-frontmatter/source-frontmatter.test.ts:90` — The scroll-only case calls `plugin.update()` with a hand-cast `{ docChanged: false, viewportChanged: true } as ViewUpdate`, so it checks the branch, not a real scroll. Acceptable in jsdom (no layout to scroll); no change needed unless a real-viewport helper exists.
3. nit — `src/lib/core/markdown-editor/extensions/source-frontmatter/source-frontmatter.ts:56-62` — The span rule also recolours wikilinks and any other highlighted token inside the frontmatter to `--syntax-meta` (underline stays). The build report names this; it follows from the selector the Issue specifies. Flag it for the owner's eye check rather than change it.
4. nit — `e2e/specs/live-preview/source-mode.spec.ts:93` — The new case waits with `waitForTimeout(150)` after the toggle; it matches the file's existing pattern, and the following `toHaveCount(3)` auto-waits, so it is not flaky in practice.

## Resolution

1. Not changed. The finding is accurate (getAllLines allocates a Line per doc line on each doc change when line 1 is a fence), and the review offers accepting it as live preview does. `frontmatterField` (`frontmatter-field.ts:14`) pays the same cost on every doc change in live preview, the default mode, without a reported slowdown, and the Issue asks for `findFrontmatterBlock` reuse. Bounding the scan is better done once for both callers in a follow-up than here, where a source change would also need another review round.
2. No change, as the review says.
3. No change: the selector is the one the Issue specifies. Left for the owner's eye check (wikilinks inside frontmatter take `--syntax-meta`; the underline stays).
4. No change, as the review says.

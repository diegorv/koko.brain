# Issue 46 discovery: Frontmatter reads as metadata in source mode

Checked at `5747ead9d`.

## Files that change

- New `src/lib/core/markdown-editor/extensions/source-frontmatter/source-frontmatter.ts` + `index.ts` (shape of `extensions/callout/callout.ts` + `index.ts`).
- `src/lib/core/markdown-editor/setup/editor-extensions.ts:99-107` `sourceModeExtensions()`: add `sourceFrontmatter()` after `calloutDecoration()`; import next to `:22`.
- `src/tests/lib/core/markdown-editor/setup/editor-extensions.test.ts:444-495`: `DOC` gains a frontmatter block, `legacyClasses` (`:459-465`) gains `frontmatter`, the four `toEqual` gain the key; new line-level test on `---\n_type: Meeting\n---\n# Title`.
- New `src/tests/lib/core/markdown-editor/extensions/source-frontmatter/source-frontmatter.test.ts`: edge cases, typing/deleting the fence, theme rules, no rebuild on selection or scroll.

## Plan

1. Builder: when `doc.lines >= 2` and line 1 matches `FRONTMATTER_FENCE_RE` (cheap early exit for most notes), run `findFrontmatterBlock(getAllLines(state))` (the same input `frontmatter-field.ts:13-18` gives it) and add `Decoration.line({ class: 'cm-source-frontmatter' })` on lines `openIdx..closeIdx`. Whole-doc, not `visibleRanges`: the block is at the top and its range does not depend on the viewport.
2. `ViewPlugin` rebuilds only on `update.docChanged` (no `viewportChanged`, unlike callout), so pure scroll and selection keep the same `DecorationSet`.
3. `sourceFrontmatterStyles = EditorView.baseTheme({ '.cm-source-frontmatter, .cm-source-frontmatter span': { fontSize: 'inherit' on spans / body size, fontWeight: 'normal', color: 'var(--syntax-meta)' } })`. Specificity: baseTheme emits `.ͼ1 .cm-source-frontmatter span` (0,2,1), the HighlightStyle heading span class is (0,1,0), so it wins without `!important`.
4. `sourceFrontmatter()` returns `[plugin, styles]`; export the plugin and the styles for the tests.

## Prior art

- `mountMarkdownView` + `withFullParse` (`test-helpers.ts`) as in the legacy decoration tests.
- `themeRules()` in `live-preview/styles.test.ts:11-18` (JSON.stringify the baseTheme, collect `{` strings).
- No-rebuild: compare `view.plugin(plugin).decorations` identity across a selection dispatch, and across a direct `update()` with a viewport-only `ViewUpdate` shape.

## Risks

- Cascade: if the span rule loses to the heading highlight the giant line stays; the theme test asserts the selector and values, the specificity argument above covers the win, the owner eye check confirms.
- Cost: a fence-started doc builds the full line array per doc change, same as live preview's `frontmatterField`; no work on scroll or selection.
- Wikilinks inside frontmatter take the meta colour (the span rule is the one the Issue names); underline stays.

## Defaults taken

- Font size on the line is the body size it already has; spans use `font-size: inherit` so nested heading spans collapse to the line's size (an `em` value would compound in nested spans).
- No live-rules guard (`isPureScroll`) import: the plugin is source-only and gates on `docChanged` alone.

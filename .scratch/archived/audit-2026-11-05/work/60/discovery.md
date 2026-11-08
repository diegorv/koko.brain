# Issue 60 discovery: live preview paints no active-line background

## Where the fill comes from

- `src/lib/core/markdown-editor/setup/editor-extensions.ts:146` installs `highlightActiveLine()` in both modes, outside every compartment. It adds the `cm-activeLine` line class.
- `src/lib/core/markdown-editor/setup/editor-theme.ts:52-54` paints `.cm-activeLine` with `var(--syntax-active-line)` (an `EditorView.theme`, so it outranks base themes of equal specificity).
- `@codemirror/view` 6.43.15 base theme also paints it (`&dark .cm-activeLine: #99eeff33`), so dropping the app rule alone would not clear it.
- `src/lib/core/markdown-editor/extensions/live-preview/styles.ts:287, 344, 611, 739, 834, 855, 988`: `livePreviewStyles` (a `baseTheme`, installed only through `livePreviewExtensions`) already sets `transparent !important` for seven `.cm-activeLine:has(<widget>)` cases.

## Plan (smallest change)

- Add one `'.cm-activeLine': { backgroundColor: 'transparent !important' }` rule as its own `EditorView.theme` (`livePreviewActiveLineTheme` in `styles.ts`), pushed by `livePreviewExtensions` (`live-preview.ts:101`). Source mode keeps `editor-theme.ts:52` untouched.
- Not inside `livePreviewStyles`: tried first, and the source-mode test failed. A base theme's rules are scoped to `ͼ1`, a class every editor carries, and StyleModule never unmounts them, so once a live-preview editor mounts the rule clears source mode too. An `EditorView.theme` scope class leaves the editor when the compartment drops it.
- Delete the seven `:has(...)` rules: in live preview the blanket rule sets the same `transparent !important` on a superset of their elements; in source mode there are no widgets for them to match.
- Keep `highlightActiveLine()` in both modes. The class is the cursor-line locator in E2E specs that run in live preview (`e2e/fixtures/click-reveal.ts:128-133` `activeLineText`, `click-reveal/frontmatter.spec.ts:46,61-62`, `horizontal-rule.spec.ts:33,40`, `wikilink-anchors.spec.ts:65,80,99`, `editor-state-persistence.spec.ts:23`, `event-calendar-tasks.spec.ts:59`). Moving `highlightActiveLine` into `sourceModeExtensions` would break all of them.

## Tests

- `src/tests/lib/core/markdown-editor/setup/editor-extensions.test.ts`: new `active-line background` block, modeled on the `heading font size has one owner per mode` block (mount through `createExtensions`, toggle with `editorModeEffects`). jsdom 30 resolves the cascade, so `getComputedStyle(.cm-activeLine).backgroundColor` reads the winning value: `transparent` in live preview, `var(--syntax-active-line)` in source mode, and both after a mode toggle. The live-preview cases fail at HEAD (`var(--syntax-active-line)`).

## Risks

- `!important` beats any later stylesheet. There is no user CSS snippet feature. The blanket rule also clears the tint of the blockquote (`.cm-lp-blockquote`, `-2`, `-3`) and callout (`.cm-lp-callout`) line decorations, which sit on the same element, so `livePreviewActiveLineTheme` restores each tint with a `.cm-activeLine.cm-lp-<class>` rule (`backgroundColor` longhand, `!important`). Those values must stay in step with the `livePreviewStyles` rules.
- `.cm-activeLineGutter` is untouched: live preview has no gutter line numbers (`sourceModeExtensions` owns `highlightActiveLineGutter`).

## Defaults taken

- "Drop it in live preview" over "only while focused": the criterion asks for no background in live preview at all.
- Optional "skip leading blank lines when placing the cursor" is not done (not a criterion).

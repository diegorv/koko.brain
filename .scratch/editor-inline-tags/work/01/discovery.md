# Issue 01 discovery: inline #tag pill + Cmd+click tag search

No spec.md for this feature; the Issue is the spec.

## Files that change
- `src/lib/utils/tag-extraction.ts:2,102-105` - export `findInlineTags(text)` returning `{ from, to, tag }` (from = the `#`, to = end of the tag without trailing `/`), built on the existing `INLINE_TAG_REGEX`; `extractInlineTags` uses it. One copy of the rule.
- `src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/tag-handler.ts` (new) - `LineHandler` `tag`: `findInlineTags(line.text)`, skips lines inside frontmatter (`frontmatterSlice(doc)` end, computed once per build through `scratch`), skips matches that overlap an `InlineCode` or `Comment` node on the line. Pushes `tagDeco` (`cm-lp-tag`) only; no reveal, no replace.
- `inline/inline-extensions.ts:42-47` - add `tagHandler` to `PRODUCTION_LINE_HANDLERS` (always on, like inline comments: not in `TOGGLEABLE_HANDLERS`).
- `live-preview/styles.ts:16-17, ~203` - `tagDeco` + `.cm-lp-tag` theme rule (`var(--accent)` bg, `var(--accent-foreground)` text, small radius, small padding).
- `live-preview/click-handler.ts` - `handleLivePreviewTagMousedown(e, view, mac)`: primary button + `isOpenLinkModifier`, `closest('.cm-lp-tag')`, pos from `view.posAtDOM`, tag read by re-running `findInlineTags` on the doc line (not `textContent`), `preventDefault`, `host.openTagSearch(tag)`, returns true. `livePreviewClickHandler.mousedown` tries tag then link.
- `core/markdown-editor/editor-host.ts:36-75` - `openTagSearch(tag): void` on `EditorHost`, no-op in `NOOP_HOST`.
- `src/lib/app/editor-host.ts:85` - `openTagSearch: (tag) => openSearch(`tag:${tag}`)` (app/ already imports features; core/ does not, baseline unchanged).
- `help/documentation/07-sidebar-panels.md:94-134` - Tags section: body tags show as pills, Cmd+click opens tag search.

## Tests (prior art to copy)
- `src/tests/lib/utils/tag-extraction.test.ts` - `findInlineTags` offsets, nested, trailing `/`, rejects.
- `src/tests/.../live-preview/inline/handlers/tag-handler.test.ts` (new) - `build()` helper from `inline-comment-handler.test.ts` (real `buildInlineDecorations`).
- `src/tests/.../live-preview/click-handler.test.ts` - fake event/view pattern, mac/non-mac modifier matrix.
- `src/tests/lib/app/editor-host.test.ts` - `openTagSearch` sets `searchStore.query` and the Search rail item (real stores).
- `inline-extensions.test.ts` - line handler list contains `tag`.

## Risks / defaults taken
- "Another modifier falls through": same rule as the link handler (`isOpenLinkModifier`), so Alt/Shift-only clicks and mac Ctrl+click fall through; Cmd+Shift is not specially rejected (matches links).
- Known divergences from the indexer, both pre-existing in the inline pipeline: lines in an `HTMLBlock` are never decorated (the plugin skips block contexts), and `~~~` fences are skipped by Lezer but not stripped by the indexer regex. Not changed here.
- A tag inside a `[[link|display #x]]` gets both marks; Cmd+click handler order picks the tag. Rare.
- Padding on a mark split by nested marks repeats per fragment; kept small.

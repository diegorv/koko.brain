# 158: An image embed with a WIDTHxHEIGHT size (300x200) applies both the width and the height

**Origin:** `audit-2026-11-05` Issue 42, moved here on 2026-11-08. Its PRD, raw evidence and closed siblings stay in `.scratch/audit-2026-11-05/`. Bare Issue numbers in the text below use that feature's numbering; `priority-2026-11-08.md` in this folder maps them to the numbers here.

**What to build:** `parseWidth` (src/lib/core/markdown-editor/extensions/live-preview/plugins/wikilink-embed-plugin.ts:19-23) does `Number(display)`, which is NaN for `300x200`, so the embed gets no size at all. `WikilinkImageEmbedWidget` (widgets.ts:561-590) has only a width field. Parse `W` and `WxH` the way `parseImageAlt` does for standard images (plugins/image-plugin.ts:28-42), add a height to the widget, include it in `eq()`, and apply it as ImageWidget does (widgets.ts:149-153).

**Blocked by:** none

**Status:** ready-for-agent

**Gate:** frontend only: `pnpm check` + `pnpm vitest run`.

- [ ] Failing test first, in src/tests/lib/core/markdown-editor/extensions/live-preview/plugins/wikilink-embed-plugin.test.ts: build decorations for 'text\n![[photo.png|300x200]]\nmore' with the cursor off the line, and assert that the WikilinkImageEmbedWidget has width 300 and height 200. It fails today.
- [ ] src/tests/lib/core/markdown-editor/extensions/live-preview/widgets/wikilink-image-embed-widget.test.ts: toDOM sets maxWidth 300px and height 200px, and eq() is false when only the height differs.
- [ ] `![[photo.png|300]]` keeps today's width-only behavior, and a non-numeric display such as `|caption` still sets no size.
- [ ] Gate: pnpm check and pnpm vitest run pass.

## Notes

- **Priority:** daily use and UI correctness (bucket 2-ux). Upheld ux/low. Only the documented WxH form is affected, and only display size changes.
- **Trigger:** The user sizes an image embed with width and height, `![[photo.jpg|300x200]]`, as help/documentation/04-markdown.md:196-201 and 05-wikilinks.md:39,116 document. The image renders at its natural size.
- **Evidence (verified by reading code at `5f8003d67`):** src/lib/core/markdown-editor/extensions/live-preview/plugins/wikilink-embed-plugin.ts:19-23 Number('300x200') is NaN, so parseWidth returns null; :80-83 passes only width to the widget; widgets.ts:561-590 has no height field and eq() compares target and width; plugins/image-plugin.ts:28-42 parseImageAlt already parses WxH for standard images; help/documentation/05-wikilinks.md:39,116 and help/examples/markdown-editor-vault/08-images.md:66-71 document the WxH form.
- **Second opinion:** upheld (ux, low). parseWidth (wikilink-embed-plugin.ts:19-23) does Number('300x200'), which is NaN, so the embed gets no size. WikilinkImageEmbedWidget has only a width field, and its eq() compares target and width. The help (05-wikilinks.md:39,116) documents WxH. The cost is display size only. Corrections to apply while implementing: Category content -> ux.
- **Source:** audit 2026-11-05, domain `live-preview`, finding `N-live-preview-06` (from live-preview-spec-3). Size S.

## Comments

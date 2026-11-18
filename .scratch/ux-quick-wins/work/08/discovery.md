# 08 discovery: live-preview widgets show failure and progress

No `spec.md` in `.scratch/ux-quick-wins/`. Rules read: `docs/agents/live-preview-rules.md` (rule 2: `toDOM` runs again on cache hits, so every `toDOM` attaches its own `error` listener; rule 11: the table buttons keep their `mousedown` stopPropagation).

## Files that change

- `src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:146-175` `ImageWidget.toDOM`: `img.addEventListener('error', ...)` via a shared helper `showImageLoadFailure(wrapper, name, view)`: returns when `!wrapper.isConnected`, else adds `cm-lp-image-missing`, `wrapper.textContent = Could not load "<name>"` (drops the `<img>`, keeps `cm-lp-image-wrapper`), `view.requestMeasure()`. Name: `this.alt`, falling back to `this.url` when alt is empty.
- `widgets.ts:600-622` `WikilinkImageEmbedWidget.toDOM`: same listener on the resolved branch only, name = `this.target`. The unresolved `"<target>" not found` branch stays.
- `widgets.ts:461-491` `attachAddButtons`: `setAttribute('aria-label', 'Add column' | 'Add row')`; `title`, mousedown and onclick unchanged.
- `styles.ts:302-309`: `.cm-lp-image-missing` after `.cm-lp-image-wrapper` (overrides its padding): `1px dashed var(--lp-embed-error)`, `border-radius: var(--radius-xs)`, `color: var(--muted-foreground)`, padding, smaller font.
- `widgets/mermaid-widget.ts:92-100`: after the cache miss, `diagramEl.textContent = 'Rendering diagram...'` before the IIFE. Success `innerHTML` and error `textContent` replace it; cache and empty-source paths untouched.
- `widgets/code-block-widget.ts:89-101`: the write runs in an async wrapper so a missing `navigator.clipboard` (TypeError) becomes a rejection; `.then(ok -> flash('Copied!'), fail -> flash('Copy failed'))`, `flash` resets to `Copy` after 1500 ms.
- `e2e/specs/live-preview/misc-features.spec.ts:108-122`: route the URL to a stub PNG (copied from `click-reveal/image.spec.ts:17-27`); new test routes another URL to 404 and sees `.cm-lp-image-missing` with "Could not load".

## Tests

- `widgets/image-widget.test.ts`, `widgets/wikilink-image-embed-widget.test.ts`: append wrapper to `document.body`, `img.dispatchEvent(new Event('error'))`; detached wrapper: dispatch, nothing changes, no throw.
- `styles.test.ts:62`: add `.cm-lp-image-missing` to the `--radius-xs` list.
- `widgets/mermaid-widget.test.ts`: `render` mocked once with a deferred promise; placeholder while pending, gone + SVG after resolve; cached path has no placeholder; empty source unchanged (existing test).
- `widgets/code-block-widget.test.ts`: `Object.defineProperty(navigator, 'clipboard', ...)` with a `writeText` mock (DOM API, allowed to mock); fake timers; rejecting, missing, success. Vitest fails the run on an unhandled rejection.
- `table-widget.test.ts:84-88`: aria-label + title on both buttons.

## Defaults taken

- ImageWidget name falls back to the URL when alt text is empty (`![](url)`).
- "In the embed error colour" read as the dashed border colour; the text is `--muted-foreground`.
- The file:// no-asset-URL branch (`applyFileSrc`) keeps its current behaviour (class only, no text): not in the Issue.
- No style for the mermaid placeholder: the diagram container already centres it.

## Risks

- `doc-edge-widgets.spec.ts` and `embed-widgets.spec.ts:71-74` count `.cm-lp-image-wrapper`; an error keeps that class, so they hold.

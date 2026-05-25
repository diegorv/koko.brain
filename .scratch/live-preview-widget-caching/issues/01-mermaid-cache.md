Status: done

# Cache mermaid widget renders across viewport cycles

## What to build

MermaidWidget.toDOM() currently fires `mermaid.render()` (async, 50-200ms per diagram) every time the widget scrolls into viewport. CodeMirror destroys widget DOM on viewport exit and calls toDOM() fresh on re-entry regardless of eq(). This causes visible jank scrolling through documents with mermaid blocks.

Add a module-level live-DOM cache following the pattern established by queryjs (`queryjsSessionStore.resultCache`). On cache hit, re-attach the existing HTMLElement instead of re-rendering. On cache miss, render and store the result. Invalidate when the source content changes.

The queryjs widget in `queryjs-block-widget.ts` + `queryjs-session.store.svelte.ts` is the reference implementation. Key design points from that pattern:
- Cache holds the LIVE element, not a clone (preserves SVG render state)
- Key is a content hash of the mermaid source
- Cache is module-scoped (survives widget destruction)

## Acceptance criteria

- [ ] Mermaid diagrams render once and are re-attached from cache on viewport re-entry
- [ ] Changing the mermaid source in the code block invalidates the cached element and re-renders
- [ ] No duplicate mermaid temp elements left in document.body after cache re-attach
- [ ] Manual test: open a document with 3+ mermaid blocks, scroll them in/out of viewport, confirm no re-render flash or jank
- [ ] Unit test for cache hit/miss logic if a store is introduced

## Blocked by

None - can start immediately

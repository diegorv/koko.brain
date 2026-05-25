Status: ready-for-agent

# Cache block math widget renders across viewport cycles

## What to build

BlockMathWidget.toDOM() calls `katex.renderToString()` on every viewport re-entry. While katex is typically fast (< 5ms per formula), the pattern violates the documented rule against expensive toDOM() work, and the cost adds up in documents with many math blocks.

Add a live-DOM cache following the same pattern as issues 01 and 02. Cache key is the formula string. On cache hit, re-attach the rendered element. On cache miss, render via katex and cache.

Lowest priority of the three widget cache issues since the per-render cost is small.

## Acceptance criteria

- [ ] Math blocks render once and are re-attached from cache on viewport re-entry
- [ ] Changing the formula in the source invalidates the cache and re-renders
- [ ] Manual test: open a document with 5+ math blocks, scroll them in/out, confirm no re-render flash
- [ ] Error state (invalid LaTeX) still displays correctly after cache miss

## Blocked by

None - can start immediately

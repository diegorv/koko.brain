# Live-DOM cache remediation (block-math, mermaid, collection)

Live-preview widgets that cache the rendered ELEMENT (keyed by content, guarded
by `!cached.isConnected`) can hand the same DOM node to two widgets when an
identical block appears twice in content CodeMirror builds detached (initial
mount assembles the whole doc detached; new lines are built detached before
insertion). The shared node is moved to the last widget and earlier occurrences
render blank. Proven on main with a real-EditorView test: a duplicated
`$$x^2$$` renders 1 element instead of 2. The same mechanism was fixed for
inline-math on the PR #133 branch by caching sanitized HTML strings instead of
live nodes.

QueryJS is deliberately NOT in scope: its cache must keep the live element so
`<canvas>` / `<video>` / `<iframe>` state survives re-mount (CLAUDE.md
performance rule 9); its `!isConnected` guard stays as partial mitigation.

## Tasks

- [x] Task 1: block-math-widget — cache the sanitized KaTeX HTML string instead
      of the element; regression tests incl. EditorView mount with a duplicated
      `$$...$$` block (multi-line form — the lezer parser rejects single-line
      `$$x$$`; RED proven against the element cache: 1 of 2 blocks rendered)
- [x] Task 2: mermaid-widget — cache the sanitized SVG markup (after id strip)
      instead of the container; cache hits fill a fresh container synchronously;
      tests with a mocked mermaid module (jsdom cannot run real mermaid)
- [x] Task 3: collection-block-widget — cache the query DATA (view +
      QueryResult) instead of the container and rebuild the DOM on every
      toDOM(); row/pill/bar click listeners must stay live, so HTML-string
      caching is not applicable here; widget-level tests with the real
      collectionStore
- [x] Task 4: update the CLAUDE.md performance note — mermaid/collection no
      longer use the live-DOM re-attach pattern (queryjs remains the only
      live-element cache)

## Notes

- Expensive work that stays cached per widget: KaTeX render + sanitize
  (block-math), mermaid parse + render + sanitize (mermaid), executeQuery over
  the property index (collection). DOM (re)construction is cheap and now runs
  per toDOM().
- Collection calendar views recompute "today" on every render after this change
  (previously frozen into the cached element until invalidation) — a
  correctness improvement, not a regression.
- Cache keys and invalidation are unchanged: `clear*Cache()` on vault teardown,
  collection's `yamlContent|indexSize` key, mermaid/math keyed by source text.

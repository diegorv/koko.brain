# 08 discovery: queryjs result cache correctness

No `spec.md` exists for ui-responsiveness; the Issue is the spec.

## Files that change

- `src/lib/plugins/queryjs/queryjs-session.store.svelte.ts:37-114` - key results on file + text: `hasResult/getResult/setResult/invalidate(filePath, jsContent)`; drop paths (`invalidate`, `clearResults`, `reset`, `setResult` overwrite) destroy the charts of a dropped element that is detached; add `holdsResult(el)` for the widget.
- `src/lib/plugins/queryjs/queryjs-charts.ts` (new) - `trackChart(canvas, chart)` (WeakMap) + `destroyChartsIn(root)`; keeps the store free of the kb-ui / Chart.js import.
- `src/lib/plugins/queryjs/kb-ui.ts:666` - `trackChart(canvas, new ChartCtor(...))`.
- `src/lib/plugins/queryjs/queryjs-block-widget.ts:88-219` - pass the `filePath` captured in `toDOM` into the cache lookup, `execute(container, filePath)` (replaces `editorStore.activeTabPath` at :196), the Run / retry buttons and `setResult`; add `destroy(dom)` that destroys the charts of a result no longer in the cache. Doc comments at :14-59 updated.
- `src/tests/lib/app/boot.test.ts:214-244`, `src/tests/lib/core/trash/trash.service.test.ts:368-631` - new two-arg store API.
- `docs/adr/0010-queryjs-kb-api-caching.md` - dated amendment (2026-11-03): key = file + text, Chart.js disposal; fix stale line 46 (`clearResults()`, not `reset()`), line 29/31 shape.
- `CLAUDE.md` live-preview rules 9 and 10 (`Map<filePath + content, HTMLElement>`, `hasResult(filePath, jsContent)`).

## Plan (test-first)

1. Widget test: two files, same text, script `kb.el('p', kb.current().file.path)` under `always`; render A, detach, switch tab to B, render: B shows B's path (fails today: cache hit returns A's element).
2. Widget test: `toDOM` for A under `always`, switch active tab to B before `getVaultEntries` resolves; the rendered path is A's (fails today).
3. Store test: a result whose container holds a tracked chart calls `destroy()` when dropped via `invalidate` / `clearResults` / `reset`; a connected element is not destroyed by the store (it is still on screen), the widget's `destroy(dom)` handles it once CodeMirror removes it.
4. Implement, update ADR + CLAUDE.md, run targeted checks.

## Prior art

- `src/tests/lib/plugins/queryjs/queryjs-block-widget.test.ts` (jsdom, real stores, mocked invoke).
- `src/tests/lib/plugins/queryjs/kb-ui.test.ts:6-13` mocks `chart.js/auto`; add a `destroy` spy there.
- `src/tests/fixtures/vault-entries.fixture.ts` `entryV2`.

## Risks / defaults taken

- Destroying charts of a result dropped while it is still on screen (every save fires `clearResults`) would blank a visible chart. Default: the store only destroys detached elements; a connected one is destroyed by `QueryjsBlockWidget.destroy(dom)` when CodeMirror removes it and it is no longer cached.
- Chart tracking uses a WeakMap keyed by canvas, not `Chart.getChart`, so it works with the test mock and does not load Chart.js to dispose.
- `setResult` overwriting a different element of the same key (two identical blocks in one note) destroys the old one only when detached.
- A chart created after its result was already dropped (script still awaiting) is not covered; rare and recoverable.

# 03 discovery: QueryJS results dropped on every save

## Files that change

- `src/lib/plugins/queryjs/queryjs-session.store.svelte.ts:46-153`: new `staleResults: Set<filePath + jsContent>` (same `resultKey`). `clearResults()` (the content-invalidation path, `queryjs-ports.ts:15` via `invalidateQueryjsCache`) moves every dropped key into it; `setResult` removes its key; `invalidatePath(filePath)` drops the path's keys (tab close / delete, keeps the set bounded by open notes); `reset()` empties it. New `isStale(filePath, jsContent)` + `staleResults` getter.
- `src/lib/plugins/queryjs/queryjs-block-widget.ts:136-139` (`toDOM` cache miss): under `first-open`, a block whose key is stale auto-runs again (no mark needed: the file is already marked). `manual` unchanged (never auto-runs), `always` unchanged. Doc comments at :15-34 and the policy matrix :61-89 updated.
- Docs: ADR 0010 amendment (policy matrix row "cache miss after invalidation"), `docs/agents/live-preview-rules.md` rule 10, `help/documentation/13-queryjs.md:29,41`.

## Plan (smallest change)

Of the Issue's three options, "re-run blocks that were already on screen": a block that had a result before the save re-runs lazily, only when CodeMirror draws it again (the hub on return). Nothing runs at save time, so no cost elsewhere. A block whose text was edited has a new key, not stale, so it still shows ▶ Run (ADR 0010 "cache miss after edit", the reason the per-block first-open marker was rejected in the 2026-11-03 amendment). "Invalidate only blocks whose inputs changed" is not possible: a script's inputs are arbitrary `kb.*` reads. A per-block override would add fence syntax, which ADR 0010 rejected.

## Tests (test-first)

- `src/tests/lib/plugins/queryjs/queryjs-block-widget.test.ts` describe "first-open marks the file after the render pass" (~l.217, same setup): a block that ran, then `invalidateQueryjsCache()` (the real listener), re-mounted after the render pass, auto-runs with no ▶ Run (fails today). Edited text after invalidation still shows ▶ Run; manual stays ▶ Run.
- `src/tests/lib/plugins/queryjs/queryjs-session.store.test.ts` `clearResults` / `reset` / `invalidatePath` / `setResult`: stale tracking per key.

## Risks

- In the note being edited, a block CodeMirror re-creates after a save (scrolled back in, cursor left it unchanged) now re-runs instead of showing ▶ Run: the `always` cost, limited to blocks that already ran. Scrolling while typing in a chart-heavy note re-runs charts after each autosave.
- A stale block whose re-run throws stays stale, so it re-runs on each re-mount until it succeeds (as under `always`).

## Defaults taken

- Step 0 (try `autoRunQueries: "always"` in the live vault) cannot run here; the run was launched for this Issue, so the app change is built. Status `needs-info` is left for deliver/main session.
- Manual mode keeps ▶ Run for stale blocks (manual means never auto-run).

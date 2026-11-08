VERDICT: APPROVED

## Acceptance criteria

- [met] Before moving: the existing tests of each moved module pass at the old path; record the count — `work/20/discovery.md` records 146 tests at the old paths (quick-switcher 15, copy-block-link 28, folder-notes 15, backlinks 36, tags 52). I recounted the `it(` calls in each file on `main` and got the same five numbers. I did not re-run the old paths myself. The moved source is byte-identical: three whole-file moves at R100/R095 (the R095 differs only in its import lines), and `diff` shows `tag-extraction.ts` matches `main:tags.logic.ts:3-127`. The test bodies are also identical (a sorted diff of old vs new with import lines stripped is empty for both splits). So the old-path pass rests on the recorded run plus unchanged code.
- [met] After moving: the same tests pass at the new path with only import lines changed (`git diff -M` shows renames) — `git diff -M --name-status main...HEAD` shows R100 for file-entries.logic.ts and folder-notes.logic.ts and R095 for copy-block-link.logic.ts (import lines only). It shows R097/R097/R098 for the three test files, again import lines only. A verbose vitest run at the new paths gives file-entries 15, folder-notes 15, copy-block-link 28, wikilink-resolution 20 + backlinks 16 = 36, tag-extraction 33 + tags 19 = 52, all passing. The two splits cannot show as renames, but their test bodies are unchanged (see above).
- [met] `grep -rnE "#lib/features/(quick-switcher/quick-switcher.logic|backlinks/backlinks.logic|copy-block-link/copy-block-link.logic|folder-notes|auto-move/auto-move.types)" src/lib/core` is empty — I ran it in the worktree: no output, exit 1.
- [met] `src/lib/features/search` no longer imports `features/tags`, and `utils/tag-extraction.ts` imports nothing outside utils — `grep -rn "features/tags" src/lib/features/search` returns nothing (exit 1). `search.logic.ts:2` now imports `#lib/utils/tag-extraction.js`. `tag-extraction.ts` has no `import` lines at all.
- [met] CLAUDE.md's features list drops folder-notes, and the issue-04 baseline and `featureCycleEdges` shrink by exactly the removed lines (search<->tags leaves `featureCycleEdges`) — CLAUDE.md:67 no longer lists folder-notes, and `src/lib/features/folder-notes/` is gone. `layer-baseline.json` goes from 57 to 44 entries with no `+` lines in the diff, and BASELINE_SIZE is now 44. `featureCycleEdges` goes from 33 to 23 with no additions, and FEATURE_CYCLE_EDGES_SIZE is now 23. `search -> tags` is removed. `tags -> search` legitimately stays, because it is still on the cycle `search -> rail-shell -> type-definitions -> properties -> tags -> search`: the ratchet's `stale` check passes with it listed. The `unlisted`, `stale` and members checks all pass, so the removals match exactly what left the cycle. No composition root was added (`scripts/` is untouched).

## Other checks

- Typecheck: `pnpm check` exit 0, with 0 errors and 0 warnings.
- Targeted vitest (`./node_modules/.bin/vitest run ...`) exit 0: 217 files, 5160 passed, 1 skipped, 1 todo. My test verdict rests on these files:
  - `src/tests/lib/architecture/` (layer-rules, feature-cycle, import-graph, pure-logic)
  - The new-path tests: `src/tests/lib/core/filesystem/{file-entries,folder-notes,wikilink-resolution}.logic.test.ts`, `src/tests/lib/core/markdown-editor/copy-block-link/`, `src/tests/lib/utils/tag-extraction.test.ts`
  - The test dirs of the touched features: `src/tests/lib/features/{tags,backlinks,auto-move,copy-block-link,note-list,rail-shell,search,collection,quick-switcher,properties}`
  - Core: `src/tests/lib/core/settings`, `app-lifecycle.service.test.ts`, `tauri-listeners.service.test.ts`, `src/tests/lib/core/markdown-editor/extensions/wikilink`, `src/tests/lib/core/markdown-editor/extensions/live-preview`
  - Plugins: `src/tests/lib/plugins/{graph-view,kanban,queryjs}`
  - `src/tests/help`
- The full suite (`pnpm vitest run && pnpm build`) and the E2E belong to deliver; I did not run them.
- e2e mock probe: `tsc --ignoreConfig --noEmit` on `e2e/mocks/vault-index.ts` resolves every rewritten import. Its one error, TS2741 `organized` missing at line 231, is in code this diff does not touch, so it predates this change.
- The worktree was clean after the test run (the featurePairs sync rewrote nothing).

## Findings

1. minor — src-tauri/src/vault/index.rs:45 (also index.rs:65 and :157, entry.rs:8, :145 and :299, parsing.rs:73, :311, :353, :433 and :506, task.rs:124) — These Rust doc comments still say `tags.logic.ts` / `backlinks.logic.ts` is where `getNoteName`, `resolveWikilinkCached`, `buildResolutionCache`, `extract*Tags`, `findTopLevelKey` and `extractAllTags` live, but those functions have moved. The comments are now wrong. Fix: point them at `core/filesystem/wikilink-resolution.logic.ts` and `utils/tag-extraction.ts`. This can be a later doc-only commit. Behaviour is unaffected, so it does not block.
2. minor — docs/adr/0004-file-type-separation.md:33 — This line still lists `buildResolutionCache` and `resolveWikilinkCached` under `backlinks.logic.ts`. The line was already stale for other names, but this diff makes it wrong for these two as well. Fix: move them to a `wikilink-resolution.logic.ts` line, or file a follow-up.
3. nit — src/lib/features/quick-switcher/QuickSwitcher.svelte:11 — The rewritten `#lib/core/...` import sits after the local `./quick-switcher.store.svelte` import, against the CLAUDE.md import grouping. The file was already out of order before this diff. Fix: move the line above the local import when the file is next touched.
4. nit — src/lib/core/filesystem/wikilink-resolution.logic.ts:1 — `getNoteName` and `resolveWikilink` have no JSDoc, which CLAUDE.md requires on exported functions. They had none in `backlinks.logic.ts` either, so the move did not cause this. Fix: add one-line JSDoc in a follow-up.

## Resolution

All four findings accepted and fixed in the deliver step:

1. Fixed: the twelve named Rust doc comments in `index.rs`, `entry.rs`, `parsing.rs` and `task.rs` now point at `core/filesystem/wikilink-resolution.logic.ts` and `utils/tag-extraction.ts` (line-number suffixes dropped). Comments naming functions that still live in `backlinks.logic.ts` / `tags.logic.ts` (`parseWikilinks`, `buildTagTree`, `findLinkedMentions*`, ...) were left alone.
2. Fixed: ADR 0004 line 33 no longer lists `buildResolutionCache` / `resolveWikilinkCached` under `backlinks.logic.ts` and names `core/filesystem/wikilink-resolution.logic.ts` for them.
3. Fixed: the `#lib/core/filesystem/file-entries.logic.js` import in `QuickSwitcher.svelte` now sits above the local `./` import. The rest of the file's pre-existing ordering was not touched.
4. Fixed: one-line JSDoc added to `getNoteName` and `resolveWikilink`.

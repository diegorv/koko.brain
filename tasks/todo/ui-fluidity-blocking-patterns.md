# UI Fluidity: Eliminate Main-Thread Blocking Patterns

## Context

Analysis of `src/` revealed several synchronous operations that iterate over the full note index during user interaction paths (typing, tab switching, view rendering). On vaults with 1000+ notes, these cause visible jank/stuttering. This plan addresses verified issues ordered by user impact — HIGH priority items affect typing and active view rendering, MEDIUM items affect less frequent operations (rename, external changes).

## Tasks

### HIGH Priority (user interaction paths)

- [x] Task 1: Cache formula ASTs in `collection.logic.ts` `executeQuery()`
  - **File:** `src/lib/features/collection/collection.logic.ts:69-83, 114-122`
  - **Problem:** `parse(formulaExpr)` is called for every record x every formula. Same for `evaluateFilter` which calls `parse()` per record per filter string. With 100 records and 5 formulas = 500 redundant parses.
  - **Fix:** Pre-parse all formula ASTs into a Map before the record loop. Add a `parseCache: Map<string, AST>` for `evaluateFilter` to avoid re-parsing the same filter expressions per record.
  - **Test:** `src/tests/lib/features/collection/collection-logic.test.ts`

- [x] Task 2: Replace O(n) `resolveWikilink` with O(1) cached version in kanban service
  - **File:** `src/lib/plugins/kanban/kanban.service.ts:40-77`
  - **Problem:** Uses `resolveWikilink()` (O(n) linear scan) + `flattenFileTree()` (O(n) tree walk) + dynamic imports. Called per kanban card with wikilink.
  - **Fix:** Replace dynamic imports with static imports. Use `noteIndexStore.noteContents.keys()` + `buildResolutionCache()` + `resolveWikilinkCached()` for O(1) lookup. Remove `flattenFileTree` dependency entirely.
  - **Test:** Create `src/tests/lib/plugins/kanban/kanban.service.test.ts` if not exists

- [ ] Task 3: Merge `buildGraphData()` into single pass
  - **File:** `src/lib/plugins/graph-view/graph-view.logic.ts:11-65`
  - **Problem:** Two full passes over noteIndex (first collects directed edges, second builds links). Can be merged: track `directedEdges` set and a `linkMap` by canonical key in one pass, flip `bidirectional` flag when reverse edge is encountered.
  - **Fix:** Single-pass algorithm using `linkMap: Map<string, GraphLink>` and `directedEdges: Set<string>` simultaneously. Accept optional `prebuiltCache` parameter.
  - **Test:** `src/tests/lib/plugins/graph-view/graph-view.logic.test.ts`

- [ ] Task 4: Yield to event loop in `updateIndexesForFile()`
  - **File:** `src/lib/core/app-lifecycle/index-updater.service.ts:25-37`
  - **Problem:** 8 sequential synchronous index updates block the main thread for 30-100ms after every typing pause (1s debounce). Includes O(n) `buildResolutionCache`.
  - **Fix:** Make async, split into 3 phases with `await new Promise(r => setTimeout(r, 0))` between them:
    - Phase 1 (immediate): `updateIndexForFile` (needed by downstream phases)
    - Phase 2 (after yield): `buildResolutionCache` + `updateBacklinksForFile` + `updateOutgoingLinksForFile`
    - Phase 3 (after yield): remaining 5 lightweight updates
  - Add staleness guard: skip phases 2/3 if `editorStore.activeTabPath` no longer matches.
  - **Test:** `src/tests/lib/core/app-lifecycle/index-updater.service.test.ts` — update to handle async + fakeTimers

### MEDIUM Priority — deferred (not in this plan)

Tasks 5-8 (parallel file reads, Map copy avoidance, parallel rename I/O, reverse index for rename) are documented but deferred to a future plan.

## Verification

For each task:
1. Run `pnpm check` (TypeScript)
2. Run `pnpm vitest run` (all frontend tests)
3. Verify specific test file passes for the changed module
4. For Tasks 1-4 (HIGH): manually test in dev mode with a vault of 500+ notes to confirm no stutter

## Notes

- Each task is independently committable and testable
- No Web Workers — all fixes use standard browser APIs (setTimeout, Promise.all/allSettled)
- False positives excluded from plan:
  - `updateActiveTabLinks()` — already uses O(k) reverse index, `buildResolutionCache` is just O(n) Map construction (~2ms for 5000 files)
  - `findLinkedMentions` — already has `findLinkedMentionsFromReverse` O(k) path
  - Search `performSearchOverFiles` — only used as fallback when FTS5 unavailable
  - Unlinked mentions — already deferred to panel visibility + save/tab-switch only

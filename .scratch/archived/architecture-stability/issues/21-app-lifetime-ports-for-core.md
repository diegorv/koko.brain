# 21: App-lifetime ports for core's remaining service-level reaches

**What to build:** Three small inversions, plus the first `src/lib/app/` file:

1. **Content invalidation.** Add `registerContentInvalidationListener(name, fn)` and `notifyContentInvalidated()` in `core/filesystem/note-change.service.ts`, next to the owner, and document it in CLAUDE.md Indexing item 6 as a signal, not a second owner of note bytes. It replaces the direct `backlinksStore.markUnlinkedDirty()`, `clearLinkedContentCache()` and `invalidateQueryjsCache()` calls in editor.hooks.ts (71, 85, 86) and trash.service.ts (260-262). In `notifyAfterSave`, the single notify call goes after `applyNoteChange`. The watcher-handler call sites stay: that file moves to `app/` in issue 22, where direct imports are allowed.
   - Why not an existing registry: `registerNoteChangeConsumer` fires on debounced `edit` keystrokes (unlinked mentions must only recompute on save and tab switch), skips consumers on a `save` dedupe hit, is per file, and is never called by `rebuildAllIndexes`. `addAfterSaveObserver` covers saves only and is wiped by `resetHooks`.
2. **Write barrier.** Add `core/vault/write-barrier.service.ts` with `registerWriteBarrier` and `drainPendingWrites`. Only vault.service.ts:16 needs it; app-lifecycle:183 and tauri-listeners:65 move to `app/` in issue 22.
3. **Unresolved wikilinks:** not here. Issue 31 removes the periodic-notes imports through `host.createNote`.
4. **Path-change consumers.** Register `PathChangeConsumer`s for the view parse cache and for the quick-switcher recents. They replace path-change.service.ts:172 and 176-177. The view-cache consumer receives one call per folder, so it needs a prefix-aware `clearViewParseCacheUnder`; today line 172 already evicts children inside the `[from, ...childPaths]` loop. The bookmarks import (:9) stays until sidebar 24 removes it.

`src/lib/app/boot.ts` exports an idempotent `registerAppPorts()`, called synchronously at the top of the `src/routes/(app)/+layout.svelte` script, not inside an `$effect`. None of these registrations go into the vault-lifetime unregister list.

**Blocked by:** 20, 34

**Status:** resolved

**Gate:** `pnpm check` + `pnpm vitest run` + `pnpm build` + `bash scripts/e2e.sh`

**Source:** src/lib/core/{editor/editor.hooks.ts,trash/trash.service.ts,app-lifecycle/watcher-handler.service.ts,vault/vault.service.ts,filesystem/path-change.service.ts}, CLAUDE.md "Removing or Refactoring Code" and Indexing item 6, docs/adr/0003

- [x] Regression tests are written and green BEFORE the change, with real stores:
  - a save sets `backlinksStore.unlinkedDirty`, and a watcher batch and a trash restore do the same
  - `switchVault` waits for an in-flight event-calendar write
  - renaming a folder that holds two `.view` files evicts both cached definitions (a characterization test: it passes before and after)
  - rename and delete drop the old path and its children from `quickSwitcherStore.recentPaths`
- [x] Each test also passes after `teardownVault()` followed by a second `initializeVault()`
- [x] For every removed direct call, the commit carries the CLAUDE.md sentence "A at file:line updated X; B at file:line updates X via Y"
- [x] editor.hooks.ts, trash.service.ts and vault.service.ts lose their `features/`/`plugins/` imports; path-change.service.ts loses all but the bookmarks import; calling `registerAppPorts()` twice registers each listener once
- [x] The write-barrier regression test keeps issue 34's save-before-switch order
- [x] `layer-baseline.json` and `featureCycleEdges` (issues 04-05) shrink by exactly the edges this issue removes, in the same commit
- [x] Existing tests that exercise these paths (e.g. `trash.service.test.ts:401,469`) call `registerAppPorts()` in their setup, with no assertion weakened

## Notes

- **Hazard 1: registration lifetime.** Init entry (app-lifecycle.service.ts:162-171) unregisters the vault-lifetime registrations BEFORE `saveAllDirtyTabs` and `drainEventCalendarWrites`. So any port that replaces an unconditional call must live for the whole app.
- **Hazard 2: `resetHooks()`** empties `afterSaveObservers`, so the ports need their own modules.
- **Hazard 3: path-change consumers run synchronously after `diskOp`.** That is earlier than today. It is safe for evictions, but the consumers must handle folder prefixes.
- **Vault-switch save bug:** confirmed by reading and split out as issue 34.
- **Review:** this changes behaviour, so it needs the post-delivery adversarial review.
- **Size:** M.

## Comments

- 2026-11-01, branch `issue/21-app-lifetime-ports-for-core`: core's remaining service-level reaches into features/plugins now go through app-lifetime ports wired once by `app/boot.ts::registerAppPorts()`: a content-invalidation signal (backlinks unlinked-dirty, queryjs cache, kanban linked content), a vault-switch write barrier (event-calendar drain), and path-change consumers for the view parse cache and quick-switcher recents. The layer baseline shrank by 7 (BASELINE_SIZE 44 -> 37). Review round 1: APPROVED, with 1 minor and 3 nits. The minor finding and the first nit (path-change consumer lifetimes, the save-bullet call site) were fixed in docs. The other two nits needed no change. Full suite: 399 files, 9557 passed, 1 skipped, 1 todo, `pnpm build` ok (exit=0), `pnpm check` 0 errors.

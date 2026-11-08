# Issue 21 discovery

## Files that change

- `src/lib/core/filesystem/note-change.service.ts`: add `registerContentInvalidationListener(name, fn)` + `notifyContentInvalidated()` (own module-level list, untouched by `resetHooks` / teardown).
- `src/lib/core/editor/editor.hooks.ts:1-3,71,85-86`: drop the backlinks / queryjs / kanban imports and calls; one `notifyContentInvalidated()` after `applyNoteChange` in `notifyAfterSave`.
- `src/lib/core/trash/trash.service.ts:18-20,260-262`: same swap in `indexRestoredNotes`.
- `src/lib/core/vault/write-barrier.service.ts` (new): `registerWriteBarrier(name, drain)`, `drainPendingWrites()` (sequential, rejections propagate like the direct await did).
- `src/lib/core/vault/vault.service.ts:5,20`: `drainEventCalendarWrites()` -> `drainPendingWrites()`, import dropped.
- `src/lib/core/filesystem/path-change.service.ts:9,172,176-177`: `clearViewParseCache` loop call and the dynamic quick-switcher import go; both become registered `PathChangeConsumer`s. (No bookmarks import exists in this file any more: nothing to keep.)
- `src/lib/features/type-definitions/view-parse-cache.ts`: add `clearViewParseCacheUnder(path)` (exact + `path + '/'` prefix).
- `src/lib/app/boot.ts` (new): idempotent `registerAppPorts()` wiring backlinks dirty flag, `invalidateQueryjsCache`, `clearLinkedContentCache`, the calendar drain barrier, the two path-change consumers. Guarded by a module flag.
- `src/routes/(app)/+layout.svelte`: call `registerAppPorts()` synchronously next to `configurePropertiesDiagnostics`.
- `src/tests/lib/architecture/layer-baseline.json` + `BASELINE_SIZE` (see below).
- CLAUDE.md Indexing item 6: one sentence on the content-invalidation signal.

Baseline lines removed: editor.hooks->backlinks.store, editor.hooks->kanban.service, path-change->quick-switcher.store, path-change->view-parse-cache, trash->backlinks.store, trash->kanban.service, vault.service->event-calendar.service = 7, so BASELINE_SIZE 44 -> 37. `featureCycleEdges` holds feature->feature pairs only; these are core->feature edges, so it shrinks by zero (no change).

## Plan

1. Regression tests first, green on current code, in `src/tests/lib/app/boot.test.ts` (jsdom; mocks only Tauri, `svelte-sonner`, debug, and `drainEventCalendarWrites` as in issue 34's tests). Each case runs twice: as is, and after real `initializeVault` -> `teardownVault` -> `initializeVault` (a spike confirmed real init runs with only Tauri mocked). Cases: save / watcher batch / trash restore set `unlinkedDirty` and clear the queryjs cache; `switchVault` waits for the drain, save before drain before path change; folder rename with two `.view` files evicts both; rename and delete drop the path + children from `recentPaths`.
2. Ports + boot.ts + call-site swaps, one commit per inversion, adding `registerAppPorts()` to the test setups that need it (boot.test.ts, trash.service.test.ts, fs.service.test.ts, vault.service*.test.ts, deep-link tests, editor.hooks.test.ts if any assertion needs it).
3. Idempotency test: two `registerAppPorts()` calls -> drain called once per switch, `markUnlinkedDirty` / `removeRecentPath` once per event (passthrough `vi.spyOn`, store stays real).

## Prior art

- `src/tests/lib/core/vault/vault.service.switch-save.test.ts` (issue 34), `trash.service.test.ts:380-470`, `fs.service.test.ts:840-895`.

## Risks / defaults

- Path-change consumers now run right after `diskOp`, before `refreshTree` (Hazard 3); evictions only, prefix-aware, so safe.
- Watcher-handler call sites stay (issue 22). `app-lifecycle:183` and `tauri-listeners:65` keep their direct drain (issue 22).
- Default: `notifyContentInvalidated` isolates listener failures (logs), like the other registries.

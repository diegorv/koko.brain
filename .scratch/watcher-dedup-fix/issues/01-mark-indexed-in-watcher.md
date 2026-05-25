Status: done

# Add markIndexed to watcher incremental update path

## What to build

The watcher incremental path in `watcher-handler.service.ts` calls the TS-side updaters (`updateNoteInIndex`, `updateFrontmatterIconForFile`, `updateCalendarForFile`) but does not call `markIndexed()` from `index-dedupe.ts` afterward. The deletion path at line 144 correctly calls `clearIndexedEntry()`, creating an asymmetry.

This means when the content-effect (1s debounce) fires shortly after the watcher for the same file, `isAlreadyIndexed()` returns false and the TS updaters re-parse unnecessarily (~5-15ms of wasted work per file).

Fix: add `markIndexed(result.path, result.content)` after the three TS updater calls (after the existing line 122). Import `markIndexed` from `$lib/utils/index-dedupe`.

## Acceptance criteria

- [ ] `markIndexed` is called after the TS updaters in the watcher incremental path
- [ ] Existing `index-dedupe.test.ts` still passes
- [ ] Add a test case verifying that after watcher-style update, `isAlreadyIndexed` returns true for the same (path, content) pair
- [ ] The deletion path still calls `clearIndexedEntry` (no regression)

## Blocked by

None - can start immediately

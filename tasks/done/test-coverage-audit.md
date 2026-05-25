# Test Coverage Audit: Fill Gaps in Unit + E2E Tests

## Context

Audit of `src/tests/` (255 unit tests) and `e2e/specs/` (41 specs, 150+ tests) revealed concrete gaps: 3 stores with zero test files, several stores missing getter/method coverage, 2 untested utilities, and 8+ features with no E2E coverage. This plan fills high-value gaps ordered by regression risk.

## Tasks

### Part A: Missing Unit Tests (New Files)

- [x] Task 1: Create `type-definitions.store.test.ts`
  - Source: `src/lib/features/type-definitions/type-definitions.store.svelte.ts`
  - Test: `src/tests/lib/features/type-definitions/type-definitions.store.test.ts`
  - Cover: initial state, setTypeMetadataMap, getTypeMetadata (existing + unknown), `sortedTypes` computed getter (sorted by order, empty), setEntries bumps entriesVersion, reset
  - ~9 tests

- [x] Task 2: Create `lifecycle-filter.store.test.ts`
  - Source: `src/lib/features/properties/lifecycle-filter.store.svelte.ts`
  - Test: `src/tests/lib/features/properties/lifecycle-filter.store.test.ts`
  - Cover: initial state, setArchivedPaths (updates Set + count), isArchived (hit + miss), empty Set edge case, reset
  - ~7 tests

- [x] Task 3: Create `file-history.store.test.ts`
  - Source: `src/lib/features/file-history/file-history.store.svelte.ts`
  - Test: `src/tests/lib/features/file-history/file-history.store.test.ts`
  - Cover: initial state (all 9 fields), each setter updates corresponding getter, setBackedUpTimestamps with Set, reset restores all defaults
  - ~12 tests

- [x] Task 4: Create `color-presets.test.ts`
  - Source: `src/lib/utils/color-presets.ts`
  - Test: `src/tests/lib/utils/color-presets.test.ts`
  - Cover: COLOR_PRESET_BG has 7 keys, values are rgba() with alpha 0.15, COLOR_PRESET_TEXT has same 7 keys, values are rgb(), both maps share same key set, spot-check specific values
  - ~5 tests

- [x] Task 5: Create `app-channel.test.ts`
  - Source: `src/lib/utils/app-channel.ts`
  - Test: `src/tests/lib/utils/app-channel.test.ts`
  - Cover: getBuildChannel() returns 'stable' in vitest (no define injection), return type is string
  - ~2 tests

### Part B: Missing Coverage in Existing Store Tests

- [x] Task 6: Add `relationshipBacklinks` coverage to `backlinks.store.test.ts`
  - Source getter: `backlinksStore.relationshipBacklinks` (line 13)
  - Source setter: `backlinksStore.setRelationshipBacklinks()` (line 21)
  - Source reset: clears it (line 28)
  - Add 3 tests: set updates getter, initial state check, reset clears it

- [x] Task 7: Add `externalContentSignal` coverage to `editor.store.test.ts`
  - Source getter: `editorStore.externalContentSignal` (line 49)
  - Source method: `editorStore.bumpExternalContentSignal()` (line 116)
  - Source reset: resets to 0 (line 171)
  - Add 4 tests: starts at 0, bump increments, multiple bumps are monotonic, reset returns to 0

- [x] Task 8: Add `removeRecent` coverage to `vault.store.test.ts`
  - Source method: `vaultStore.removeRecent(path)` (line 67)
  - Add 3 tests: removes vault from list, persists updated list, no-op for non-existent path

### Part C: E2E Tests (New Specs)

- [x] Task 9: Create `bookmarks.spec.ts`
  - File: `e2e/specs/bookmarks.spec.ts`
  - Uses existing `vaultPage` fixture + context menu pattern from `file-operations.spec.ts`
  - Scenarios: right-click shows Bookmark option, toggle bookmark via context menu, bookmarked file shows Remove Bookmark, removing bookmark works
  - ~4 tests

- [x] Task 10: Create `word-count.spec.ts`
  - File: `e2e/specs/word-count.spec.ts`
  - Uses existing `vaultPage` fixture
  - Scenarios: word count visible when file open, count updates on content change, shows characters + reading time, disappears when no file open
  - ~4 tests

- [x] Task 11: Create `table-of-contents.spec.ts`
  - File: `e2e/specs/table-of-contents.spec.ts`
  - Uses `vaultPage` fixture, may need settings tweak for TOC visibility
  - Scenarios: TOC shows headings from open file, TOC updates on file switch, clicking TOC heading scrolls editor
  - ~3 tests

- [x] Task 12: Create `calendar-plugin.spec.ts`
  - File: `e2e/specs/calendar-plugin.spec.ts`
  - Uses `vaultPage` fixture (calendarVisible already true in default settings)
  - Scenarios: calendar panel visible in sidebar, month navigation works, clicking day + creating daily note
  - ~3 tests

- [x] Task 13: Create `folder-notes.spec.ts`
  - File: `e2e/specs/folder-notes.spec.ts`
  - Needs custom fixture adding `Projects/Projects.md` to test vault
  - Scenarios: clicking folder with folder note opens it, clicking folder without just expands
  - ~2 tests

- [x] Task 14: Extend `search.spec.ts` with advanced scenarios
  - File: `e2e/specs/search.spec.ts` (existing)
  - Scenarios: case-sensitive toggle, whole-word toggle, search clears on Escape
  - ~3 tests

- [x] Task 15: Extend `tasks-view.spec.ts` with task interactions
  - File: `e2e/specs/tasks-view.spec.ts` (existing)
  - Scenarios: task completion toggle via checkbox, task count reflects vault content
  - ~2 tests

## Verification

After each task:
1. Run `pnpm vitest run` for unit test tasks (Part A + B)
2. Run `bash scripts/e2e.sh` for E2E tasks (Part C)
3. All new tests must pass before committing

## Notes

- `global-keybindings.test.ts` mock anti-pattern deferred -- rewrite is high-effort, moderate-value since it's a thin orchestrator. All downstream stores/services already have their own tests.
- E2E tests for graph-view, terminal, file-history, deep-link skipped -- mock limitations make them untestable or empty-state-only.
- Store tests for simple pass-through getters (outgoing-links, tags, etc.) are already adequate for their complexity level.

VERDICT: APPROVED

## Acceptance criteria

- [met] Failing test first, in a new `src/tests/lib/features/tags/TagsView.refresh.test.ts` (`TagsView.test.ts` mocks `tags.service`, so this file mocks only `@tauri-apps/api/core`, like `tags.service.test.ts`): with `tagsStore` holding a loaded tree with tag `work` and `get_all_tags_v2` left pending, mount `TagsView` and advance past the 300 ms debounce; the `work` row is still in the DOM and "Indexing tags..." is not. — `TagsView.refresh.test.ts:97-108` loads `work` through a real `buildTagIndex`, gates the next `invoke`, mounts, advances 300 ms, asserts `invoke` called twice, `isLoading` true, `work` present, loading line absent. Probe: with main's `TagsView.svelte` restored, this test and the other three refresh tests fail (4 failed, 3 passed), so the test is red without the fix.
- [met] A parent tag expanded before a refresh is still expanded after the refresh resolves with the same tree. — `TagsView.refresh.test.ts:121-144` clicks the `project` collapsible trigger, resolves the refresh with the same tree, asserts the trigger is the same DOM node and still `aria-expanded="true"`, with `alpha` rendered. Fails against main's view.
- [met] A vault with zero tags, after its first successful build, shows "No tags found" (not "Indexing tags...") while a refresh is in flight. — `TagsView.refresh.test.ts:146-157`; `hasLoaded` asserted true after an empty build; fails against main's view. The flag (not an empty-tree check) drives it: `TagsView.svelte:43`.
- [met] The header count stays visible during a refresh after the first load. — `TagsView.svelte:56` uses `!isFirstLoad`; `TagsView.refresh.test.ts:110-120` asserts `1 tag` in `.pane-toolbar` during a pending refresh; fails against main's view.
- [met] With an empty store (first load), "Indexing tags..." still shows until the IPC resolves; a failed first build leaves `hasLoaded` false and shows "No tags found". — `TagsView.refresh.test.ts:159-188` (two tests); `tags.service.test.ts:91-97` asserts `hasLoaded` false after a rejected first build. `setHasLoaded(true)` sits inside the success path only (`tags.service.ts:46`), not in `finally`.
- [met] A refresh that fails leaves the previous tree on screen; `tags.service.test.ts` "clears loading state even on IPC error" stays green, or is updated with the reason in the commit. — `TagsView.refresh.test.ts:190-204` (tree, `hasLoaded`, row and header count kept); `tags.service.test.ts:99-112` (tree, count, flag, `isLoading` false). The existing IPC-error test is unchanged in the diff and passes.
- [met] `tags.store.test.ts` covers `hasLoaded` and its `reset()`. — `tags.store.test.ts:14` (default), `:34-37` (setter), `:54,63` (reset clears it); `tags.service.test.ts:184` also checks `resetTags`.
- [met] Only Tauri is mocked; `tags.store` and `tags.logic` are real. — `TagsView.refresh.test.ts:9-11` has the only `vi.mock`, `@tauri-apps/api/core`; `call()` in `src/lib/contracts/ipc.ts:1,26` goes through that `invoke`. Service, store, logic and settings store are imported for real.
- [met] Frontend gate: `pnpm check` and `pnpm vitest run` pass. — `pnpm check` exit 0 (232 files, 0 errors, 0 warnings; the `4.9.1..HEAD` git message is a version lookup, not a check failure). `pnpm vitest run src/tests/lib/features/tags/` exit 0, 5 files, 65/65. The full suite is deliver's to run.

## Findings

1. nit, `src/lib/features/tags/tags.service.ts:46`: a `buildTagIndex` that resolves after `resetTags()` (vault close/switch with an IPC in flight) sets `hasLoaded` back to true along with the old vault's tree. This is the same pre-existing behavior as `setTagTree`/`setTotalTagCount`, which already wrote the stale tree before this change; the only new effect is that the next vault's first refresh shows that stale list instead of "Indexing tags..." until the vault-open build lands. Rare and self-correcting; no change needed for this Issue (the tasks store has a generation guard for the same race if it ever matters, `tasks.service.test.ts:263`).

## Other checks

- Test verdict rests on: `src/tests/lib/features/tags/TagsView.refresh.test.ts`, `tags.service.test.ts`, `tags.store.test.ts`, `TagsView.test.ts`, plus the fifth file in `src/tests/lib/features/tags/`, all run by me (exit 0). Mutation probe: main's `TagsView.svelte` against the new test file gives 4 failed / 3 passed, as expected; the worktree was restored (clean `git status`).
- No other source, test or e2e spec asserts "Indexing tags..." or `tagsStore.isLoading` outside the tags tests (grep over `src` and `e2e`).
- Issue point 5 (no header refresh spinner): none added. Point 4: the flag, not an empty tree, decides the loading line.
- Scope: only the tags store, service, view and their tests change, plus the workflow's `discovery.md`. No layer-baseline or composition-root change.
- Scroll position is not asserted (jsdom has no layout); it follows from the scroll container `TagsView.svelte:82` and the keyed rows staying mounted, which the same-DOM-node assertion proves.

## Resolution

1. Rejected (no change): agreed with the reviewer. The stale write after `resetTags()` predates this Issue (`setTagTree`/`setTotalTagCount` already did it); `hasLoaded` only changes which placeholder the next vault's first refresh shows, and the vault-open build replaces it. A generation guard would add complexity for a rare, self-correcting glitch.

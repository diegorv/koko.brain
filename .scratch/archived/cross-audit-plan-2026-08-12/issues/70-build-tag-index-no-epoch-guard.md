# Issue 70: `buildTagIndex` has no epoch guard, so an orphaned run rewrites the old vault's tags after teardown

Status: ready-for-agent
Phase: unplanned
Source: named as an open follow-up in commit `f5078d1b`'s Behavior paragraph (closing issue 56) and
tracked nowhere; filed by the merge-gate review of branch `issues-55-56-backlinks`

Blocked by: none

Anchoring note: every reference below is by symbol.

## What

**Verdict: confirmed by reading the two symbols.** `features/tags/tags.service.ts::resetTags` cancels
the debounced trigger and clears `isBuilding` / `pendingRebuild`, then calls `tagsStore.reset()`. It
has no way to stop a `buildTagIndex()` whose `await invoke('get_all_tags_v2')` is already in flight:

```ts
export async function buildTagIndex(): Promise<void> {
	tagsStore.setLoading(true);
	try {
		await timeAsync('TAGS', 'buildTagIndex', async () => {
			const aggregates = await invoke<TagAggregateV2[]>('get_all_tags_v2');
			...
			tagsStore.setTagTree(tree);
			tagsStore.setTotalTagCount(entries.length);
		});
	} ...
}
```

There is no snapshot of any epoch taken before the `invoke` and no check after it, so the orphaned
run writes its result into the store `resetTags()` just emptied. Because `get_all_tags_v2` reads the
process-global `VaultIndexState` with no vault parameter, that result is the PREVIOUS vault's tag
tree, and the Tags panel shows it under the new vault until the next rebuild.

`f90eb147` narrows the entry points but does not close this: it gates the step 5b `buildTagIndex()`
call on `indexBuilt`, and the `setTimeout` body re-checks `initVersion !== version` before calling.
Both checks happen BEFORE the `invoke`; nothing re-checks after it resolves. The reachable window is
a teardown landing between the call and its resolution, which is exactly what a vault switch does.

`features/tasks/tasks.service.ts::buildTaskIndex` should be audited in the same change: it is the
sibling call two lines below in step 5b, reading the same process-global index through
`get_all_tasks_v2`. Confirm whether it has a guard before deciding whether it needs one; do not
assume symmetry either way.

Severity: **low**. Self-heals on the next `vault-index-updated` bump for the new vault, and the same
switch already leaks the previous vault's data through the wider issue 54 path. It matters because it
is a second, independent producer of the same wrong state, so fixing issue 54 alone does not close it.

## How

One symbol changes: `buildTagIndex` in `src/lib/features/tags/tags.service.ts` (plus `buildTaskIndex`
if the audit above finds the same hole).

### Scope contract

- Snapshot an epoch before the `invoke` and bail after it resolves if the epoch moved, BEFORE any
  `tagsStore` write. Reuse what the repo already has rather than inventing a counter:
  `utils/inflight.ts` already carries the staleness helpers used by `backlinks.service.ts`, and
  `resetTags()` is the natural place to advance a module-local epoch since it is already the teardown
  hook. Pick one and use it consistently for tags and tasks.
- Do not skip the `finally { tagsStore.setLoading(false); }`. A bailing run must still leave the
  loading flag false.

### Explicitly must NOT change

- Do not gate on `vaultStore.indexReady`. It is false for the whole of the new vault's build, so the
  first legitimate rebuild would be dropped and the Tags panel would stay empty until the user's next
  edit.
- Do not scope by comparing tag file paths against `vaultStore.path`. `TagAggregateV2.filePaths` is a
  list, an empty vault legitimately yields no tags at all, and a path-prefix check has the nested-root
  failure mode issue 54 documents. Epoch, not content.
- Do not remove the step 5b `if (indexBuilt)` gate or the `initVersion !== version` check in the
  timer. They are `f90eb147`'s and remain correct; this guard is additive.
- Do not touch `debouncedTrigger`, `isBuilding` or `pendingRebuild` semantics in `resetTags`.

### Red-first test strategy

In `src/tests/lib/features/tags/tags.service.test.ts`, real stores only.

1. **Red case.** Mock `get_all_tags_v2` to resolve on a deferred promise. Call `buildTagIndex()`, call
   `resetTags()` while it is pending, then resolve the IPC with a non-empty aggregate list. Assert
   `tagsStore.tagTree` is empty and `tagsStore.totalTagCount` is `0` (real state, not
   `.toHaveBeenCalled()`). Confirm this fails against unmodified source.
2. **Green half (must not regress).** A `buildTagIndex()` with no intervening `resetTags()` still
   populates `tagTree` and `totalTagCount`, and still clears `loading`.
3. **Bail path leaves loading false.** Assert `tagsStore.isLoading` is `false` after the dropped run,
   so a guard placed above the `finally` goes red.

Side channel that can fake green: `tagsStore.reset()` already empties the tree, so a case that
resolves the IPC with an EMPTY aggregate list passes with and without the guard. The fixture must be
non-empty.

## Gate

- Frontend surface only: `pnpm check` + `pnpm vitest run` + `pnpm build`. No Rust change, so no
  `cargo test`. No E2E collateral.
- Stage only `src/lib/features/tags/tags.service.ts` (and `tasks.service.ts` if the audit pulls it
  in), their tests and this issue file; verify with `git diff --cached --stat`.
- One commit, full format (Context, Problem, Solution, Behavior, Files with line ranges). Adversarial
  review before the commit, per the playbook.

## Comments

VERDICT: APPROVED

## Acceptance criteria

- [met] A failing test first: a read of A held, a newer read of A that resolves and caches, then the held read resolving leaves the newer entry in the cache — `view-parse-cache.test.ts` "keeps the entry the newer read stored" (and "keeps an entry a newer read confirmed with identical bytes") are in commit c5ca5b0b, before the fix in b0049e81. Probe: with `view-parse-cache.ts` restored to `main`, the file ran 2 failed, 23 passed, and those two were the failures. With the branch source it runs 25 of 25.
- [met] Concurrent reads of different paths (the `countViewNotes` fan-out) all still cache — "caches every path of a concurrent fan-out, whatever order the reads resolve in" holds reads of A, B and C, resolves them in reverse, and asserts every path is served from the cache with no disk read. Probe: changing the per-path check to one global key (`lastReadSeq.get("g")`) makes exactly this test fail, so it tells a per-path sequence from a global one. The global epoch is not bumped on insert (`view-parse-cache.ts:44-53`).
- [met] The Issue 54 cases (a read held across an eviction, a read after the eviction, rename A -> B -> A) still pass — the describe "a read in flight across an eviction" is unchanged apart from `holdNextRead` moving to file scope. Its tests pass in the 25/25 run.

## Findings

None.

## Correctness review

- `refreshViewDefinition` takes `seq = ++readSeq` synchronously, before `await readTextFile`, so a read's start order decides which read wins. In the Issue's race, `updateViewQuery` (`type-definitions.service.ts:303-309`) writes the file and only then starts its refresh, so its read always has the higher number and reads the new bytes. If the recount's read starts earlier but actually runs after the write, it also gets the new bytes, so the skip does no harm.
- The `lastReadSeq.set` call comes before the hash-hit check, so a read that confirms the entry also records its number. The "identical bytes" test covers this: if only a real insert recorded the number, that test would fail.
- A skipped read returns its own parse and leaves the cache alone, the same as the epoch branch. Each clear function also deletes the matching `lastReadSeq` keys, so the map never holds more paths than the cache. A read held across a clear is still caught by the epoch check, which runs first.
- Only `refreshViewDefinition` writes `parseCache`. Its callers are `type-definitions.service.ts:308` and `view-lens.service.ts:22`, and no other code path writes the cache.
- Scope: the only source changes are in the two files the Issue lists. The other file is the workflow's own `work/63/discovery.md`. Added lines use tabs, and the new module state has JSDoc.

## Checks run

- `pnpm check`: exit 0, 0 errors, 0 warnings.
- `pnpm vitest run src/tests/lib/features/type-definitions/view-parse-cache.test.ts`: exit 0, 25/25.
- The test files of the changed code and its callers: `view-parse-cache.test.ts`, `type-definitions.service.test.ts`, `view-lens.service.test.ts`, `TypesNavigator.test.ts`, `RailNoteList.test.ts`, `RailNoteList.view.test.ts`, `EventCalendarSection.test.ts`, `boot.test.ts`, `app-lifecycle.service.test.ts`, `fs.service.test.ts`, `raw-write-ratchet.test.ts`. Run together: exit 0, 11 files, 386 tests passed. The test verdict rests on these files.
- The full suite and `pnpm build` (the Issue's Gate) were not run. Deliver runs them.
- Not checked: as the Issue says, the race was never reproduced in the running app. The fix is verified only at the module level, with held reads.

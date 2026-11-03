VERDICT: APPROVED

## Previous findings

| # | Severity | Status | Evidence |
|---|----------|--------|----------|
| 1 | minor | resolved | `kb-api.ts:65` adds `private _pageSet`; `ensureCache` (`:416-455`) returns it first, stores the slot hit (`:423`) or the fresh build (`:453`). The widget builds a fresh `KBAPI` per run (`queryjs-block-widget.ts:245`), and `runView` passes `this` to the view script (`kb-api.ts:398`), so one block run and its views share one set, and a re-run gets a new instance and so a fresh lookup. No stale-set path across runs. New test "a block keeps the page set it first got when a block at a newer index state runs in between" (`kb-api.test.ts`) checks `a.page(alpha)` identity, `a.pages()` identity, the `computed` write surviving, B getting a different object, and 2 builds. Traced against the pre-fix code: A's second read sees the slot at version 8, rebuilds, and the `toBe` fails, so the test is red without the fix. `_pageSet` is in `KBAPI_INTERNAL` (`kb-api-contract.test.ts:103`). The ADR 0010 amendment says the same. |
| 2 | minor | resolved | `help/documentation/13-queryjs.md:341` has one paragraph after the `mutate` example: page objects are shared until the index changes, write a field of your own, not a frontmatter key such as `status`. Accurate to the code. |
| 3 | nit | rejection stands | Memory only, bounded to one set; `teardownVault` calls `invalidateVaultEntries()`, so the next vault's entries array never matches the old key and its first block replaces the slot. No visible behavior. |
| 4 | nit | resolved | JSDoc on `PageSet.list` / `byPath` (`kb-api.ts:17-20`) and the three slot fields (`:32-39`). |
| 5 | nit | resolved | List-isolation test's `mutate` now assigns `computed = 1` and asserts `a.page('/vault/alpha.md').computed === 1`, which pins the shared page objects. No assertion was removed; the reverse/push and order/length checks remain. |

## Acceptance criteria re-checked

- [met] Failing first: two blocks at the same index version build pages once — the "build the pages once" test is unchanged and passes; with `_pageSet` the second block still takes the slot hit (`kb-api.ts:418-424`), so the one-build count holds.
- [met] A write (new entries array or a collection version bump) rebuilds the set — the two rebuild tests pass unchanged; a fresh `KBAPI` per run has `_pageSet` null, so a new key still rebuilds. The new interleave test also sees 2 builds for a version bump.
- [met] Block B's `sort` / `mutate` on its `pages()` list does not change the order or length of block A's list — `pages()` still copies `cache.list.slice()`; the strengthened list-isolation test passes with a real `mutate` write.
- [met] KBAPI firewall tests (`kbapi-firewall.test.ts`) stay green — ran it in `src/tests/lib/plugins/queryjs/`, passes.

## Checks run

- `pnpm check`: 212 files, 0 errors, 0 warnings, exit 0.
- `pnpm vitest run src/tests/lib/plugins/queryjs/ src/tests/help/`: 16 files, 749 passed, 1 todo, exit 0 (covers `kb-api.test.ts`, `kb-api-contract.test.ts`, `kbapi-firewall.test.ts`, `queryjs-block-widget.test.ts` and the help contract tests that read `13-queryjs.md`).
- Full suite and `pnpm build` not run: deliver's.
- Fix diff (`2f5e0154..HEAD`, outside `.scratch`) touches only `kb-api.ts`, its two test files, the help doc and ADR 0010. No scope creep, no weakened or deleted test, no `layer-baseline.json` / `BASELINE_SIZE` change, no `src-tauri/` change.

## Findings

None open or new.

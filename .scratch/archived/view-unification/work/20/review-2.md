VERDICT: APPROVED

## Previous findings

| # | Finding | Status | Evidence |
|---|---------|--------|----------|
| 1 | minor, `boot.test.ts`: `blockRows` forwarding not exercised | resolved | `boot.test.ts:194-202` calls `port.blockRows(matched, unlimited, definition)` on the recent-view fixture. `matched` is the plain query over `recentIndex()`, which holds `old.md` (archived), `_system/templates/t.md`, `types/Project.md` (type definition) and both `.view` files, so the assertion that exactly n1..n5 remain checks every exclusion. Setting `templates.systemFolder` to `''` and asserting `_system/templates/t.md` returns proves the folder is read per call. The `finally` at `:204` restores `'_system'`, the store default (`settings.store.svelte.ts:96`). |
| 2 | nit, `collection-features.test.ts`: `.collection` samples not checked for empty views | resolved | `collection-features.test.ts:92-101` now loops over `all`, and `run()` still sends `.collection` files through the plain query. `sprint-board.collection [Backlog]` is on `MEANT_TO_BE_EMPTY` (`:21`): its top-level `or` requires a `bug` or `task` tag, and the only `backlog`/`planning` notes (`ideia-graph-3d.md`, `projeto-beta.md`) carry neither, so the view is empty today on main as well. The assertion is `toEqual`, so a new empty view or a fixed Backlog both fail it. |

## Acceptance criteria re-checked

- [met] `src/tests/help/collection-features.test.ts` runs samples through `blockRowSet`. Its current checks would stay green if a sample silently matched no rows, so add a check for that where a sample is expected to match. — inline blocks still run through `executeQuery(..., blockRowSet)`; the empty-view check now covers every sample with an exact expected-empty list; the file passes (see Checks).

## Checks run by this review

- `taskpolicy -c background pnpm check`: exit 0, 0 errors, 0 warnings.
- `taskpolicy -c background pnpm vitest run src/tests/lib/app/boot.test.ts src/tests/help/collection-features.test.ts`: exit 0, 2 files, 30 tests passed.
- The fix commit `855cf849a` touches only these two test files (plus the review file's Resolution). No app code, no test removed or weakened, no layer-baseline change. The full suite and `pnpm build` are deliver's to run.

## Findings

None.

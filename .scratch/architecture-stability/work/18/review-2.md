VERDICT: APPROVED

## Previous findings

| # | Severity | Status | Evidence |
|---|---|---|---|
| 1 | major | resolved | `ScriptDataArrayV1` (contract/kb-api.v1.ts:301-302) now omits the 16 chain members of `DataArrayV1` and re-declares them in `ScriptDataArrayChainV1` (:275-292) returning `ScriptDataArrayV1`, with a recursive index signature. `KBScriptApiV1` (:638-661) re-types pages / pagePaths / getDaysInRange / array and both `table` members. help/examples/queryjs-globals.d.ts:15-16 uses it. The new src/tests/help/queryjs-globals.test.ts compiles a probe against the real globals file and expects zero diagnostics for the shorthand at depth and after where / sort / groupBy, and two errors for `kb.nope()` and a wrong field type, so `kb` cannot have silently become `any`. I reverted the globals to `KBApiV1` by hand: the test failed with TS2339 / TS2551 (`Property 'file' does not exist on type 'DataArrayV1<KBPageV1>'`). I restored the file, and the worktree was clean afterwards. |
| 2 | minor | resolved | 13-queryjs.md:1131 and the globals header (queryjs-globals.d.ts:5-7) now say the file works only from a repository checkout, and that a vault copy leaves `kb` untyped. Documenting the limit is one of the two fixes the review offered. |
| 3 | nit | resolved | 13-queryjs.md:150 and kb-api.v1.ts:28 now describe `display` as the basename, or for outlinks the alias, or else the target text as written. That matches `display: wl.alias ?? wl.target` in queryjs.logic.ts. |
| 4 | nit | resolved | kb-api-contract.test.ts:227-233 `shape()` maps arrays to `'array'`. The expected root `tags` and file `tags` / `inlinks` / `outlinks` / `tasks` are `'array'`, and `link` stays `'object'`. The test passes on the real `buildKBPage`, so the array/object distinction is now pinned. |

## Acceptance criteria re-checked

- [met] The contract file exists, declares every public member, and imports nothing from `#lib/types`, `#lib/features` or generated bindings — the fixes only added the script-view types to contract/kb-api.v1.ts. The file still has no import, and the `implements` surface (KBApiV1, DataArrayV1) is unchanged.
- [met] The surface snapshot test fails when a member is added or removed on any of the four classes, and when `KBPage` or `KBPage.file` gains or loses a key or changes a value type — the member lists are unchanged. `shape()` now also tells arrays from objects. kb-api-contract.test.ts passes.
- [met] 13-queryjs.md matches the code, and an "API version and compatibility" section states the policy above — the `display` wording now matches queryjs.logic.ts, and the section at :1129-1131 now covers `KBScriptApiV1` and the checkout-only limit of the globals file. The policy text is unchanged.

## Checks I ran (worktree at 0cc9c7e7)

- `pnpm check`: exit 0, 212 files, 0 errors, 0 warnings.
- `pnpm vitest run src/tests/help src/tests/lib/plugins/queryjs`: exit 0, 13 files, 556 passed, 1 todo. This includes queryjs-globals.test.ts and kb-api-contract.test.ts.
- Red probe of queryjs-globals.test.ts (described under finding 1): it failed as expected, and I reverted the change.
- No test was weakened or deleted. The fix diff (`b3bb952a..HEAD`) does not touch layer-baseline.json, `BASELINE_SIZE`, the composition roots or src-tauri.
- The full suite and `pnpm build` are left to deliver.

## Findings

1. **nit**: src/lib/plugins/queryjs/contract/kb-api.v1.ts:256-273. `DataArrayChainKeyV1` is a hand-kept list. If a future DataArrayV1 member returns a DataArray and nobody adds it to this list, the script view returns a plain `DataArrayV1` for it and the shorthand breaks after it, with no failing check. Fix (optional): add a type-level assertion that every DataArrayV1 key whose return type is a `DataArrayV1` appears in `DataArrayChainKeyV1`, or add a line to the editing rules in the file header.
2. **nit**: docs/adr/0010-queryjs-kb-api-caching.md:9-11. The amendment does not name `KBScriptApiV1` / `ScriptDataArrayV1` as the script-facing view. Fix (optional): add one clause.

## Resolution

1. Fixed. contract/kb-api.v1.ts now derives `DataArrayReturningKeyV1` (every DataArrayV1 member whose inferred return type is a DataArray, probed with a branded item type so `first` / `find` / generic `reduce` do not match) and `DataArrayChainKeysCheckV1` asserts it equals both `DataArrayChainKeyV1` and `keyof ScriptDataArrayChainV1`. `pnpm check` fails (TS2344) when either list drops a chain member or gains a non-chain one; probed by removing `'into'` from the list, adding `'reduce'` to it, and removing `into` from ScriptDataArrayChainV1, each reverted.
2. Fixed. The ADR 0010 amendment names `KBScriptApiV1` / `ScriptDataArrayV1` as the script-facing typing (the Proxy shorthand) that types help/examples/queryjs-globals.d.ts.

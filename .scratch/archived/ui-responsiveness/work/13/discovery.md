# Issue 13 discovery: queryjs blocks share one page set per index version

No `spec.md` exists for this feature; the Issue and its research notes are the spec.

## Files that change

- `src/lib/plugins/queryjs/kb-api.ts:27-58` constructor: takes a new `propertyIndexVersion: number`, keeps the `entries` array reference instead of building `entriesByPath` per block (that Map moves into the shared build).
- `src/lib/plugins/queryjs/kb-api.ts:32,373-410` `ensureCache`: reads a module-level single-slot memo keyed on `entries` array identity + `propertyIndexVersion`; builds (and logs `ensureCache N=...`) only on a key miss. `_pageCache` field goes away.
- `src/lib/plugins/queryjs/kb-api.ts:68-79` `pages()`: unfiltered path returns `new DataArray(cache.list.slice())` so `sort` / `mutate` / any in-place work on one block's list cannot change another's. The filtered path already allocates via `filter`.
- `src/lib/plugins/queryjs/queryjs-block-widget.ts:245-252`: passes `propertyIndexVersion: collectionStore.version`, read in the same synchronous step as `propertyIndex` and `entries`.
- Tests constructing `KBAPI` gain the new option: `src/tests/lib/plugins/queryjs/kb-api.test.ts:67`, `kb-api-contract.test.ts:37` (+ `KBAPI_INTERNAL` list: drop `_pageCache`, `entriesByPath`; add `entries`, `propertyIndexVersion`), `src/tests/help/queryjs-features-scoping.test.ts:64`, `src/tests/help/queryjs-contract.test.ts:303`.

## Plan (test-first)

1. Failing test in `kb-api.test.ts`: two `KBAPI` over the same entries array + version -> one `ensureCache` QJS-PROFILE line, and both see the same page object for a path.
2. Tests: a new entries array at the same version rebuilds; a version bump with the same array rebuilds.
3. Test: block B's `pages().sort(...)` / `mutate` + a `_values` length check leave block A's `pages()` order and length unchanged (and a later `pages()` call too).
4. Implement memo + copy; update widget and the other constructors; run targeted checks.

## Prior art

- Single-slot version memo idiom: `src/lib/utils/inflight.ts::versionGated` (used by `vault-entries.service.ts`). Not reused directly: the key here is an array identity + a number and the build is synchronous.
- QJS-PROFILE log assertion: `kb-api.test.ts:86-94`.

## Defaults taken

- Key is exactly what the Issue names: entries identity + `collectionStore.version`. `vaultPath` is not in the key: a vault switch calls `invalidateVaultEntries()`, so the next block gets a new entries array.
- Single slot, module-level, never explicitly dropped on vault teardown: the next vault's first build replaces it. Holding one stale set after close is a bounded memory cost, no correctness risk.
- Page objects stay shared (no deep copy, per the Issue). Pre-existing leak: `p.file.tags` is already the entries-memo array (`queryjs.logic.ts:118,154`); the shared surface now also covers `inlinks`, `outlinks`, `tasks`, `KBDateTime` values and page-root properties. `mutate` writes to page objects, so a field assigned by block B is visible to block A.

## Risks

- A test that reuses one entries array across different property indexes at the same version would see a stale set; all current constructors build fresh arrays per call.

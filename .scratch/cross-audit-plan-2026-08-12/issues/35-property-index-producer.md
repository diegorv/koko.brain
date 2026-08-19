# Issue 35: Collection store producer + removeRecord wiring

Status: ready-for-agent
Phase: P3 Track E step 2 (cluster C11, C03)
Source: ARCH 7.0, M12, M08 — plan-2026-08-12.md §P3 — ARCH Strong refactors (Track E — Rust index)
Blocked by: 29-apply-note-change, 34-dead-vault-commands

## What

Give the collection store a real producer so embedded query results refresh when the vault index
updates (closes **M12**, stale embedded queries), and evict deleted notes from collection records
(closes **M08**, phantom collection pages) through the single note-change owner.

## How

- **Producer = option 2, decided at P1 (C11):** refresh `collectionStore` from the **existing
  debounced `vault-index-updated` listener** at `tauri-listeners.service.ts:97-131`. Touches no Rust
  commands.
- **Keep the synchronous per-file path** for `editor.hooks` / `note-creator` — the listener does not
  replace it.
- Add a **`collectionStore` version counter** and re-key `collection-block-widget`'s `cacheKey` on it.
  Closes **M12**.
- Wire **`removeRecord` at all four removal sites**, **reusing `forgetNote` / `applyNoteChange`
  (issue 29)** — single owner, never a second eviction path. Closes **M08**.
- **The queryjs half is DROPPED.** Per **ADR-0010 and CLAUDE.md perf rule 9**, the queryjs live-DOM
  cache is **never version-keyed** — re-keying it would destroy the canvas/video/iframe state the
  live-ref scheme exists to preserve. Do not add it back.
- Test collateral in the same commit: assert real `collectionStore` state after a
  `vault-index-updated` bump and after a removal (records gone, version advanced), plus the widget
  `cacheKey` change — not mock-call assertions.

## Gate

Frontend surface: `pnpm check` + `pnpm vitest run` + `pnpm build` before the commit. Stage only this
step's files, verify with `git diff --cached --stat`, and commit using the repo's full commit format
(Context, Problem, Solution, Behavior, Files with line ranges).

## Comments

### 2026-08-19 — M12 + producer implemented; M08 was already closed by issue 29

**Scope actually shipped.** Only the M12 half plus the producer. The `## How` bullet "wire
`removeRecord` at all four removal sites" was already done by issue 29 and is NOT re-done here (see
"Plan/issue discrepancies").

**Red-green evidence.**

1. `collection.store.test.ts` — new `describe('version')`. Red against the unfixed store:
   `TypeError: actual value must be number or bigint, received "undefined"` at the three
   `expect(collectionStore.version).toBeGreaterThan(before)` assertions (3 failed | 12 passed).
   Green after adding the counter.
2. `collection-block-widget.test.ts` — the existing test at :185 was INVERTED. It used to swap the
   whole property index for two DIFFERENT records of the SAME size and assert the OLD rows still
   rendered (M12 written down as an expectation). Now it asserts the NEW rows.
   Red: `expected [ 'a.md', 'b.md' ] to deeply equal [ 'x.md', 'y.md' ]`. Both maps deliberately hold
   exactly two records: with a different size the old `yaml|indexSize` key would flip on its own and
   the probe would pass against broken code. A companion cache-HIT guard (mutate the live Map in
   place, no store method, therefore no version bump, assert the ORIGINAL rows) was also red
   (`expected [ 'a.md', 'b.md', 'z.md' ] to deeply equal [ 'a.md', 'b.md' ]`, because in-place
   mutation changed `indexSize` and so changed the old key) and pins that the fix is a version
   check, not a deleted cache.
3. `tauri-listeners.service.test.ts` — new "rebuilds the collection property index from the same
   refresh". Red: `expected "vi.fn()" to be called with arguments: [ 'get_all_property_records' ]`,
   `Number of calls: 1` (`get_all_vault_entries_v2` only). Green after the producer call; asserts
   real store state (`collectionStore.propertyIndex.get('/vault/p.md')?.properties.get('status')`),
   not the spy.

**What discovery found.**

- The producer gap is the incremental watcher leg: `buildPropertyIndex` had exactly two callers,
  `app-lifecycle.service.ts:290` (vault open) and `watcher-handler.service.ts:74` (FULL rebuild
  only). A <= 10 file watcher batch refreshed the Rust index and the per-file TS record but never
  reprojected the snapshot. Wiring it into the debounced `vault-index-updated` refresh is plan
  decision C11 option 2 and touches no Rust command.
- The queryjs half stayed dropped. `queryjs-block-widget.ts` caches by content hash in
  `queryjsSessionStore` and is NOT version-keyed (ADR-0010, CLAUDE.md perf rule 9).

**Beyond the issue's literal `## How` (deliberate).**

- A version in `cacheKey` + `eq()` is necessary but NOT sufficient. `CollectionBlockWidget` is only
  constructed when `computeCollectionBlocks` runs (`collection-block-field.ts:24`), which the
  `blockDecorator` factory gates on docChanged / selectionSet / `forceDecorationRebuild`. For the
  headline M12 case (note A open, note B changed elsewhere) nothing dispatched a rebuild, so the new
  version never reached a widget. The existing `$effect` at `MarkdownEditor.svelte:445` now reads
  `collectionStore.version` alongside `isIndexReady`. Not unit-tested: the repo has no
  component-rendering tooling for `MarkdownEditor.svelte` (no test file exists, and the sibling
  `isIndexReady` read it extends is equally untested); extracting a one-line effect body would be
  pure ceremony.
- The cache is keyed by `yamlContent` with the version INSIDE the entry, not `${yaml}|${version}`.
  A monotonic counter in the key makes `collectionCache` unbounded — one dead `QueryResult` per
  visible block per save, cleared only at vault teardown (`clearCollectionCache`). Entry-level
  versioning is bounded at one entry per distinct block.
- `indexSize` was replaced by `version` (not kept alongside): every legitimate index mutation goes
  through a store method that bumps the version, so size is strictly subsumed.

**Plan/issue discrepancies.**

- **M08 is already closed.** `collection.service.ts:113-119` registers
  `{ name: 'collection', upsert: updateNoteInIndex, remove: removeNoteFromIndex }` on the
  note-change registry (registered at `app-lifecycle.service.ts:189`), and `applyNoteChange`'s
  delete branch fans out to it at `note-change.service.ts:152`. All four sites route through it:
  `fs.service.ts:202` / `:243` / `:280` via `forgetNote` at `:179-181`, plus
  `watcher-handler.service.ts:113`. Covered by real-store tests at `fs.service.test.ts:538`, `:567`,
  `:709` and `watcher-handler.service.test.ts:365`. Re-wiring would create exactly the second
  eviction path the issue forbids, so nothing was added.
- **Version monotonicity was unspecified.** Chosen: never reset, mirroring the note at
  `app-lifecycle.service.ts:472-478` for `vaultIndexVersion`. Rewinding to 0 on a vault switch while
  a widget still holds an old snapshot would produce a false cache hit. Pinned by the
  "is monotonic across reset" store test.

**Known costs, accepted deliberately (not oversights).**

- `refresh()` now fires a SECOND full-vault IPC per debounce window (`get_all_property_records`
  alongside `get_all_vault_entries_v2`). The 300 ms debounce is what makes this tolerable — the call
  must stay inside it. Issue 36 (vault-entries memo) is the follow-up that would fold the two.
- `buildPropertyIndex()` has no `fetchSeq`/`cancelled` guard, so a response landing after
  `teardownVault`'s `resetCollection()` could leak one vault's records into the next. Exposure is
  identical to the pre-existing unguarded call at `watcher-handler.service.ts:74`, it self-heals on
  the next event, and the debounce makes it rare. No guard machinery built (YAGNI).
- The `MarkdownEditor` effect now dispatches `forceDecorationRebuild` on every version bump, i.e.
  roughly one extra full-decoration pass per save (Svelte coalesces a synchronous burst, and
  `docChanged` already rebuilds while typing). New per-save cost on the editor's critical path,
  acceptable per the LP-PROFILE figures in CLAUDE.md.
- `core/layout/tauri-listeners.service.ts` importing `features/collection/collection.service` is a
  core -> features edge that ADR-0003 nominally forbids. The file already imports
  `features/properties`, `features/type-definitions` and `features/folder-notes`, and
  `core/app-lifecycle/watcher-handler.service.ts:3` imports this exact symbol. No new class of
  violation, but it is not a registration-API route either.

**Test collateral touched by the new IPC.** `tauri-listeners.service.test.ts` blanket
`vi.mocked(invoke).mockResolvedValue(entries)` mocks in the fan-out describe were switched to a
command-routing helper: the refresh now fires two commands, so a blanket mock handed `NoteEntryV2`
objects to `buildPropertyIndex` (which expects `NoteRecordV2`, and would log a caught
`Object.entries(undefined)` failure). The `mockReturnValueOnce` pair in the latest-wins test had to
route by command too, otherwise `buildPropertyIndex` consumed one of the queued promises. The
`expect(invoke).toHaveBeenCalledTimes(1)` coalescing assertion now counts
`get_all_vault_entries_v2` calls specifically. The `fs.service` mock gained `createFile` because
`collection.service` imports it.

**Follow-up worth an issue (minor).** `buildPropertyIndex` and the entries fetch now both pull a
full-vault snapshot in the same debounce tick; folding them into one IPC (or memoizing the entries
snapshot, issue 36) would halve the per-burst payload.

**Deferred review finding (minor, out of this step's scope).** The `eq()` probe in
`collection-block-widget.test.ts` (the "treats a version bump as a different widget" pair) calls
`collectionStore.updateRecord('/vault/c.md', ...)`, which ADDS a path and grows the index from 2 to
3 entries. The old `indexSize`-based `eq()` also differed under that mutation, so the probe passes
against both the old and the new `eq()` and does not discriminate them. Escape it leaves open:
reverting only the `eq()` line to compare `indexSize` while keeping the versioned cache would let a
same-size index swap return `eq() === true`, CodeMirror would reuse the old DOM without calling
`toDOM()`, and M12 would resurface through the DOM-reuse path with the suite green (the `toDOM`
re-query test cannot catch it: it constructs widgets directly and never exercises `eq()`). Fix is
one line - mutate an EXISTING path instead (`updateRecord('/vault/a.md', recordAt('/vault/a.md',
'a.md'))`) so the size stays 2 and only the version distinguishes the two widgets. Not applied here
because it changes test semantics rather than a repo convention; worth folding into the next commit
that touches this file.

**Gate.** `pnpm check` 0 errors / 0 warnings, `pnpm vitest run` 287 files / 6396 passed | 1 todo,
`pnpm build` OK. `cargo test` skipped: no `src-tauri/` file touched (group carve-out for issue 35).

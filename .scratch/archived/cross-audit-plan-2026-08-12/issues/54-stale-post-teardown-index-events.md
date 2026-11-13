# Issue 54: The surviving `vault-index-updated` listener republishes the previous vault's snapshot during a vault switch

Status: ready-for-agent
Phase: unplanned
Source: reviewer follow-up surfaced during the cross-audit run, verified 2026-08-19 by triage

Blocked by: none

Anchoring note: every reference below is by symbol. The one sha-bound fact is the `git log -S`
evidence, taken at `5e0b8bd3`.

## What

**Verdict: confirmed.** A `vault-index-updated` event emitted for vault A, still inside its 300 ms
debounce when `teardownVault()` runs, refills four stores that teardown had just cleared with vault
A's data while vault B is the open vault.

### Causal chain

1. `src/routes/(app)/+layout.svelte` registers the listener as
   `$effect(() => registerVaultIndexUpdatedListener())`. That effect reads nothing reactive at all -
   its dependency set is **empty**, not merely "unchanged on a switch". It runs once at layout mount
   and its cleanup runs only when the layout component is destroyed. The vault effect below it
   (`vaultStore.isOpen` + `vaultStore.path` -> `initializeVault` / `teardownVault`) returns no
   cleanup function whatsoever. So neither the `cancelled` flag nor `debouncedRefresh.cancel()` in
   `tauri-listeners.service.ts::registerVaultIndexUpdatedListener`'s returned cleanup can ever fire
   on a vault switch.
2. A switch is the only route into this: `vault.service.ts::openVaultDialog` /
   `openRecentVault` (and `deep-link.service.ts`) call `vaultStore.open(B)`, the layout vault effect
   sees the new path and calls `app-lifecycle.service.ts::initializeVault(B)`. `vaultStore.close()`
   has **no production caller** - there is no "close vault" command, so the only teardown that
   matters is the one `initializeVault` performs on itself.
3. `initializeVault` runs `await saveAllDirtyTabs()` *before* `teardownVault()`. Every save routes
   through `note-change.service.ts::applyNoteChange` with `source: 'save'`, whose `SOURCE_POLICY` row
   fires the Rust `update_note_in_index`, which calls `commands::vault::emit_index_updated`. Those
   are vault A's events, and they land inside the listener's 300 ms trailing window.
4. `teardownVault()` clears the targets: `typeDefinitionsStore.reset()`,
   `lifecycleFilterStore.reset()`, `resetCollection()`, `resetFileSystem()` (which resets
   `fsStore.contentOrder`), plus `invalidateVaultEntries()`.
5. `initializeVault(B)` then awaits `loadSettings`, `open_vault_db`, the parallel user-data loads,
   and finally `buildIndex(B)`. Anywhere in that stretch the armed `debouncedRefresh` fires
   `refresh()`. Nothing in `refresh` is vault-scoped: it calls `buildPropertyIndex()`
   (`get_all_property_records`) and `getVaultEntries()` (`get_all_vault_entries_v2`). Both Rust
   commands read the process-global `VaultIndexState` with no vault parameter
   (`commands::vault::get_all_vault_entries_v2` is a bare `state.read()` over `idx.entries()`), and
   nothing clears that state on teardown (`teardownVault` invokes only `save_vault_cache`,
   `shutdown_semantic`, `close_vault_db`). Both therefore return **vault A's** data.
6. The fan-out writes A back into B: `refreshArchivedPaths(entries)` ->
   `lifecycleFilterStore.setArchivedPaths`; `refreshTypeDefinitions(entries)` +
   `typeDefinitionsStore.setEntries(entries)`; `buildContentOrderMap(entries)` ->
   `fsStore.setContentOrder`; `buildPropertyIndex()` -> `collectionStore.setPropertyIndex`. And
   because the order map goes from empty to A's non-empty map, `orderChanged && vaultStore.path` is
   true (`vaultStore.path` is already B) so `loadDirectoryTree(B)` is invoked with A's order map
   sitting in the store.

### Why the window is wide, not a frame

`registerVaultIndexUpdatedListener`'s `refresh` is the **sole producer** of
`typeDefinitionsStore.entries` / `typeDefinitionsStore.typeMetadataMap` and of
`lifecycleFilterStore.archivedPaths` - grep for `refreshTypeDefinitions`,
`typeDefinitionsStore.setEntries` and `refreshArchivedPaths` returns their definitions and this one
call site, nothing else. So the wrong data stands until the *next* refresh, which is ~300 ms after
`scan_vault_v2_cached` (inside `backlinks.service.ts::buildIndex`) emits for B. That is the whole
duration of B's index build, seconds on a large vault, not a paint frame.

### User-visible repro

Open vault A with the Types sidebar active and an unsaved edit in a tab, then switch to vault B via
Open Recent. Until B's index build lands:

- `TypeSidebar.svelte` and `TypeNoteList.svelte` read `typeDefinitionsStore.entries` /
  `typeMetadataMap` / `entriesVersion` with **no `indexReady` guard** (only `BacklinksPanel.svelte`
  and the layout's tab effect carry one), so the sidebar lists vault A's types and A's notes.
- Clicking a row calls `TypeNoteList.svelte -> openFileInEditor(note.path)` with an absolute path
  inside vault A. The previous vault's file opens in vault B's editor, and can be edited and saved
  from there.
- Clicking "New <type>" calls `type-definitions.service.ts::createNoteOfType`, which reads
  `typeDefinitionsStore.getTypeMetadata(name)` and builds the target with
  `buildTypeNoteDir(vaultStore.path = B, …, metadata.folder from A)` and
  `templatePath = B/<A's template path>` - the note lands in the folder A configured, with a
  template path that does not exist in B.
- `AppShell.svelte`'s dock-badge effect counts A's inbox.

### Parts of the original claim that are wrong or incomplete

- "the effect's dependencies do not change on a switch" understates it: the effect has **no**
  dependencies, so it can never re-run for any reason short of the layout being destroyed.
- The claimed fix shape, "the handler compares the vault the event belongs to", is **not
  implementable as written**. `emit_index_updated` builds `UpdateResult { changed, affected,
  version }` and the TS `UpdateResultV2` mirrors it field for field: the payload carries no vault
  identity, and `VaultIndexState` stores no vault root either. The scoping has to come from the
  snapshot's own absolute paths, or from a Rust change that is out of scope here.
- The store list is incomplete: `collectionStore.propertyIndex` (via `buildPropertyIndex`) is a
  fourth victim, and the spurious `loadDirectoryTree(B)` call is a fifth effect.
- Confirmed as claimed: issue 36's `invalidateVaultEntries()` does not close this. It drops the
  `versionGated` memo in `vault-entries.service.ts`; the listener then refetches and Rust hands back
  the same previous-vault snapshot. Its two invalidation points protect the memo's *key*, never the
  stores.

### Not already fixed

`git log -S invalidateVaultEntries` returns only `f3a63ec6` and `5900f786` (issue 36, the memo).
`git log -S indexReadySuppressed -- src/lib/core/vault/vault.store.svelte.ts` returns only
`06a01402`, which scoped `indexReady` (the "Indexing vault..." placeholder) and, per its own comment
in `vault.store.svelte.ts`, deliberately left the fan-out unscoped. Nothing since has touched
`refresh`.

Severity: **medium**. Transient (it self-heals ~300 ms after B's first index event) and reachable
only through a vault switch, but during the window it puts clickable actions in front of the user
that read and write the previous vault.

## How

One symbol changes: `refresh`, the closure inside `registerVaultIndexUpdatedListener` in
`src/lib/core/layout/tauri-listeners.service.ts`.

### Scope contract

- Capture `const vaultPath = vaultStore.path` at the top of `refresh`, before the debounced work.
- Inside the `getVaultEntries().then(...)` callback, after the existing
  `if (cancelled || seq !== fetchSeq) return;`, drop a snapshot that does not belong to `vaultPath`:
  bail when `vaultPath` is null, and bail when any entry's `path` is not under `vaultPath + '/'`.
- Use `entries.some(...)` (early exit on the stale case), **not** `entries[0]`. Nested vault roots
  (`/vault` then `/vault/sub`) defeat a first-element check: `get_all_vault_entries_v2` returns the
  list sorted by path, and whether the first element is the foreign one depends entirely on what the
  outer vault happens to contain. A stale `/vault` snapshot whose outer-root files all sort after
  `sub/` (say `/vault/zzz.md`) begins with `/vault/sub/child.md`, which passes an `entries[0]` check
  while every other entry is still the wrong vault's.
- An **empty** snapshot must still be applied - an empty vault legitimately produces `[]`, and the
  stores need to end up empty for it.
- `buildPropertyIndex()` reads the same unscoped Rust state, so it must not run for a snapshot that
  is going to be dropped. Move it behind the same decision: call it from inside the guarded branch,
  which necessarily places it after the existing `if (cancelled || seq !== fetchSeq) return;`. That
  subjects it to the `fetchSeq` latest-wins guard, and that is **accepted** here: it publishes a
  whole snapshot, so latest-wins loses nothing. Consequence for the docs: the JSDoc sentence "It
  keeps its own try/catch and needs no `fetchSeq` guard" is no longer true and must be REWRITTEN to
  state that the property rebuild now rides the same vault-scoping decision. Do not preserve it as
  written. Keep its own try/catch, so a failing `get_all_property_records` still leaves the entries
  fan-out intact.
- Update the `registerVaultIndexUpdatedListener` JSDoc to record the invariant. **No CLAUDE.md edit**:
  keeping the doc change inside the touched files avoids colliding with other issues in this run.

### Explicitly must NOT change

- **Do not gate on `vaultStore.indexReady`.** It looks like the ready-made flag and it is wrong here.
  `markIndexReady()` runs only after `await Promise.all([buildIndex, loadDirectoryTree])`, while the
  event that must produce the FIRST fan-out is emitted when `scan_vault_v2_cached` returns. Whenever
  `loadDirectoryTree` outlasts `buildIndex` by more than the 300 ms debounce, that first refresh
  would be dropped - and since this listener is the sole producer of `typeDefinitionsStore` and
  `lifecycleFilterStore`, the Type sidebar would stay empty until the user's next edit. That is a
  worse bug than the one being fixed.
- Do not touch `vaultStore.bumpVaultIndexVersion` / `markIndexReady` / `resetIndexReady` /
  `indexReadySuppressed`. The counter must stay monotonic and process-global:
  `vault-entries.service.ts` and `utils/inflight.ts::versionGated` key on it.
- Do not change the 300 ms debounce, the `fetchSeq` latest-wins guard, or the `cancelled` flag.
- Do not change the Rust side. Adding a vault field to `UpdateResult`, or a `clear_vault_index`
  command called from `teardownVault`, is a larger fix that also races `save_vault_cache` - both
  would be fire-and-forget `invoke`s with no cross-command ordering guarantee. If it is ever wanted
  it is its own issue.
- Do not push the guard down into `refreshArchivedPaths` / `refreshTypeDefinitions` /
  `buildPropertyIndex`. They stay pure projections; the scoping belongs at the one call site that
  owns the lifecycle knowledge.
- Do not make the layout `$effect` vault-dependent and do not re-register the listener per vault. The
  listener is deliberately process-lived.

### Red-first test strategy

All in `src/tests/lib/core/layout/tauri-listeners.service.test.ts`, in
`describe('registerVaultIndexUpdatedListener — entries fan-out')`. Reuse the existing `fireEvent`,
`settleFanOut`, `mockInvokeByCommand` helpers and the `entryV2` fixture. Real stores only - no store
mocking.

New cases:

1. **Stale snapshot from the previous vault.** `vaultStore.open('/vault-b')`, route
   `get_all_vault_entries_v2` to entries under `/vault-a`, register, `fireEvent(1)`,
   `await settleFanOut()`. Assert real state: `typeDefinitionsStore.entries` is `[]`,
   `typeDefinitionsStore.entriesVersion` is `0`, `lifecycleFilterStore.archivedCount` is `0`,
   `fsStore.contentOrder.size` is `0`, `collectionStore.isIndexReady` is `false`, and
   `loadDirectoryTree` was not called.
2. **Nested roots, with the fixture ordered so the case actually discriminates.** Current vault
   `/vault/sub`, stale snapshot from `/vault` passed as
   `[entryV2('/vault/sub/child.md'), entryV2('/vault/zzz.md')]`, in that order. Must still drop.
   `mockInvokeByCommand` resolves the fixture array verbatim and never sorts it, so the FIXTURE
   ORDER, not Rust's `sort_by(path)`, is what pins the `entries.some(...)` vs `entries[0]`
   distinction: the first element is under the current vault, so an `entries[0]` guard would apply
   this stale snapshot and the case goes red against that shortcut. Do not put the foreign path
   first (`['/vault/root.md', '/vault/sub/child.md']`): an `entries[0]` guard drops that one too,
   and the case then passes identically with and without the shortcut, proving nothing.
3. **Green half (must not regress).** Current vault `/vault-b`, snapshot under `/vault-b` - the full
   fan-out still happens; and a snapshot of `[]` under an open vault still applies (stores end
   empty, no throw).

Side channels that can fake a green:

- The block's `beforeEach` calls `vaultStore._reset()`, leaving `vaultStore.path` null. A new case
  that forgets `vaultStore.open(...)` goes green through the null bail for the wrong reason. Pin the
  open vault in every new case and confirm the red run fails on the **store** assertions.
- The entries snapshot is a module-scoped version-keyed memo. The existing `beforeEach` call to
  `invalidateVaultEntries()` must stay - a memo hit skips the IPC and leaves the stores empty
  regardless of the guard, which fakes green on cases 1 and 2.
- Prove the red run by running the new cases against unmodified `refresh` first, then re-verify by
  reverting the guard after the fix.

Existing cases the guard will turn red, and what to do with each:

- `'fetches the full entries snapshot and fans out to the real stores'`,
  `'coalesces a burst into one snapshot fetch carrying the final version'`,
  `'drops a stale in-flight response that resolves after a newer one'`,
  `'rebuilds the collection property index from the same refresh'` - these four assert legitimate
  behaviour but run with `vaultStore.path === null`, so the guard drops their snapshot and their
  store assertions fail. Give each an open vault whose path matches its fixture paths
  (`vaultStore.open('/vault')`); do **not** weaken the guard to keep them green.
- Expected to stay GREEN, so do not read them as a broken red run:
  `'skips the fan-out when cleanup runs before the in-flight fetch resolves'` (the `cancelled`
  short-circuit returns before the new guard is ever evaluated) and
  `'logs and leaves stores untouched when the entries fetch fails'` (`mockRejectedValue` means the
  `.then` callback, and with it the guard, never runs). Both already assert "stores untouched", so
  they hold with or without the fix. Adding `vaultStore.open('/vault')` to them is harmless and
  keeps the block uniform; it changes no assertion.
- `'does not reload the tree when no vault is open, but still updates the order map'` - this one's
  contract genuinely changes. With no vault open there is nothing to scope against, so dropping is
  the new correct behaviour (and the branch is defensive only: production has no `vaultStore.close()`
  caller). Rewrite it to assert the drop, and say so in the commit body - a reviewer will challenge
  it otherwise.

## Gate

- Frontend surface only: `pnpm check` + `pnpm vitest run` + `pnpm build`. No Rust file changes, so no
  `cargo test`. No E2E collateral.
- Stage only `src/lib/core/layout/tauri-listeners.service.ts` and
  `src/tests/lib/core/layout/tauri-listeners.service.test.ts` plus this issue file; verify with
  `git diff --cached --stat`.
- One commit with the fix and the tests together, full format (Context, Problem, Solution, Behavior,
  Files with line ranges). Adversarial review before the commit, per the playbook.

## Comments

### 2026-08-19 - triage revision after adversarial review

Three findings applied. Verdict unchanged: confirmed, medium, ready-for-agent.

- Red-test case 2 did not discriminate. With `['/vault/sub/child.md', '/vault/root.md']`,
  `/vault/root.md` sorts first (`r` < `s` at byte 7), so an `entries[0]` guard drops that snapshot
  too and the case passed identically with and without the shortcut it claims to catch. The fixture
  is now ordered with the under-current-vault path first, and the rationale records that
  `mockInvokeByCommand` resolves the array verbatim, so fixture order, not Rust's `sort_by(path)`,
  is what pins the distinction.
- The `buildPropertyIndex` scope contract contradicted itself ("call it from inside the guarded
  branch" versus "keep it out of the `fetchSeq` guard"). Resolved in favour of the guard, with the
  JSDoc sentence now explicitly marked for rewrite rather than preservation.
- Two entries left the "will turn red" list: `'skips the fan-out when cleanup runs before the
  in-flight fetch resolves'` (the `cancelled` short-circuit returns before the guard) and `'logs and
  leaves stores untouched when the entries fetch fails'` (`mockRejectedValue`, so the `.then` never
  runs). Both stay green, and the implementer must not read that as a broken red run.
- Style: 21 em-dashes replaced. The single survivor is inside the verbatim
  `describe('registerVaultIndexUpdatedListener — entries fan-out')` string, a real code anchor.

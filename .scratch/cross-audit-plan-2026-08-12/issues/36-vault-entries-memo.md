# Issue 36: Version-keyed vault-entries memo

Status: ready-for-agent
Phase: P4
Source: ARCH 5.0 (half), absorbs ARCH 3.2 part 2 — plan-2026-08-12.md §P4 — Worth-exploring variants and heavy-collateral PARTIALs

Blocked by: 04-vault-index-ready-flag

## What

Every widget render refetches `get_all_vault_entries_v2`, and `completion.ts` keeps its own private
snapshot cache with no vault-scoped invalidation — so for ~300 ms after a vault switch, wikilink
completion still suggests notes from the previous vault. Replace both with one version-keyed
`entries()` memo whose invalidation is explicit on vault open/close.

## How

- Build a version-keyed `entries()` memo over `get_all_vault_entries_v2`, keyed on the vault index
  version; **fold `completion.ts`'s own cache into it** (it stops holding a private snapshot).
- **Explicit invalidation on vault open and vault close** — this is what closes the ~300 ms
  wrong-vault completion window; do not rely on the version counter alone (it is never reset).
- Fixes the per-widget refetch: one IPC per version instead of one per widget render.
- **Absorbs arch 3.2 part 2** (the entries-snapshot leg deferred out of the LB3/indexReady fix). Do
  not ship a second snapshot holder.
- Extract `versionGated` / `isStillCurrentPath` into `src/lib/utils/inflight.ts` as part of the same
  work — they are the guards the memo and its callers share.
- **Drop the `subscribe(fetch, apply)` half of arch 5.0.** Only the memo + inflight extraction ship.
- Document the memo as a **cache, not a mirror**, in ADR-0025, amended in this same commit series.
- Test collateral: assert real store/memo state across a vault switch (open A → entries A → close →
  open B → entries B, never A's), plus same-version reuse (no second IPC).

## Gate

- Frontend surface: `pnpm check` + `pnpm vitest run` + `pnpm build`.
- Stage only this change's files (`git add <specific files>`), verify with `git diff --cached --stat`.
- One commit for the memo + inflight extraction + ADR-0025 amendment + tests, using the repo's full
  commit format (Context, Problem, Solution, Behavior, Files with line ranges).

## Comments

2026-08-17 (from issue 04 adversarial review) — additional consumer for the invalidation scope:
`registerVaultIndexUpdatedListener`'s debounced `refresh()` (`tauri-listeners.service.ts:106-118`)
survives vault switches and, on a stale post-teardown event, fetches the snapshot directly and
writes it into `typeDefinitionsStore` / `refreshArchivedPaths` / `fsStore.contentOrder` — the old
vault's data lands in those stores until the new vault's first index event overwrites it. When the
version-keyed memo ships, route this fetch through it so the open/close invalidation covers these
writes too. (The indexReady suppression from issue 04 gates only the readiness flag, not these
snapshot writes.)

2026-08-19 — implemented. Both defects reproduced red first, then fixed.

**Red-green evidence.**

Probe A (cross-vault completion leak), new `it()` inside `describe('teardownVault')` in
`src/tests/lib/core/app-lifecycle/app-lifecycle.service.test.ts`. Open vault A at index
version 5, complete `[[Alphax` and get the alias `Alphaxyz`; point the IPC at vault B;
`teardownVault()`; complete `[[Zetaq`. Red against unfixed code:

```
FAIL  teardownVault > drops the wikilink entries snapshot so the next vault never suggests the old vault aliases
AssertionError: expected [] to include 'Zetaqqq'
 ❯ src/tests/lib/core/app-lifecycle/app-lifecycle.service.test.ts:677:19
 Tests  1 failed | 49 passed (50)
```

The empty option list is the bug exactly: `completion.ts` still held vault A's snapshot
(no `Zetaqqq` in it, and `Alphaxyz` does not match `Zetaq`). Green after the fix, 50/50.
Mutation-checked: deleting only the `invalidateVaultEntries()` in `teardownVault` puts the
same assertion back to red, so the probe is anchored on the invalidation and not on a side
channel.

Probe B (per-render refetch), new describe in
`src/tests/lib/core/markdown-editor/extensions/live-preview/widgets/queryjs-block-widget.test.ts`
with `autoRunQueries: 'always'`, two widgets, one index version. Red against unfixed code:

```
FAIL  QueryjsBlockWidget.execute — vault entries snapshot > fetches the entries snapshot once per index version across widget renders
AssertionError: expected 2 to be 1
 Tests  1 failed | 7 passed (8)
```

Green after the fix, 8/8. The sibling case (`refetches once the index version moves`)
passed before AND after on purpose: it is the over-caching guard, not a bug probe.

Gate: `pnpm check` 191 files / 0 errors; `pnpm vitest run` 292 files, 6474 passed, 1 todo;
`pnpm build` OK in 4.51 s.

**What discovery found.** Both defects were real and confirmed in source, not inferred:

- `completion.ts` kept `cachedEntries` / `cachedVersion` at module scope keyed on
  `vaultStore.vaultIndexVersion` alone. `vault.store.svelte.ts::resetIndexReady()` documents
  that it deliberately leaves the counter untouched (monotonicity contract), and
  `teardownVault` cleared no completion state, so after an A -> B switch the key never
  changed and vault A's entries were served until B's first `vault-index-updated` landed —
  through a 300 ms debounce, on a listener that `+layout.svelte` registers in a
  dependency-free `$effect` and therefore never re-registers on a vault switch.
- `queryjs-block-widget.ts` invoked `get_all_vault_entries_v2` inside `execute()`, reached
  from `toDOM()` on every cache miss, so N visible blocks meant N full-snapshot IPCs.

Fix as specified: `versionGated` + `isStillCurrentPath` in `src/lib/utils/inflight.ts`, one
memo in the new `src/lib/core/vault/vault-entries.service.ts`, three consumers rewired
(completion, queryjs widget, the `vault-index-updated` fan-out), and THREE explicit
invalidation points, not two. `initializeVault` entry + `teardownVault` alone leave the
window between init entry and `buildIndex(B)` completing, in which a still-debounced
old-vault event refills the memo under the unchanged key; the third call, immediately after
`vaultStore.markIndexReady()`, is what actually closes the wrong-vault window.

**Plan discrepancies surfaced.**

1. **utils layer rule vs. the named location.** The issue puts both helpers in
   `src/lib/utils/inflight.ts`, but `CLAUDE.md` defines `utils/` as "no state, no side
   effects" and no file there imports `$lib` today. Resolution: both helpers take their
   input as a parameter — `versionGated(fn, versionOf)` and
   `isStillCurrentPath(fetchedPath, currentPath)` — so the store reads stay at the call
   sites (`vault-entries.service.ts` passes `() => vaultStore.vaultIndexVersion`;
   backlinks / outgoing-links pass `editorStore.activeTabPath`). Location honoured, layer
   rule intact.
2. **`versionGated` has exactly one consumer.** A generic helper with a single
   implementation is what the repo's simplicity rules would normally reject in favour of
   inlining ten lines in `vault-entries.service.ts`. Kept because `## How` mandates the
   extraction by name. Flagging rather than silently deviating.
3. **Five of the eight `get_all_vault_entries_v2` call sites deliberately NOT routed**
   through the memo: `app-lifecycle` step 4b, `file-icons.service.ts::buildFrontmatterIconIndex`,
   `graph-view.service.ts::buildGraph`, the `entries ?? await invoke(...)` fallback in
   `type-definitions.service.ts` / `lifecycle-filter.service.ts`, and
   `search.service.ts::loadVaultContentMap` / `loadVaultTagMap`. Two different reasons. The
   one-shot builders (step 4b, `buildFrontmatterIconIndex`) run immediately after
   `buildIndex` / `rebuildIndex`, i.e. BEFORE the 300 ms-debounced TS version bump, so a
   version-keyed read would hand them the pre-rebuild snapshot. The search maps instead run
   at QUERY time, long after many bumps: they want freshness beyond the last debounced bump,
   and `loadVaultContentMap` pairs the entries fetch with a `read_files_batch` the memo
   cannot amortize. `buildGraph` and the `entries ?? invoke` fallback are simply not named by
   the issue. Only the three repeat readers the issue names are routed.
4. **"Do not ship a second snapshot holder" was already partly violated before this issue.**
   `typeDefinitionsStore.setEntries` (`tauri-listeners.service.ts`) holds a full
   `NoteEntryV2[]` and is asserted by existing tests. Pre-existing, consumed by
   TypeSidebar / TypeNoteList, not removed here. The rule is honoured in the sense that the
   new code adds no further holder and completion's private cache is gone.
5. **The 2026-08-17 comment overstates what routing the listener buys.** Invalidation only
   drops a cached snapshot. A stale post-teardown `vault-index-updated` still fetches and
   still writes `refreshArchivedPaths` / `refreshTypeDefinitions` /
   `typeDefinitionsStore.setEntries` / `fsStore.setContentOrder` / the collection property
   index — the listener's `cancelled` flag never trips on a vault switch because
   `+layout.svelte` never re-runs its `$effect`. The routing is implemented as asked, but
   the stale-write race is NOT closed by it; that needs a vault-scoped guard, out of scope
   here.

**Accepted behaviour change.** Between a Rust index mutation and the 300 ms-debounced
`vaultIndexVersion` bump, the queryjs widget and wikilink completion now serve the previous
snapshot instead of refetching. That is the "cache, not mirror" trade the issue asks for; it
is written into the ADR-0025 amendment and into `CLAUDE.md` item 12.

**Required test collateral, not hygiene.** `invalidateVaultEntries()` had to go into the
`beforeEach` of the entries fan-out describe in `tauri-listeners.service.test.ts`: every case
there does `vaultStore._reset()` (version 0) then fires version 1, so without the drop case
N+1 would read case N's memo entry at key 1 and assert on the previous case's snapshot.

**Follow-ups worth their own issue (not done here).**

- `graph-view.service.ts::buildGraph` could join the memo for free: its only caller
  (`GraphView.svelte`) already fires from a `vaultIndexVersion` effect, so it is a
  once-per-version read that currently pays its own IPC. Not named by the issue, no
  measurable change, left alone.
- Dead branch, noticed and deliberately not deleted (root CLAUDE.md: mention, do not
  remove): the `entries ?? await invoke(...)` fallback in `type-definitions.service.ts:24`
  and `lifecycle-filter.service.ts:8` has no production caller — the listener always passes
  entries — and is exercised only by those two services' own tests.
- The stale post-teardown fan-out write race from point 5 above: the debounced listener
  needs a vault-scoped guard (compare the event's vault against the currently open one, or
  re-register the listener per vault) so old-vault events cannot write into the new vault's
  stores.

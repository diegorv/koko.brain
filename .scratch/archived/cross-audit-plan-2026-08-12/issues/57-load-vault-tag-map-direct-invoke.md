# Issue 57: `loadVaultTagMap` keeps a direct invoke on a rationale that fits only `loadVaultContentMap`

Status: wontfix
Phase: unplanned
Source: reviewer follow-up surfaced during the cross-audit run, verified 2026-08-19 by triage.

Blocked by: none

Note on anchors: everything below is anchored by symbol. The one commit sha cited (`77092b5d`) is a
fixed point in history and does not drift; no line numbers are used.

## What

The claim has two halves. The documentation half is **already fixed**; the code half is **refuted**.

### Half 1 - the doc defect was closed by `77092b5d`, before this follow-up was triaged

The claim's premise is that the surviving direct-invoke rationale is content-map shaped. That was
true of the text the memo commit `f3a63ec6` shipped, which justified both search helpers with
"pair the fetch with a `read_files_batch` the memo cannot amortize" - a reason that only fits
`loadVaultContentMap`. (Quoted verbatim from `git show f3a63ec6:CLAUDE.md`. `77092b5d`'s own commit
message renders it as "pair the entries fetch ..."; that is the commit message drifting, not the
shipped text.) The run's own final cleanup commit `77092b5d`
("chore(cleanup): fix convention and accuracy debt from the cross-audit run") already identified
that exact defect as its Problem 4 and replaced the clause in **both**
`CLAUDE.md` rule 12 and `docs/adr/0025-rust-vault-index.md`.

At HEAD both documents carry the corrected, symmetric reason, and both name `loadVaultTagMap`
explicitly with its own trigger condition:

> they run at query time, want freshness beyond the last debounced bump, and each fires at most once
> per settled query. `loadVaultContentMap` fires only on the two fallback paths (an operator-only
> query, or FTS5 unavailable); `loadVaultTagMap` fires only on a successful `search_fts` call whose
> query carries `tag:` operators. Neither has a repeat-reader fan-out for a version-keyed memo to
> collapse.

So the "the rationale only fits the content map" statement is false against current code and current
docs. Nothing about `read_files_batch` remains in either document.

### Half 2 - routing the tag map through the memo is a net loss

Causal chain, by symbol:

- `routes/(app)/+layout.svelte` runs a search `$effect` on `searchStore.query` / `mode` /
  `fuzzyEnabled` with a 200 ms `setTimeout` debounce, then calls
  `features/search/search.service.ts::performSearch`.
- `performSearch` (text / hybrid branch) calls `search.logic.ts::parseSearchQuery`, computes
  `hasOperators`, invokes `search_fts`, and only on success with `query.tags.length > 0` calls
  `loadVaultTagMap`.
- `loadVaultTagMap` issues exactly ONE `invoke('get_all_vault_entries_v2')`, projects
  `entry.tags` into `Map<absolutePath, Set<tag>>`, and the map is used as a filter over the FTS
  rows.

Two reasons not to move it onto `core/vault/vault-entries.service.ts::getVaultEntries`:

1. **There is no fan-out to collapse.** `utils/inflight.ts::versionGated` earns its keep where N
   readers hit the same version in one turn: `queryjs-block-widget.ts` (one per visible block),
   `markdown-editor/extensions/wikilink/completion.ts` (per keystroke burst), and
   `core/layout/tauri-listeners.service.ts::registerVaultIndexUpdatedListener`'s fan-out. The tag
   path is one reader, once, per settled query, behind a 200 ms debounce. The memo would collapse
   nothing that is not already collapsed by that debounce.

2. **The freshness delta runs the wrong way, and is not bounded by 300 ms.** The memo key is
   `vaultStore.vaultIndexVersion`, bumped only inside `registerVaultIndexUpdatedListener` through
   `debounce(refresh, 300)`. `utils/debounce.ts::debounce` is trailing-only with no maxWait, so
   during a burst of `vault-index-updated` events spaced under 300 ms - which is exactly what the
   watcher incremental loop produces, one event per changed file - the bump is deferred for the
   whole burst and the cached snapshot ages for as long as the burst lasts. The direct `invoke`
   reads `src-tauri/src/commands/vault.rs::get_all_vault_entries_v2` under the live `VaultIndex`
   read lock and is always at least as fresh.

**Repro path if the change were applied** (user-visible, and a silent wrong answer rather than a
crash): the tag map is a NEGATIVE filter - a path missing from it, or present with a stale tag set,
causes `performSearch` to DROP the corresponding FTS row. So: add `#foo` to a note, save, then run
`tag:foo` in the search panel while an external sync or a multi-file watcher batch keeps
`vault-index-updated` firing under 300 ms apart. FTS5 has the row (its update rides
`applyNoteChange`), the stale snapshot does not have the tag, and the note vanishes from the results
for its own tag. Today that cannot happen: the tag map is read fresh at query time.

**Parts of the original claim that are refuted:**

- "the documented rationale ... fits `loadVaultContentMap` but NOT `loadVaultTagMap`" - false at
  HEAD. The `read_files_batch` clause it refers to no longer exists; the surviving reason applies
  verbatim to both helpers.
- "issues no batch read, so it could route through the memo" - the batch read is not, and no longer
  claims to be, the reason. Whether a helper pairs a second IPC is orthogonal to whether it can
  tolerate a bounded-stale snapshot (ADR 0025), which is the actual gate.

**One more cost the claim does not price in.** `src/tests/lib/features/search/search.service.test.ts`
calls `vaultStore._reset()` in `beforeEach`, which zeroes `vaultIndexVersion`, and never calls
`invalidateVaultEntries()`. The memo is a module singleton, so routing the tag map through it makes
every test in that file share whichever snapshot the first memo read cached at version 0; the
`entries` a later test hands to its `mockSearchIPCs` helper would be silently ignored. An
implementer would have to add memo invalidation to that suite - extra test coupling bought with a
negative correctness delta.

## How

**Do not apply.** This is a tombstone. A future agent re-deriving "the tag map could use the memo"
stops here.

- The documentation half is closed: `77092b5d` already rewrote the clause in `CLAUDE.md` rule 12 and
  `docs/adr/0025-rust-vault-index.md`. Do not re-edit either paragraph to "fix" it again.
- The code half is refuted: `loadVaultTagMap` and `loadVaultContentMap` both keep their direct
  `invoke`. The memo trades freshness for fan-out collapse; the tag path has no fan-out to collapse
  and cannot spend the freshness, because a stale tag set removes correct results instead of merely
  delaying new ones.

**Re-decision condition.** Reopen only if BOTH become true: (a) a measured trace shows
`get_all_vault_entries_v2` on the `tag:` search path is a real cost on a large vault, and (b) the
search `$effect` in `routes/(app)/+layout.svelte` gains a `vaultStore.vaultIndexVersion` dependency,
so a filter computed from a stale snapshot self-heals on the next bump instead of standing until the
user retypes. Neither holds today.

**Optional guard, not required.** If a mechanical check is ever wanted in place of this file, the
cheap one is a single test in `src/tests/lib/features/search/search.service.test.ts`: prime
`getVaultEntries` at the current version with a snapshot whose entry lacks the tag, then run
`performSearch()` on a `tag:` query and assert the matching FTS row survives. It goes red the moment
the tag map is routed through the memo. The tombstone alone is what stops the re-derivation, so this
is a take-it-or-leave-it extra, not part of any scope contract.

**Must not change:** `features/search/search.service.ts::loadVaultTagMap`,
`features/search/search.service.ts::loadVaultContentMap`,
`core/vault/vault-entries.service.ts`, `utils/inflight.ts::versionGated`, `CLAUDE.md` rule 12, and
the "search content/tag maps" paragraph in `docs/adr/0025-rust-vault-index.md`.

## Gate

None - do not action.

## Comments

### 2026-08-19 - triage revision after adversarial review

One finding applied. Verdict unchanged: wontfix.

The quotation was wrong: `f3a63ec6` shipped "pair the fetch with a `read_files_batch` the memo
cannot amortize", with no "entries" (verified with `git show f3a63ec6:CLAUDE.md`). The drift was
inherited from `77092b5d`'s own commit message and is now flagged inline so nobody "corrects" it
back. The tombstone's substance is unaffected, since the quoted clause is deleted at HEAD.

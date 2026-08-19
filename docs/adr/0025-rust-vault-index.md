---
type: ADR
id: "0025"
title: "Rust VaultIndex as source of truth for vault metadata; native Rust watcher; vault-index-updated event"
status: active
date: 2026-04-28
---

## Context

Vault metadata indexing (backlinks, outgoing links, tags, tasks, frontmatter
properties) currently lives entirely in TypeScript. A codebase audit on
2026-04-28 confirmed the shape:

- `noteIndexStore` holds `Map<path, WikiLink[]>` plus a `reverseIndex` and
  `noteContents` (`src/lib/features/backlinks/note-index.store.svelte.ts`),
  with a strict ordering rule that `setNoteContents` must precede
  `setNoteIndex` (ADR 0009).
- `index-updater.service.ts:38-79` runs a 3-phase orchestration on every
  active-tab content change (debounced 1 000 ms in `+layout.svelte:101-121`),
  yielding to the event loop between phases. A version counter discards
  stale callbacks.
- `editor.hooks.ts::notifyAfterSave` synchronously fans out to six indexers
  before observers fire. The watcher (`fs.watcher.ts`) adds another fan-out:
  500 ms debounce, `<= 10` files incremental, else full rebuild, plus
  `areAllRecentSaves` self-save filter and `isInsideHiddenDir` (ADR 0017).
- `active-tab-tracker.service.ts` recomputes backlinks + outgoing links on
  tab switch (debounced 150 ms).
- The Rust side owns only `scan_vault` (file tree) and `read_files_batch`
  (ADR 0018). It exposes no per-note metadata. `tauri-plugin-fs` has
  `["watch"]` enabled but is unused on the Rust side; the watcher runs on
  the JS main thread.

Three problems compound:

1. **All metadata work runs on the JS main thread**, competing with the
   editor for cycles. The 1 000 ms content-effect debounce and the 150 ms
   tab-switch debounce exist precisely to mask this.
2. **No single source of truth for note metadata.** Six stores
   (`noteIndexStore`, `backlinksStore`, `outgoingLinksStore`, tag map,
   `fileTasksIndex`, properties) are kept in sync by the orchestration
   service. Adding a consumer means wiring it into all six debounce paths.
3. **Cold starts re-parse the entire vault.** Every reopen scans every
   markdown file, regardless of whether the vault has changed since the
   last close.

## Decision

**Migrate vault metadata indexing into a Rust `VaultIndex` keyed by
absolute path, run the file watcher off the JS main thread via the `notify`
crate, and emit a single `vault-index-updated` event that all consumer
panels listen to.** The migration is incremental: each phase lands behind
an `experimental.<feature>` flag, runs parallel to the existing TS path
during a 4-hour to 2-day soak window, then deletes the TS orphan via the
trace-before-remove ritual. End state has three permitted JS write surfaces
(editor save, live-preview widget via `view.dispatch`, user-initiated op via
Rust invoke), zero TS metadata indexers, and a git-commit-hash cache for
instant reopens.

The full task plan lives at
[`tasks/todo/performance-architecture-refactor.md`](../../tasks/todo/performance-architecture-refactor.md).
The approved design plan lives at
`/Users/diegorv/.claude/plans/pode-avaliar-o-users-diegorv-dev-pet-pro-mutable-eclipse.md`.

Components (target state):

1. **`src-tauri/src/vault/`** module: `entry.rs` (`NoteEntry`),
   `parsing.rs` (`extract_outgoing_links`, `extract_tags_strict`,
   `parse_frontmatter`, `extract_tasks`), `index.rs` (`VaultIndex` with
   `entries`, `by_path`, `backlinks`, `tags`, `tasks`, `properties`,
   `version`).
2. **Tauri commands** under `commands/vault.rs`: `scan_vault_v2`,
   `get_backlinks_v2`, `update_note_in_index`, `get_outgoing_links_v2`,
   tag/task/property reads and writes, file ops (`create_note`,
   `rename_note`, `delete_note`, `create_folder`).
   Amendment 2026-08-19 (issue 39): `rename_note` is INDEX-ONLY. It
   re-keys every entry stored under `from` and under the `from + '/'`
   prefix (so a folder rename or move carries its children), but it does
   NOT rename anything on disk; that write stays TS-side in
   `fs.service.ts` through `plugin-fs`. This is the one file op that
   diverges from `create_note`, which owns its own `write_atomic`.
   Moving the disk rename into Rust would change the `exists()`
   precheck, bypass the plugin-fs ACL and alter the error semantics of
   three call sites for no stated benefit, so the command is a sibling
   of `remove_note_from_index`, not of `create_note`. The caller must
   invoke it BEFORE the per-path removal sweep; reversed, the sweep
   deletes the entries the re-key needs.
3. **Managed state**: `pub type VaultIndexState = RwLock<VaultIndex>;`
   added next to the existing `TerminalState` (ADR 0022 model).
4. **Event-driven update flow**: any mutation calls `update_entry` under
   the write guard, then emits `vault-index-updated` carrying an
   `UpdateResult { changed, affected, version }` payload. Frontend
   consumers (panels) read `vaultStore.vaultIndexVersion` to invalidate
   and re-fetch via the appropriate `get_*_v2` command.
5. **Native Rust watcher** on a dedicated tokio task using the `notify`
   crate, replacing the JS-side `fs.watcher.ts` fan-out. Same 500 ms
   debounce; same hidden-dir filter; emits the same `vault-index-updated`.
6. **Coexistence with `fts_logic::extract_tags`**: the FTS extractor
   (`src-tauri/src/search/fts_logic.rs`) stays permissive (no digit-first
   rejection, no HTML-comment strip, no trailing-slash normalization)
   because broader recall is correct for full-text search. The new
   `parsing::extract_tags_strict` mirrors `tags.logic.ts::extractAllTags`
   exactly for the canonical index view. Both must coexist; audit any
   change to either.
7. **Git-commit-hash cache** (`scan_vault_cached`, opt-in) for instant
   reopens on git-tracked vaults: load cached entries, compare to
   `git diff` + `git status` since the last cache write, re-parse only
   the differences.
8. **Three-tier change detection** for the windowed app: the Rust watcher
   for in-session events, focus-based `git status` + `git diff HEAD` diff
   on `WindowEvent::Focused(true)`, and a configurable periodic poll
   (default 10 s, range 5-60 s, 0 disables).

## Alternatives considered

- **Stay in TypeScript and optimize the existing pipeline.** The 1 000 ms
  debounce on the content-effect already exists because expensive O(V x n)
  scans were running on the main thread; the 3-phase yield pattern was
  added for the same reason. We have already tuned what JS can give us.
  Moving to Rust gives us off-main-thread parallelism, which JS Web Workers
  cannot provide for the IPC-heavy paths. Rejected.
- **Big-bang Rust migration in one PR.** Touches `noteIndexStore`,
  `backlinksStore`, `outgoingLinksStore`, tag/task/property panels, the
  watcher, `editor.hooks.ts`, `index-updater.service.ts`, and every
  consumer panel at once. No safe rollback path mid-soak. Rejected; the
  per-flag, per-feature staging matches the trace-before-remove ritual
  required by `CLAUDE.md`.
- **Keep one TS index for backlinks, move only watcher and FTS to Rust.**
  Reduces scope but leaves `noteIndexStore` and the orchestration service
  as a single point of contention on the JS main thread. The whole reason
  to do the watcher migration is to take metadata work off the main thread,
  and the metadata work IS the indexers. Rejected.
- **Use `tauri-plugin-fs::watch` from the JS side instead of `notify`
  directly.** That's the current setup. The plugin watcher still wakes the
  JS event loop on every event; `notify` on a tokio task does not. The
  whole point is to keep filesystem events out of the JS thread. Rejected.
- **Skip the experimental flag gates and ship phases directly to default.**
  Faster but breaks the trace-before-remove ritual: there is no controlled
  state to A/B against if a soak finds a regression. Rejected.

## Consequences

- **Off-main-thread metadata.** Backlinks/outgoing/tag/task/property
  computations no longer compete with the editor for cycles. The 1 000 ms
  debounce on the layout content-effect can shrink (or be removed) once
  Phase 5 lands.
- **Single source of truth.** `VaultIndex` replaces six TS stores. New
  consumers subscribe to `vault-index-updated` and read via `get_*_v2`
  commands; they do not reimplement orchestration.
- **Tab-switch reactivity wins shipped alongside.** Phase 4 removes a stray
  `forceDecorationRebuild.of(null)` rAF and adds `AbortController` to the
  tab-switch effect. Phase 5 rewrites the content-sync `$effect` so it no
  longer round-trips `view.state.doc.toString()` per keystroke.
- **Trace-before-remove ritual is mandatory** for every TS-side deletion
  in this migration (tasks 3.8, 4.2 if removing the rAF, 5.3, 6.5, 7.6,
  8.11, 9.2b, 9.5, 11.5, 11.6). Each commit body includes the explicit
  "Function A at [file:line] updates [store]. Replacement B at [file:line]
  also updates [store] via [mechanism]." sentence.
- **Soak windows are non-negotiable.** 30 minutes of manual smoke for the
  Phase 4.2 rAF removal; 4 hours of parallel emission for the Phase 9
  watcher cutover (with `< 1 percent` event-count delta gate); 2 days
  between flag default-on and TS orphan deletion for Phases 3, 6, 7, 8.
- **Dual implementations during migration.** Until Phase 11.5, the TS
  indexers and the Rust `VaultIndex` both run when the relevant flag is
  on. Memory cost is acceptable for the metadata footprint; the
  trace-before-remove ritual ensures we never delete a TS path before
  its Rust replacement is verified.
- **First nested experimental settings group.** `experimental:
  ExperimentalSettings` introduces a new pattern (existing groups like
  `SearchSettings` are flat top-level interfaces). Subsequent feature
  flags nest under the same parent.
- **`legacyTsIndexers` flag retained for first release** post-Phase 11.5
  as an escape hatch. Removed in a separate commit after a stable
  release window.
- **Re-evaluation triggers**: a phase's parity verification fails the
  delta gate; the `notify` crate ABI breaks compatibility with our tokio
  version; vault sizes grow to a point where the in-memory `VaultIndex`
  needs a disk-backed cache (a Phase 10 git-commit-hash cache evolution);
  a Tauri watcher API change makes JS-side filtering competitive again.

## Advice

The migration plan was validated against the codebase audit on 2026-04-28
and against `CLAUDE.md` rules (Indexing & Watcher items 1-10, Removing or
Refactoring Code mandatory checks, Plan Mode Workflow). The user
explicitly chose a balanced risk posture (30 min smoke / 4 h watcher
parity / 2 day soak) over a conservative or aggressive variant.

This ADR is `proposed` until Phase 2 lands a working `VaultIndex` with at
least the backlinks command (`get_backlinks_v2`) wired through and a
green `cargo test`. At that point the ADR moves to `active` in a separate
commit citing the merging code paths.

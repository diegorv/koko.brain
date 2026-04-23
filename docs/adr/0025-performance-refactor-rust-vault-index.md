---
type: ADR
id: "0025"
title: "Performance refactor: move vault metadata indexing from TS to a Rust VaultIndex, event-driven UI updates, three-tier change detection"
status: active
date: 2026-04-23
---

## Context

Every vault metadata index (backlinks, outgoing links, tags, tasks, frontmatter properties) is currently computed in TypeScript on the main thread, as recorded in ADR 0009 ("incremental indexing with reverse index"). ADR 0009 was a within-its-era optimisation: it made backlinks O(K) instead of O(N) via a reverse index, and added per-file incremental updates. But the entire pipeline — parsing wikilinks, extracting tags, extracting tasks, parsing frontmatter, maintaining per-file caches, fanning out to panels — still lives in JS and still runs on the event loop that CodeMirror needs for typing. On a 1 870-note vault:

- Cold vault open: hundreds of milliseconds of JS parsing after Rust returns the file contents.
- Tab switch: `updateActiveTabLinks` runs ~100 ms of O(N) work (even with the reverse index, building the resolution cache is still linear).
- Keystroke on a 500 kB file: the content-sync `$effect` in `MarkdownEditor.svelte` runs `view.state.doc.toString()` and a string-compare against the store on every reactive tick.
- Claude Code burst (20 files modified in 2 seconds): the TS watcher fan-out cascades into 20 index passes — `updateBacklinksForFile`, `updateOutgoingLinksForFile`, `updateTagIndexForFile`, `updateTaskIndexForFile`, `updateNoteInIndex`, etc. — each blocking the main thread briefly.

External factors that reshape the solution space:

- A macOS auto-commit daemon already commits vault changes every 30 s, independent of the app. The working tree is almost always clean.
- The Rust backend already holds SQLite (FTS5 full-text per ADR 0011 and ONNX semantic embeddings per ADR 0012), so a "Rust is authoritative for note metadata" model doesn't require new infrastructure — just a new index alongside those.
- ADR 0017's file watcher lives in TS via `tauri-plugin-fs`'s `watch()` API. Its callbacks also run on the JS main thread.
- ADR 0007 ("real stores, no mocks") and ADR 0016 ("plan mode, one commit per task") govern how this refactor is executed.

## Decision

**Move vault metadata indexing from TypeScript into a Rust `VaultIndex` that is the single source of truth for backlinks, outgoing links, tags, tasks, and frontmatter properties. Drive all UI consumers from a single `vault-index-updated` Tauri event. Migrate the file watcher to a native Rust implementation (crate `notify`) off the JS main thread. Cache the index to disk keyed by git commit hash so vault reopens are near-instant. Finalise change detection as three independent tiers (internal watcher + focus-based git diff + startup cache) that each degrade independently.**

The rollout is 11 phases (`tasks/todo/performance-architecture-refactor.md`), each independently reviewable and revertable, each shipping a visible win or a zero-risk foundation:

| Phase | Theme | Visible win | Behavioural change |
|---|---|---|---|
| 0 | Measurement baseline (probes + parser + template) | safety net | no |
| 1 | Rust entry enrichment (`NoteEntry`, extractors, `scan_vault_v2`) | none yet | no |
| 2 | Rust `VaultIndex` with reverse backlinks + `update_note_in_index` | none yet | no |
| 3 | Migrate backlinks consumers to `get_backlinks_v2` | fast tab switches | no |
| 4 | Tab-switch pipeline cleanup in `MarkdownEditor.svelte` | smoother tab UX | no |
| 5 | Keystroke reactivity: explicit `syncExternalContentToEditor` | smoother typing | ⚠️ subtle |
| 6 | Rust outgoing links (reads + unlinked mentions) | fast inspector | no |
| 7 | Rust tag + task indexes + write commands | fast tag/task views | no |
| 8 | Rust frontmatter + file-op commands | fast collections | no |
| 9 | Native Rust watcher + `vault-index-updated` + conflict banner | predictable updates, free JS thread | ⚠️ subtle |
| 10 | Git-commit-hash cache (`scan_vault_cached`) | instant vault reopen | ⚠️ opt-in |
| 11 | Three-tier change detection + delete TS indexers | unified model | ⚠️ full |

### Architectural patterns (apply uniformly)

1. **Event-driven update flow**. Every mutation: frontend invoke → Rust mutation (file I/O + `VaultIndex::update_entry` + SQLite if relevant) → Rust emits `vault-index-updated { changed, affected }` → frontend bumps `vaultStore.vaultIndexVersion` → consumer panels `$effect` re-fetch. Rust never mutates the index without emitting. Frontend never computes metadata locally.
2. **Consumer panel pattern**. Every panel that displays vault-derived data follows:
   ```svelte
   $effect(() => {
       const path = tabsStore.activePath;
       vaultStore.vaultIndexVersion;
       if (!path) { data = []; return; }
       invoke('get_X_v2', { path }).then(r => data = r);
   });
   ```
   Two reactive dependencies, one invoke, no local computation.
3. **Three permitted write surfaces**. After the refactor, TS may mutate vault files only through: (a) the editor save path (`editor.service.ts` → Rust `update_note_in_index`); (b) live-preview widgets editing the CM document via `view.dispatch` (no direct disk I/O — auto-save persists); (c) user-initiated file operations (`create_note`, `rename_note`, `delete_note`, `create_folder`, `update_frontmatter`, `rename_tag`, `toggle_task_status`, etc.) which are Rust commands. Template processing stays in TS as a pure string function (`src/lib/utils/template.ts`); template-generated file creation flows through category (c). Anything else is a bug to audit.
4. **Panel write-back branching**. When a panel edits vault state (Properties, Tags, inline frontmatter): local `$state` holds the draft while typing; on commit, branch: tab open → `view.dispatch` on the CM view (category b); tab closed → `invoke('update_X', ...)` (category c). Prevents conflicts with unsaved editor state.
5. **Atomic consistency**. After the frontend receives `vault-index-updated`, all consumer panels re-fetch from the same VaultIndex version — no panel shows stale data relative to another. Enforced by the single-event-per-mutation rule in Rust; TS cannot fan out partial updates.

### Three-tier change detection (end state, after Phase 11)

| Tier | Detection | Runs when | Typical latency |
|---|---|---|---|
| 1. Internal watcher (crate `notify`, tokio task) | fs events on `vault/*` | app running | <50 ms save → UI |
| 2. Focus-based `git status` + `git diff HEAD` | window focus + 10 s poll while focused | app focused | ≤10 s |
| 3. Startup git-commit-hash cache | `git diff cached_hash..HEAD` + `git status` | app open | near-instant load if hash matches |

Each tier degrades independently: watcher fails silently → focus poll catches up; focus poll fails → manual Cmd+R recovers; cache corruption → full scan rebuilds.

## Alternatives considered

- **Keep indexing in TS, optimise harder** (memoise more, cache resolution keys more aggressively). Explored during ADR 0009. Returns diminish once backlinks are O(K); remaining TS hot paths are tag/task/frontmatter extraction, which scale with content length, not with the reverse-index shape. A Rust parser is 10–50× faster and takes the CPU off the JS thread. Rejected.
- **Web Worker for indexing in TS**. Moves CPU off the main thread but keeps the JS GC pressure, postMessage overhead, and duplicate parser implementations (one in TS for workers, one still in Rust for FTS5/semantic chunking). Rejected.
- **SQLite as the authoritative index** (extend the FTS5 schema to store backlinks / tags / etc). Would force every panel query through rusqlite on every read; overkill for O(K) in-memory lookups; also commits the app to a schema migration story for every new index field. Keep SQLite for embeddings + FTS5; use an in-memory `VaultIndex` for everything else. Rejected.
- **Unified event stream from Rust** (one event per changed file, consumers aggregate). More flexible but breaks atomic consistency — two consumers can render different versions of the index during a burst. The single consolidated `vault-index-updated` event per debounced batch is the contract we need. Rejected.
- **Mutation-heavy TS with optimistic UI + Rust eventual consistency**. Lets the UI feel fast but allows the two-source-of-truth bug category back in. Rejected — the refactor's whole point is "Rust is authoritative".
- **Skip the git-hash cache, rely on full scan every open**. Full scan on a 1 870-note vault is ~2 s. The daemon makes the cache cheap to maintain (commits invalidate it correctly). Rejected.
- **Keep the TS watcher, just move its consumers to Rust commands**. The TS watcher still holds the event loop through `tauri-plugin-fs` callbacks, still needs JS-side debouncing, still fans out to multiple listeners. Native `notify` in a tokio task eliminates this entire class of main-thread work. Rejected for Phase 9.

## Consequences

- Every consumer panel converges to the same reactive shape (`$effect(activePath + vaultIndexVersion) → invoke → render`). New features that show vault-derived data follow this pattern by default.
- TS-side indexing code (`note-index.store.svelte.ts`, `backlinks.service.ts`, `tags.service.ts`, `tasks.service.ts`, `collection.service.ts`, `outgoing-links.service.ts`, `index-updater.service.ts`, `index-dedupe.ts`) is eventually deleted in Phase 11. Pure-logic helpers that have external callers (e.g. `resolveWikilink` in `backlinks.logic.ts`) are retained.
- All vault mutations become Rust commands. Direct `writeTextFile` / `mkdir` in feature code is banned (Phase 11.5b audit enforces this). Template processing stays in TS as a pure function; its output flows through `create_note`.
- The file watcher stops blocking the JS main thread. ADR 0017's TS-side fan-out is replaced by a single Rust-side orchestrator + one `vault-index-updated` event per debounced batch.
- Vault reopens become near-instant when the git state is unchanged from the previous session — the cache key is the commit hash, which the external auto-commit daemon moves forward predictably.
- Phases 5, 9, 10, 11 are flagged as behavioural changes. Each ships behind a feature flag (`settings.experimental.*`) and is enabled by default only after 1–2 weeks of real-use validation. Phase 11's TS-indexer removal (Task 11.5) is the one irreversible step; it ships with a `legacyTsIndexers: true` opt-out on first release.
- Perf claims in commit bodies must cite before/after numbers via the template in `docs/perf/baseline-template.md` processed through `scripts/perf-baseline.py`.
- SQLite (FTS5 + ONNX) is untouched — it remains the search layer and is explicitly not absorbed by the VaultIndex. The external macOS auto-commit daemon is also untouched; the refactor relies on its commits but never commits itself.
- Re-evaluation triggers: if a future feature needs query shapes beyond "backlinks of X", "notes with tag Y", "notes where property Z == V" — e.g., graph queries across multiple hops — the in-memory `VaultIndex` may need to be reshaped or partially swapped for a more structured backing store. Revisit when the consumer demands that shape.

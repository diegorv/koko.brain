---
type: ADR
id: "0010"
title: "QueryJS (kb-api) as Dataview-style scripting with per-session caches"
status: active
date: 2026-04-22
---

## Context

Power users want to query their vault from inside a note: "list all pages tagged `#project` modified in the last week," "show a table of meeting notes with their dates and attendees." Obsidian's Dataview fills this role in its ecosystem; adopting Dataview verbatim is not possible (license + JavaScript engine coupling) and would also import a large, complex plugin that does not match the rest of Kokobrain.

The queries must:

- Run inside `` ```queryjs `` fenced blocks in the editor's live preview.
- Have access to a rich data model: pages, links, properties, tags, dates.
- Complete in O(vault) once per widget render, not O(vault²).
- Survive viewport re-entry without re-executing expensive scripts on every scroll.
- Handle async scripts (network fetches, `kb.view()` calls that paginate) without returning an empty `undefined` synchronously.

## Decision

**Build a custom scripting API (`KBAPI`) in `src/lib/plugins/queryjs/kb-api.ts`, wired into CodeMirror via a block widget (`queryjs-block-widget.ts`), with three caches: a per-KBAPI `_pageCache`, a per-session `WikilinkResolutionCache` reused across `buildKBPage` calls, and a per-session `queryjsSessionStore` that keeps a live DOM reference to each rendered block by content hash.** Provide both `kb` (new) and `dv` (Dataview-style alias) entry points for familiarity.

Key pieces:

- **`KBAPI` class** (`kb-api.ts:16-80`): instantiated per widget render with `container`, `propertyIndex`, `noteIndex`, `noteContents`, `currentFilePath`, `vaultPath`, `loadScript`. Exposes `pages()`, `pagePaths()`, `current()`, `page(path)`, `.view()`, date/time helpers (`KBDateTime`), UI primitives (`KBUI`), and a `DataArray` fluent iterator.
- **`_pageCache`** — built on first `pages()` / `current()` / `page()` call, reused for the whole widget execution. Avoids rebuilding `KBPage` objects per chained query.
- **`WikilinkResolutionCache`** (`CLAUDE.md` Indexing rule 8) — one `Map<basename, absolutePath>` per query session, passed into every `buildKBPage` call. Resolves each outlink via `resolveWikilinkCached` (O(1)) instead of scanning `allFilePaths` per wikilink (O(N)). Drops outlink cost on a full-vault query from O(N² × L) to O(N + N × L) — ~17 M ops → ~10 k on a 1870-note vault.
- **`queryjsSessionStore`** (`queryjs-session.store.svelte.ts`) — per-session `Map<contentHash, HTMLElement>` storing a **live DOM reference** (not a deep clone) plus a `Set<notePath>` tracking which notes have auto-run this session and a reverse index for per-path invalidation. On cache hit, the widget moves the same element into the fresh CodeMirror container; because the node itself is preserved, `<canvas>` pixel buffers, `<iframe>`/`<video>` playback state and any other mutable DOM state survive viewport re-entry without special casing. Entries are dropped when a tab closes (`editor.service.ts → closeTab`) and the whole store is reset on vault teardown.
- **Pending-view tracking** (`kb-api.ts:_pendingViews` + `awaitAllPending()`) — every `kb.view()` call pushes its promise into a per-instance tracker; the widget's `execute()` awaits all pending promises after the user code returns so bare `kb.view(...)` calls still complete before the cache entry is stored. Covers both `await kb.view(...)` and bare `kb.view(...)` uniformly without a regex pass on the user's source.
- **Execution policy** (`settings.queryjs.autoRunQueries`, `'first-open' | 'always' | 'manual'`) — the widget consults the policy on cache miss. `'first-open'` (default) executes once per note per session, then renders a `▶ Run` button for subsequent cache misses (typical: the block was edited and the content hash changed). `'always'` re-runs every miss. `'manual'` always renders `▶ Run` on miss, never auto-executes.

## Alternatives considered

- **Port Dataview verbatim**: license + upstream velocity + massive codebase make this impractical.
- **Dataview-compatible syntax only (DQL subset)**: declarative, less flexible, users still need an escape hatch to JavaScript. Rejected — `kb.pages()` chained with `DataArray` gives full JS control without a second language.
- **No caching — re-execute on every render**: simplest; real user scripts take 50–500 ms, so scroll jank is immediate. Rejected.
- **Cache by widget identity rather than script content**: fails when the same script appears in multiple notes — we want one cache entry per distinct script body.
- **Require explicit `await` on `kb.view()`**: punts the footgun onto the user; most `queryjs` blocks are written ad-hoc and the symptom (silent blank render) is hard to debug. Rejected — pending-view tracking covers bare calls without asking users to change anything.
- **Deep-clone the rendered DOM on cache set / cache get**: simple isolation between widget instances, but `cloneNode(true)` doesn't copy `<canvas>` pixel buffers or `<iframe>`/`<video>` playback state, which forces an exclusion branch that re-executes on every render for those containers. Rejected in favor of the live-reference cache — accepts the duplicate-hash edge case documented under Consequences but removes the need for special casing media elements.
- **Pre-compute all `KBPage` objects upfront**: wastes memory and work on notes never queried; the per-widget `_pageCache` is lazy and bounded.

## Consequences

- `kb`/`dv` are rich enough that most user queries are one-liners: `kb.pages('#project').sort(p => p.file.mtime).limit(10)`.
- Live-reference caching means a `<canvas>`-based Chart.js chart renders once per session per note; viewport re-entry reuses the same canvas element with its pixel buffer intact. No more "blank square on scroll-back" regression.
- Duplicate-hash edge case: if the same `` ```queryjs `` block appears verbatim in two open notes, both widgets compete for the single cached element. The last widget to toDOM "wins" — the other widget's container is empty until the next rebuild. Rare in practice; `autoRunQueries: 'always'` sidesteps this by re-executing every miss.
- `queryjsSessionStore` is not invalidated on vault content changes — it's keyed on script body, so a script that reads stale data shows stale data until the widget content changes or the user hits `▶ Run`. The per-KBAPI `_pageCache` is still rebuilt on every new widget render, which re-reads fresh `noteIndex`/`noteContents`, so the visible staleness is bounded to "within the cached render." `invalidateQueryjsCache()` (called on save via `editor.hooks.ts` and on vault index rebuild via `watcher-handler.service.ts`) remains as a compatibility shim that resets the whole store.
- Adding a new `kb.*` method requires updating the `KBAPI` class, `queryjs.types.ts`, and often `DataArray` too. Follow the existing method pattern (lazy caches, no hidden I/O inside the chain).
- Re-evaluation triggers: users demand Dataview DQL compatibility; we want to move indexes into Rust and query them via IPC (would kill the need for the per-session resolution cache); a sandboxed JS execution layer (Web Workers) is introduced.

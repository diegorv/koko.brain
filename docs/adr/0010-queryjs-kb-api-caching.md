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

**Build a custom scripting API (`KBAPI`) in `src/lib/plugins/queryjs/kb-api.ts`, wired into CodeMirror via a block widget (`queryjs-block-widget.ts`), with three caches: a per-KBAPI `_pageCache`, a per-session `WikilinkResolutionCache` reused across `buildKBPage` calls, and a module-level `scriptResultCache` keyed by script content.** Provide both `kb` (new) and `dv` (Dataview-style alias) entry points for familiarity.

Key pieces:

- **`KBAPI` class** (`kb-api.ts:16-80`): instantiated per widget render with `container`, `propertyIndex`, `noteIndex`, `noteContents`, `currentFilePath`, `vaultPath`, `loadScript`. Exposes `pages()`, `pagePaths()`, `current()`, `page(path)`, `.view()`, date/time helpers (`KBDateTime`), UI primitives (`KBUI`), and a `DataArray` fluent iterator.
- **`_pageCache`** — built on first `pages()` / `current()` / `page()` call, reused for the whole widget execution. Avoids rebuilding `KBPage` objects per chained query.
- **`WikilinkResolutionCache`** (`CLAUDE.md` Indexing rule 8) — one `Map<basename, absolutePath>` per query session, passed into every `buildKBPage` call. Resolves each outlink via `resolveWikilinkCached` (O(1)) instead of scanning `allFilePaths` per wikilink (O(N)). Drops outlink cost on a full-vault query from O(N² × L) to O(N + N × L) — ~17 M ops → ~10 k on a 1870-note vault.
- **`scriptResultCache`** (`CLAUDE.md` Live Preview rule 2) — module-level `Map<scriptContent, HTMLElement>`. On cache hit, `cloneNode(true)` the cached DOM and return it from `toDOM()`, skipping script re-execution entirely.
- **Auto-await wrapping** (`CLAUDE.md` Live Preview rule 8) — `queryjs-block-widget.ts` wraps user scripts in `return (async () => { … })()` and regex-prepends `await` to top-level `kb.view(` / `dv.view(` calls. Without this, `` ```queryjs\nkb.view("…")\n``` `` (no explicit `await`) runs the async IIFE, kicks off `kb.view()`, returns `undefined` synchronously, and `scriptResultCache.set(cloneNode(container))` captures an empty container before the inner script writes DOM. Next cache hit then clones the blank snapshot.
- **Cache exclusions** (`CLAUDE.md` Live Preview rule 9) — `scriptResultCache` skips containers holding `<canvas>`, `<video>`, or `<iframe>` because `cloneNode(true)` doesn't clone pixel buffers / playback state. Chart.js widgets would otherwise cache as blank squares. These re-execute on every `toDOM()`; the per-KBAPI `_pageCache` + O(1) wikilink resolution keep re-execution bounded — a 1870-note vault re-renders in ~200 ms.

## Alternatives considered

- **Port Dataview verbatim**: license + upstream velocity + massive codebase make this impractical.
- **Dataview-compatible syntax only (DQL subset)**: declarative, less flexible, users still need an escape hatch to JavaScript. Rejected — `kb.pages()` chained with `DataArray` gives full JS control without a second language.
- **No caching — re-execute on every render**: simplest; real user scripts take 50–500 ms, so scroll jank is immediate. Rejected.
- **Cache by widget identity rather than script content**: fails when the same script appears in multiple notes — we want one cache entry per distinct script body.
- **Require explicit `await` on `kb.view()`**: punts the footgun onto the user; most `queryjs` blocks are written ad-hoc and the symptom (silent blank render) is hard to debug. Rejected — the regex prepend is boring and correct.
- **Pre-compute all `KBPage` objects upfront**: wastes memory and work on notes never queried; the per-widget `_pageCache` is lazy and bounded.

## Consequences

- `kb`/`dv` are rich enough that most user queries are one-liners: `kb.pages('#project').sort(p => p.file.mtime).limit(10)`.
- Users writing `<canvas>`-based charts (Chart.js) pay re-execution on every scroll-in. Acceptable: their script is small + vault-bounded; for anything heavier, they use `kb.ui` primitives that do cache.
- The auto-await regex is fragile — if a user writes `kb.view(args)` *inside* a function they define locally, we still prepend `await`. This is acceptable because the function call either awaits a promise (correct) or awaits a non-promise (effectively a no-op that just returns the value). The regex targets top-level `kb.view(` / `dv.view(` patterns only.
- Adding a new `kb.*` method requires updating the `KBAPI` class, `queryjs.types.ts`, and often `DataArray` too. Follow the existing method pattern (lazy caches, no hidden I/O inside the chain).
- `scriptResultCache` is not invalidated on vault content changes — it's keyed on script body, so a script that reads stale data will show stale data. The per-KBAPI `_pageCache` is rebuilt on every new widget render, which re-reads fresh `noteIndex`/`noteContents`, so the visible staleness is bounded to "within a single render."
- Re-evaluation triggers: users demand Dataview DQL compatibility; we want to move indexes into Rust and query them via IPC (would kill the need for the per-session resolution cache); a sandboxed JS execution layer (Web Workers) is introduced.

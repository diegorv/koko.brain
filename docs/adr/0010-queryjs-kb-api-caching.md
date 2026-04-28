---
type: ADR
id: "0010"
title: "QueryJS execution model — session cache + autoRunQueries policy"
status: active
date: 2026-04-28
---

## Context

Power users want to query their vault from inside a note: "list all pages tagged `#project` modified in the last week," "show a table of meeting notes with their dates and attendees." The KBAPI scripting layer (`src/lib/plugins/queryjs/kb-api.ts`) provides this through `kb.pages()`, `DataArray`, `KBUI`, `KBDateTime`, and `kb.view()` — a JS-fluent alternative to Dataview without taking on its license / upstream / footprint.

Two problems shaped how the **execution model** is wired into CodeMirror:

1. **Re-executing on every `toDOM()` is too expensive.** Real user scripts read the full vault index, render charts, paginate large datasets — anywhere from 50 ms to 500 ms per render. CodeMirror destroys and re-creates widgets when they leave + re-enter the viewport, so a naive "execute on every render" approach ran the script multiple times per scroll cycle.
2. **The original `scriptResultCache` (clone + regex auto-await) had three coupled hacks:** (a) a regex that prepended `await` to top-level `kb.view(` / `dv.view(` calls so unawaited views wouldn't return `undefined` synchronously and cause cache to capture an empty container; (b) `container.cloneNode(true)` on cache write so multiple cache hits got distinct DOM trees; (c) an exclusion list (`querySelector('canvas, video, iframe')`) because `cloneNode(true)` doesn't clone pixel buffers / playback state. Three coupled workarounds for one underlying gap: no explicit execution control.

## Decision

**Execute QueryJS blocks under a per-session cache + per-file `autoRunQueries` policy, with an explicit ▶ Run button on cache miss when policy says not to auto-execute. The result cache holds live `HTMLElement` references, not clones.**

### Pieces

- **`queryjsSessionStore`** (`src/lib/plugins/queryjs/queryjs-session.store.svelte.ts`):
    - `resultCache: Map<contentHash, HTMLElement>` — the rendered DOM, keyed by script content. **Live element reference, not a clone.** When CodeMirror destroys the widget, the DOM detaches but stays alive (held by the store); re-mount re-attaches the same node, preserving canvas/video/iframe state through DOM identity.
    - `autoRunOnFirstOpen: Set<filePath>` — files that have auto-executed at least once this session. Drives the `'first-open'` policy.
    - Methods: `hasResult` / `getResult` / `setResult` / `invalidate(contentHash)`; `hasAutoRun` / `markAutoRun` / `invalidatePath(filePath)`; `reset()` (vault teardown).

- **`autoRunQueries` setting** (`settingsStore.queryjs.autoRunQueries`, default `'first-open'`):
    | Policy | Cache hit | Cache miss + first-open | Cache miss after edit | Cache miss + manual |
    | --- | --- | --- | --- | --- |
    | `first-open` | re-attach DOM | execute + mark autoRun | ▶ Run | n/a |
    | `always` | re-attach DOM | execute (always) | execute (always) | n/a |
    | `manual` | re-attach DOM | n/a | n/a | ▶ Run |

    **Invariant:** clicking ▶ Run in manual mode does NOT mark the file as `autoRun`. A user who switches policy back to `'first-open'` will see the ▶ Run button again until each file is auto-run once.

- **`KBAPI._pendingViews` + `awaitAllPending()`** (`kb-api.ts`): `kb.view()` registers its returned Promise on the array; the widget calls `await api.awaitAllPending()` after the user script's IIFE resolves. Replaces the legacy auto-await regex — same effect (unawaited `kb.view()` no longer caches an empty container) without rewriting the user's source.

- **Lifecycle hooks**:
    - `closeTab` / `closeTabsForDeletedPath` (editor.service.ts) → `queryjsSessionStore.invalidatePath(path)` (cache stays; only the autoRun marker drops).
    - `notifyAfterSave` (editor.hooks.ts) → currently calls `invalidateQueryjsCache()` (a shim around `queryjsSessionStore.reset()`). Phase 12.5 will narrow this to `queryjsSessionStore.invalidate(jsContent)` per just-edited block.
    - `teardownVault` (app-lifecycle.service.ts) → `queryjsSessionStore.reset()`.

### Existing pieces that stay

- **`KBAPI._pageCache`** — built on first `pages()` / `current()` / `page()` call, lives for the duration of one widget execution. Avoids rebuilding `KBPage` objects per chained query.
- **`WikilinkResolutionCache`** (CLAUDE.md Indexing rule 8) — one `Map<basename, absolutePath>` per query session, drops outlink resolution from O(N²×L) to O(N+N×L). Reused unchanged.

## Alternatives considered

- **Keep auto-await regex + clone semantics.** Simplest patch path. Rejected — the three workarounds (regex / clone / exclusion list) coupled with each other and made `<canvas>` widgets either render blank or re-execute on every scroll. The new model removes all three at once.
- **Web Worker sandbox for script execution.** Cleaner isolation, but `kb.ui.*` writes directly to the widget's DOM, which a Worker can't do without postMessage marshalling — too invasive for the value gained today.
- **Per-block "execute" toggle in the markdown source** (e.g. `kb-run`/`kb-norun` fence info). Pollutes the source format. Rejected.
- **Cache by widget identity, not content.** Fails when the same script appears in two notes — we want one cache entry per distinct script body.
- **`always` as the default**, matching the legacy "execute on every render" behaviour. Rejected — the cache-hit-on-scroll wins are the reason for the new model. `always` remains available for users who need fresh data on every render (e.g., `kb.view()` calls that fetch live data).

## Consequences

- Most user queries now render instantly when scrolling away and back (cache hit).
- A new `kb.view()` widget that uses `<canvas>` (Chart.js, custom drawings) keeps its rendered state across scroll-out/in without re-execution. State preservation comes from DOM identity, not cloning — significantly simpler than the legacy approach.
- Editing a queryjs block invalidates the cached result; on the next render, the user gets ▶ Run unless policy is `'always'`. Removes accidental re-executions while typing inside a block.
- Users on `'manual'` see ▶ Run for every cache miss. They can flip to `'first-open'` to opt into the cached / first-open auto-execution model.
- The auto-await footgun is gone: a function-local `kb.view()` defined inside the script no longer accidentally gets `await`-prefixed because there's no regex anymore. The Promise is registered and awaited centrally.
- New `kb.*` methods that return Promises and want to participate in `awaitAllPending()` should follow the `view()` pattern: register on `_pendingViews`, return the Promise. Otherwise their async work may complete after `setResult()` and miss being captured.
- Re-evaluation triggers: users want fresh data without picking `'always'` (could add a per-block "stale" indicator + a per-source ttl); we move the index layer to Rust + IPC (would change `_pageCache` lifecycle); a sandboxed JS execution layer (Workers) is introduced.

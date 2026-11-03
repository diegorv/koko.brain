---
type: ADR
id: "0010"
title: "QueryJS execution model — session cache + autoRunQueries policy"
status: active
date: 2026-04-28
---

## Amendment (2026-11-01): the public surface is a versioned contract

The script-facing API is `src/lib/plugins/queryjs/contract/kb-api.v1.ts`: `KBApiV1`, `KBUIV1`, `DataArrayV1`, `KBDateTimeV1`, `KBPageV1`, `KBLinkV1`, `KBTaskV1` and the `kb.ui` option types. It is hand-written and imports nothing; `KBAPI`, `KBUI`, `DataArray` and `KBDateTime` `implements` it, and members are function-typed properties so the check uses strict variance. Anything a class exposes beyond the contract (`awaitAllPending`, `_values`, TS-private members) is internal. `KBScriptApiV1` and `ScriptDataArrayV1` in the same file are the script-facing typing of that surface: they add the Proxy's property-mapping shorthand (`kb.pages().file.link`), which a class cannot implement, and type `help/examples/queryjs-globals.d.ts`. `kb.version` is the integer major (`1`). New `kb` / `kb.ui` members are additive; a new DataArray member or page-root key is a major change, because both can shadow a user's frontmatter key. `src/tests/lib/plugins/queryjs/kb-api-contract.test.ts` freezes the runtime surface and the page shape. The policy for script authors is in `help/documentation/13-queryjs.md` ("API version and compatibility").

## Amendment (2026-11-03): the first-open mark lands after the render pass

Under `first-open` the per-file marker was set inside the first block's `toDOM()`, so the next block in the same pass saw the file as already run and showed ▶ Run: only the first block of a note auto-ran. The widget now schedules the mark (`markAutoRunAfterRenderPass`): a timer queued from the next animation frame, after CodeMirror's measure pass, so every block built in the first render pass of a file auto-runs. A block first built on a later scroll shows ▶ Run. The policy matrix is unchanged, including "cache miss after edit -> ▶ Run" and the manual-mode invariant; the marker stays per file. A per-block marker (`filePath + jsContent`) was rejected: an edited block has new text and no marker, so it would auto-run on every edit-exit.

## Amendment (2026-11-03): results are keyed on file plus block text, and dropping one destroys its charts

The result cache key is the note's path plus the block text (`Map<filePath + jsContent, HTMLElement>`; `hasResult` / `getResult` / `setResult` / `invalidate` take `(filePath, jsContent)`). The content-only key below assumed a script's output depends only on its text, but shared view scripts read `kb.current()`: a weekly note re-attached another week's chart. Notes that share a block no longer share its result, so each note runs it once; the "Cache by widget identity" alternative is still rejected, because the key is the note, not the widget instance. `execute()` runs against the path `toDOM()` captured, not `editorStore.activeTabPath` read after its await, so fast prev/next cannot run a block against the next note.

Chart.js keeps every chart in a module-level registry until `destroy()`, so dropping a result without destroying its charts kept its canvases alive for the session. `kb.ui.chart()` records each chart by canvas (`queryjs-charts.ts`). The store destroys the charts of a result it drops (`invalidate`, `clearResults`, `reset`, a `setResult` that replaces another element) when the result is detached; a result still on screen keeps drawing (`clearResults` runs on every save), and `QueryjsBlockWidget.destroy(dom)` destroys its charts once CodeMirror removes the widget and the cache no longer holds the result. A run still in flight is skipped there: it caches its container when it settles. The lifecycle line below is corrected: content invalidation calls `invalidateQueryjsCache()`, a shim around `clearResults()` (results drop, autoRun markers stay), not `reset()`.

## Amendment (2026-11-03): blocks share one page set per index state

Each block built its own page set on its first `pages()` / `current()` / `page()` call: a weekly note with several blocks rebuilt every note's `KBPage` once per block (about 70 ms each on a 10k-note vault). The set now lives in one module-level slot in `kb-api.ts`, keyed on the entries snapshot array identity (one array per index version from `getVaultEntries()`; a vault switch invalidates it) plus `collectionStore.version`, which the widget passes as `propertyIndexVersion`. A new key rebuilds and replaces the slot. Each `KBAPI` instance keeps the set it got on its first read, so a block that awaits (`kb.view`, a script load) keeps stable page identity and its own writes even when a block at a newer key replaces the slot. `pages()` hands each call its own copy of the list, so `mutate` or an in-place reorder in one block cannot change another block's list. The page objects stay shared: a script that writes to a page (a `mutate` that assigns a field, `p.file.tags.push()`) is seen by later blocks at the same index state. `p.file.tags` was already the entries-memo array before this change; the shared surface now also covers `inlinks`, `outlinks`, `tasks`, `KBDateTime` values and page-root properties. A deep copy per block was not taken: it would cost most of what the shared build saves.

## Context

Power users want to query their vault from inside a note: "list all pages tagged `#project` modified in the last week," "show a table of meeting notes with their dates and attendees." The KBAPI scripting layer (`src/lib/plugins/queryjs/kb-api.ts`) provides this through `kb.pages()`, `DataArray`, `KBUI`, `KBDateTime`, and `kb.view()` — a JS-fluent alternative to Dataview without taking on its license / upstream / footprint.

Two problems shaped how the **execution model** is wired into CodeMirror:

1. **Re-executing on every `toDOM()` is too expensive.** Real user scripts read the full vault index, render charts, paginate large datasets — anywhere from 50 ms to 500 ms per render. CodeMirror destroys and re-creates widgets when they leave + re-enter the viewport, so a naive "execute on every render" approach ran the script multiple times per scroll cycle.
2. **The original `scriptResultCache` (clone + regex auto-await) had three coupled hacks:** (a) a regex that prepended `await` to top-level `kb.view(` / `dv.view(` calls so unawaited views wouldn't return `undefined` synchronously and cause cache to capture an empty container; (b) `container.cloneNode(true)` on cache write so multiple cache hits got distinct DOM trees; (c) an exclusion list (`querySelector('canvas, video, iframe')`) because `cloneNode(true)` doesn't clone pixel buffers / playback state. Three coupled workarounds for one underlying gap: no explicit execution control.

## Decision

**Execute QueryJS blocks under a per-session cache + per-file `autoRunQueries` policy, with an explicit ▶ Run button on cache miss when policy says not to auto-execute. The result cache holds live `HTMLElement` references, not clones.**

### Pieces

- **`queryjsSessionStore`** (`src/lib/plugins/queryjs/queryjs-session.store.svelte.ts`):
    - `resultCache: Map<filePath + jsContent, HTMLElement>` — the rendered DOM, keyed by the note and the script content (content only before the 2026-11-03 amendment). **Live element reference, not a clone.** When CodeMirror destroys the widget, the DOM detaches but stays alive (held by the store); re-mount re-attaches the same node, preserving canvas/video/iframe state through DOM identity.
    - `autoRunOnFirstOpen: Set<filePath>` — files that have auto-executed at least once this session. Drives the `'first-open'` policy.
    - Methods: `hasResult` / `getResult` / `setResult` / `invalidate(filePath, jsContent)`, `clearResults()`; `hasAutoRun` / `markAutoRun` / `invalidatePath(filePath)`; `reset()` (vault teardown).

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
    - Content invalidation (`notifyAfterSave`, the watcher, Trash restore, through the `queryjs-cache` content-invalidation listener) → `invalidateQueryjsCache()`, a shim around `queryjsSessionStore.clearResults()`. Phase 12.5 will narrow this to `queryjsSessionStore.invalidate(filePath, jsContent)` per just-edited block.
    - `teardownVault` (app-lifecycle.service.ts) → `queryjsSessionStore.reset()`.

### Existing pieces that stay

- **The KBAPI page set** — built on the first `pages()` / `current()` / `page()` call. Avoids rebuilding `KBPage` objects per chained query. Since the 2026-11-03 amendment it is shared by every block at one index state instead of living for one widget execution.
- **`WikilinkResolutionCache`** (CLAUDE.md Indexing rule 8) — one `Map<basename, absolutePath>` per query session, drops outlink resolution from O(N²×L) to O(N+N×L). Reused unchanged.

## Alternatives considered

- **Keep auto-await regex + clone semantics.** Simplest patch path. Rejected — the three workarounds (regex / clone / exclusion list) coupled with each other and made `<canvas>` widgets either render blank or re-execute on every scroll. The new model removes all three at once.
- **Web Worker sandbox for script execution.** Cleaner isolation, but `kb.ui.*` writes directly to the widget's DOM, which a Worker can't do without postMessage marshalling — too invasive for the value gained today.
- **Per-block "execute" toggle in the markdown source** (e.g. `kb-run`/`kb-norun` fence info). Pollutes the source format. Rejected.
- **Cache by widget identity, not content.** Fails when the same script appears in two notes — we want one cache entry per distinct script body. (Superseded by the 2026-11-03 amendment: results are keyed by note path plus script text.)
- **`always` as the default**, matching the legacy "execute on every render" behaviour. Rejected — the cache-hit-on-scroll wins are the reason for the new model. `always` remains available for users who need fresh data on every render (e.g., `kb.view()` calls that fetch live data).

## Consequences

- Most user queries now render instantly when scrolling away and back (cache hit).
- A new `kb.view()` widget that uses `<canvas>` (Chart.js, custom drawings) keeps its rendered state across scroll-out/in without re-execution. State preservation comes from DOM identity, not cloning — significantly simpler than the legacy approach.
- Editing a queryjs block invalidates the cached result; on the next render, the user gets ▶ Run unless policy is `'always'`. Removes accidental re-executions while typing inside a block.
- Users on `'manual'` see ▶ Run for every cache miss. They can flip to `'first-open'` to opt into the cached / first-open auto-execution model.
- The auto-await footgun is gone: a function-local `kb.view()` defined inside the script no longer accidentally gets `await`-prefixed because there's no regex anymore. The Promise is registered and awaited centrally.
- New `kb.*` methods that return Promises and want to participate in `awaitAllPending()` should follow the `view()` pattern: register on `_pendingViews`, return the Promise. Otherwise their async work may complete after `setResult()` and miss being captured.
- Re-evaluation triggers: users want fresh data without picking `'always'` (could add a per-block "stale" indicator + a per-source ttl); we move the index layer to Rust + IPC (would change the page set lifecycle); a sandboxed JS execution layer (Workers) is introduced.

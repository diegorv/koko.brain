# F deep dive: docReplace 142-156 ms on the fruit fly note

Source: owner log `~/Library/Logs/com.diegorv.kokobrain/2026-11-02_14-52-43.log`, code at `main` (99a4aed5),
microbenchmark `/tmp/ui-resp-bench/F/bench.mjs` (node, real Svelte 5.57.2 `proxy` from `node_modules`).

## Summary

- Root cause (VERIFIED code path, cost MEASURED in a bench that matches the log): every image or note embed
  widget that CodeMirror draws calls `appEditorHost.resolveLink`, which flattens the whole 42,925-node
  file tree through the Svelte deep `$state` proxy and then scans every path twice. One call costs
  about 46 ms (bench p50, prod Svelte; 76 ms with the `development` condition).
- The fruit fly note has 3 embeds in the viewport that the doc-replace dispatch draws: 3 x 46 = 130 ms
  in the bench vs 142 and 156 ms in the log. Every note in the ~50 ms cluster is a reading-list note with
  one embed in the first viewport. Notes without embeds take 2-8 ms.
- Thread: webview JS main thread (input and paint blocked). The tab-switch scroll restore draws a second
  viewport, which builds more embeds (INFERRED): the 462 ms `[HB] stall` covers both waves.
- Fix: resolve through a `buildResolutionCache` map memoised on the `fsStore.fileTree` identity. It
  already exists and returns the same results. Gain: about 45 ms per embed drawn, so 142 ms becomes about 5 ms.
  It also removes the same hitch while scrolling through image-heavy notes. Quick win.

## Evidence

### Log (VERIFIED)

Fruit fly, first open (log lines 9658-9696):
- `17:54:50.092` dispatch. The decorator LP-TRACE pairs all close by `50.096`, so plugin JS takes 4 ms.
- `50.235` `docReplace: 142.0ms`. That leaves 139 ms with no logged work inside the dispatch.
- `50.356` first rAF ("restoring scroll"), visibleRanges `1657-4535`. The dispatch drew the viewport at
  the previous tab's scrollTop.
- `50.362` `[HB] stall 462ms`.
- `50.529` second rAF, visibleRanges `364-2016` after `scrollTo(0,0)`. The first-rAF-to-second-rAF gap is 173 ms.

Fruit fly, second open (`17:54:51.426`): `docReplace: 156.0ms`, visibleRanges `364-2248`, `[HB] stall 356ms`.

Every docReplace of 20 ms or more in the session (dispatch and result lines paired):

| time | ms | chars | note |
|---|---|---|---|
| 17:54:50.092 | 142 | 14,628 | reading-list fruit fly |
| 17:54:51.426 | 156 | 14,628 | reading-list fruit fly (re-open) |
| 17:54:49.803 / 50.777 / 51.612 | 52 / 54 / 71 | 17,879 | reading-list AI & Tech Radar |
| 17:54:50.555 / 51.277 | 62 / 61 | 17,979 | reading-list Laya |
| 17:54:51.044 | 50 | 7,646 | reading-list "Just Call SAM" |
| 17:53:35.044 | 50 | 15,737 | `_gmail-inbox-01-07-2026.md` (content not inspected) |
| others | 20-42 | 550-9,843 | journal, collection, mermaid, regression fixtures (other widgets) |

The 65-124 KB notes take 2-9 ms, so size does not drive the cost.

### The note (VERIFIED, read the named path)

There are 14 `![[...]]` embeds. Each target is a full vault-relative path
(`vault/reading-list/medium-com-roanonlydevs/images/....gif|png`), at char offsets
575, 1079, 1797, 2614, 3420, 5435, ...

- Dispatch viewport `1657-4535` holds 3 embeds (1797, 2614, 3420): 142 ms.
- Re-open viewport `364-2248` holds 3 embeds (575, 1079, 1797): 156 ms.
- Radar's viewport `253-2313` holds its one embed (offset 433 per scout F1): 52-71 ms.

The folder `vault/reading-list/medium-com-roanonlydevs/` (non-recursive ls and grep) has 318 notes.
278 of them contain `![[`, with 1,579 embeds in total (about 5.7 per note). Its `images/` folder has 315 entries.

### Code path (VERIFIED)

- `src/lib/core/markdown-editor/MarkdownEditor.svelte:262-268`: the timed span is one synchronous
  `replaceDoc` dispatch (`:77-95`).
- `plugins/wikilink-embed-plugin.ts:79-91` builds a `WikilinkImageEmbedWidget` or `WikilinkNoteEmbedWidget`
  per embed over the expanded ranges. The builder does not touch the host, which is why LP-TRACE is cheap.
- `extensions/live-preview/widgets.ts:559-570`: `WikilinkImageEmbedWidget.toDOM` calls
  `resolveImageEmbedAssetUrl` (`:544-548`), which calls `host.resolveLink(target)` (`:545`).
- `widgets.ts:652` and `:591-597`: `WikilinkNoteEmbedWidget.toDOM` calls `loadEmbedContent`, which runs
  `host.resolveLink` synchronously before its first `await`. Note embeds pay the same cost.
- `src/lib/app/editor-host.ts:59-61` runs
  `resolveWikilink(target, flattenFileTree(fsStore.fileTree).map((f) => f.path))` on every call.
- `src/lib/core/filesystem/file-entries.logic.ts:10-26`: `flattenFileTree` does a full recursive walk with a
  `push(...spread)` per directory and one object per file.
- `src/lib/core/filesystem/fs.store.svelte.ts:6,27`: `fileTree` is a deep `$state`, so every
  `node.isDirectory/children/name/path` read goes through a Svelte proxy `get` trap.
- `src/lib/core/filesystem/wikilink-resolution.logic.ts:11-35`: pass 1 compares `getNoteName(path)`
  (split + pop + lastIndexOf + substring + toLowerCase) for every path. A path-style target never matches
  in pass 1, because a note name has no `/`. So pass 1 always runs to the end, then pass 2 scans until it
  finds the basename.
- The `EditorHost` contract allows `toDOM` callers (`core/markdown-editor/editor-host.ts:28-31`), but CLAUDE.md
  Live Preview rule 2 forbids expensive work in `toDOM`, and widgets re-run `toDOM` whenever they re-enter
  the viewport (rule 3).

### Microbenchmark (MEASURED, `/tmp/ui-resp-bench/F/bench.mjs`)

Synthetic tree: 42,925 nodes (3,000 dirs, 39,925 files: .md plus .png), absolute paths, wrapped in the real
Svelte `proxy`. Target: a path-style image embed in the middle of the tree. Node on the throttled Mac.

| operation | p50 (prod) | p50 (`--conditions=development`) |
|---|---|---|
| `flattenFileTree` on the plain tree | 2.7 ms | 2.5 ms |
| `flattenFileTree` through the Svelte proxy | 22.3 ms | 37.0 ms |
| `resolveWikilink` over the paths (path-style target) | 18.0 ms | 28.2 ms |
| **`resolveLink` as shipped (1 embed)** | **46.0 ms** | **76.1 ms** |
| **as shipped x3 (fruit fly viewport)** | **129.8 ms** | **249.3 ms** |
| `buildResolutionCache` once | 22.6 ms | 26.1 ms |
| `resolveWikilinkCached` x1000 | 0.38 ms | 0.44 ms |

With 8,000 dirs, `resolveLink` takes 52.7 ms. The cold first walk through the proxy, which creates the lazy
sources, takes 74 ms. `resolveWikilinkCached` returns the same path as `resolveWikilink` (checked in the bench).

JSC (WebKit) is not V8. The match of about 43-52 ms per embed in the log against 46 ms in the bench is
consistent, but it is not a profile.

## Root cause

`appEditorHost.resolveLink` (`src/lib/app/editor-host.ts:59-61`) is O(tree) with a high constant: a proxy walk
plus two linear string scans. It is also not memoised. It runs synchronously in the `toDOM` of every image
and note embed widget, inside CodeMirror's dispatch and its measure/scroll updates. Cost = embeds drawn
x ~46 ms.

Secondary amplifier (INFERRED, not profiled): for a tab without a saved scroll state, the dispatch draws the
viewport at the previous tab's scrollTop. The rAF then calls `scrollTo(0,0)` (`MarkdownEditor.svelte:287-301`),
which draws a second viewport and builds more embed widgets. This fits the 121 ms docReplace-to-rAF1 gap and
the 173 ms rAF1-to-rAF2 gap on the first fruit fly open.

Not the cause:
- Decorators: 4 ms by LP-TRACE.
- The language reconfigure: notes without embeds take 2-8 ms with the same reconfigure (`highlight-styles.ts:101-112`).
- GIF size: `img.src` is async, and image decode is not JS-thread work in the timed span (INFERRED).

The GIFs that scout F1 flagged are a coincidence of this note. Its embeds are dense at the top.

## Impact

- Thread: webview JS main thread. Input, paint and the heartbeat are blocked.
- Per event: about 46 ms per embed drawn, in a single sync task.
  - Opening a reading-list note costs 50-160 ms in docReplace, plus a second wave after the scroll restore.
    The observed stalls are 346-462 ms per open while clicking through a list.
  - Scrolling an image-heavy note (Laya: 28 embeds) costs about 46 ms each time an embed enters the
    viewport (INFERRED from rule 3; not seen in this log, where the owner did not scroll).
- Frequency: every open of, or scroll through, a note with `![[...]]` embeds. In this session, 8 of the 10
  docReplace events of 50 ms or more are reading-list opens. The reading-list folder that was checked has
  278 notes with embeds.
- What the user sees: a 0.15-0.45 s freeze after clicking an article in the list (no paint, and the next click
  is queued), and choppy scrolling through illustrated notes.
- Also affected, same function: wikilink click navigation (`wikilink-navigation.ts:19`), completion
  heading lookup (`wikilink/completion.ts:16`) and meta-bind `open` (`meta-bind-button-widget.ts:93`). These
  are one call per user action, so about 46 ms each, not per frame.

## Fixes (ranked by gain)

1. **Memoise the resolution map on the tree identity (quick win).** In `src/lib/app/editor-host.ts`, keep
   `lastTree` and `lastCache` at module level. `resolveLink(target)` does:
   `const t = fsStore.fileTree; if (t !== lastTree) { lastCache = buildResolutionCache(flattenFileTree(t).map(f => f.path)); lastTree = t; }`,
   then `return resolveWikilinkCached(target, lastCache)`.
   - Gain: 46 ms per embed becomes about 0.0004 ms. The fruit fly docReplace goes from about 142 ms to about
     5 ms, and the second wave and the scroll hitches go away. Each tree replace costs one rebuild of about 45 ms,
     paid lazily on the next resolve.
   - Safety:
     - Every tree change goes through `fsStore.setFileTree` (`fs.service.ts:93`, `fs.watcher.ts:184`,
       `path-change.service.ts:163`, `app-lifecycle.service.ts:367`), and each one assigns a new proxy.
     - No in-place path or name or children mutation was found (grep). `attachFileCounts` writes only
       `fileCount`, before `setFileTree`.
     - `resolveWikilinkCached` is first-wins on the same key order as `resolveWikilink`, so the results are
       identical. The project already relies on that equivalence (CLAUDE.md Indexing rule 12, kanban and queryjs).
   - Risks: a stale map if a future change mutates tree paths in place. A vault switch is safe because
     `setFileTree([])` changes the identity. This does not touch `applyNoteChange`, `vaultIndexVersion` or
     queryjs policy. Reading `fsStore.fileTree` inside `toDOM` already happens today. After the fix there are
     fewer proxy reads, so no new effect dependencies.
   - Files: `src/lib/app/editor-host.ts`, `src/tests/lib/app/editor-host.test.ts`.
   - Tests (failing first):
     - (a) Parity: on a fixture with name collisions, a path-style target, the basename fallback, an
       extension-stripped image target and a missing target, `appEditorHost.resolveLink` equals
       `resolveWikilink(target, flattenFileTree(tree).map(...))` for every case.
     - (b) Freshness: resolve `note`, then `setFileTree` with `note.md` moved, then expect the new path. Do the same
       for a removed file (expect null) and an added one.
     - (c) Cost guard that fails before the fix: count proxy reads of the tree. Wrap the tree passed to
       `setFileTree` in a counting `Proxy`, call `resolveLink` 50 times, and assert the reads stay under 2x
       the node count. Today it reads about 50x. This asserts real behaviour and mocks no store or logic.
2. **Draw the right viewport once on a tab switch (medium).** Put the scroll target into the `replaceDoc`
   dispatch: `EditorView.scrollIntoView(0, { y: 'start' })` for a tab without saved state, or a stored
   `view.scrollSnapshot()` effect for a saved tab. The rAF `scrollTo` then no longer draws a second viewport.
   - Gain: removes the second render wave for every note. That wave is 38-173 ms of gaps on these opens
     (INFERRED share). After fix 1 it is mostly layout, not embed cost.
   - Risks: the ordering contract with the `pendingScrollPosition` double rAF (`MarkdownEditor.svelte:310-330`)
     and with the `forceDecorationRebuild` rAF chain. Also, `saveTabViewState` stores raw `scrollTop`, so the
     tab view-state shape changes.
   - Files: `MarkdownEditor.svelte`, the tab view-state helper, and their tests.
   - Test: an E2E or jsdom check that after a switch to a fresh tab, the first `visibleRanges` start at 0.
3. **Stop flattening the proxy for every `flattenFileTree` consumer (large, shared with B/C).** Hold the tree
   as `$state.raw`, or expose a module-level `$derived` flat path list and resolution map in `fs.store`
   (ADR-0034).
   - Gain: each proxy flatten drops from 22 ms to 2.7 ms for QuickSwitcher, RailNoteList, PropertiesView,
     kanban and others.
   - Risks: the reactivity of `fileCount`, which `attachFileCounts` writes in place through the proxy
     (`fs.watcher.ts:183`), and every component that reads nested nodes reactively. This needs the
     Pre-Change Checklist.
4. **Correctness aside (not perf; needs the owner's call).** A path-style embed resolves by basename without
   extension (`wikilink-resolution.logic.ts:24-29`), so `![[a/images/foo.gif]]` can resolve to any `foo.md`
   or `foo.png` that comes first in tree order. An exact vault-relative path lookup first would be both O(1)
   and correct. It changes behaviour, so it belongs in its own Issue.
5. **Language reconfigure per markdown switch (low).** `markdownLanguage()` builds a new `markdown()` on every
   switch (`highlight-styles.ts:85-87,108`). A full doc replace reparses anyway. No measurable gain is
   expected: the notes without embeds take 2-8 ms in total. Do not pursue without a profile.

## Quick wins

- Fix 1 only: about a day including tests, one file, about a 45 ms gain per embed drawn, and it removes the 142-156 ms
  outlier. To verify, re-run the same clicks with debug log on and expect fruit fly docReplace under 15 ms.
  Optionally add a temporary `profileStart('wikilink-embed-toDOM')` around `widgets.ts:570` to confirm
  per-call time in WebKit.

## Open questions

- The tree's directory/file split is unknown, since the vault can't be scanned recursively. The bench covered 3,000 and 8,000 dirs
  (46 and 53 ms), and both match the log.
- The 50 ms `_gmail-inbox-01-07-2026.md` and the 20-42 ms journal and collection notes were not inspected.
  They probably have embeds or other widgets (queryjs, collection); confirm before closing F.
- What fills the 121 ms gap between docReplace and rAF1 on the first fruit fly open: CM measure-driven embed
  builds or Svelte effects (`activeTabPath changed` at `50.256`). This needs a WebKit profile or the toDOM
  timing log.
- Whether the owner's build was dev or release Svelte. The bench gives 46 ms in prod and 76 ms in dev
  conditions. The log fits prod better.

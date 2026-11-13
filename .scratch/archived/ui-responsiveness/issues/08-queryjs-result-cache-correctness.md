# 08: queryjs never shows another note's result, and drops its charts when results are cleared

**Status:** resolved

Priority: P2 (correctness: a weekly note showed another week's chart; memory leak per execution)

**What to build:** Three bugs found while measuring queryjs. They are correctness bugs, not speed: the measured queryjs cost is about 30 ms per block.

1. **Result-cache key is block text only** (`src/lib/plugins/queryjs/queryjs-block-widget.ts:98,207`). Shared view scripts read `kb.current()` (`_shared-weekly-radar.js:9`), so two notes with the same block text share one cached element. In the baseline session week 42 stored the wellness chart at 17:54:58.439, and week 40 re-attached it at 17:54:59.534 with no write in between. Key the cache on file plus text. ADR 0010 (line 59) chose content keys on purpose, so this needs an ADR 0010 amendment; line 46 is also stale (it says `reset()`, the code calls `clearResults()`).
2. **`execute` reads `editorStore.activeTabPath` after an await** (`queryjs-block-widget.ts:187-192`) instead of the `filePath` that `toDOM` captured (`:88`). Under fast prev/next, `kb.current()` can resolve to the next note. Pass the captured path in.
3. **Chart.js instances are never destroyed.** Each `new Chart` registers in Chart.js's module-level `instances` and leaves only on `destroy()` (`node_modules/chart.js/dist/chart.js:5617,5700,6269`). No `destroy` exists under `src/lib/plugins/queryjs`, so `clearResults()` drops the Map but the registry keeps every canvas alive. Destroy charts owned by a result when it is dropped. Fixing 1 raises executions, so 3 must ship with it.

**Blocked by:** 05

**Gate:** `pnpm check` + `pnpm vitest run` + `pnpm build` (frontend)

**Source:** src/lib/plugins/queryjs/queryjs-block-widget.ts:31-44,88-117,187-207, src/lib/plugins/queryjs/queryjs-session.store.svelte.ts:38,83-98, src/lib/plugins/queryjs/queryjs-ports.ts:15, src/lib/plugins/queryjs/kb-ui.ts:609,910-914, docs/adr/0010-queryjs-kb-api-caching.md

- [x] Failing first: two files with identical block text and a script that renders `kb.current().file.path` each show their own path
- [x] Failing first: `execute` started for file A, with the active tab switched to B before the await resolves, still runs against A
- [x] Failing first: dropping a cached result calls `destroy()` on the charts it created
- [x] The `autoRunQueries` matrix tests stay green (CLAUDE.md live-preview rule 10; manual mode never marks `autoRunOnFirstOpen`)
- [x] ADR 0010 amendment written and dated, and CLAUDE.md live-preview rules 9 and 10 updated (they describe the cache as `Map<contentHash, HTMLElement>` keyed by `hasResult(jsContent)`)

## Notes

- Owner decision (2026-11-03): key the result cache on file plus block text, with the ADR 0010 amendment. Notes that share a block no longer share its result; Chart.js `destroy()` ships in the same Issue.
- Blocked by 05 so its `QJS-PROFILE` timers measure executions before and after.
- Research: `.scratch/ui-responsiveness/research/E-deep-dive.md`, `E-verify.md` (bug 2, Chart.js leak, `execute` race).

## Comments

- 2026-11-03, branch `issue/08-queryjs-result-cache-correctness`: result cache keyed on note path plus block text; `execute` uses the path captured in `toDOM`; Chart.js charts are destroyed when their result is dropped and when an uncached run fails (guarded by `!container.isConnected`); ADR 0010 amended, CLAUDE.md live-preview rules 9-10 updated. Full suite at e27757d7: exit=0, 449 files, 10303 passed, 1 skipped, 1 todo; build passed. Reviews: round 1 APPROVED (nits fixed in a fix round), round 2 APPROVED (one nit: no test pins the `isConnected` guard; not fixed, ship-only).

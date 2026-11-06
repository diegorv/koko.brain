# 141: The local graph center follows every way the graph tab gets focus, and hints when the center note is gone

**Migrated from:** `.scratch/audit-2026-11-04/issues/21-graph-center-follows-every-focus.md` (audit 2026-11-05). Priority: later (refactor, deferred, feature) (bucket 5-later). The owner triaged it low priority on 2026-11-05 and said do not launch it.

**Audit check at `5f8003d67`:** still_present (ux, low). src/lib/plugins/graph-view/graph-view.service.ts:24-27 captureCenterPath is called only from openGraphTab (:36) and toggleGraphTab (:67); rg finds no other setCenterPath caller and no graph reference in src/lib/core/editor/editor.service.ts, so a tab-bar click, tab cycling, closing a neighbour or a session restore that focuses the graph keeps the old center. No registerPathChangeConsumer in src/lib/plugins/graph-view. src/lib/plugins/graph-view/GraphView.svelte:53-54 the local graph uses centerPath via getLocalGraph, and :430 shows the hint only when centerPath is null, so a renamed or deleted center gives an empty canvas with no hint. The only graph-view commit after 59b824233 is 3c7f1b9a8 (drops views from buildGraphData), which does not touch this.

**Stale in the text below:** The hint is at :430 exactly (Issue says ~:430). Nothing else is stale. The owner triaged it low priority on 2026-11-05 and it stays needs-triage.

**Owner decision needed:** You triaged this low on 2026-11-05: keep it deferred, or schedule it?

**What to build:** Two gaps left by Issue 07 (review findings 1 and 3 in `.scratch/audit-2026-11-04/work/07/review.md`). (1) The local graph's center (`graphViewStore` center path) is captured only in `openGraphTab()` and `toggleGraphTab()` (src/lib/plugins/graph-view/graph-view.service.ts). Focusing the graph tab any other way keeps the previous center: a tab-bar click (`editor.service.ts` `switchTab`), tab cycling, closing a neighbouring tab, a session restore. Owner decision D6 (a) says the center is the note active when the graph is "opened or focused". Fix: a plugin-side tracker that records the last active markdown note whenever `editorStore.activeTab` changes, registered from the app layer (core cannot import the plugin, ADR-0003), and the graph uses it as its center when it takes focus. (2) When the center note was renamed, moved or deleted after capture, `getLocalGraph` finds no node and local mode shows an empty canvas with no hint (src/lib/plugins/graph-view/GraphView.svelte, hint at ~:430 shows only when the center is null). Fix: show the hint when the center is not in the graph data (which needs `fullData` reactive), or clear/re-key the center through a path-change consumer (`registerPathChangeConsumer`).

**Blocked by:** none

**Status:** needs-info

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`.

- [ ] Failing test first: open the graph from note A, open note B, then `switchTab(<graph index>)`; the graph's center is B. It fails today (center stays A).
- [ ] Test: tab cycling and closing a neighbour tab that lands on the graph also set the center to the last active markdown note.
- [ ] Test: renaming the center note keeps local mode centered on it (new path), and deleting it shows the "open a note" hint instead of an empty canvas.
- [ ] The tracker is registered from the app layer and unwound where the other plugin consumers are; no new `core/` -> `plugins/` import and no layer-baseline entry.
- [ ] Frontend gate green.

## Notes

- **Source:** Issue 07 review round 1 (`.scratch/audit-2026-11-04/work/07/review.md`), findings 1 (major, not a blocker) and 3 (minor), both deferred in its Resolution. Issue 07 merged as 59b824233.
- Issue 07 is never worse than main here: main always showed an empty local graph.
- **Size:** M.

## Comments

- 2026-11-05: triaged by the owner as low priority. Stays needs-triage for later; do not launch it.
- 2026-11-06: migrated from `.scratch/audit-2026-11-04/issues/21-graph-center-follows-every-focus.md` by audit 2026-11-05, which re-checked it at `5f8003d67`.

# Issue 06 discovery

No `spec.md` for architecture-stability; the Issue, ADR-0004 and Issue 04's work folder
(`work/04/`) are the reference. Same pattern as 04: reuse `scripts/import-graph.mjs` `scanLib`
edges (which already carry `typeOnly`); only the rule set and the walk differ.

## Files that change

- `src/tests/lib/architecture/pure-logic.test.ts` (new): transitive walk over `scanLib` edges from
  every `**/*.logic.ts`, `**/*.types.ts`, `src/lib/utils/*.ts` (minus `debug.ts`, `log.service.ts`).
- `src/lib/features/properties/properties.logic.ts:15,257,463`: drop the `appendLog` import; add a
  module-level sink `configurePropertiesDiagnostics({ log })` (no-op default), both sites call it.
- `src/routes/(app)/+layout.svelte:1-20`: call `configurePropertiesDiagnostics({ log: appendLog })`
  synchronously at the top of the script (where Issue 21's `registerAppPorts()` will go).
- `src/lib/features/copy-block-link/copy-block-link.logic.ts:1`, `plugins/table-of-contents/toc.logic.ts:1`:
  import from `wikilink/navigation.logic.js`, not the `wikilink/index.js` barrel.
- `src/lib/features/canvas/canvas-image.logic.ts` -> `canvas-image.service.ts` (git mv);
  importers `CanvasInner.svelte:42`, `ImageNode.svelte:5`; test renamed to `canvas-image.service.test.ts`.
- `src/tests/lib/features/properties/properties.logic.test.ts:3-8,428-447,525-550`: assert through
  a configured sink instead of mocking log.service; add a cache-hit-emits-nothing case.

## Rules the guard applies

- Forbidden: package `svelte`/`svelte/*`, any package whose name carries a `svelte` segment
  (`@xyflow/svelte`, `svelte-sonner`, `lucide-svelte`), `@tauri-apps/*`, a `.svelte` file, a
  `.store.svelte.ts`, a `.service.ts`, `log.service.ts`, `debug.ts` (reached, not as a start point).
- Type-only edges count, except when the importing file is a `.types.ts` (Issue: rail-shell keeps
  `import type { Component }`); those edges are neither checked nor followed.
- Allowlist: the edges `canvas.logic.ts -> @xyflow/svelte` and `canvas-history.logic.ts -> @xyflow/svelte`.
  A stale allowlist entry (edge gone) fails, like the layer baseline.
- Report: one line per start file with the shortest chain to the forbidden target.

## Prior art

- `src/tests/lib/architecture/layer-rules.test.ts` (scanLib use, stale-entry assertion).

## Risks / defaults

- Svelte libraries without `svelte` in the name (`bits-ui`, `paneforge`) are not caught; none is
  imported by a logic file today (the guard would not see a new one).
- Before the sink is configured (tests, the composer window) the two diagnostics are dropped; the
  composer route does not parse properties panels. Default no-op, not console, to keep tests quiet.
- Issue line numbers (205/405) are now 257/463; same two sites.

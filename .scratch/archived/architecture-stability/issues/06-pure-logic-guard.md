# 06: Make the pure logic set actually pure and guard it with a test

**What to build:** Remove four of the five root causes that make 16 logic/types files (3,990 LOC, not counting the exempt debug.ts and log.service.ts) impure, and allowlist the fifth (`@xyflow/svelte` in `canvas.logic.ts:11-12` and `canvas-history.logic.ts:1`). Then add a vitest guard that walks the import graph of every `.logic.ts`, `.types.ts` and `utils/*.ts` file and fails if it reaches `svelte`, `@tauri-apps/*`, a `.svelte` file, a `.store.svelte.ts` store, a `.service.ts` or `log.service`.
- `utils/debug.ts` and `utils/log.service.ts` are services that live in utils, so they are exempt.
- The canvas `@xyflow` logic files go on a named allowlist.
- No folder moves.
- Reuse issue 04's `extractImports`/`resolveSpecifier` instead of writing a second walker.
- The guard decides type-only imports explicitly: `import type` in a `.types.ts` file is allowed (ADR-0004 sets no rule for types files), so `rail-shell.types.ts` keeps its `Component` type.

**Blocked by:** 04

**Status:** resolved

**Gate:** `pnpm check` + `pnpm vitest run` + `pnpm build`

**Source:** src/lib/features/properties/properties.logic.ts:14,205,405 (lines as of 408896d4; they were 138 and 321 before Issues 39 and 41); src/lib/features/copy-block-link/copy-block-link.logic.ts:1; src/lib/plugins/table-of-contents/toc.logic.ts:1; src/lib/features/rail-shell/rail-shell.types.ts:1; src/lib/features/canvas/canvas-image.logic.ts:1-2; ADR-0004; src/tests/lib/lib-specifier-convention.test.ts (scanner pattern)

- [x] The failing guard test is written first and lists the current violations
- [x] properties.logic.ts logs through a module-level diagnostics sink (configured once, synchronously, at the top of the `src/routes/(app)/+layout.svelte` script, the same place issue 21 calls `registerAppPorts()`; same shape as the profiling port in issue 31) instead of importing appendLog. Both sites use it: line 205 (dropped nested key, still emitted only on a cache miss) and line 405 (`dedupeCanonicalKeys`, also reached from `serializeProperties`). The YAML-warning `console.warn` at line 182 (Issue 41) is not an `appendLog` import and can stay. A test covers both, and a cache hit emits nothing
- [x] copy-block-link.logic and toc.logic import HEADING_RE/BLOCK_ID_RE from wikilink/navigation.logic, not from the barrel (which re-exports Tauri-backed completion.ts)
- [x] canvas-image.logic is renamed or moved to a .service.ts, and its test is updated
- [x] The guard test passes with only the canvas @xyflow allowlist

## Notes

- **Why this is the biggest single cause:** `properties.logic.ts` calls appendLog, which makes 10 files impure including itself (9 others: calendar, collection, linear-calendar, deep-link, three event-calendar logic files, note-action-bar, `rail-shell/lens.logic.ts`).
- **Sequencing:** do this before issue 20, which moves `copy-block-link/`.
- **Scale:** 118 files (14.4k LOC) are already pure.
- **packages/domain:** a domain package was considered and dropped. It would split feature folders, and a package does not block undeclared dependencies anyway: it resolves them through the root node_modules (checked by experiment). This guard gives the same protection.
- **Size:** S.

## Comments

- 2026-11-01, branch `issue/06-pure-logic-guard`: added `src/tests/lib/architecture/pure-logic.test.ts` (ADR-0004 guard over `scanLib`, only the two canvas @xyflow allowlist entries; also forbids `@sveltejs/` and `$app/`, and checks the layout wires the properties sink); `properties.logic.ts` logs through `configurePropertiesDiagnostics`, wired to `appendLog` in `(app)/+layout.svelte`; copy-block-link and toc logic import from `wikilink/navigation.logic`; `canvas-image.logic.ts` renamed to `canvas-image.service.ts`. Full suite: 382 files, 9258 passed, 1 skipped, 1 todo; `pnpm build` ok. Review round 1: APPROVED (4 minor/nit findings, all fixed).

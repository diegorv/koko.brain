# 32: Fenced block renderer registry; queryjs and collection widgets leave the editor

**What to build:**
- **Registry.** Add a `fencedBlockRenderers` facet.
- **Fields stay in the editor.** queryjs-block-field and collection-block-field keep their Lezer FencedCode detection and their BLOCK_DECORATOR_NAMES entries. They get the widget from the registry, and with no renderer registered they produce no decoration.
- **Widgets move out.** Move queryjs-block-widget.ts to plugins/queryjs and collection-block-widget.ts to features/collection. Each one registers itself in the app's editor wiring.
- **Unchanged:** the autoRunQueries policy matrix, the live-DOM resultCache, the collection data cache, and the mousedown stopPropagation (CLAUDE.md Live Preview rule 11). No renderer may hand one live node to two widgets; QueryJS is the only live-DOM cache.
- **Also:** the `editor.service.ts:13` import of `queryjsSessionStore` (a core -> plugin edge) moves behind the queryjs renderer registration.

**Blocked by:** 31

**Status:** resolved

**Gate:** `pnpm check` + `pnpm vitest run` + `pnpm build` + `bash scripts/e2e.sh`

**Source:** extensions/live-preview/widgets/{queryjs,collection}-block-widget.ts; plugins/{queryjs,collection}-block-field.ts; core/decorator-names.ts; ADR-0008, ADR-0010; CLAUDE.md Live Preview rules 2, 9, 10, 11

- [x] Field tests: with no registered renderer there is no decoration, and with a renderer there is one widget per fenced block
- [x] The existing queryjs widget tests (policy matrix, manual mode never marks autoRun, cache re-attach) pass after the move with only specifier changes
- [x] The Troubleshooting kill-switches for queryjs and collectionBlock still disable the blocks (test)
- [x] `core/markdown-editor/**/*.ts` has zero imports of #lib/features or #lib/plugins (the `.svelte` shells are handled by issue 22)
- [x] Widget `eq()` stays content-only and never compares renderer or host identity
- [x] The registry facet is installed outside the compartments
- [x] `special-fence-detection.test`, `decorator-toggles.test` and `pipeline-dom.test` install the registry, or record that blocks render raw without it
- [x] The E2E specs queryjs-basic and the collection specs pass

- [x] `layer-baseline.json` and `featureCycleEdges` (issues 04-05) shrink by exactly the edges this issue removes, in the same commit
## Notes

- **Why a registry on top of issue 31:** without it, the host would have to expose KBAPI, the queryjs session store, collectionStore and the autoRun policy, which makes the host plugin-aware. Note that `code-block-field.ts:12` hard-codes `SPECIAL_LANGUAGES`, so an unregistered block shows raw lines with no code styling.
- **Size:** M.

## Comments

- 2026-11-01, branch `issue/32-fenced-block-renderer-registry`: a `fencedBlockRenderers` facet in core/markdown-editor replaces the direct queryjs and collection widget imports; the widgets moved to their plugin/feature; a `registerTabCloseListener` port in editor.service replaces the queryjs session import; queryjs ports moved to `plugins/queryjs/queryjs-ports.ts` (review round 1 finding 1), the core JSDoc no longer names a consumer (finding 2). Tests: pnpm check 0 errors; full suite (32-deliver-2.log) exit=0, 411 files / 9741 tests passed, pnpm build passed (run 1 failed on 2 editor.service mocks lacking `registerTabCloseListener`, fixed). Reviews: round 1 APPROVED (3 minor/nit findings, 2 fixed, 1 no change), round 2 APPROVED (no findings).

# 32: Fenced block renderer registry; queryjs and collection widgets leave the editor

**What to build:**
- **Registry.** Add a `fencedBlockRenderers` facet.
- **Fields stay in the editor.** queryjs-block-field and collection-block-field keep their Lezer FencedCode detection and their BLOCK_DECORATOR_NAMES entries. They get the widget from the registry, and with no renderer registered they produce no decoration.
- **Widgets move out.** Move queryjs-block-widget.ts to plugins/queryjs and collection-block-widget.ts to features/collection. Each one registers itself in the app's editor wiring.
- **Unchanged:** the autoRunQueries policy matrix, the live-DOM resultCache, the collection data cache, and the mousedown stopPropagation (CLAUDE.md Live Preview rule 11). No renderer may hand one live node to two widgets; QueryJS is the only live-DOM cache.
- **Also:** the `editor.service.ts:13` import of `queryjsSessionStore` (a core -> plugin edge) moves behind the queryjs renderer registration.

**Blocked by:** 31

**Status:** ready-for-agent

**Gate:** `pnpm check` + `pnpm vitest run` + `pnpm build` + `bash scripts/e2e.sh`

**Source:** extensions/live-preview/widgets/{queryjs,collection}-block-widget.ts; plugins/{queryjs,collection}-block-field.ts; core/decorator-names.ts; ADR-0008, ADR-0010; CLAUDE.md Live Preview rules 2, 9, 10, 11

- [ ] Field tests: with no registered renderer there is no decoration, and with a renderer there is one widget per fenced block
- [ ] The existing queryjs widget tests (policy matrix, manual mode never marks autoRun, cache re-attach) pass after the move with only specifier changes
- [ ] The Troubleshooting kill-switches for queryjs and collectionBlock still disable the blocks (test)
- [ ] `core/markdown-editor/**/*.ts` has zero imports of #lib/features or #lib/plugins (the `.svelte` shells are handled by issue 22)
- [ ] Widget `eq()` stays content-only and never compares renderer or host identity
- [ ] The registry facet is installed outside the compartments
- [ ] `special-fence-detection.test`, `decorator-toggles.test` and `pipeline-dom.test` install the registry, or record that blocks render raw without it
- [ ] The E2E specs queryjs-basic and the collection specs pass

- [ ] `layer-baseline.json` and `featureCycleEdges` (issues 04-05) shrink by exactly the edges this issue removes, in the same commit
## Notes

- **Why a registry on top of issue 31:** without it, the host would have to expose KBAPI, the queryjs session store, collectionStore and the autoRun policy, which makes the host plugin-aware. Note that `code-block-field.ts:12` hard-codes `SPECIAL_LANGUAGES`, so an unregistered block shows raw lines with no code styling.
- **Size:** M.

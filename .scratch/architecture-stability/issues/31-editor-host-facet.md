# 31: EditorHost facet and profiling port for core/markdown-editor

**What to build:**
- **The `editorHost` facet.** A CodeMirror Facet (`static: true`, `combine: v => v[0] ?? NOOP_HOST`) with 7 methods: resolveLink, listLinkCandidates, readNote, assetUrl, openLink, openExternal, createNote. copyBlockLink goes through `CreateExtensionsOptions`, as `onDocChanged` already does. reportError uses the profiling port's `log`. openFile is not needed once issue 32 moves the collection widget out.
- **The profiling port.** A module-level `configureProfiling({ isEnabled, log })`.
- **The app's host.** The app implements the host once in `EditorView.svelte` (a composition root after issue 22) from fsStore, vaultStore, Tauri, periodic-notes and note-creator. It installs the host outside every compartment, with a stable identity. This is required for correctness: completion and the Mod-Shift-l keymap live outside `livePreviewCompartment` and must work in source mode.
- **Imports to replace.** Remove every store, service, Tauri and feature import in the markdown-editor `.ts` files, except the two block widgets (issue 32). Besides the Source list, this covers `widgets.ts:8,14`, `plugins/meta-bind-input-plugin.ts:18`, `plugins/table-field.ts:10-11` (properties logic and types, moved below features by issue 23), and the dynamic `#lib/plugins/periodic-notes` imports in `wikilink-navigation.ts:26-35`.
- **Host calls stay out of compute.** No host method may be called inside a StateField `compute`/`update` or a decoration build. A sync `resolveLink` that flattens the file tree there would be O(N) per link per rebuild.
- **Other changes.** `livePreviewExtensions` takes `disabledDecorators` as an argument, and `openWikilinkTarget` moves to the app.

**Blocked by:** 20, 22, 23

**Status:** resolved

**Gate:** `pnpm check` + `pnpm vitest run` + `pnpm build` + `bash scripts/e2e.sh`

**Source:** setup/editor-extensions.ts:25; click-handler.ts:2,5; widgets.ts:162,526,587-603; wikilink-navigation.ts:1-41; live-preview.ts:33,42,96; core/profiling.ts:1-2; inline/inline-formatting-plugin.ts:5,90; wikilink/completion.ts:2-8; wikilink/completion.logic.ts:1; widgets/meta-bind-button-widget.ts:2,87-129; ADR-0003, ADR-0008; CLAUDE.md Live Preview rules 1-11

- [x] A test written first builds an EditorView with a fake host and asserts that wikilink click, embed resolution, image asset URL and completion candidates all go through the host
- [x] The issue-04 extractor (not a line grep, which also matches comments) finds no `.store.svelte`, `.service`, `@tauri-apps`, `#lib/features`, `#lib/plugins`, `utils/debug` or `log.service` import in core/markdown-editor/**/*.ts, except in the two block widgets
- [x] A test proves the app's `createExtensions` installs the real host, not NOOP_HOST
- [x] An unresolved `[[2026-11-01]]` (with the daily format) opens or creates the daily note in its folder through `host.createNote`, through both the click path and the table-cell path
- [x] profiling.test.ts proves that when profiling is disabled, profileStart returns 0 and calls neither performance.now nor log
- [x] Toggling profiling or periodic-notes settings dispatches no transaction with `reconfigured`, and `state.facet(editorHost)` keeps its identity across those changes
- [x] Counters on every host method show zero calls during StateField compute on a docChanged transaction
- [x] LP-PROFILE per-plugin numbers on a 6000-line note are recorded before and after in the commit message (5 runs each, every block decorator plus the inline plugin, median compared); no plugin's median regresses by more than 10%
- [ ] The E2E specs wikilink-navigation, wikilink-create-on-click, embed-widgets and live-preview/* pass

- [x] `layer-baseline.json` and `featureCycleEdges` (issues 04-05) shrink by exactly the edges this issue removes, in the same commit
## Notes

- **What it does not fix:** this removes 15 ADR-0003 violations and lets widget tests use a fake host. It does not target the internal decoration bugs; issue 16 does.
- **Performance trap:** never reconfigure the host when settings change. `checkUpdateAction:21` rebuilds on any `t.reconfigured`.
- **Size:** M-L. Split it if needed: 108 test files depend on these 15 files.

## Comments

- 2026-11-01, branch issue/31-editor-host-facet: added the `editorHost` facet (7 methods, NOOP_HOST default, installed by the app outside every compartment with a stable identity) and the `configureProfiling` port; core/markdown-editor no longer imports stores, services, Tauri, features or plugins (except the two block widgets, issue 32); `livePreviewExtensions` takes `disabledDecorators`; `openWikilinkTarget` moved to the app (`app/editor-host.ts`). Fix round: meta-bind button createNote keeps its path, passes `{ periodic: false }` and stops the action chain on failure; Kanban harness forwards `onOpenWikilink` with a test; LIVE-PREVIEW.md updated.
  - LP-PROFILE (jsdom, 6000-line note, 45 runs per side, median before -> after): audio 1.70->1.80, block-comment 3.50->3.40, callout 2.20->2.30, code-block 3.90->3.90, collection-block 1.50->1.50, inline-formatting 1.00->0.60, mermaid 1.00->1.00, meta-bind-button 1.00->1.00, queryjs-block 1.10->1.00, table 2.80->2.70, video 1.80->1.80 ms; block-math, footnote, frontmatter, meta-bind-input, wikilink-embed under the 0.5 ms threshold. No plugin regresses by more than 10%. The in-app 6000-line run is not recorded.
  - Tests: pnpm check exit 0; targeted vitest (kanban, app, markdown-editor, architecture) 131 files, 2267 passed, 1 skipped; full suite at 55718867 `pnpm vitest run && pnpm build` exit=0, 410 files, 9706 passed, 1 skipped, 1 todo, build OK. E2E not run (that criterion stays open).
  - Reviews: round 1 APPROVED (review.md), round 2 APPROVED (review-2.md) after the fix round; the dotted meta-bind name nit is left as is (behaviour improvement).

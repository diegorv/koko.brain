# 31: EditorHost facet and profiling port for core/markdown-editor

**What to build:**
- **The `editorHost` facet.** A CodeMirror Facet (`static: true`, `combine: v => v[0] ?? NOOP_HOST`) with 7 methods: resolveLink, listLinkCandidates, readNote, assetUrl, openLink, openExternal, createNote. copyBlockLink goes through `CreateExtensionsOptions`, as `onDocChanged` already does. reportError uses the profiling port's `log`. openFile is not needed once issue 32 moves the collection widget out.
- **The profiling port.** A module-level `configureProfiling({ isEnabled, log })`.
- **The app's host.** The app implements the host once in `EditorView.svelte` (a composition root after issue 22) from fsStore, vaultStore, Tauri, periodic-notes and note-creator. It installs the host outside every compartment, with a stable identity. This is required for correctness: completion and the Mod-Shift-l keymap live outside `livePreviewCompartment` and must work in source mode.
- **Imports to replace.** Remove every store, service, Tauri and feature import in the markdown-editor `.ts` files, except the two block widgets (issue 32). Besides the Source list, this covers `widgets.ts:8,14`, `plugins/meta-bind-input-plugin.ts:18`, `plugins/table-field.ts:10-11` (properties logic and types, moved below features by issue 23), and the dynamic `#lib/plugins/periodic-notes` imports in `wikilink-navigation.ts:26-35`.
- **Host calls stay out of compute.** No host method may be called inside a StateField `compute`/`update` or a decoration build. A sync `resolveLink` that flattens the file tree there would be O(N) per link per rebuild.
- **Other changes.** `livePreviewExtensions` takes `disabledDecorators` as an argument, and `openWikilinkTarget` moves to the app.

**Blocked by:** 20, 22, 23

**Status:** ready-for-agent

**Gate:** `pnpm check` + `pnpm vitest run` + `pnpm build` + `bash scripts/e2e.sh`

**Source:** setup/editor-extensions.ts:25; click-handler.ts:2,5; widgets.ts:162,526,587-603; wikilink-navigation.ts:1-41; live-preview.ts:33,42,96; core/profiling.ts:1-2; inline/inline-formatting-plugin.ts:5,90; wikilink/completion.ts:2-8; wikilink/completion.logic.ts:1; widgets/meta-bind-button-widget.ts:2,87-129; ADR-0003, ADR-0008; CLAUDE.md Live Preview rules 1-11

- [ ] A test written first builds an EditorView with a fake host and asserts that wikilink click, embed resolution, image asset URL and completion candidates all go through the host
- [ ] The issue-04 extractor (not a line grep, which also matches comments) finds no `.store.svelte`, `.service`, `@tauri-apps`, `#lib/features`, `#lib/plugins`, `utils/debug` or `log.service` import in core/markdown-editor/**/*.ts, except in the two block widgets
- [ ] A test proves the app's `createExtensions` installs the real host, not NOOP_HOST
- [ ] An unresolved `[[2026-11-01]]` (with the daily format) opens or creates the daily note in its folder through `host.createNote`, through both the click path and the table-cell path
- [ ] profiling.test.ts proves that when profiling is disabled, profileStart returns 0 and calls neither performance.now nor log
- [ ] Toggling profiling or periodic-notes settings dispatches no transaction with `reconfigured`, and `state.facet(editorHost)` keeps its identity across those changes
- [ ] Counters on every host method show zero calls during StateField compute on a docChanged transaction
- [ ] LP-PROFILE per-plugin numbers on a 6000-line note are recorded before and after in the commit message (5 runs each, every block decorator plus the inline plugin, median compared); no plugin's median regresses by more than 10%
- [ ] The E2E specs wikilink-navigation, wikilink-create-on-click, embed-widgets and live-preview/* pass

- [ ] `layer-baseline.json` and `featureCycleEdges` (issues 04-05) shrink by exactly the edges this issue removes, in the same commit
## Notes

- **What it does not fix:** this removes 15 ADR-0003 violations and lets widget tests use a fake host. It does not target the internal decoration bugs; issue 16 does.
- **Performance trap:** never reconfigure the host when settings change. `checkUpdateAction:21` rebuilds on any `t.reconfigured`.
- **Size:** M-L. Split it if needed: 108 test files depend on these 15 files.

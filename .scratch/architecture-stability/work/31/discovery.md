# Issue 31 discovery

No spec.md for this feature. Prior art for ports: `app/boot.ts` `registerAppPorts` (Issue 21/22).

## Forbidden imports today (extractor, core/markdown-editor/**/*.ts, block widgets excluded)
- `extensions/live-preview/click-handler.ts:2,5` (plugin-opener, utils/debug)
- `extensions/live-preview/core/profiling.ts:1-2` (settings store, log.service)
- `extensions/live-preview/inline/inline-formatting-plugin.ts:5` (log.service)
- `extensions/live-preview/live-preview.ts:33` (settings store)
- `extensions/live-preview/widgets.ts:17,165,529,590,606` (log.service, tauri core, fs store, plugin-fs)
- `extensions/live-preview/widgets/meta-bind-button-widget.ts:2,93,103,111,112`
- `extensions/live-preview/wikilink-navigation.ts:1,18,27,30,33,39,41`
- `extensions/wikilink/completion.ts:2,4,5,8`
- `setup/editor-extensions.ts:26` (copy-block-link service)
(`widgets.ts:8,14`, `meta-bind-input-plugin.ts`, `table-field.ts` are already clean after Issue 23.)

## Plan
1. `core/markdown-editor/editor-host.ts`: `EditorHost` (resolveLink, listLinkCandidates, readNote, assetUrl, openLink, openExternal, createNote), `NOOP_HOST`, `editorHost` Facet (static, combine `v[0] ?? NOOP_HOST`).
2. `core/profiling.ts`: `configureProfiling({ isEnabled, log })` module port, `logEditor(tag, msg)` for the inline/meta-bind logs, `reportError` (console.error + port log).
3. Callers read `view.state.facet(editorHost)` only in event handlers / `toDOM` / completion: click-handler (openExternal), table cell + editor click (`followWikilink`), image/file-URL asset (assetUrl), note embed (resolveLink + readNote), completion (listLinkCandidates, resolveLink, readNote), meta-bind button (resolveLink/openLink/openExternal/createNote).
4. `wikilink-navigation.ts` becomes host-only `followWikilink(host, target, anchor?)`; MarkdownEditor's click body moves into `followWikilinkClick(view, pos)` in the same file.
5. `createExtensions` takes `host`, `copyBlockLink`, `disabledDecorators`; installs `editorHost.of(host)` outside every compartment. `livePreviewExtensions(disabledDecorators)`, `editorModeEffects(isLivePreview, compartment, disabledDecorators)`.
6. App: `app/editor-host.ts` (`appEditorHost` constant, `openWikilinkTarget`), `configureProfiling` wired in `registerAppPorts`. EditorView passes `host` to MarkdownEditor, `onOpenWikilink` to TasksView / KanbanView (they may not import app/).
7. Baseline: drop `editor-extensions.ts -> copy-block-link`, `wikilink-navigation.ts -> periodic-notes` x2, `MarkdownEditor.svelte -> periodic-notes` x2; BASELINE_SIZE -5. featureCycleEdges: check whether any listed pair goes stale.

## Tests (prior art)
- `setup/editor-extensions.test.ts` (makeOptions), `test-helpers.ts mountMarkdownView`, `app/EditorView.test.ts` (mount), `wikilink-navigation.test.ts`, `table-widget.test.ts`, `widgets/wikilink-image-embed-widget.test.ts`, `core/profiling.test.ts`.
- New: `editor-host.test.ts` (fake host: click, embed, asset URL, completion, StateField counters), app `editor-host.test.ts` (createNote daily-note path), EditorView test (real host installed, no `reconfigured` on settings toggles).

## Defaults taken
- `createNote(target, anchor?)`: periodic match -> `openOrCreatePeriodicNoteForDate`; else `openOrCreateNote` at `resolveFilePath(vault, target)` (creates the folder, opens an existing file). The meta-bind `createNote` action uses the same method, so it now also honours periodic names. Wikilinks previously used `createFile` (unique-name); with an unresolved target the result is the same file.
- `reportError` goes to console + the port log, so the two errors that used `utils/debug.error` (external URL open, completion read) no longer reach Sentry.
- LP-PROFILE numbers are measured in vitest/jsdom over `EditorState` on a 6000-line note (no Tauri app available to this agent).

## Found during implementation
- A bare periodic name (`[[2026-11-01]]`) did not match `detectPeriodicNoteType` when a periodic folder is set (the logic wants `Folder/` first). The app host retries with the folder prefix, so the AC's "in its folder" holds; the plugin logic is unchanged.
- Any settings write replaces the whole settings object, so the theme effect in MarkdownEditor reconfigured `editorThemeCompartment` on the profiling toggle. The effect now reads primitive `$derived` theme inputs. (The tag-colors effect still dispatches `forceDecorationRebuild` on every settings write; it carries no `reconfigured`, left as is.)
- Image embeds and `file://` images resolve synchronously in `toDOM` (the host is sync), so the "destroyed before async resolution" tests no longer apply and were replaced.
- `isBinaryFile` stays in core (`fs.logic`), not a host method.

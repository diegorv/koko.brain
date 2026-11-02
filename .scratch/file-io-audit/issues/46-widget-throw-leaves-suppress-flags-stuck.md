# 46: A widget that throws during a tab switch leaves `isTabSwitching` stuck and silently turns off saving

**Status:** resolved

Priority: P0 (every edit after the throw is never saved, with no error shown, until the markdown editor remounts)

**What to build:** `MarkdownEditor.svelte` sets a suppress flag around two whole-doc replaces: the tab switch (src/lib/core/markdown-editor/MarkdownEditor.svelte:227 `isTabSwitching = true`, dispatch :230-235, reset :237) and the external-content sync (:328 `isExternalEdit = true`, dispatch :329-333, reset :334). Neither reset is in a `finally`. CodeMirror builds widget DOM inside `view.dispatch` (`WidgetTile.of` calls `widget.toDOM`, node_modules/@codemirror/view/dist/index.js:2204-2210, under `docView.update` at :8084, wrapped in `try/finally` with no `catch`), so a `toDOM` that throws escapes the dispatch and the flag stays `true`. The update listener (src/lib/core/markdown-editor/setup/editor-extensions.ts:171) then drops every later doc change (`!opts.isTabSwitching() && !opts.isExternalEdit()`), so `onContentChange` (src/lib/core/editor/editor.service.ts:228-231) never runs: the tab never turns dirty, autosave never fires, close does not prompt, and the quit flush has nothing to save.

The known trigger is F105: `fileUrlToFsPath` (src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:104-117) guards `new URL()` but not `decodeURIComponent(parsed.pathname)` at :113. A raw `%` that is not a valid escape (`![shot](file:///Users/me/100%.png)`) throws `URIError: URI malformed` from `ImageWidget.toDOM` (:129-154, via `applyFileSrc` :156-162).

Fix, two parts:

1. Catch a throw from either dispatch inside the effect instead of letting it escape. A `try/finally` alone is not enough: after the throw `view.state.doc` already holds the new note while `contentDOM` still shows the old one, the next full replace throws a `TypeError`, and Svelte rethrows an effect error that hits no boundary. So: `try { dispatch } catch (err) { error('EDITOR', ...); rebuild the view for the tab's content (view.setState(EditorState.create(...)) with the same extensions, or a remount) } finally { isTabSwitching = false; }`, and the same for `isExternalEdit`. The rest of the tab-switch effect (focus, the rAF decoration rebuild, `lastTabPath = path` at :273) must still run after the catch.
2. In `fileUrlToFsPath`, catch the `decodeURIComponent` failure and return `null` (the image then renders with no `src`, the same as any other unresolvable `file://` URL). Update its JSDoc.

Part 2 removes the known trigger; part 1 keeps any other throwing widget from corrupting the view or silencing autosave. Issue 14 changes the same two dispatches (history reset); whichever lands second rebases onto the other.

**Blocked by:** none

**Gate:** `pnpm check` + `pnpm vitest run` + `pnpm build`

**Source:** src/lib/core/markdown-editor/MarkdownEditor.svelte:42-45,225-237,310-337, src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:93-162, src/lib/core/markdown-editor/setup/editor-extensions.ts:170-171, src/tests/lib/core/markdown-editor/MarkdownEditor.test.ts, src/tests/lib/core/markdown-editor/extensions/live-preview/widgets/image-widget.test.ts

- [x] Failing test comes first. Move the `F105` and `F105 escalation` describes of `.scratch/editor-data-safety/repro/table-and-doc-mutations/widget-doc-rewrites.test.ts` under `src/tests/` (into `image-widget.test.ts` or next to it, fixing the `test-helpers` import path) and see them fail
- [x] `new ImageWidget('file:///Users/me/100%.png', 'shot').toDOM(view)` does not throw and leaves `img.src` empty; a well-encoded URL such as `file:///Users/me/CleanShot%202026.png` still reaches `host.assetUrl` with the decoded path
- [x] A view mounted on a note holding that image, through the real `imagePlugin`, renders the rest of the note
- [x] A component test in MarkdownEditor.test.ts: with a widget whose `toDOM` throws during the tab-switch dispatch (for example a `host.assetUrl` that throws, with a `file://` image in the target note), typing after the switch still updates `editorStore` and marks the tab dirty
- [x] The same holds for a throw during the external-content dispatch (`syncExternalContentToEditor` into the active tab): later typing still reaches `editorStore`
- [x] After a widget throws during a tab switch, a second tab switch shows the right note in both `view.state.doc` and the rendered DOM, no `TypeError` follows, and edits land only in that tab
- [x] Existing ImageWidget and MarkdownEditor tests still pass

## Audit evidence (editor-data-safety, 2026-11-02)

Source: editor-data-safety audit (`.scratch/editor-data-safety/audit-2026-11-02.md`, P0 row 11), cross-referenced in `.scratch/editor-data-safety/xref-file-io-audit.md` (no existing issue mentions ImageWidget, fileUrlToFsPath, URIError or the suppress flags). Code re-read at 1351a35d; the line numbers above are current.

### F105: a raw `%` in a `file://` image URL throws out of `ImageWidget.toDOM` and leaves `isTabSwitching = true`

- Verdict: CONFIRMED_BY_TEST for the throw out of `toDOM`, the view constructor and a tab-switch-shaped dispatch; the stuck flag is from the code trace (P0, likelihood rare, severe)

**How a user hits it.** A note holds `![shot](file:///Users/me/100%.png)`, typed by hand or pasted from a tool that does not encode `%`. The user switches to that note from another markdown tab. The doc-replace dispatch throws, `isTabSwitching` stays `true`, and from then on nothing typed in any markdown tab reaches the store: no dirty marker, no autosave, no close prompt. The flag is a component-local `let`, so it resets only when `MarkdownEditor` remounts (EditorView.svelte:70-86 unmounts it for the Tasks, Tags, Graph, calendar, kanban, canvas and collection views) or the app restarts. A user who stays in notes loses everything typed for the rest of the session. A write that brings such an image into the open note (for example a watcher reload after another app added the line) goes through the external-sync dispatch and leaves `isExternalEdit` stuck the same way.

**Recoverable from.** No. The edits exist only in the CodeMirror state; the file on disk and File History hold the bytes from before the switch.

**Code trace.** widgets.ts:113 `decodeURIComponent(parsed.pathname)` with no guard; `new URL('file:///Users/me/100%.png').pathname` is `/Users/me/100%.png` and `decodeURIComponent` of it throws `URIError: URI malformed` (checked in Node). widgets.ts:148 `applyFileSrc` runs from `toDOM` with no try/catch. CodeMirror view 6.43.15: `WidgetTile.of` (index.js:2206) calls `toDOM` inside `docView.update` (:8084), whose `try` (:8064) has a `finally` (:8091) and no `catch`; the update listeners (:8100-8104) run after it, so they are skipped for the throwing update too. MarkdownEditor.svelte:237 and :334 are never reached. editor-extensions.ts:171 gates `onDocChanged` on both flags. editor.service.ts:228-231 is how a keystroke reaches `editorStore.updateContent` and `scheduleAutoSave`.

**Repro test.** `.scratch/editor-data-safety/repro/table-and-doc-mutations/widget-doc-rewrites.test.ts`, describes `F105` and `F105 escalation`. Failing assertions: `expect(() => new ImageWidget('file:///Users/me/100%.png', 'shot').toDOM(view)).not.toThrow()`, the same for `new EditorView(...)` with the real `imagePlugin`, and `expect(() => view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: bad } })).not.toThrow()`. Recorded result: all three fail with `URIError: URI malformed`. A probe showed that after the throw `view.state.doc` is the new note while `contentDOM` still shows the old note's text, and the next full replace throws `TypeError: Cannot destructure property 'tile' of 'parents.pop(...)'`. The repro does not assert the flag itself; the MarkdownEditor.test.ts criteria above cover it.

**Not verified.** How Svelte 5 handles the error rethrown from the `$effect`, and what the user sees in the running app after the throw.

**Fix sketch.** Guard `decodeURIComponent` in `fileUrlToFsPath` (return `null`), and catch a throw from the tab-switch and external-edit dispatches, rebuild the view state and reset the suppress flags in a `finally` (see What to build: `try/finally` alone leaves the view desynced).

## Comments

- 2026-11-02, branch `issue/46-widget-throw-leaves-suppress-flags-stuck`: `ImageWidget` no longer throws on a raw `%` in a `file://` URL; `MarkdownEditor.svelte` `replaceDoc` catches a widget throw during a doc replace and rebuilds the view, so the suppress flags reset and saving stays on. Round 1 fixes: `replaceDoc` JSDoc names the rebuild-throw limit, tests assert the catch-path log, EOF blank line dropped; persistent-thrower desync recorded as follow-up Issue 55. Tests: pnpm check 0 errors; full suite (`pnpm vitest run && pnpm build`) at 47020f85 exit=0, 430 files, 9937 passed, 1 skipped, 1 todo. Reviews: round 1 APPROVED (4 findings, fixed or recorded), round 2 APPROVED (no findings).

# Issue 15 discovery: one "open" modifier for every link

Template: issue 09 (`work/09/discovery.md`), which added the primary-button filter in `findWikilinkClickTarget`. This Issue adds the platform modifier on top.

## Files that change
- `src/lib/utils/platform.ts` (new): no platform helper exists in the repo (searched `isMac`, `navigator.platform`, `darwin`). Exports `detectMac(nav)` (pure), `IS_MAC` (computed once at module load), `isOpenLinkModifier(e, mac)` (mac: `metaKey && !ctrlKey`; else `ctrlKey`) and `isMacContextClick(e, mac)` (`mac && ctrlKey`).
- `src/lib/core/markdown-editor/wikilink-click-target.ts:29-32`: `findWikilinkClickTarget(e, mac)` also returns `null` for a macOS Ctrl+click. New `resolveWikilinkClickPosition(e, view, mac)`: element hit -> `view.posAtDOM(el)`; no element but the open modifier is held -> `view.posAtCoords({x,y})`, kept only when `findWikilinkInfoAtPosition` finds a wikilink there (the revealed raw `[[...]]` in live preview has no wikilink class since issue 09); otherwise `null`.
- `src/lib/core/markdown-editor/MarkdownEditor.svelte:57-75`: `handleEditorClick` calls `resolveWikilinkClickPosition(e, view, IS_MAC)` and only then prevents/stops the event, so a Cmd+click on plain text still reaches CodeMirror.
- `src/lib/core/markdown-editor/extensions/live-preview/click-handler.ts:13-14`: `if (!e.metaKey && !e.ctrlKey)` becomes `if (!isOpenLinkModifier(e, mac))`, with `mac = IS_MAC` as a defaulted third parameter (CM passes `(event, view)`).

## Plan
1. Test-first: `src/tests/lib/utils/platform.test.ts` (detectMac on mac/windows/linux navigators, modifier helpers for both platforms). Implement. Commit.
2. Test-first: `wikilink-click-capture.test.ts` gets the table rows for wikilinks on both platforms (plain, Cmd, Ctrl, right click) for the rendered link, plus the revealed-source case through `resolveWikilinkClickPosition` with a real markdown `EditorState` and a stub `posAtCoords` (jsdom has no layout): modifier -> position inside the link, plain click -> null, modifier on plain text -> null. `click-handler.test.ts` gets the external-link rows for both platforms. Implement both files + the svelte handler. Commit.

## Prior-art tests
- `wikilink-click-capture.test.ts` `findWikilinkClickTarget` block and the capture-phase contract.
- `click-handler.test.ts` fake event + `createMarkdownState` view.

## Risks / defaults taken
- Platform detection: `navigator.platform` (deprecated but present in WKWebView/WebView2/WebKitGTK), falling back to `userAgent`. No `@tauri-apps/plugin-os` dependency added.
- Revealed-source position comes from `posAtCoords`; jsdom cannot exercise real geometry, so the test stubs it. Manual check in the app is left for the human.
- Source mode (no live preview) keeps plain-click navigation on `.cm-wikilink-*` tokens; the Issue's table is about the rendered link and does not ask to change source mode.
- On macOS Cmd+Ctrl+click counts as a context click (no navigation).
- No "open in new tab".

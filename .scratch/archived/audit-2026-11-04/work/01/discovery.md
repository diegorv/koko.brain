# Issue 01 discovery

No `spec.md` exists for audit-2026-11-04; the Issue and its Notes are the spec.

## Files that change

- `src/lib/core/editor/editor.service.ts:228-232`: add `onContentChangeForPath(path, content)` next to `onContentChange`: `editorStore.updateTabContentOnly(path, content)` + `scheduleAutoSave('body')`.
- `src/lib/app/EditorView.svelte:80-81`: wrap `CanvasView` in `{#key editorStore.activeTab.path}` (as the collection branch at :84), pass `path`, wire `onJsonChange={onContentChangeForPath}`.
- `src/lib/features/canvas/CanvasView.svelte:5-16`: add `path` prop, `onJsonChange: (path, json) => void`, pass through.
- `src/lib/features/canvas/CanvasInner.svelte`:
  - capture the instance's own path once (`untrack(() => path)`); the keyed instance never changes path while alive, and at destroy time the prop getter would read the new active tab.
  - keep `lastSyncedData` (parsed canvas of `lastSyncedJson`) next to `lastSyncedJson` (:79); `persistWithoutHistory` (:104-109) uses it as the `flowToCanvas` base instead of the `canvasData` prop-derived value and calls `onJsonChange(ownPath, json)`.
  - onDestroy flush (:230-234) kept as is; it now goes through the path-bound persist.

## Plan (test-first)

1. New `src/tests/lib/features/canvas/canvas-tab-switch.test.ts`, jsdom, mounts `EditorView` with real `editorStore` + `editor.service`, fake timers. Mocks: `@tauri-apps/plugin-fs` (asserted on), plus the Tauri boundary mocks `EditorView.test.ts` already needs (`@tauri-apps/api/core`, `@tauri-apps/api/event`); no store or logic mocks. Infra stubs: ResizeObserver, matchMedia, scrollTo/scrollIntoView (copied from `src/tests/lib/app/EditorView.test.ts:8-30`).
   - switch A -> M (guard), close A (guard), A -> B -> M (red on main), active canvas edit persists after 300 ms and autosaves to A's path (guard).
   - Typing: dblclick the text node, `input` event on its textarea (TextNode.svelte:38-41 -> `updateNodeData`).
2. Implement the four file changes above; run the test green.
3. Grep check for criterion 5: no `onContentChange` / `updateContent(` in `src/lib/features/canvas/`.

## Prior art

- `src/tests/lib/app/EditorView.test.ts:258-313` (mounting EditorView with a canvas tab, jsdom stubs).
- `EditorView.svelte:83-86` collection `{#key}` pattern.

## Risks / defaults taken

- "Mocking only @tauri-apps/plugin-fs" read as "no store/service mocks": EditorView pulls modules that call `invoke`/`listen`, so those Tauri APIs are mocked too (allowed by docs/TESTING.md: Tauri APIs are mockable).
- Captured path goes stale on a rename while an edit is pending (<300 ms): the rename re-keys the instance and the flush targets the old path, which no longer has a tab, so that one edit is dropped. Rare; same shape as the collection branch. Not handled.
- `canvasData` / `flowState` (CanvasInner.svelte:71-74): after this change `canvasData` feeds only `flowState`, which was already unused. Left in place (pre-existing dead code), reported.

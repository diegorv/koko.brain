# Issue 66 discovery

No spec.md for this feature. Prior art: Issue 31 (`work/31/`, `editorHost` + `CreateExtensionsOptions.copyBlockLink`) and Issue 32 (`work/32/`, `fencedBlockRenderers`, `appFencedBlockRenderers` in `app/editor-host.ts`, `registerAppPorts` in `app/boot.ts`).

## Files that change
1. Collection signal. `core/markdown-editor/MarkdownEditor.svelte:16,369-377` reads `collectionStore.isIndexReady` / `.version` in a `$effect` that dispatches `forceDecorationRebuild`. Add an optional `rebuildOn?(): unknown` to `FencedBlockRenderer` (`extensions/live-preview/core/fenced-block-renderers.ts`): a reactive read; the editor's effect calls it for every renderer. `collectionBlockRenderer` (`features/collection/collection-block-widget.ts:386`) reads both fields; `queryjsBlockRenderer` (`plugins/queryjs/queryjs-block-widget.ts:262`) reads `isIndexReady` (its widget snapshots it at :65, so it owns that dependency too). Same rebuild set as today.
2. Copy-block-link. `MarkdownEditor.svelte:17,91-97,123`: new prop `blockLinks: { copyLink(view), copyEmbed(view) }` (type in `core/markdown-editor/editor-host.ts`), used by both menu items and the keymap option. `app/editor-host.ts` exports `appBlockLinks` over the service; `app/EditorView.svelte:84` passes it.
3-5. Deep link. `features/deep-link/deep-link.service.ts:11,23,25`. Choice: a small action registry in deep-link (`registerDeepLinkAction('daily' | 'capture', handler)`), with the two handlers moved to `src/lib/app/deep-link-actions.ts` and registered from `registerAppPorts`. Why app/ and not the plugins: each handler composes deep-link (content resolution, capture body, tree refresh) with plugin code (periodic notes, quick capture); the app layer is where that composition belongs, and periodic-notes does not need to learn about deep links. An action with no handler throws inside `executeAction`'s try, so it logs and toasts like any failed action. `refreshTreeInBackground` becomes exported.
6. TOC. `features/note-action-bar/NoteActionBar.svelte:37,97`: new prop `onShowTableOfContents(path)`; `EditorView.svelte:66` passes `showTableOfContents`.
- `layer-baseline.json`: drop each line in the same commit as its move; `BASELINE_SIZE` 9 -> 3 in `layer-rules.test.ts`.

## Tests (pinned before each move)
- New `src/tests/lib/core/markdown-editor/MarkdownEditor.test.ts` (jsdom, mount, like `NoteActionBar.test.ts`): a ```collection block shows "Building index..." then the table after `setPropertyIndex`, and the row count follows `updateRecord` (version). Both context-menu items copy a block link / embed through the real service (clipboard is the mocked boundary). After the move the test mounts with the app's renderers / `appBlockLinks`.
- Deep link: existing `deep-link.service.test.ts` + `race-audit.test.ts` cover `daily` and `capture` through `executeAction`; after the move they register the app handlers in `beforeAll`. Add: an unregistered action toasts the failure.
- TOC: existing `NoteActionBar.test.ts` "TOC shows the right sidebar ..." pins it; render passes the real `showTableOfContents`.
- `boot.test.ts` (if present): `registerAppPorts` registers the deep-link handlers.

## Risks / defaults
- `rebuildOn` is read inside the editor `$effect`; it must only read state (no writes). Documented on the interface.
- Deep-link actions before `registerAppPorts` runs: it runs synchronously in `routes/(app)/+layout.svelte:27`, before the listener (:49), so none.
- E2E: no deep-link / copy-block-link / collection spec exists; `note-action-bar.spec.ts` and `table-of-contents.spec.ts` do. Deliver runs `bash scripts/e2e.sh`.

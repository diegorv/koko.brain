# 66: Clear the six remaining layer violations outside utils/

**What to build:** After Issue 32, `src/tests/lib/architecture/layer-baseline.json` holds nine edges. Three are the documented `utils/` exception (`utils/debug.ts` and `utils/app-channel.ts` -> `core/settings/`, CLAUDE.md Layer Rules). Remove the other six, so the baseline holds only those three:
1. **`core/markdown-editor/MarkdownEditor.svelte` -> `features/collection/collection.store.svelte.ts`** (:16, read at ~:370). The editor reads `collectionStore.isIndexReady` and `collectionStore.version` only to re-render the collection placeholders once the index is ready or changes. Move that signal behind the fenced-block renderer registry from Issue 32 (the collection renderer supplies its own rebuild trigger) or the `editorHost` facet from Issue 31, so the editor does not name the store.
2. **`MarkdownEditor.svelte` -> `features/copy-block-link/copy-block-link.service.ts`** (:17). The context menu calls `copyBlockLinkToClipboard` / `copyBlockEmbedToClipboard` directly. Issue 31 already routes copy-block-link through `CreateExtensionsOptions` for the keymap; give the context menu the same injected callbacks from the composition root.
3-5. **`features/deep-link/deep-link.service.ts` -> `plugins/periodic-notes/periodic-notes.service.ts`, `periodic-notes.logic.ts` (:11, :23) and `plugins/quick-capture/note-composer.logic.ts` (:25).** A feature must not import plugins. Either let the plugins register their deep-link actions (a small action registry in deep-link, wired in `src/lib/app/`), or move the daily-note and capture handlers into `src/lib/app/`. Pick one and say why in the commit.
6. **`features/note-action-bar/NoteActionBar.svelte` -> `plugins/table-of-contents/toc.service.ts`** (:37, used at :97). Let the table-of-contents plugin register its action, or pass it in from the composition root.

Behavior stays the same for every path: the collection placeholders still re-render when the index becomes ready or changes, both copy-block-link menu items still copy, every deep-link action still opens or creates its note, and the action bar still shows the table of contents.

**Blocked by:** none

**Status:** resolved

**Gate:** `pnpm check` + `pnpm vitest run` + `pnpm build` + `bash scripts/e2e.sh`

**Files:** src/lib/core/markdown-editor/,src/lib/features/deep-link/,src/lib/features/note-action-bar/,src/lib/features/collection/,src/lib/features/copy-block-link/,src/lib/plugins/periodic-notes/,src/lib/plugins/quick-capture/,src/lib/plugins/table-of-contents/,src/lib/app/,src/tests/lib/architecture/layer-baseline.json

**Source:** the layer baseline after Issue 32 (26eef1f1), 2026-11-01; the owner asked to clear it outside `utils/`.

- [x] Each moved call is pinned by a test before the move (collection placeholder re-render on index ready / version change, both copy-block-link menu items, each deep-link action, the table-of-contents action)
- [x] `layer-baseline.json` lists only the three `utils/` edges, shrunk in the same commit as each move, and `layer-rules.test.ts` passes
- [x] `featureCycleEdges` stays 0
- [ ] The E2E specs for deep links, copy-block-link, the note action bar and the collection blocks pass

## Notes

- **Size:** M. One commit per violation group (collection signal, copy-block-link, deep-link, table of contents) keeps the review small.

## Comments

- 2026-11-01, branch `issue/66-clear-remaining-layer-violations`: moved the collection rebuild signal behind the block renderers, injected the copy-block-link menu actions and the table-of-contents action from the app, and registered the daily and capture deep-link actions from `src/lib/app/`; `layer-baseline.json` now lists only the three `utils/` edges. Tests: `pnpm check` 0 errors; full suite at 0f4d1338 exit=0 (415 files, 9781 passed, 1 skipped, 1 todo), build OK. E2E (`bash scripts/e2e.sh`) not run by the workflow; no deep-link, copy-block-link or collection spec exists. Reviews: round 1 APPROVED (doc fixes applied in 0f4d1338), round 2 APPROVED with no findings.

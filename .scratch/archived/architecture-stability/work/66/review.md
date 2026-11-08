VERDICT: APPROVED

## Acceptance criteria

- [met] Each moved call is pinned by a test before the move (collection placeholder re-render on index ready / version change, both copy-block-link menu items, each deep-link action, the table-of-contents action) — Collection and copy-block-link: `src/tests/lib/core/markdown-editor/MarkdownEditor.test.ts` landed in 23ba1085, before the moves in e642f74c and e9bbbc81. It mounts the real editor with the real `collectionStore` and covers "Building index..." -> `T (0)` on `setPropertyIndex`, `T (0)` -> `T (1)` on `updateRecord` (version), and both menu items through the real copy-block-link service with only the clipboard mocked. I checked that it bites: with `collectionBlockRenderer.rebuildOn` reduced to `isIndexReady`, "re-render when the ready index changes in another note" fails (1 failed / 3 passed), and it passes again on the restored code. Deep links: on main, `deep-link.service.test.ts` already exercised `daily` and `capture` through `executeAction` (39 such actions). They still pass, and the only path to the moved handlers is `registerAppPorts()` at the top of the file. TOC: `NoteActionBar.test.ts:365` and `:461` on main already pinned "TOC shows the right sidebar ... on this note". e5e2d60a adds end-to-end wiring tests in `EditorView.test.ts`.
- [met] `layer-baseline.json` lists only the three `utils/` edges, shrunk in the same commit as each move, and `layer-rules.test.ts` passes — The baseline now holds only the `utils/app-channel.ts` and two `utils/debug.ts` edges. Each move commit touches `layer-baseline.json` and `layer-rules.test.ts` (e642f74c -1, e9bbbc81 -1, e5e2d60a -1, 77d9d14b -3). `BASELINE_SIZE = 3`. No entries or roots were added. `layer-rules.test.ts` passes in my run.
- [met] `featureCycleEdges` stays 0 — `src/tests/lib/architecture/feature-cycle.test.ts` passes in my run (the `src/tests/lib/architecture` directory was included).
- [not met] The E2E specs for deep links, copy-block-link, the note action bar and the collection blocks pass — Only deliver's `bash scripts/e2e.sh` can check this, so I did not run it. Also, `e2e/specs` has no spec for deep links, copy-block-link or collection blocks (discovery.md says the same). Only `note-action-bar.spec.ts` and `table-of-contents.spec.ts` touch these paths, so part of this criterion has nothing to run.

## Findings

1. nit, docs/adr/0028-quick-capture-merge-into-kokobrain.md:70: the "Source:" line still points to `src/lib/features/deep-link/deep-link.service.ts::executeCaptureAction`, which now lives in `src/lib/app/deep-link-actions.ts`. Fix: update the path, or leave it because ADRs are historical records. Line 44 names the function only, so it is still correct.
2. nit, docs/LIVE-PREVIEW.md:39: the `fencedBlockRenderers` paragraph does not mention the new optional `FencedBlockRenderer.rebuildOn`. A future renderer whose widgets snapshot store state would not learn that it must supply its own rebuild trigger now that the editor names no store. Fix: add one sentence. The JSDoc at `fenced-block-renderers.ts:20-26` covers it in code.
3. nit, src/lib/app/deep-link-actions.ts: this new source file has no test file of its own. Its behavior is covered through `executeAction` in `deep-link.service.test.ts` (daily append/prepend, capture kinds, template vars, unique path), and removing `registerDeepLinkActions()` from `boot.ts` would fail those tests, so this is not a coverage gap. Fix: none required.

## Correctness checks (no finding)

- Rebuild signal: on main the effect read `collectionStore.isIndexReady` and `collectionStore.version`. On the branch the union of `queryjsBlockRenderer.rebuildOn` (isIndexReady) and `collectionBlockRenderer.rebuildOn` (both) reads the same set. The loop does not short-circuit, and the `untrack` dispatch body is unchanged.
- Deep-link timing: `registerAppPorts()` runs synchronously in `src/routes/(app)/+layout.svelte:27`, before `registerDeepLinkListener` (:49) and `registerQuickCaptureListener` (:53). The composer window sends its capture to Rust, which emits it on the main window (`src/routes/composer/+page.svelte:36-39`), so no second JS context calls `executeAction` without the registry. A missing handler throws inside `executeAction`'s try, which logs and toasts, and a test pins this. The HMR dispose unregisters the handlers through `unregisterAppPorts`.
- The moved handlers are byte-identical apart from the stray duplicated JSDoc on main, which is now merged correctly. The `raw-write-ratchet` reasons moved with them, in the same order.
- `MarkdownEditor` and `NoteActionBar` are mounted only in `EditorView.svelte` and their tests. Both new props are required, so `pnpm check` would catch a missed mount site.
- The deep-link commit message explains why the handlers go in app/ rather than the plugins, as the Issue asks.

## Checks run

- `pnpm check`: exit 0, 212 files, 0 errors, 0 warnings.
- `pnpm vitest run` on: `src/tests/lib/core/markdown-editor/MarkdownEditor.test.ts`, `src/tests/lib/app/` (EditorView, editor-host, boot and the rest), `src/tests/lib/architecture/` (layer-rules, feature-cycle), `src/tests/lib/features/deep-link/`, `src/tests/lib/features/note-action-bar/`, `src/tests/lib/features/collection/`, `src/tests/lib/features/copy-block-link/`, `src/tests/lib/plugins/queryjs/`, `src/tests/lib/plugins/quick-capture/`, `src/tests/lib/plugins/table-of-contents/`, `src/tests/lib/plugins/periodic-notes/`, `src/tests/lib/raw-write-ratchet.test.ts`, `src/tests/lib/core/markdown-editor/extensions/live-preview/`. Exit 0: 160 files, 3479 passed, 1 skipped, 1 todo. My test verdict rests on these files.
- Mutation probe described under criterion 1. The worktree was restored and is clean.
- Not run: the full suite, `pnpm build` and `bash scripts/e2e.sh`, which are deliver's to run.

## Resolution

1. Fixed: the ADR 0028 "Source:" line now points to `src/lib/app/deep-link-actions.ts::executeCaptureAction`.
2. Fixed: the `fencedBlockRenderers` paragraph in `docs/LIVE-PREVIEW.md` now says a renderer whose widgets snapshot reactive state must supply `rebuildOn()`.
3. No change: the finding itself says none is required; `deep-link.service.test.ts` covers the file through `executeAction` and `registerAppPorts()`.

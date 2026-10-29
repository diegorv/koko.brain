# 11: Force rebuild and reconfigure pass the viewport guards

**What to build:** `checkUpdateAction` now returns `'rebuild'` for a `forceDecorationRebuild` effect or a reconfigure that arrives in the same update as a viewport change (Issue 01). The 11 factory-built block decorators and `inlineFormattingPlugin` never get that far: their guard `if (update.viewportChanged && !update.docChanged && !update.selectionSet) return;` drops such an update before `checkUpdateAction` runs, so the rebuild is lost when the selection did not move. Let `forceDecorationRebuild` and `reconfigured` through both guards while a pure scroll (and a `rebuildOn` effect riding a pure scroll) still returns early. Update CLAUDE.md Performance rule 4, `docs/LIVE-PREVIEW.md` and ADR 0008 where they quote the guard line.

**Also (drag release, found by the post-merge review of `a81edad6`):** since `a81edad6`, a `forceDecorationRebuild` that arrives during a mouse drag returns `'skip'`, on the promise that the drag release rebuilds. The queryjs decorator's narrower `gate` (`plugins/queryjs-block-field.ts:70-73`) passes only `docChanged`, `selectionSet` or `forceDecorationRebuild`, and the release transaction from `releaseMouseSelecting` (`core/mouse-selecting.ts`) is effect-only, so queryjs drops it before `checkUpdateAction`. Repro: open a note whose queryjs block shows "Building index...", start a drag-select, let the property index finish (the `$effect` in `MarkdownEditor.svelte` dispatches `forceDecorationRebuild`, skipped), release with no further selection change: the placeholder stays until the next edit or cursor move; a `collectionStore.version` bump mid-drag leaves stale rows the same way. Let the gate pass a transaction where `mouseSelectingField` goes from true to false (do not add `forceDecorationRebuild` to `rebuildOn`: that bypasses `checkUpdateAction` and brings back the mid-drag collapse). Unconfirmed related risk to check, not necessarily fix: a mousedown with no mouseup (native HTML5 drag of selected text ending in drop/dragend) leaves the drag flag set, and every non-doc forced rebuild is skipped until the next mousedown.

**Context:** Review of Issue 01 (`.scratch/live-preview-analysis/work/01/review.md`, finding 4); report item 13 in `.scratch/live-preview-analysis/report-markdown-editor.md` names `block-decorator.ts:72` as a site of this loss. Issue 01 scoped that file as read-only.

**Blocked by:** 08 (fenced-code-awareness), which modifies `queryjs-block-field.ts`; otherwise none.

**Status:** ready-for-agent

**Touches:**
- `src/lib/core/markdown-editor/extensions/live-preview/core/block-decorator.ts` (modify; guard at :72)
- `src/lib/core/markdown-editor/extensions/live-preview/inline/inline-formatting-plugin.ts` (modify; guard at :160)
- `src/lib/core/markdown-editor/extensions/live-preview/plugins/queryjs-block-field.ts` (modify; `gate`)
- `CLAUDE.md`, `docs/LIVE-PREVIEW.md`, `docs/adr/0008-codemirror-live-preview-architecture.md` (modify; guard line quotes)

**Gate:** `pnpm check` + `pnpm vitest run` + `pnpm build` (frontend only)

- [x] Test (`block-decorator.test.ts`): a viewport-changing update carrying `forceDecorationRebuild`, no selection change, rebuilds
- [x] Test (`block-decorator.test.ts`): the same with a reconfigure rebuilds
- [x] Test (`inline-formatting-plugin.test.ts`): the same two cases for `inlineFormattingPlugin`
- [x] The existing "skips viewport-only updates, even when a rebuildOn effect rides along" test still passes
- [x] Test: a queryjs block whose forced rebuild was skipped mid-drag rebuilds on the drag release with no selection change; written and seen failing first

## Comments

- 2026-10-29 18:24 — discovery — plan in work/11/discovery.md: shared isPureScroll guard, queryjs gate passes drag release — 958d8491
- 2026-10-29 18:27 — implement — isPureScroll guard in blockDecorator + inlineFormattingPlugin (54c5aae9), queryjs gate passes drag release (08479677); live-preview vitest 1253/1253, pnpm check 0 errors; native HTML5 text drag (no mouseup) confirmed by reading mouse-selecting.ts to leave the drag flag set until the next mousedown+mouseup, not fixed — 08479677

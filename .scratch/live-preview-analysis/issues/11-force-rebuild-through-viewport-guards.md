# 11: Force rebuild and reconfigure pass the viewport guards

**What to build:** `checkUpdateAction` now returns `'rebuild'` for a `forceDecorationRebuild` effect or a reconfigure that arrives in the same update as a viewport change (Issue 01). The 11 factory-built block decorators and `inlineFormattingPlugin` never get that far: their guard `if (update.viewportChanged && !update.docChanged && !update.selectionSet) return;` drops such an update before `checkUpdateAction` runs, so the rebuild is lost when the selection did not move. Let `forceDecorationRebuild` and `reconfigured` through both guards while a pure scroll (and a `rebuildOn` effect riding a pure scroll) still returns early. Update CLAUDE.md Performance rule 4, `docs/LIVE-PREVIEW.md` and ADR 0008 where they quote the guard line.

**Context:** Review of Issue 01 (`.scratch/live-preview-analysis/work/01/review.md`, finding 4); report item 13 in `.scratch/live-preview-analysis/report-markdown-editor.md` names `block-decorator.ts:72` as a site of this loss. Issue 01 scoped that file as read-only.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

**Touches:**
- `src/lib/core/markdown-editor/extensions/live-preview/core/block-decorator.ts` (modify; guard at :72)
- `src/lib/core/markdown-editor/extensions/live-preview/inline/inline-formatting-plugin.ts` (modify; guard at :160)
- `CLAUDE.md`, `docs/LIVE-PREVIEW.md`, `docs/adr/0008-codemirror-live-preview-architecture.md` (modify; guard line quotes)

**Gate:** `pnpm check` + `pnpm vitest run` + `pnpm build` (frontend only)

- [ ] Test (`block-decorator.test.ts`): a viewport-changing update carrying `forceDecorationRebuild`, no selection change, rebuilds
- [ ] Test (`block-decorator.test.ts`): the same with a reconfigure rebuilds
- [ ] Test (`inline-formatting-plugin.test.ts`): the same two cases for `inlineFormattingPlugin`
- [ ] The existing "skips viewport-only updates, even when a rebuildOn effect rides along" test still passes

# 04: queryjs pager click reveals source, plus cosmetic live-preview render gaps

**Status:** needs-triage

**Blocked by:** none

Priority: P3 (low likelihood for the owner; split into separate Issues at triage if any is picked up)

Evidence for each is in `.scratch/live-preview-audit/repro/` (see `audit-2026-11-02.md` for how to run).

1. **queryjs `kb.ui.table` Prev/Next.** The pager buttons get only `onclick` (src/lib/plugins/queryjs/kb-ui.ts:520-531), with no `mousedown` stopPropagation, unlike the Run buttons (queryjs-block-widget.ts:159, :250); `QueryjsBlockWidget.ignoreEvent` returns false (:138-140). Clicking Next moves the cursor to the fence, reveals the raw JS and loses the click. Fix: stop `mousedown` on the pager buttons, or a container-level guard for button, a and input targets so user-script controls are covered. Test: repro/interactions/widget-click.test.ts 'pager Next survives its click and turns the page'.
2. **Wikilink and wikilink embed inside inline code.** wikilink-embed-plugin.ts:72-74 and inline/handlers/wikilink-handler.ts:17-47 skip only block contexts, so `` `![[Note]]` `` renders an embed and `` `[[Note]]` `` loses its brackets. Fix: skip matches inside an `InlineCode` node. Test: repro/inline/lp-redraw-inline-audit.test.ts.
3. **INPUT option containing `]`.** `INPUT_RE` (parsers/meta-bind-input.ts:23) captures `[^\]]+`, so `option(good, [[good]])` ends the match early and the INPUT never becomes a control. Fix (only if wanted): a bracket-balanced scan. Test: repro/inline/lp-redraw-inline-audit.test.ts.
4. **`$$` block math right after a paragraph line** (including the first body line of a callout) renders as source; a blank line fixes it. Fix: an `endLeaf` for BlockMath so `$$` ends a paragraph like a fence does (check Obsidian's behavior first). Test: repro/block-vs-block/block-vs-block-extra.test.ts.
5. **`<audio>` / `<video>` inside a revealed code fence or `%%` comment** renders a player instead of source. Fix: the `isInsideBlockContext` guard the inline plugins use, plus the comment ranges. Test: repro/block-vs-block/block-vs-block-extra.test.ts.
6. **Stale embeds (PLAUSIBLE, traced only).** A note embed keeps old text after the target changes elsewhere, mermaid keeps the old theme after a light/dark switch, and an image embed shows "not found" after the file appears, until the line is redrawn.

## Acceptance criteria

To be written at triage, per item picked up.

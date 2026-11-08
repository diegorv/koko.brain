# 04 (postponed by the owner): queryjs pager clicks reveal source; wikilinks in inline code and media tags in code render as widgets

**Status:** wontfix

**Blocked by:** none

Priority: P3 (low likelihood for the owner; three small, independent fixes with red tests)

Triage note (2026-11-02): this Issue first bundled six items. The three with a confirmed test and a clear fix stay here; the ones that need an owner decision or were only traced moved to Issue 05.

**What to build:**
1. **queryjs `kb.ui.table` Prev/Next.** The pager buttons get only `onclick` (src/lib/plugins/queryjs/kb-ui.ts:520-531) and no `mousedown` stopPropagation, unlike the Run buttons (src/lib/plugins/queryjs/queryjs-block-widget.ts:159, :250); `QueryjsBlockWidget.ignoreEvent` returns false (:138-140). Clicking Next moves the cursor to the fence, reveals the raw JS and loses the click. Stop `mousedown` on the pager buttons; a container-level guard in `QueryjsBlockWidget.toDOM` for `button`, `a` and `input` targets is preferred if it also covers controls a user script appends, as long as the Run buttons and kb-api links keep working.
2. **Wikilinks inside inline code.** wikilink-embed-plugin.ts:72-77 and inline/handlers/wikilink-handler.ts:17-47 skip only block contexts, so `` `![[Note]]` `` renders an embed widget and `` `[[Note]]` `` loses its brackets and gets link styling. Skip a match whose range sits inside an `InlineCode` node (for example `syntaxTree(state).resolveInner(from, 1)` with an `InlineCode` ancestor) in both.
3. **`<audio>` / `<video>` inside a code fence or `%%` comment.** audio-plugin.ts and video-plugin.ts (`computeAudioBlocks` / the video equivalent) scan lines without the `isInsideBlockContext` guard the inline plugins use, so a media tag inside a revealed fenced code block or a `%%` block comment renders as a player. Skip lines inside a block context, and inside the block comment ranges if the comment is not a Lezer node.

**Gate:** `pnpm check` + `pnpm vitest run` + `pnpm build`

**Source:** src/lib/plugins/queryjs/kb-ui.ts:500-540, src/lib/plugins/queryjs/queryjs-block-widget.ts:130-260, src/lib/core/markdown-editor/extensions/live-preview/plugins/wikilink-embed-plugin.ts, inline/handlers/wikilink-handler.ts, plugins/audio-plugin.ts, plugins/video-plugin.ts, core/is-inside-block-context.ts, plugins/block-comment-field.ts; tests in .scratch/live-preview-audit/repro/interactions/widget-click.test.ts, repro/inline/lp-redraw-inline-audit.test.ts, repro/block-vs-block/block-vs-block-extra.test.ts

## Acceptance criteria

- [ ] Failing tests first: move the pager case ('pager Next survives its click and turns the page'), the two wikilink-in-inline-code cases and the audio/video-in-code cases from the repro files above under `src/tests/` and see them fail
- [ ] Clicking Next on a paginated `kb.ui.table` shows page 2, the widget stays drawn and the cursor does not move; the Run and Run-again buttons behave as today
- [ ] `` `![[Note]]` `` and `` `[[Note]]` `` render as inline code with their brackets; wikilinks and embeds outside inline code render as today
- [ ] A `<video>` / `<audio>` line inside a fenced code block or a `%%` comment shows its source; a top-level media tag renders the player as today

## Comments

- 2026-11-06: migrated to `.scratch/open-itens/issues/086-queryjs-pager-clicks-keep-widget-rendered-wikilinks.md` by audit 2026-11-05 (its re-checked text and any related audit findings now live there, in one plan ordered by impact on written content and daily use). Closed here as wontfix so it is worked in one place; nothing was implemented.

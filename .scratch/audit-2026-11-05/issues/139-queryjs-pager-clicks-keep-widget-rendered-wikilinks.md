# 139: QueryJS pager clicks keep the widget rendered; wikilinks in inline code and media tags in code render as text

**Migrated from:** `.scratch/live-preview-audit/issues/04-queryjs-pager-and-cosmetic-render-gaps.md` (audit 2026-11-05). Priority: later (refactor, deferred, feature) (bucket 5-later). The owner postponed it on 2026-11-02. It is fully specified.

**Audit check at `5f8003d67`:** still_present (ux, low). Item 1: src/lib/plugins/queryjs/kb-ui.ts:505-538 creates the Prev/Next buttons with only onclick and no mousedown stopPropagation. QueryjsBlockWidget.ignoreEvent returns false (src/lib/plugins/queryjs/queryjs-block-widget.ts:168-170). The only mousedown stops are on Run (:208) and Retry (:318), and toDOM has no container-level guard. Item 2: inline/handlers/wikilink-handler.ts:19-45 decorates every findWikilinkRanges match with no InlineCode check. plugins/wikilink-embed-plugin.ts:72-74 skips only isInsideBlockContext at the line start. Item 3: plugins/audio-plugin.ts:12-45 (computeAudioBlocks) scans getAllLines with no isInsideBlockContext guard; the video plugin is the same.

**Stale in the text below:** Line numbers drifted. The queryjs Run button stop is at :208 (not :159), Retry at :318 (not :250), ignoreEvent at :168-170 (not :138-140), and the kb-ui pager handlers at :526-538. The Issue is still postponed by the owner (needs-info). It stays valid as written.

**Owner decision (2026-11-06):** schedule it now. Any wording below that assumes this decision, calls it recommended or unconfirmed, or asks to confirm it with the owner is superseded: the owner confirmed it on 2026-11-06.

**Status:** ready-for-agent

**First wave:** yes, picked by the owner on 2026-11-06.

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

- 2026-11-06: migrated from `.scratch/live-preview-audit/issues/04-queryjs-pager-and-cosmetic-render-gaps.md` by audit 2026-11-05, which re-checked it at `5f8003d67`.
- 2026-11-06: owner decision recorded from the 2026-11-06 survey; status ready-for-agent.

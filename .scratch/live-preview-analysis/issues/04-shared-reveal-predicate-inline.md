# 04: One reveal rule, applied to inline formatting

**What to build:** Every inline construct reveals its syntax when its line is touched by the selection, decided by one shared predicate. Today handlers mix per-line and per-node checks (`isTouched` over node ranges for `**`, links, escapes, `%%`) under a per-line rebuild gate, so moving between two bold runs on the same line does not update. The predicate returns the set of lines touched by any selection range (multi-cursor and multi-line selections included, nothing during a mouse drag). Also fixes `- > quote`: the blockquote mark starts at `line.from` and swallows the bullet widget; it must start at the first QuoteMark.

**Context:** Analysis run 2026-10-29 (40 haiku + 15 opus over `src/lib/core/markdown-editor`, plus 20 haiku over seven reference editors). Evidence and decisions: `.scratch/live-preview-analysis/findings-2026-10-29.md`; verified findings with file:line: `.scratch/live-preview-analysis/report-markdown-editor.md`. Target model: one shared line-based reveal predicate (every line touched by the selection), rebuild on every selection change with no cross-update state, instant swaps with no CSS animation, heading line height independent of the cursor.

**Blocked by:** 02 (instant-syntax-swaps)

**Status:** ready-for-agent

**Touches:**
- `src/lib/core/markdown-editor/extensions/live-preview/core/` (new; shared predicate, e.g. `reveal.ts`)
- `src/lib/core/markdown-editor/extensions/live-preview/core/should-show-source.ts` (modify or replace)
- `src/lib/core/markdown-editor/extensions/live-preview/inline/inline-formatting-plugin.ts` and `src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/` (modify)
- `src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/blockquote-handler.ts` (modify; :48)

**Gate:** `pnpm check` + `pnpm vitest run` + `pnpm build` (frontend only)

- [ ] Predicate tests: single cursor, multi-cursor, multi-line selection, drag in progress
- [ ] Every inline handler uses the predicate; no handler keeps its own range check
- [ ] Test: `**one** and **two**` reveals both runs when the cursor is anywhere on the line
- [ ] Test: `- > quote` keeps its bullet visible

## Comments

- 2026-10-29 17:33 — discovery — plan: core/reveal.ts line-interval predicate wired into buildInlineDecorations as isRevealed; blockquote hide starts at first QuoteMark; shouldShowSource left for Issue 05, lastCursorLine for 06 — (this commit)
- 2026-10-29 17:37 — implement — core/reveal.ts revealPredicate wired into every inline handler as isRevealed; blockquote hide starts at first QuoteMark; editor vitest 1317/1317, pnpm check 0 errors; e2e not run; multi-line selection collapsing onto the same head line can stay stale until Issue 06 removes lastCursorLine — 107ccb3d
- 2026-10-29 17:42 — review — CHANGES_REQUESTED: all 4 criteria met; HardBreak range ends at next line start so the cursor on line N+1 reveals line N (medium); triple-click/selectLine reveals next line (low); indented-quote test missing (low) — (this commit)
- 2026-10-29 17:44 — fix — review findings 1-3 fixed: a non-empty range ending at a line start ends on the previous line (hard break, triple-click); indented-quote test pins markFrom 2; editor vitest 1323/1323, pnpm check 0 errors — (this commit)

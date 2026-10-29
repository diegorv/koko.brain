# 06: No cross-update state: remove the lastCursorLine gate

**What to build:** Decorations rebuild on every selection change, with no `lastCursorLine` memory. First measure with LP-PROFILE the rebuild cost of the inline plugin plus the block decorators on every selection change on a large note (record the numbers in `.scratch/live-preview-analysis/findings-2026-10-29.md`). If the cost is not small (order of a few ms), stop, set `ready-for-human` and report the numbers. Otherwise drop `lastCursorLine` from `checkUpdateAction` and every caller (one rebuild gate), update CLAUDE.md live-preview rules 4-5, and add the end-to-end regression test for the reported bug.

**Context:** Analysis run 2026-10-29 (40 haiku + 15 opus over `src/lib/core/markdown-editor`, plus 20 haiku over seven reference editors). Evidence and decisions: `.scratch/live-preview-analysis/findings-2026-10-29.md`; verified findings with file:line: `.scratch/live-preview-analysis/report-markdown-editor.md`. Target model: one shared line-based reveal predicate (every line touched by the selection), rebuild on every selection change with no cross-update state, instant swaps with no CSS animation, heading line height independent of the cursor.

**Blocked by:** 01 (navigation-always-updates-reveal), 05 (block-decorators-shared-reveal)

**Status:** ready-for-agent

**Touches:**
- `src/lib/core/markdown-editor/extensions/live-preview/core/check-update-action.ts` (modify)
- `src/lib/core/markdown-editor/extensions/live-preview/core/block-decorator.ts`, `src/lib/core/markdown-editor/extensions/live-preview/inline/inline-formatting-plugin.ts`, `src/lib/core/markdown-editor/extensions/live-preview/plugins/` (modify; callers)
- `CLAUDE.md` (modify; Live Preview rules 4-5)
- `e2e/` or unit tests (new; regression)

**Gate:** `pnpm check` + `pnpm vitest run` + `pnpm build` (frontend only)

- [ ] LP-PROFILE numbers recorded before the gate is removed
- [ ] No `lastCursorLine` remains in live-preview
- [ ] Regression test: ArrowUp/ArrowDown between a bullet line and an H1 line reveals exactly the new line and hides the old one, with and without the move scrolling the viewport
- [ ] Pure scroll still skips rebuilds

## Comments

- 2026-10-29 18:34 — discovery — LP-PROFILE measured: ~2.9 ms JS per rebuild at 1k lines, ~5.0 ms at 2k, ~12.3 ms (15.4 ms per dispatch) at 6k lines; not "a few ms" on a large note, so stopped before removing the gate per the Issue's rule. Numbers in findings-2026-10-29.md, options A/B/C in work/06/discovery.md. Needs a user decision. — 4f358626

- 2026-10-29 owner decision (option B from `work/06/discovery.md`): the measurement stopped the
  plain removal (6000-line note ~12.3 ms JS per rebuild, 88% in the block decorators). Replace
  the `lastCursorLine` memory with a stateless check instead: rebuild on a selection change only
  when the set of lines touched by `update.startState.selection` differs from the set touched by
  `update.state.selection` (use the shared reveal line set, so the rule stays identical to
  `revealPredicate`). No state survives across updates. Keep every other gate (doc change,
  reconfigure, forced rebuild, drag release, pure-scroll skip). Remove `lastCursorLine` from
  `checkUpdateAction` and every caller, update CLAUDE.md live-preview rules 4-5, ADR 0008 and
  `docs/LIVE-PREVIEW.md` to describe the stateless rule, and add the bullet <-> H1 regression test
  (with and without scroll). Acceptance: no `lastCursorLine` remains; a test proves a selection
  move within the same line set does not rebuild and a move that changes the set does.

- 2026-10-29 20:43 — discovery — plan for option B (stateless touched-line-set gate shared with revealPredicate) in work/06/discovery.md — 137fd16c

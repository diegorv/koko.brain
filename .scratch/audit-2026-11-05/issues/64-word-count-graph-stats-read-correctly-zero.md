# 64: Word count and graph stats read correctly for zero and one

**Migrated from:** `.scratch/ux-polish/issues/12-word-count-and-graph-stats-counts.md` (audit 2026-11-05). Priority: polish (bucket 3-polish). Still present, a copy fix.

**Audit check at `5f8003d67`:** still_present (polish, medium). src/lib/plugins/word-count/WordCount.svelte:33 renders the fixed string '{words} words <sep> {characters} characters <sep> {readingTime} min read' with no zero or singular handling. src/lib/plugins/graph-view/GraphView.svelte:441 prints '{simNodes.length} notes &middot; {simLinks.length} links'. rg finds no formatGraphStats anywhere in src. Every new empty note shows '0 words ... 1 min read' (estimateReadingTime floors at 1, pinned by word-count.logic.test.ts:89).

**Stale in the text below:** GraphView footer is at line 441, not about 442. No WordCount.test.ts exists yet. Cosmetic only.

**What to build:** Two status lines print wrong counts:

1. `src/lib/plugins/word-count/WordCount.svelte` (about line 33) prints "0 words · 0 characters · 1 min read" for an empty note, and "1 words" / "1 characters" for one. `estimateReadingTime` floors at 1 on purpose (pinned by `word-count.logic.test.ts` "returns 1 min for 0 words"), so the fix lives in the component: hide the reading-time segment and its separator when `words === 0`, and use "word" / "character" for a count of 1.
2. `src/lib/plugins/graph-view/GraphView.svelte` (about line 442) prints "1 notes · 1 links". Add a pure `formatGraphStats(noteCount: number, linkCount: number): string` to `src/lib/plugins/graph-view/graph-view.logic.ts` that returns e.g. "1 note · 2 links" (singular for 1, plural otherwise, `·` as the separator), and render it in the footer.

**Blocked by:** none

**Status:** ready-for-agent

**First wave:** yes, picked by the owner on 2026-11-06.

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`.

- [ ] Failing first: `graph-view.logic.test.ts` gains `formatGraphStats` cases for (0, 0) "0 notes · 0 links", (1, 1) "1 note · 1 link" and (2, 3) "2 notes · 3 links"
- [ ] Failing first: a new `src/tests/lib/plugins/word-count/WordCount.test.ts` mounts `WordCount` with the real `editorStore` holding an active `.md` tab (fake timers, advance 500ms): empty content renders "0 words" and no "min read"; content "hello" renders "1 word" and "5 characters" and "1 min read"; a 250-word body renders "2 min read". Use the existing test helpers for opening a tab; do not mock the store
- [ ] `estimateReadingTime` and its tests are unchanged
- [ ] `e2e/specs/word-count.spec.ts` (expects "min read" on `Welcome.md`) still holds; run it with `bash scripts/e2e.sh e2e/specs/word-count.spec.ts`
- [ ] `GraphView.svelte` calls `formatGraphStats(simNodes.length, simLinks.length)`; no inline pluralization left in the footer

## Notes

- **Source:** review-2026-11-04.md "Shell layout" row "Small items" ("1 min read" for 0 words, "fix counters") and "Feature views" row "Graph view" ("pluralize 1 notes · 1 links").
- **Assumption (stated, no owner decision needed):** the 1-minute floor stays for any non-empty note; only the empty note hides the estimate. Changing the floor itself would mean editing a test that pins it, which needs owner approval and is not part of this ticket.
- **Layer:** both files are in `plugins/`; `graph-view.logic.ts` stays framework-free.
- **Out of scope:** the graph label font size (dropped in this cluster) and graph theme colors (review ticket 9).
- **Size:** S.

## Comments

- 2026-11-06: migrated from `.scratch/ux-polish/issues/12-word-count-and-graph-stats-counts.md` by audit 2026-11-05, which re-checked it at `5f8003d67`.

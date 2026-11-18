# 41: Word count and graph stats read correctly for 0 and 1; graph mode buttons show their state

**Origin:** design review 2026-11-17, proposals P172 (count copy), P116 (singular and zero) and P86 (the graph pair), prototype `.scratch/design-review/prototypes/feedback-components.html`, research `.scratch/ux-quick-wins/research/verdict-feedback-b.md` (QB5 and P86) and `verdict-editor.md` (P116, owned by QB5), `breakdown.md` (old ticket 09). Absorbs open-itens 213 (`.scratch/open-itens/issues/213-word-count-graph-stats-read-correctly-zero.md`, to be marked wontfix with a pointer here).

**What to build:**

1. **Word count copy.** `src/lib/plugins/word-count/WordCount.svelte:33` prints a fixed "{words} words | {characters} characters | {readingTime} min read". It reads "1 word" and "1 character" for a count of 1, and drops the reading-time segment and its separator at 0 words ("0 words | 0 characters"). `estimateReadingTime` is unchanged: it floors at 1 on purpose (pinned by `word-count.logic.test.ts`), so the hiding lives in the component. A non-empty note still shows "1 min read" at least.
2. **Graph footer.** A pure `formatGraphStats(noteCount, linkCount)` in `src/lib/plugins/graph-view/graph-view.logic.ts` returns "1 note · 1 link", "2 notes · 3 links", "0 notes · 0 links". `GraphView.svelte:556-557` (`{simNodes.length} notes &middot; {simLinks.length} links`) renders it, with no inline pluralization left in the footer.
3. **Graph mode buttons.** The two buttons in `src/lib/plugins/graph-view/GraphControls.svelte:44-63` get `aria-pressed` from `graphViewStore.mode` (`graph-view.store.svelte.ts:27`). Attributes only: `setMode` and the handlers are untouched, and `aria-label` and `title` stay.

Not in this ticket: the "N of M words" selection count (no selection state in `editor.store.svelte.ts`); the kanban view trio's `aria-pressed` (ticket 02); one voice for "Failed to" and "Could not" in toasts; the SegmentedControl primitive; the graph label font size and graph theme colours.

**Size:** S.

**Blocked by:** none

**Status:** ready-for-agent

**Gate:** pnpm check + pnpm vitest run, plus bash scripts/e2e.sh e2e/specs/word-count.spec.ts.

- [ ] Failing test first, `src/tests/lib/plugins/graph-view/graph-view.logic.test.ts`: `formatGraphStats(0, 0)` is "0 notes · 0 links", `(1, 1)` is "1 note · 1 link", `(2, 3)` is "2 notes · 3 links".
- [ ] Failing test first, new `src/tests/lib/plugins/word-count/WordCount.test.ts` (real `editorStore` with an active `.md` tab, fake timers advanced 500 ms): empty content shows "0 words" and no "min read"; "hello" shows "1 word", "5 characters" and "1 min read"; a 250-word body shows "2 min read"; a non-markdown tab renders nothing.
- [ ] `src/tests/lib/plugins/graph-view/GraphView.test.ts:73` changes from `toContain('1 links')` to `toContain('1 link')` plus `not.toContain('1 links')`. It pins the bug today, so this corrects a test that encodes it and does not weaken one. `:120,135` ("2 links") stay.
- [ ] `GraphControls.test.ts`: `aria-pressed` on the Global and Local buttons follows `graphViewStore.mode` and flips after a click; the lookups by `aria-label` at `:290-296` still work.
- [ ] `estimateReadingTime` and its tests are unchanged. `bash scripts/e2e.sh e2e/specs/word-count.spec.ts` passes: its counts (`\d+ words`, `\d+ min read` on `Welcome.md`, and the status-bar test at `:43-83` typing "Some words here") stay above 1, so no selector changes.
- [ ] Frontend gate: pnpm check and pnpm vitest run pass.

## Original proposal

- **P172 (count copy).** Copy and casing drift across the app, among it "1 words". One pass over user-visible strings; here only the count strings ("1 words", "1 links", "0 words ... 1 min read"). Validation: revise, log messages are out of scope.
- **P116 (singular and zero).** A one-word note shows "1 words". Pluralise correctly; with a selection show "N of M words" (deferred: no selection state). Validation: revise, the two counts match in the real app, the screenshot mismatch is the mock.
- **P86 (graph pair).** Six segmented controls have five selected looks and only one has ARIA. Here only `aria-pressed` on the graph mode pair; the kanban trio is ticket 02, search and calendar are already done, and the shared SegmentedControl primitive is deferred.
- **Open-itens 213.** Word count and graph stats read correctly for zero and one; its five criteria are carried above.

## Problem

An empty new note shows "0 words | 0 characters | 1 min read", a one-word note "1 words", and a graph with one note and one link says "1 notes · 1 links". The two graph mode buttons look pressed or not only by a background colour, so a screen reader cannot tell which graph is showing.

## Evidence

Checked at `085b23c5d`.

- `WordCount.svelte:33` (the fixed string); `:8-9` the state, `:22-26` the 500 ms debounce.
- `GraphView.svelte:556-557`; `graph-view.logic.ts` has no stats helper.
- `GraphControls.svelte:44-63`: both buttons have `aria-label` and `title`, a state-dependent class, and no `aria-pressed`.
- `src/tests/lib/plugins/graph-view/GraphView.test.ts:73` asserts `toContain('1 links')`. No `WordCount.test.ts` exists. `GraphControls.test.ts:290-296` finds buttons by `aria-label`.
- No E2E selects the graph mode buttons (`rg "Global graph" e2e/specs` finds nothing).

## Sequence with

Open-itens 087, 165 and 166 (all ready-for-agent) edit `GraphView.svelte` on other lines (local-graph centre, node drag, the arrows toggle); not covered here, rebase only. The finders-ux graph tickets 12 to 15 are resolved. No other ux-quick-wins ticket edits these files.

## Comments

- 2026-11-18, triage: ready-for-agent. Decided by the owner: the order and grouping. Defaults (not individually answered): none in the old ticket. Assumption carried from open-itens 213: the 1-minute floor stays for any non-empty note; only the empty note hides the estimate.

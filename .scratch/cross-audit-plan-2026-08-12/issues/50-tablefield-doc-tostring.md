# Issue 50: table-field allocates the full doc per rebuild (same bug as issue 07)

Status: ready-for-agent
Phase: unplanned
Source: issue 07 implementation (2026-08-17) — pre-existing sibling of the meta-bind `doc.toString()`, out of the surgical scope of that fix

## What

`computeTables` (`src/lib/core/markdown-editor/extensions/live-preview/plugins/table-field.ts:16`)
runs `parseFrontmatterProperties(state.doc.toString())` on every decoration rebuild. The plugin is
`checkUpdateAction`-driven like meta-bind-input, so this is the same per-keystroke full-document
string allocation issue 07 just removed from `meta-bind-input-plugin.ts` — typing lag in large
notes whenever the table plugin rebuilds.

Not covered elsewhere: issue 43 (inline ViewPlugin fold) folds image/footnote/wikilink-embed/
meta-bind-input only; table-field is a block plugin and stays out of that fold. No other issue or
plan item mentions `table-field`. The `widgets.ts:763/815` and `meta-bind-button-widget.ts:89`
`doc.toString()` calls are click-handler one-offs, not per-rebuild — deliberately not filed.

## How

- Reuse `frontmatterSlice` from `meta-bind-input-plugin.ts` (added by issue 07's fix, commit
  84a78ad) instead of re-deriving it: export it from a shared live-preview core module (or move it
  next to the other `core/` helpers) and call it from both plugins. Parity contract and its proof
  are documented on the helper's JSDoc.
- Regression test FIRST (red): mirror issue 07's `sliceString` spy test — bound every recorded span
  to the closing frontmatter fence on a large doc while still asserting the table widget receives
  the frontmatter properties.

## Gate

- Frontend surface: `pnpm check` + `pnpm vitest run` + `pnpm build`.
- Stage only the files related to this issue, verify with `git diff --cached --stat`.
- One commit, full commit format (Context, Problem, Solution, Behavior, Files with line ranges).

## Comments

- 2026-08-19: not attempted in this run - the issue 40 step in the shared `issue-40-50` worktree
  failed before this one started. Status left untouched; still `needs-triage` (UNVERIFIED report).
- 2026-08-19: VERIFIED and fixed. Red-green evidence: the new spy test in
  `src/tests/.../plugins/table-field.test.ts` records every `state.doc.sliceString` call during a
  `computeTables` rebuild on a 13552-char doc (`---\nrating: 2\n---` + a 3-line table + a blank
  line + 500 lorem lines, cursor at 0) and bounds every span that starts at offset 0 by the closing
  fence. Against the unfixed code it failed with `AssertionError: expected 13553 to be less than or
  equal to 17` — exactly one span of `{from: 0, to: 13553}`, i.e. the whole document copied in a
  single rebuild. After swapping line 15/16 to `parseFrontmatterProperties(frontmatterSlice(state.doc))`
  the suite is green (8/8), and the four issue-07 tests in `meta-bind-input-plugin.test.ts` pass
  UNCHANGED, which is the move's behaviour-preservation proof. Gate: `pnpm check` 0 errors,
  `pnpm vitest run` 284 files / 6293 passed, `pnpm build` ok.
- 2026-08-19: discovery findings. The impact is worse than reported: the `doc.toString()` is the
  FIRST statement of `computeTables`, before `findAllTables`, so it fired on every keystroke in
  every note whose `table` decorator is enabled — including notes with no table at all
  (`core/block-decorator.ts:85` calls `compute(update.state)` whenever
  `core/check-update-action.ts:17` returns `'rebuild'`, which it does unconditionally on
  `update.docChanged`). `Text.toString()` is literally `sliceString(0)`, which is what makes the
  spy probe sound. Root-cause completeness confirmed: `table-field.ts:15` was the ONLY per-rebuild
  `doc.toString()` left in live-preview.
- 2026-08-19: plan discrepancies. (1) The `## How` prescribed a test that cannot go green — "bound
  every recorded span to the closing frontmatter fence". `parsers/table.ts:92` and `:139` slice each
  `TableCell` / `TableDelimiter` range, so `findAllTables` must read past the fence and a blanket
  bound stays red after a correct fix. Corrected design: bound only spans with `from === 0`
  (measured legitimate spans on the probe doc: `{20,21} {24,25} {28,41} {44,45} {48,49}`).
  (2) Line drift in `## What`: the deliberately-excluded one-off sites are `widgets.ts:735` and
  `widgets.ts:787` in the current tree, not `763/815`; `meta-bind-button-widget.ts:89` is exact. The
  substance of the exclusion (event-handler one-offs that also need `extractBody(doc)`, so they need
  the full string) is verified correct at the current lines and they were left untouched.
  (3) The `frontmatterSlice`/commit-84a78ad attribution was not verified; only the helper's presence
  at `meta-bind-input-plugin.ts:102-109` mattered and that was verified.
  (4) Status was still `needs-triage` (UNVERIFIED report); this run verified it and flipped it to
  `ready-for-agent`.
- 2026-08-19: no follow-up issue filed. The helper now lives at
  `live-preview/core/frontmatter-slice.ts` with the parity contract on its JSDoc and a direct unit
  test at `src/tests/.../live-preview/core/frontmatter-slice.test.ts`; the private copy is gone from
  `meta-bind-input-plugin.ts`, so there is nothing left to drift.

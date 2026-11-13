VERDICT: APPROVED

## Previous findings

| # | Severity | Status | Evidence |
|---|----------|--------|----------|
| 1 | minor | resolved | `frontmatter-field.ts:68-72` adds `isBlockWidgetLine` (via the now-exported `soleBlockWidget`, `block-band-click.ts:23`); `frontmatter-field.ts:93` sets `anchor = null` and `get()` returns `startSel` (`:101`), mirroring `bandClickTarget`'s `{ pos: null }`. Red-first checked by me: with line 93 reverted to `anchor = start` for one run, the three new `it.each` cases (code block, table, `$$` math) fail (3 failed, 10 passed); restored with `git checkout`, all 13 pass. The test asserts both the unchanged head and that the block source is not in the DOM, so it cannot pass while the block is revealed. |
| 2 | nit | resolved | New test "a drag from the padding that moves back into the frontmatter clamps the head to the first body line" (`frontmatter-field-click.test.ts:110-126`) drives mousedown, mousemove into the body (head `BODY_START + 5`), mousemove back to 0, and asserts head clamped to `BODY_START`. It exercises the `pos < min` clamp in `get()`. |
| 3 | nit | resolved | `docs/LIVE-PREVIEW.md:36` has a `frontmatterClick` bullet next to `blockBandClick`, matching the code (padding remap, shift/drag clamp, sole-block-widget keep, keyboard unchanged, body-start drag default). |
| 4 | nit | rejection stands | Existing CodeMirror default for a drag that starts in the body; outside this Issue's scope. The docs bullet states the limit. The follow-up Issue is for the main session to file. |

## Acceptance criteria

- [met] `frontmatter.spec.ts` "clicking the 16px padding above the first body line moves the cursor there and keeps the frontmatter hidden" passes with `test.fail()` removed — `bash scripts/e2e.sh e2e/specs/live-preview` run by me after the fix commit: exit 0, 236 passed, 1 flaky (mermaid, see finding 2); all frontmatter tests passed first try.
- [met] Failing first: a test that a click in the padding followed by Enter leaves the frontmatter bytes unchanged — unchanged by the fix (text first line keeps `anchor = start`); the remap test still passes in `frontmatter-field-click.test.ts` (13/13).
- [met] Other users of `hideLines` (table, code block, math, mermaid) keep their behavior; the folder stays green — `core/hide-lines.ts` unchanged; the only change to `block-band-click.ts` is the `export` keyword. `pnpm vitest run src/tests/lib/core/markdown-editor/extensions/live-preview`: exit 0, 100 files, 1569 passed, 1 skipped. E2E `e2e/specs/live-preview`: exit 0. Full vitest suite and build are deliver's to run.

## Findings

1. nit — `src/lib/core/markdown-editor/extensions/live-preview/plugins/frontmatter-field.ts:68-72`: `isBlockWidgetLine` relies on `view.domAtPos(bodyStart)` resolving inside the widget's `.cm-line`; it is tested only in jsdom (code block, table, math), with no E2E for a block right after the frontmatter and no WebKit run. If `domAtPos` returned `contentDOM` in a real engine, the check would silently return false and the padding click would reveal the block again (the pre-fix minor behavior, not a frontmatter break). Fix: optionally add an E2E case with a code block right after the frontmatter.
2. nit — `e2e/specs/live-preview/click-reveal/mermaid.spec.ts:86` "clicking the line after the diagram moves the cursor there and keeps it rendered" was flaky in my run (active line `""` on the first try, passed on retry). That spec has no frontmatter, so `frontmatterClick` returns `null` there (`bodyStart` is null); unrelated to this diff. Noted so deliver is not surprised.

## Checks I ran

- `pnpm check`: exit 0, 0 errors, 0 warnings.
- `pnpm vitest run src/tests/lib/core/markdown-editor/extensions/live-preview`: exit 0, 100 files, 1569 passed, 1 skipped (includes `plugins/frontmatter-field-click.test.ts` and `core/block-band-click.test.ts`).
- Red probe of fix 1 (one-line revert, then `git checkout`): 3 failed as expected.
- `bash scripts/e2e.sh e2e/specs/live-preview`: exit 0, 236 passed, 1 flaky.
- Scope: fix commit `26cae900` touches only `frontmatter-field.ts`, an `export` in `block-band-click.ts`, the unit test, `docs/LIVE-PREVIEW.md` and the review file. No test weakened or deleted, no layer-baseline or composition-root change. Worktree clean apart from this review.

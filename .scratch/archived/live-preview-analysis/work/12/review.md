VERDICT: APPROVED

# Issue 12 review: multi-line images and wrapped link labels

Reviewed `git diff main...HEAD` (a30b5631..b9a749c8): `image-plugin.ts` (+5), `markdown-link-handlers.ts` (+15/-15), three test files.

## What I ran (my own runs; the build report's numbers were not reused)

- `vitest run` on the three changed test files: 3 files, 51 tests, all pass.
- Red-before-fix probe: I restored `main`'s versions of the two source files in the worktree, ran the three test files again, then restored HEAD. 7 of the 51 failed: all 7 new cases. Both jsdom image cases threw `RangeError: Decorations that replace line breaks may not be specified via plugins`, so the crash the Issue predicted (and did not reproduce) is now reproduced.
- Mutation probe: with only the `hidden.some(... '\n')` guard (`markdown-link-handlers.ts:48`) deleted, the 6 existing `f7638b13` cases fail (3 unit, 3 jsdom). The old shapes are still protected by those tests. Restored afterwards.
- Edge probe (a throwaway jsdom test, deleted afterwards; the worktree is clean). I mounted each shape with the real `livePreviewExtensions()` stack and moved the cursor through every position. None threw. Shapes: wrapped label inside a blockquote and inside a list item, destination newline inside a blockquote, wrapped label with a title, image with a wrapped alt, image in a blockquote with a destination newline, reference image with a wrapped label inside a list, a link wrapping a multi-line image, image with a wrapped title, reference and collapsed-reference links with a wrapped label.
- All of `src/tests/lib/core/markdown-editor/extensions/live-preview`: 89 files, 1181 tests, all pass.
- `pnpm check`: 0 errors, 0 warnings.
- I did not run the full gate, as instructed.

My test verdict rests on these files:
- `src/tests/lib/core/markdown-editor/extensions/live-preview/plugins/image-plugin.test.ts`
- `src/tests/lib/core/markdown-editor/extensions/live-preview/inline/pipeline-dom.test.ts`
- `src/tests/lib/core/markdown-editor/extensions/live-preview/inline/handlers/markdown-link-handlers.test.ts`

## Acceptance criteria

- [x] **Mounted `EditorView` test: `![a](\n/url)` and a multi-line resolved reference image render as source without throwing; written and seen failing first.** Met. `pipeline-dom.test.ts:270-284` mounts both shapes, asserts `not.toThrow()`, and checks that the source text renders. Both threw the RangeError against `main`'s source (my probe). The unit cases at `image-plugin.test.ts:86-102` first check that each shape parses as one multi-line `Image`, so they cannot pass vacuously. The reference case does take the widget path: before the fix it emitted a widget, which proves `resolveRefUrl` resolved the `[r\ns]: /url` definition. Fix: `image-plugin.ts:122-124`, placed after the reveal check and covering both widget branches.
- [x] **Test: `[a\nb](/url)` is styled again (no replace range contains a newline).** Met. `markdown-link-handlers.test.ts:94-103` covers the inline and reference forms: no crossing replace, `cm-lp-link` at exactly 1-4, and exactly 2 replaces. `pipeline-dom.test.ts:251-259` checks the same in a mounted view (`.cm-lp-link` present, `/url` hidden). All three failed against `main`.
- [x] **Test: `[a](\n/url)` and the other multi-line shapes from `f7638b13` still do not throw.** Met. The `f7638b13` cases are untouched: `markdown-link-handlers.test.ts:81-90` and `pipeline-dom.test.ts:234-249`. They pass, and the mutation probe shows they fail when the new guard is removed.
- [x] Blocked-by 05 is resolved: it was closed in a5e16246, and the image plugin already uses `revealPredicate`.

## CLAUDE.md and PRD checks

- Layer rules: both changes stay inside `core/markdown-editor/extensions/live-preview`. There are no new imports in source.
- Performance: the image guard costs two `lineAt` lookups per visible `Image` node. The link guard slices two short ranges per `Link`. Both are negligible, and the viewport and `checkUpdateAction` gating is unchanged.
- Error handling: not applicable (no IPC, no services).
- Tests for every changed source file: yes. Each source file has a unit test, and there is a jsdom mount test for each.
- Comments describe the code as it is now. The `linkHandler` JSDoc was updated for the new rule, and the image-plugin JSDoc bullet was added. No session narration. Tabs are used.
- Scope: no scope creep. The diff touches exactly the two files in **Touches**.

## Findings

1. **Info (no change): link default deviates from the Issue's literal wording.** `markdown-link-handlers.ts:48`. The Issue says "skip only the replace ranges that would contain a newline". The build renders the whole link as source when either hidden range crosses a line; it does not keep the single-line half hidden. The default is recorded in discovery.md and matches the existing `f7638b13` assertions (`cm-lp-link` is undefined for those shapes). A half-hidden `a](\n/url)` reads worse than raw source. I accept it as is.
2. **Low (no code change): f3cdb3e7 commit message is slightly inaccurate.** Its Files line ranges are off by about one line (the guard is at `image-plugin.ts:122-124`; the tests are at `image-plugin.test.ts:83-103`). It also says only the inline unit case failed before the fix, but my probe shows both unit cases failed. Fixing this needs a history rewrite, which is not worth it. Deliver may mention it in the merge notes.
3. **Info (follow-up, out of scope): pre-existing reference-label normalization gap.** `image-plugin.ts:80-81`. `resolveRefUrl` lowercases the label but does not collapse internal whitespace, as CommonMark requires. As a result, `![a][r\ns]` with a `[r s]: /url` definition does not resolve, so it renders as source anyway. The fix here does not depend on this gap, because the guard runs before resolution. A separate Issue could normalize labels on both sides (collapse runs of whitespace, then case-fold).

No blocking findings.

## Resolution

1. Finding 1 (Info): accepted as is. Rendering the whole link as source when either hidden range crosses a line is the documented default in discovery.md and matches the `f7638b13` assertions. No change.
2. Finding 2 (Low): correct but not fixed. The f3cdb3e7 message has Files ranges off by about one line (guard at `image-plugin.ts:122-124`, tests at `image-plugin.test.ts:83-103`) and says only the inline unit case failed before the fix, when both did. Correcting it needs a history rewrite; recorded here and in the closing commit instead.
3. Finding 3 (Info): out of scope and pre-existing. `resolveRefUrl` does not collapse internal whitespace in reference labels. Left for a separate follow-up Issue; no change here.

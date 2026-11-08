VERDICT: APPROVED

## Previous findings

| # | Severity | Status | Evidence |
|---|----------|--------|----------|
| 1 | minor | rejection stands | No code change asked. `widgets.ts:819-825` takes the snapshot before dispatch and maps it through the same `changes`, so the pinned anchor does not depend on which update lands before the next measure. The owner's macOS check (select first) is the remaining guard, as recorded in the Resolution. |
| 2 | nit | resolved | Commit 33bae7f1 changes only the comment at `widgets.ts:820-824`: "(Issue 10)" is replaced by `e2e/specs/live-preview/frontmatter-write-keeps-scroll.spec.ts`, which exists in the branch. `grep "Issue 10"` over `src/lib` and the spec finds nothing. The dispatch line is byte-identical to the round 1 version. |
| 3 | nit | rejection stands | jsdom has no layout, so a unit test cannot measure screen y; the E2E spec stays the guard. No test changed in the fix round. |
| 4 | nit | rejection stands | `click-reveal/mermaid.spec.ts:79` has no frontmatter write; the fix round did not touch it. |

## Acceptance criteria re-checked

- [not met] Not verified by the agent: the owner repeats the steps in the macOS app — owner check, still pending; nothing in the fix round changes that, and it does not block APPROVED.

## Findings

None new. The fix round (`git diff 0a72842c..HEAD`) touches only the comment in `widgets.ts` (+2/-1) and the Resolution section of `work/10/review.md`: no code change, no test weakened or deleted, no scope creep, no layer-baseline or composition-root change, nothing under `src-tauri/`.

## Checks run by the reviewer

- `pnpm check`: exit 0, 0 errors, 0 warnings.
- `pnpm vitest run src/tests/lib/core/markdown-editor/extensions/live-preview/meta-bind-writers.test.ts src/tests/lib/core/markdown-editor/extensions/live-preview/widgets/`: exit 0, 7 files, 130 passed, 1 skipped.
- E2E not re-run: the fix is comment only. The full suite is deliver's to run.

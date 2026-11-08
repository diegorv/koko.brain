VERDICT: APPROVED

## Previous findings

| # | Finding | Status | Evidence |
|---|---------|--------|----------|
| 1 | `collection-block.spec.ts` title claimed "a cell with no event" for a header `th` click | resolved | a76b3272: the title is now "clicking a header cell reveals the source like the header" (`collection-block.spec.ts:162`). It matches the `th` locator and the `^TH` hit assertion at 167-170. The test body did not change. |
| 2 | `markdown-link.spec.ts` Cmd/Ctrl+click loop checked only `RAW_LINK` | resolved | `markdown-link.spec.ts:109` adds `expect(await isRevealed(page, RAW_AUTOLINK)).toBe(false)` and keeps the `RAW_LINK` check, so nothing was weakened. Both loop cases (autolink, bare URL) pass. |
| 3 | `wikilink-image-embed.spec.ts` new block split the original constant group | resolved | `RAW_EMBED` / `WRAPPER` now sit at lines 15-16, right after `CONTENT`. `STUB_PNG` / `REAL_CONTENT` / `openWithRealImage` follow them. The values did not change and both are declared before first use. |
| 4 | Video wrapper likely shares the audio padding bug, untested | resolved | The Issue Notes, known bug 1, now say the follow-up Issue must include the video wrapper in its scope and tests. Writing that follow-up Issue is the main session's job, not this branch's. |

## Acceptance criteria re-checked

- [met] Every zone listed above has a test, or Notes say why it cannot run in the E2E app (for example no media playback) — the fixes only renamed one test, added one assertion and moved two constants. No zone test was removed. The three changed specs pass (28 passed).
- [met] Each new `test.fail()` fails at its bug assertion when the marker is removed (record the check in Notes), and each such bug is listed in Notes with its root cause file:line — the fixes touched no `test.fail()` test. Known bug 1 in the Notes keeps its root cause (`widgets.ts:214`, `widgets.ts:195-205`) and only gains the sentence about the video scope.
- [met] The low findings above are fixed — the fix diff (`git diff 2cf87fb9..HEAD`) does not touch the files of the round 1 low-finding fixes, so the round 1 evidence still holds.
- [met] The click-reveal folder gives the same per-test verdict in two runs; the rest of `e2e/specs/live-preview` stays green — I re-ran the three specs the fixes change: `bash scripts/e2e.sh <collection-block, markdown-link, wikilink-image-embed> --retries=0 --workers=3` gave 28 passed, exit 0. No other spec or fixture changed since round 1's two-run check. The full suite is deliver's to run.

## Findings

1. nit — `e2e/specs/live-preview/click-reveal/collection-block.spec.ts:136` — the fix report says this unchanged test failed once under 5 workers. It passed here under 3 workers. This branch did not cause it, and it does not block delivery. Fix: if it fails again under higher parallelism, file a flakiness Issue.

## Checks run by this review

- `pnpm check`: 0 errors, 0 warnings, exit 0.
- E2E: the three changed specs, chromium, `--retries=0 --workers=3`: 28 passed.
- Scope: the fix commit touches only the three e2e specs, the Issue Notes and the review's Resolution section. It changes no app code, no layer baseline and no composition roots.

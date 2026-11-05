VERDICT: APPROVED

## Acceptance criteria

- [met] The measured setup time alone and under full-suite load is recorded in the commit body — commit 37eba287f body, "Problem" section: alone 2383/2373/2345 ms, beside 10 busy loops 4987/5064 ms, beside 20 busy loops 9451 ms, and the real full-suite data from deliver logs 04, 05, 10, 17, 23, 36, 49, 64 ("killed at 10 000 ms", file total 10.2 to 14.6 s). I checked those eight logs under `brain.worktrees/test-logs/ux-polish/`: each has `Error: Hook timed out in 10000ms.` at `queryjs-contract.test.ts:404:1`, and the file durations are 11274, 10207, 14451, 10618, 12440, 10223, 14292 and 10334 ms, which matches the body. The full-suite number is a lower bound, not a direct measurement. The owner's 2026-11-05 note on the Issue rules out new full-suite load runs, so the recorded data is enough.
- [met] Every assertion the file makes today is kept; no example is skipped or removed — `git diff main...HEAD -- src` changes only `src/tests/help/queryjs-contract.test.ts`. It adds the `SETUP_TIMEOUT` constant and its JSDoc (lines 404-411) and changes `});` to `}, SETUP_TIMEOUT);` (line 423). No `it`, `expect`, discovery, allowlist or snapshot file changed. `taskpolicy -c background pnpm vitest run src/tests/help/queryjs-contract.test.ts` exited 0 with 133/133 passed.
- [met] If a timeout is raised, it is set on this hook only (not globally in the vitest config) and carries a comment with the reason — the diff stat lists only the test file and the discovery note. `vitest.config.ts` and `vite.config.js` are untouched and set no `hookTimeout`. The value is passed only to the one `beforeAll` (line 423), and the JSDoc at lines 404-410 gives the reason. Probe: `pnpm vitest run src/tests/help/queryjs-contract.test.ts --hookTimeout=1000` exited 0 with 133/133 passed. The hook takes about 2.4 s alone, so the explicit 30 s overrides the global hook timeout for this hook.

## Checks run by this review

- `taskpolicy -c background pnpm check`: exit 0, 216 files, 0 errors, 0 warnings.
- `taskpolicy -c background pnpm vitest run src/tests/help/queryjs-contract.test.ts`: exit 0, 133 passed (Duration 8.34 s).
- Probe `... --hookTimeout=1000` on the same file: exit 0, 133 passed (shows that the per-hook value is the one that applies).
- The test verdict rests on `src/tests/help/queryjs-contract.test.ts`, the only test file the diff changes. The branch changes no app code. The full suite and `pnpm build` were not run here: deliver runs them.

## Findings

1. minor — src/tests/help/queryjs-contract.test.ts:407-408 (and the commit body's "Why 30 s is still tight" paragraph). The headroom argument uses the synthetic 20-busy-loop number (9.5 s, "about 3x"). The real full-suite runs it is meant to cover already ran the hook past 10 s, and the file reached 14.6 s in logs 10 and 49. The vitest 5 runner checks `deadline.exceeded()` again when the hook resolves (`withTimeout` in `vitest/dist/chunks/run.*.js`), so those file totals are close to how long the hook actually ran under real load. Against real load the margin is about 2x, not 3x. That is still inside the Issue's "well under a multiple" bound, but the comment should not present 9.5 s as "that load". Fix: in the comment, cite the real-load lower bound (hook past 10 s, file up to about 14.6 s under a parallel full suite) next to the synthetic number. If 2x looks too thin with up to five parallel relay workflows, deliver's full-suite run is the check.
2. nit — src/tests/help/queryjs-contract.test.ts:408-409. "a setup that turns an order of magnitude slower alone still fails here" is not exact: 10 x 2.4 s = 24 s, which passes under 30 s. Only a slowdown above about 12.5x fails. The commit body makes the same claim. Fix: reword to "a setup more than about 12x slower alone still fails here".
3. nit — .scratch/ux-polish/work/74/discovery.md:20. The table lists logs 38 and 73 among the hook-timeout logs. Neither contains `Hook timed out`: both are truncated logs where the file shows 133 skipped. The commit body correctly leaves them out. This is a workflow record only, so no change is required.

## Resolution

1. Fixed: the `SETUP_TIMEOUT` JSDoc now cites the real full-suite bound (hook past 10 s, file up to about 14.6 s) next to the synthetic 9.5 s, and states the margin as about 2x over the real-load bound.
2. Fixed: the comment now says a setup more than about 12x slower alone still fails.
3. No change, as the review says: discovery.md is a workflow record and the commit body already leaves logs 38 and 73 out.

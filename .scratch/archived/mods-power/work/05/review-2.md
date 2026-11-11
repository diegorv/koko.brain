VERDICT: APPROVED

Re-review round 2 of the fixes after `81e2581f0` (the commit that added `review.md`): `git diff 81e2581f0..HEAD` is `d407e5c6f`, which changes only the `callModCallback` JSDoc in `src/lib/plugins/mods/mods-host.service.ts` (+5/-4) and adds the Resolution section to `review.md`.

## Previous findings

| # | Severity | Finding | Status | Evidence |
|---|----------|---------|--------|----------|
| 1 | nit | `mods-host.service.ts:135-136` overlong JSDoc line | resolved | The diff rewraps the comment to the block's width. The words are unchanged (same callbacks list, same `debug()` / Labs row / toast / no-Sentry / `untrack` sentences). No code line changed. |
| 2 | nit | unloading test in `mod-note-moved.test.ts` would pass without the unload clearing `pending` | rejection stands | Marked optional by round 1. Both guards remain in the code and the test file is unchanged by the fixes; the disposal test still covers clearing pending timers. |

## Acceptance criteria re-checked

- [met] Same file, lifetime: the disposer cancels a pending callback and stops later ones; unload does the same and a later `ctx.onNoteMoved` throws `unloaded`; a vault switch between the move and the timer drops the callback; a sync throw and an async rejection are recorded under `modsStore.callbackErrorFor(<id>).callback === 'onNoteMoved'`, land in `debug(tag, 'onNoteMoved callback failed:', ...)` and never in `error`, and the per-load toast is shared with the other callbacks (one toast per load in total); a non-function callback throws `onNoteMoved needs a callback function`. — The fix touches only the JSDoc of `callModCallback`, the function these cases run through; no code changed. `pnpm vitest run src/tests/lib/plugins/mods` exit 0, 24 files, 730 tests, including `mod-note-moved.test.ts`.
- [met] Gate: `pnpm check`, `pnpm vitest run`, `pnpm build`, and the mods workspace's `pnpm verify` with `KOKOBRAIN_HOST_ROOT` set to this checkout. — `pnpm check` exit 0 (0 errors, 0 warnings) after the fix. The fix is comment-only, so round 1's `pnpm build` and `pnpm verify` results still apply. The full `pnpm vitest run` is deliver's to run; the targeted mods tests pass.

## Findings

No open or new findings. The fix commit contains no regression, no test change and no scope creep.

## Checks run by this re-review

- `pnpm check`: exit 0.
- `pnpm vitest run src/tests/lib/plugins/mods`: exit 0, 24 files, 730 tests.
- Not run: the full suite (deliver), `pnpm build` and the mods `pnpm verify` (unaffected by a comment-only change).

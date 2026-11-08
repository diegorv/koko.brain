VERDICT: APPROVED

# Re-review round 2: Issue 01

Reviewed `git diff 4916a727..HEAD` (the fix commit d5f84421): `src/lib/app/tauri-listeners.service.ts`, `src/tests/lib/app/tauri-listeners.service.test.ts`, and Notes in Issues 01 and 44.

## Previous findings

| # | Severity | Status | Evidence |
|---|----------|--------|----------|
| 1 | minor | resolved | `tauri-listeners.service.ts:89` calls `toast.error('Kokobrain could not finish saving before quitting. Try quitting again.')` in the catch; the app stays open (no `confirm_exit`). The "logs and stays open when the exit flush fails" test asserts one toast with that text; "shows no error toast when the exit goes on" covers the negative. Probe: with the toast line removed, the failure test fails. |
| 2 | nit | resolved | `exitInFlight` is per listener (`:80`), checked first (`:82`), set before the first `await`, and reset in `finally` (`:91`), which also runs on the cancel `return` and on a throw. "ignores a second exit request while the first is still running" holds the first save open and fires a second request: one save, one `confirm_exit`. Probe: with the guard line removed, this test fails. "runs the exit flush again for a request after a cancelled one" shows the flag is reset after a cancel. |
| 3 | nit | rejection stands | No code change, as the round 1 review accepted the trade-off. Issue 44 now has a Notes entry on the unanswered-webview case with a Cmd+Q-right-after-launch manual check, and Issue 01's Notes add that case to the owner's check. |

## Acceptance criteria re-checked

- [met] Cmd+Q and the app-menu Quit run `prepareForExit` (Rust side tested where possible; record in the commit message what can only be checked by hand) — the fix keeps `prepareForExit` then `confirm_exit` on the `app:exit-requested` path unchanged for the first request; the guard only drops overlapping requests, and the reset in `finally` keeps a later Quit working (tested). The Rust side is untouched by d5f84421.
- [met] Not verified in the app by the agent: the owner checks Cmd+Q right after typing — Issue 01's Notes now give the owner Cmd+Q right after typing and right after launch; the fix report states nobody ran Cmd+Q in the app.

## Findings

None open or new.

Checked for regressions: the guard cannot strand the flag (every exit path goes through `finally`); a Quit during the first request's discard prompt is dropped, which is the intended behavior, and the user can Quit again after answering. `svelte-sonner` is already used by other `src/lib/app/` files, so no new layer edge; `layer-baseline.json` and `BASELINE_SIZE` are untouched. No test was weakened or deleted: the existing failure test gained assertions and three tests were added. No scope creep.

## Checks run by the reviewer

- `pnpm check`: exit 0, 0 errors, 0 warnings.
- `pnpm vitest run src/tests/lib/app/tauri-listeners.service.test.ts src/tests/lib/core/vault/exit.service.test.ts src/tests/lib/architecture`: exit 0, 10 files, 147 tests passed.
- Red probe: removing the guard line and the toast line makes exactly the two matching tests fail; the file was restored and the worktree is clean.
- Not run: the full suite and `pnpm build` (deliver runs them), cargo (no `src-tauri/` change in the fixes), and the running app (the owner's check).

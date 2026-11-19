VERDICT: APPROVED

## Previous findings

| # | Severity | Status | Evidence |
|---|----------|--------|----------|
| 1 | major | resolved | `claude.service.ts:59` reads `chatId` right after `beginTurn`, before any await. After `saveAllDirtyTabs` the send returns when the chat id changed (`:64`) and throws "The vault changed before the turn started." when only the path changed (`:66`), so `claude_run_turn` never runs for a closed vault. The target (`:71`), the stale-run check (`:84`) and the catch (`:93`) all use the early id, so a late rejection no longer calls `failTurn` on the new chat. The three tests in "a reset while the dirty tabs are saving" (`claude.service.test.ts:496-570`) cover the reviewer's ordering (one `claude_run_turn`, for `/vault-b`, no cancel, B keeps `r-new`, B's Done saves into `/vault-b`), a rejected tab save after a reset (new chat idle, no error) and a switch the chat survived (no turn, no write, status `error`). I restored the pre-fix `claude.service.ts` (from 41996e132) and ran the test file: those 3 failed and 44 passed. With the fix restored, all pass. |
| 2 | minor | resolved (recorded) | Recorded in 19acdd745 as Problem item 3 of `.scratch/claude-code-integration/issues/09-stale-run-after-vault-switch.md`, with an acceptance criterion that names the test (send in B, switch to C with no reset, C's restore, then Done) and the lifecycle service and its test added to Files. The review asked for exactly this, and it does not block. |

## Acceptance criteria re-checked

- [met] **Late run id.** A `claude_run_turn` that resolves after the chat was reset attaches no run id and is cancelled (`claude_cancel_turn` with the returned id). This is the first half of claude-code-integration Issue 09; if 09 has landed, this is already met. — A reset after `claude_run_turn` was called: `claude.service.ts:84-86` cancels with the returned id ("a run id that arrives after the chat was reset" tests pass). A reset during the dirty-tab save: the turn never reaches `claude_run_turn`, so no run id exists to attach or cancel, and the new chat keeps its own run ("a reset while the dirty tabs are saving" tests pass).
- [met] **Save.** At send the service captures `{ vaultPath, chatId, runId }`. It saves on send, and on `Done` only when that `Done` ended the current run of the same `chatId` in the same vault; otherwise it writes nothing anywhere. Never per delta. The `claude-event` listener (`src/lib/app/tauri-listeners.service.ts`) calls a service function after `claudeStore.receive` for this (listener test). A failed save logs through `error()` and does not interrupt the chat. Test: a turn sent in vault A, a switch to B, then A's `Done`: no `claude_chat_write` call at all. — The captured `chatId` is now the one read at send (`:59`), not one read after an await. The new test asserts every `claude_chat_write` targets `/vault-b` and B's chat id. The earlier save tests and the listener test still pass.

## Findings

None open or new.

- Regressions: none found. The catch no longer guards on `!target`, but it compares against the early `chatId`, so the gate is stricter in the same direction. No existing test was weakened or deleted: the test diff only adds lines.
- Scope: the fix touches only `claude.service.ts`, its test file and the workflow's own `.scratch` records. Issue 09 is the Issue the previous review named for finding 2.

## Checks run by this review

- `pnpm check`: exit 0, 0 errors, 0 warnings.
- `pnpm vitest run src/tests/lib/features/claude-code/ src/tests/lib/app/tauri-listeners.service.test.ts src/tests/lib/app/lifecycle/app-lifecycle.service.test.ts`: exit 0, 9 files, 370 tests passed.
- Red check: with the pre-fix `claude.service.ts`, `pnpm vitest run src/tests/lib/features/claude-code/claude.service.test.ts` exited 1 (the 3 new tests failed, 44 passed). The file was then restored and the worktree is clean.
- Not run: the full suite, cargo (nothing under `src-tauri/` changed in the fixes) and E2E. The full suite belongs to deliver.

# 11: Quitting the app cancels running turns

**What to build:** Every way the app exits (Cmd+Q, Dock Quit or logout, closing the main window when that quits, "Restart to update") kills the process group of every running turn, so no `claude` or tool it started outlives Kokobrain.

**Blocked by:** 07

**Files:** src-tauri/src/commands/claude/turn.rs,src-tauri/src/lib.rs,src-tauri/tests/commands/

**Status:** resolved

**Gate:** `cargo test --manifest-path src-tauri/Cargo.toml`

- [x] Failing test first: start the sleeping fake `claude` from the cancel tests through `run_turn_with`, call the new `ClaudeRuns::cancel_all()`, and assert the turn ends in `Done` within a few seconds and its process group is gone (`killpg(pgid, 0)` returns `ESRCH`).
- [x] `ClaudeRuns::cancel_all()` kills every listed run with the same group kill `claude_cancel_turn` uses (`kill_group`, including Issue 07's second kill), under the lock, and returns without waiting for the reader threads.
- [x] It runs on every exit path. Read the Tauri 2 source in `~/.cargo/registry` to find which `RunEvent`s each path raises (Cmd+Q goes through `on_exit_requested` then `confirm_exit`; Dock Quit and logout reach `RunEvent::Exit` without `ExitRequested`; check what `AppHandle::restart` raises), hook the ones needed in `lib.rs`'s `.run` closure, and name the source lines you relied on in a comment.
- [x] No change in the frontend exit flow (`prepareForExit`): tabs are still saved before the app exits.

## Problem

From the PR #247 review (2026-11-15), raised by three reviewers and confirmed: no exit path touches `ClaudeRuns`. The child leads its own process group (`process_group(0)`, `src-tauri/src/commands/claude/turn.rs:127-135`), so nothing the dying app does reaches it, and macOS has no parent-death signal. `prepareForExit` (`src/lib/core/vault/exit.service.ts:15-23`) only saves tabs and flushes settings, and `lib.rs:407` handles only `RunEvent::ExitRequested`. A tool started under `bypassPermissions` (a long Bash command, an edit loop) keeps running in the vault with no UI left to stop it; `claude` itself probably dies on its next stdout write. After a restart the empty `ClaudeRuns` also lets a second turn start in the same vault.

## Comments

- 2026-11-15, branch `issue/11-cancel-turns-on-app-exit`: `ClaudeRuns::cancel_all()` kills the process group of every running turn, called from `lib.rs` on every exit path. Delivery finished by the main session after the deliver step stopped on a full disk (284 MiB free). Tests at 44e8a8f45: pnpm check 0 errors; vitest 644 files, 17078 passed, 54 skipped, 1 todo; cargo test 1545 passed and 4 `vault_watcher_test` failures while another session compiled, then that file alone 12 passed (this Issue does not touch the watcher). Review: round 1 APPROVED (1 minor and 2 nits rejected with reasons in review.md).

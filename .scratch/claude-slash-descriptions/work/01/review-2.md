VERDICT: APPROVED

Re-review, round 2, of the fixes after `8dce00ec0` (the commit that added `review.md`): `f50ddb2d9` and `3e3042ea4`.

## Previous findings

| # | Finding | Status | Evidence |
|---|---------|--------|----------|
| 1 | minor: `ClaudePanel.svelte` effect read `vaultStore.path`, so a vault switch sent a request with the previous vault's binary | resolved | `ClaudePanel.svelte:95-104` no longer reads `vaultStore.path`; the effect has no tracked deps and runs on mount only. The remount path holds: `claudePanelShown` (`AppShell.svelte:66`) depends on `claudeCode.enabled` and `layout.claudeVisible`, both `false` after `resetSettings()` (`app-lifecycle.service.ts:671`, defaults at `settings.store.svelte.ts:70,112`), and `vaultStore.open` (`vault.service.ts:25`) sets the path before `loadSettings` (`app-lifecycle.service.ts:211`), so the remount sees the new path. The panel test now asserts no call on a path change while mounted, then models teardown and remount with `/opt/other`. Mutation probe: restoring the pre-fix `ClaudePanel.svelte` makes "asks once per vault" fail (exit 1); reverted, worktree clean. |
| 2 | minor: `slash.rs` blocked in `child.wait()` with no deadline after stdout EOF, and the run was already unlisted | resolved | `slash.rs:231-244`: on EOF the run stays listed while `exited_unreaped` (WNOWAIT, so it does not reap and the pgid stays reserved) is polled until `deadline_at`; if still running, `runs.cancel(&id)` kills the group while listed; `runs.remove` and `child.wait()` come after. `exited_unreaped` returns `true` on a `waitid` error, so the loop cannot spin past the deadline. New test `a_script_that_closes_stdout_and_keeps_running_is_killed_at_the_deadline` (`claude_slash_test.rs:304-322`) asserts the rows, `SHORT <= elapsed < 5 s`, the group gone and `runs` empty; it passes. Non-unix keeps the old blocking wait (not compiled here). |

## Acceptance criteria re-checked

- [met] **Runner.** Spawns `claude -p --input-format stream-json --output-format stream-json --verbose --no-session-persistence` with the turn env (`turn_env`, `CLAUDECODE` removed), cwd = the vault, its own process group, stdin piped, stderr discarded (`Stdio::null()`, nothing logged). It writes one initialize line with a fresh `request_id`, parses stdout lines until its reply, then closes stdin and keeps reading stdout to EOF without parsing (hooks can still print after the reply). One deadline (30 s) covers the reply and the exit: past it the group is killed, and the rows already parsed are returned if the reply came, an error otherwise. No hook-disabling setting: the user's hooks run, as in a turn. — The EOF path now also honours the deadline (`slash.rs:231-244`), closing round 1's gap; spawn args, env, stderr and the non-EOF path are unchanged by the fixes. 138 `claude_` Rust tests pass.
- [met] **Runner tests**, with fake `claude` shell scripts (the `claude_turn_test.rs` pattern) that read one stdin line and echo its `request_id` in the reply, and fail when no request arrives: — All earlier runner tests still pass unchanged (no test weakened or deleted in the fix diff), plus the new stdout-closing test that uses `READ_REQUEST`/`REPLY`.
- [met] **Quit.** A running request is registered in managed state with the turns, and `ClaudeRuns::cancel_all()` on `RunEvent::Exit` (`lib.rs:419`) kills its group too. Tested like `cancel_all_kills_every_run_and_its_process_group` (`claude_turn_test.rs:374`). — The request now stays listed until it has exited even after EOF, so `cancel_all` reaches it in that phase too; `cancel_all_kills_a_running_request_and_its_process_group` still passes.
- [met] **When it is fetched.** The service passes `settingsStore.claudeCode.binaryPath` and the normalized vault path (test like the `claude_status` one at `ClaudePanel.test.ts:712`). — Mount-only fetch; `loadSlashCommandDetails` (`claude.service.ts:291-297`) is unchanged and still keys per vault. The updated panel test checks the remount after a switch asks with the new binary (`/opt/other`) and the new vault (`/other`), which also covers "the next vault open does" refetch. `ClaudePanel.test.ts` and `claude.service.test.ts`: 146 tests pass.

## Findings

None open or new.

## Checks run (by this review)

- `pnpm check`: exit 0, 0 errors, 0 warnings.
- `pnpm vitest run src/tests/lib/features/claude-code/ClaudePanel.test.ts src/tests/lib/features/claude-code/claude.service.test.ts`: exit 0, 2 files, 146 tests.
- `cargo test --manifest-path src-tauri/Cargo.toml --test commands_test claude_`: exit 0, 138 passed (one more than round 1: the new test).
- `cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings`: exit 0.
- Mutation probe on `ClaudePanel.svelte` (pre-fix version): the "asks once per vault" test fails; reverted.
- No layer-baseline entry, BASELINE_SIZE change or composition root in the fix diff. No scope creep: the fixes touch only `ClaudePanel.svelte`, `slash.rs`, `shell_env.rs` (visibility only), their tests and `review.md`.
- The full suite is deliver's to run. Nothing ran against a real `claude` binary; the non-unix EOF path was not compiled.

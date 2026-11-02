VERDICT: APPROVED

## Previous findings

| # | Severity | Status | Evidence |
|---|----------|--------|----------|
| 1 | major | resolved | `browser-cold-start.test.ts` now boots through `startRemoteSession({ open, reload })`, so the welcome runs `vaultStore.open`. The canned settings enable `debugModeTauri` and Sentry with a DSN. The recorder asserts that `build_search_index`, `set_tauri_debug_mode {enabled:true}` and `configure_sentry {enabled:true}` are in the sequence, and the fixture equals the recording. `remote_cold_start_test.rs` asserts the fixture carries those calls, starts with `logger::set_debug_mode(false)` and no client on `sentry::Hub::main()`, and checks both are still off at the end. Those asserts can now fail: a desktop `configure_sentry {enabled:true}` would bind a client, and `set_tauri_debug_mode` would turn debug on. Passes. |
| 2 | major | resolved | `policy.rs` `fs_path_rule` drops one trailing `/`, then denies empty, `.` and `..` segments, and denies a first segment that matches `.kokobrain` without case but is not spelled exactly so. `is_meta_path` matches without case, and `require_vault_path` also refuses `is_settings_file`. `dispatch.rs` redacts by `is_settings_file`: a case-insensitive match of the full path, or the same dev+inode. Tests: remote_policy_test `empty_segments_are_denied`, `kokobrain_case_variants_are_denied`, `meta_paths_match_*`; remote_ws_test `settings_spellings_never_leak_the_token`, `a_link_to_the_settings_file_is_redacted_or_refused`. All pass. |
| 3 | major | resolved | `server.rs` registers each `/ws` socket clone in `Sessions` before it writes the 101, removes it when the session ends, and `Drop` sets `stopped` and `shutdown(Both)`s every open socket after the accept thread joins. A session that registers after the stop gets no upgrade. Test `stopping_the_server_ends_open_sessions` passes. |
| 4 | minor | resolved | `remote-transport.ts` starts `welcomeTimer = setTimeout(giveUp, timeoutMs)` when the transport is created. A welcome with the right proto clears it, and `lose` clears it. `onmessage` ignores messages once disconnected. Tests "drops the connection when no welcome arrives in time" and "keeps the connection when the welcome arrives in time" pass. |
| 5 | minor | resolved | `architecture-proposal-2026-11-02.md` has a deviation note under M1: std server plus `ws.rs` in place of axum, why, the limits, that 03 and 04 must not assume axum, and that the choice is revisited at 04. The `server.rs` module comment points to it. |
| 6 | nit | resolved | The transport refuses a welcome whose `proto !== REMOTE_PROTO` (test "refuses a welcome from another protocol version"). `rpc.rs` closes the session when hello's `params.proto` is missing or not `PROTO` (remote_ws_test `a_hello_with_another_protocol_is_closed`, which covers both `proto: 2` and `{}`). |
| 7 | nit | resolved | `exists` uses `Path::try_exists` (it follows links). remote_ws_test `exists_reports_a_dangling_link_as_missing` passes. |

## Acceptance criteria re-checked

- [met] A WebSocket endpoint speaks a small JSON-RPC protocol: a hello/welcome exchange carrying the server version and the vault root the Mac has open, then request/response calls. The stand-in forwards `invoke` calls over it with a per-call timeout; on connection loss pending calls are rejected and never replayed. The upgrade's `Origin` must match the host exactly — both sides now check `proto` (`rpc.rs` hello check, `remote-transport.ts` welcome check). A missing welcome now times out into `lose()`, which rejects pending calls without resending them. remote-transport.test.ts and remote_ws_test pass (162 vitest, 25 ws tests).
- [met] The read side of the fs plugin is forwarded here (read text file as bytes, exists, read dir, stat), because settings and other boot code read `.kokobrain/*.json` through it. `exists` rejects on a transport error and never resolves `false` because the connection failed — `exists` uses `try_exists`, and an I/O error still maps to an error rather than `false` (`dispatch.rs` exists arm). remote_ws_test `fs_reads_are_forwarded` and `exists_reports_a_dangling_link_as_missing` pass.
- [met] Path rules by prefix (full canonical containment is 03): reads of `.kokobrain/*.json` are allowed; writes to `.kokobrain/*.json` (settings is rewritten on every load) are acknowledged and dropped (Virtual), so the browser never falls back to default settings and never writes a redacted settings file to the Mac; any other access under `.kokobrain/` is denied — `fs_path_rule` now holds for `//`, `.`, `..` and case variants. The canonical `.kokobrain/*.json` read and write rules are unchanged (`([child], _) if child.ends_with(".json")`). remote_policy_test (9) and remote_ws_test `settings_writes_are_acknowledged_and_dropped` and `other_writes_and_kokobrain_access_are_denied` pass.
- [met] The browser opens the Mac's vault automatically from the welcome message (no picker). Settings are read from the host with the Todoist token redacted; queryjs auto-run defaults to manual in the browser — redaction now goes by the file actually read (case-insensitive path, or the same dev/inode). remote_ws_test `settings_spellings_never_leak_the_token`, `a_link_to_the_settings_file_is_redacted_or_refused` and `settings_are_read_with_the_todoist_token_redacted` pass.
- [met] Test: a recorded browser cold start (the real command sequence, including the `teardownVault` the layout runs at mount before a vault is open, then `initializeVault`, then `teardownVault`) run against the host leaves the desktop database open, the watcher in place, the index version unchanged, the Sentry and debug flags unchanged, and no file created or changed in the vault or `.kokobrain/` — the recording now goes through the real session, so the welcome opens the vault and `build_search_index` is in the fixture. The flag asserts start from the opposite state of what the browser asks for, so they can fail. browser-cold-start.test.ts (the fixture equals the recording) and remote_cold_start_test pass.

## Findings

None open, none new.

Things I checked and did not count as findings:
- `fs_path_rule(root, "<root>/")` used to return Allow and now returns Deny. The vault root itself was already refused by the plugin-fs path rule before the fixes (`relative` returns `None`). `require_vault_path` still allows the exact root. The browser cold start fixture replays with no error that matters.
- A symlinked directory inside the vault that points at `.kokobrain/` still passes the lexical rule. The Issue leaves this to 03 ("full canonical containment is 03"). The settings file read through such a link is still redacted (the inode check).
- No test was weakened or deleted. The old flag asserts (`== before`) were replaced with stricter absolute ones. No change to the layer baseline, BASELINE_SIZE or the composition roots. No scope creep beyond the proposal note that finding 5 asked for.

## Checks run by this review

- `pnpm check`: exit 0, 0 errors, 0 warnings.
- `pnpm vitest run src/tests/lib/app/remote src/tests/lib/contracts src/tests/lib/architecture`: exit 0, 21 files, 162 tests passed.
- `cargo test --manifest-path src-tauri/Cargo.toml --test remote_policy_test --test remote_ws_test --test remote_cold_start_test --test remote_server_test`: exit 0 (9, 25, 1 and 20 passed).
- The worktree was clean afterwards (the ts-rs bindings did not change).
- Not run, left to deliver: the full vitest suite, `pnpm build`, the full cargo test and `bash scripts/e2e.sh`.

VERDICT: APPROVED

Re-review of the fix commit `e0714ee9` (diff `2ae73992..HEAD`: `remote/dispatch.rs`, `remote/policy.rs` comment, `remote_containment_test.rs`, `discovery.md`, `review.md` resolution).

## Previous findings

| # | Severity | Status | Evidence |
|---|----------|--------|----------|
| 1 | minor | resolved | `src-tauri/src/remote/dispatch.rs:62-69`: `check_path_args` peeks the `PATH_ARGS` rows, calls `root(ctx)?` when the command has any, and returns `Missing argument` for a missing or `null` arg. I checked every `PATH_ARGS` row (`policy.rs:235-262`) against `src/lib/contracts/commands.ts:37-146`: every one is a required, non-optional `string` / `string[]` arg, so no valid call is newly refused. Plugin-fs `path` args are not in `PATH_ARGS` (they go through `fs_check`), so they are unaffected. Tests: three Virtual no-path calls in `every_path_command_is_refused_with_no_vault_open` (they would have returned `Ok` before, so `expect_err` fails without the fix) and `a_missing_path_arg_is_refused` (vault open; covers Virtual, Read, `Root`, `Inside` and `Relative` rows). |
| 2 | minor | resolved | `remote_containment_test.rs:219-220` labels the KELVIN SIGN case as the NFC/NFD variant; `:236` now calls the `\u{0301}` case an unrelated non-ASCII dot-dir. No assertion changed. |
| 3 | nit | resolved | `policy.rs:184-189`: the comment now says the lexical ASCII-dot pass is the first line and the canonical re-check is the guarantee, with HFS+ marked not tested. Comment only. |
| 4 | nit | resolved | `discovery.md:6` says 32 hops, matching `MAX_LINKS = 32` (`policy.rs:265`). |
| 5 | nit | rejection stands | Not a code change; round 1 accepted the check-then-use race for this Issue (the browser cannot create links). Deferred to Issue 08 (`O_NOFOLLOW`/`openat`), recorded in `review.md` Resolution. |

## Acceptance criteria re-checked

- [met] Every path-like argument of every remote call (Tauri commands and fs plugin calls alike) is canonicalized and must sit inside the open vault root; anything else is refused before the command runs — the fix tightens `check_path_args` (`dispatch.rs:62-88`): a missing or `null` path arg is now refused before the command runs, instead of being acknowledged by a Virtual handler; the canonical checks for present args are unchanged. `ipc-parity.test.ts` 6/6.
- [met] With no vault open on the Mac, every path-taking call is refused — `root(ctx)?` now runs first for every command with a `PATH_ARGS` row, whatever its args; `every_path_command_is_refused_with_no_vault_open` includes `update_note_in_index {}`, `start_vault_watcher { path: null }` and `scan_vault_v2_cached {}`, each with a "No vault" error. `remote_containment_test` 14/14 passed.
- [met] A refused call returns an error the browser shows; it never returns empty content — the new refusal is an `Err` ("Missing argument `<name>`"), which `rpc.rs` turns into a JSON-RPC error frame; `a_missing_path_arg_is_refused` asserts the error text.
- [met] The `.kokobrain/` and `.git/` rules and the `settings.json` redaction are applied to the canonical path, so no spelling of `.kokobrain/settings.json` (an ASCII or Unicode case variant, NFD vs NFC, `//`, a trailing `/`) reaches the browser unredacted or escapes the `.kokobrain/` rules; a test covers each variant — only comments changed in `no_spelling_of_the_settings_file_reaches_the_browser_unredacted`; the KELVIN SIGN case (NFC/NFD) and the other variants are still asserted, and the test passes.

## Findings

None open or new. No regression, no weakened or deleted test (the fix only adds cases and one test), no scope creep, no layer-baseline, composition-root or ts-rs binding change.

## Checks run by the reviewer

- `cargo test --manifest-path src-tauri/Cargo.toml --test remote_containment_test --test remote_policy_test --test remote_ws_test`: exit 0, 14 + 11 + 25 passed.
- `cargo test ... --test remote_server_test --test remote_cold_start_test`: exit 0, 1 + 20 passed.
- `cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings`: exit 0.
- `pnpm check`: exit 0, 0 errors, 0 warnings.
- `pnpm vitest run src/tests/lib/contracts/ipc-parity.test.ts`: exit 0, 6/6.
- Worktree clean after the checks. The full suites (`cargo test`, `pnpm vitest run && pnpm build`) are deliver's to run.
- Not verified: HFS+ behaviour (as round 1).

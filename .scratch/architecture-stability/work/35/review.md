VERDICT: APPROVED

## Acceptance criteria

- [met] The CI log of the job shows a non-zero "passed" count for each of the three targets — the GitHub log itself exists only after the push (deliver's / the CI run's to confirm). Locally on darwin I extracted the step's `run:` block from `.github/workflows/ci.yml:123-137` unchanged and ran it: exit 0, `cargo test --lib commands::fonts: 4 passed`, `cargo test --test semantic_qos_test: 5 passed`, `cargo test --test utils_fs_test: 40 passed`. Each target is its own cargo call with `-p kokobrain`, matching the Issue's command, and the helper prints the per-target count into the log.
- [met] The job fails if a filter matches zero tests (for example, a step that checks the `running N tests` line is not 0) — real cargo probe with the old filter (`--lib commands::fonts_test::macos`): `running 0 tests`, `::error::cargo test --lib commands::fonts_test::macos ran 0 tests`, exit 1. Fake-cargo probes: `0 passed` -> exit 1 with `::error::`; failing test (exit 101) -> exit 101 via `pipefail`; no `test result` line -> exit 1. The job's result feeds `ci-success` (`ci.yml:157-179`), so the failure propagates.

## Checks run by this review

- `actionlint .github/workflows/ci.yml`: exit 0 (includes shellcheck of the run block); `shellcheck -s bash` on the extracted script: exit 0.
- Extracted step script against real cargo (macOS, main's target dir, `CARGO_BUILD_JOBS=2`): exit 0, counts above.
- Same script with the old zero-match filter: exit 1 with the `::error::` line.
- `pnpm check`: exit 0, 0 errors, 0 warnings (no frontend files changed).
- Test verdict rests on: the lib test `commands::fonts::tests` (`src-tauri/src/commands/fonts.rs:77-110`), `src-tauri/tests/semantic_qos_test.rs`, `src-tauri/tests/utils_fs_test.rs`, the three targets the step runs. No Rust source changed, so no other test files are affected. The full `cargo test` gate is deliver's to run.
- Worktree clean; diff touches only `.github/workflows/ci.yml` and the discovery note. No scope creep.

## Findings

1. minor: `src-tauri/tests/semantic_embedder_qos_session_test.rs:31`: this test has a macOS-only branch (`assert_eq!(started, 3)`) that still never runs in CI: the Ubuntu job takes the `else` arm and the macOS job does not list this target. Out of this Issue's stated scope (it names three targets); fix: file a follow-up Issue or add `run_nonzero --test semantic_embedder_qos_session_test` to the step.
2. minor: `.github/workflows/ci.yml:112`: the job now compiles the lib twice (cfg(test) for `--lib`, normal for the integration tests) on `macos-latest` under a 15-minute timeout; the Linux `rust` job gets 20. A cold rust-cache / sccache run could hit the limit. Fix: watch the first CI run's duration; raise `timeout-minutes` if it is close.
3. nit: `.github/workflows/ci.yml:128`: when the log has no `test result:` line at all, `grep` exits 1 inside the `passed=$(...)` substitution and `set -e` ends the step before the `::error::` message is printed. Still fails closed, only the message is lost. Fix (optional): `{ grep ... || true; } | awk ...`.
4. nit: `.github/workflows/ci.yml:108`: the job display name `Rust (cargo test — macOS fonts)` no longer describes what it runs. The build report left it on purpose in case a required-check name depends on it; leaving it is fine, renaming needs the branch-protection check updated.

## Resolution

1. Fixed: the step also runs `run_nonzero --test semantic_embedder_qos_session_test`. Locally on darwin through the step script: exit 0, 2 passed (the macOS `assert_eq!(started, 3)` branch ran).
2. Fixed: `timeout-minutes` raised from 15 to 20, matching the Linux `rust` job, to cover the second lib compile on a cold cache.
3. Fixed: the grep is wrapped as `{ grep ... || true; } | awk ...`. Probe with a fake `cargo` that prints no `test result:` line: the `::error::` line prints, exit 1.
4. Rejected: the job name stays `Rust (cargo test — macOS fonts)`. A rename could break a branch-protection required-check reference, and the reviewer marks keeping it as fine.

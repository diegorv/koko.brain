VERDICT: APPROVED

# Issue 40 review
## Acceptance criteria

- [met] The step fails when the macOS-gated `semantic_qos_test` tests do not all run (a fake output with 2 passed instead of 3 for that call fails) — I pulled the step script out of `.github/workflows/ci.yml` into `/tmp/r40-review/step.sh` and ran it with a fake `cargo` on PATH. When the gated `--exact` call prints `2 passed`, the step exits 1 with `::error::... ran 2 tests, expected 3`. `0 passed` (the gates compiled out) exits 1 with `ran 0 tests in a binary`, and `4 passed` exits 1 with `expected 3`. On darwin, the real gated call reports `3 passed; 2 filtered out`, so the `--exact` filter selects exactly the three `#[cfg(target_os = "macos")]` tests at `src-tauri/tests/semantic_qos_test.rs:15,31,50`.
- [met] The step fails when any binary in a call reports 0 passed, even if another binary in the same call passed tests — Fake cargo printing `0 passed` then `4 passed` for the fonts call: exit 1, `::error::cargo test --lib commands::fonts ran 0 tests in a binary`. With the order reversed (`40 passed` then `0 passed` on the utils_fs call): exit 1. With no `test result` line at all: exit 1. A `FAILED` line with cargo exit 101: exit 101, because pipefail and `set -e` stop the step.
- [not met] The step still passes on the real macOS CI run, and its log shows each call's count — This needs the first GitHub Actions run on main after the push, so deliver checks it. Local evidence: I ran the real pulled-out step on darwin at ff391608 and it exited 0. It printed one count line per call: fonts 4, semantic_qos_test 5, gated 3, utils_fs_test 40, semantic_embedder_qos_session_test 2. Log: `/Users/diegorv/Dev/pet-projects/koko/brain.worktrees/test-logs/architecture-stability/40-review-step.log`.

## Checks run by the reviewer

- `actionlint .github/workflows/ci.yml`: exit 0.
- `shellcheck -s bash` on the pulled-out step script: exit 0.
- `pnpm check`: exit 0 (0 errors, 0 warnings).
- Fake-cargo probes in `/tmp/r40-review/`: all_good 0, zero_next 1, gated_two 1, gated_zero 1, gated_four 1, no_result 1, failed 101, zero_last_binary 1.
- A real darwin run of the step: exit=0 (log above).
- Test verdict rests on: the step script itself, run against fake and real cargo. The diff changes no Rust or frontend source, and no test file covers the YAML. The real run covered `src-tauri/tests/semantic_qos_test.rs`, `utils_fs_test.rs` and `semantic_embedder_qos_session_test.rs`, plus the `commands::fonts` lib tests. Deliver runs the full suite.
- Scope: the diff is the one CI step plus `work/40/discovery.md`. It changes no layer baseline, no `BASELINE_SIZE` and no composition root.

## Findings

1. nit — `.github/workflows/ci.yml:130-131`: the comment covers renames only ("rename one there and rename it here too"). A new `#[cfg(target_os = "macos")]` test added to `semantic_qos_test.rs` would also need its name added to the `--exact` list and the count raised. Otherwise only the `any` whole-binary call covers it, and a broken gate on the new test goes unnoticed. Fix: reword to "add or rename one there and update the list and count here too".
2. nit — `.github/workflows/ci.yml:136,147`: `expected` is not checked. A non-numeric value other than `any` (probe: `run_tests 3x ...` with the gated call printing `2 passed`) makes `[ "$passed" -ne "$expected" ]` fail with status 2 inside the `if`. Status 2 counts as false, so the count check is skipped and the step exits 0. If the count is dropped by mistake, the zero check still catches it with real cargo, because the call then runs every binary and most of them report 0. Optional fix: `case $expected in any|[0-9]*) ;; *) echo "::error::run_tests: bad count $expected"; exit 1 ;; esac`.

## Resolution

1. Fixed: the step comment now reads "add or rename one there and update the list and count here too".
2. Fixed, with a stricter guard than the one suggested. The suggested `[0-9]*` pattern would still accept `3x`, because a case glob only checks the first character. `run_tests` now accepts `any` or digits only (`'' | *[!0-9]*` is rejected with `::error::run_tests: bad count`). Probes with fake cargo: the normal step exits 0, a gated count of 2 exits 1, and `run_tests 3x` exits 1 with the bad-count error. actionlint and shellcheck exit 0.

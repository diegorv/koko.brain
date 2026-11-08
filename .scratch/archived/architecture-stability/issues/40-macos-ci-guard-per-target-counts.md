# 40: The macOS CI guard checks the tests it means, per binary

**What to build:** Issue 35's `run_nonzero` step (`.github/workflows/ci.yml:122-138`, job `rust-fonts-macos`) fails a cargo call that reports 0 passed tests. Two gaps remain:
- **`semantic_qos_test` is counted as a whole.** `src-tauri/tests/semantic_qos_test.rs` has 3 macOS-gated tests (lines 13, 29, 48) and 2 tests with no platform gate. If the `cfg(target_os = "macos")` gates broke or those 3 tests were removed, the count would drop from 5 to 2 and the step would still pass. Add a call filtered to the gated tests that must report 3 passed. Either give `run_nonzero` an expected count, or filter the call on the gated test names.
- **The guard sums every `test result:` line** (ci.yml:127). A call that runs two binaries hides a 0-test binary behind the other's count (a probe with `0 passed` and `4 passed` lines exits 0). No call runs two binaries today: `--lib` skips doc tests, and each `--test` is one binary. Fail when any single `test result:` line reports 0 passed, so a later edit that adds a target to a call cannot slip through.

**Blocked by:** none

**Status:** resolved

**Gate:** `actionlint .github/workflows/ci.yml`. Run the step's script with a fake `cargo` (the probes from the review are in `/tmp/r35/` while they last) to cover a 0-count binary next to a non-zero one, and a gated count of 2 instead of 3. Then check the first CI run on main.

**Source:** post-delivery adversarial review of Issue 35 (squash 15519540), 2026-11-01, findings 1 and 2. `.github/workflows/ci.yml:118-138`, `src-tauri/tests/semantic_qos_test.rs`.

- [x] The step fails when the macOS-gated `semantic_qos_test` tests do not all run (a fake output with 2 passed instead of 3 for that call fails)
- [x] The step fails when any binary in a call reports 0 passed, even if another binary in the same call passed tests
- [x] The step still passes on the real macOS CI run, and its log shows each call's count (Nightly run 41324696367 on b096c415: fonts 4, semantic_qos_test 5, the gated call 3, utils_fs_test 40, semantic_embedder_qos_session_test 2)

## Notes

- **Not urgent:** neither gap lets a test slip today. They guard against later edits.
- **Size:** S.

## Comments

- 2026-11-01, branch `issue/40-macos-ci-guard-per-target-counts`: the "Run macOS-gated tests" CI step now fails when any binary of a call reports 0 passed, and pins the three `#[cfg(target_os = "macos")]` semantic_qos_test tests to an `--exact` call that must report exactly 3. Deliver fixes: the comment covers added tests as well as renamed ones, and `run_tests` rejects any count that is not `any` or digits. Tests: `pnpm check` 0 errors; full suite 386 files / 9304 passed, 1 skipped, 1 todo, build ok (`test-logs/architecture-stability/40-deliver.log`); actionlint and shellcheck clean; fake-cargo probes behave as expected. Review round 1: APPROVED (2 nits, both fixed). The third criterion (real macOS CI run) stays open until the first GitHub Actions run on main; it passed in a local darwin run of the step.

# Issue 40 discovery: macOS CI guard checks per-binary counts

Repeats Issue 35's step (work/35). Only the `Run macOS-gated tests` step changes.

## Files that change

- `.github/workflows/ci.yml:118-138` (job `rust-fonts-macos`): the `run_nonzero`
  helper sums every `test result:` line (:127) and checks only `sum > 0`.

No Rust source changes. `src-tauri/tests/semantic_qos_test.rs` gated tests:
`guard_lowers_the_thread_to_utility_and_restores_it` (:15),
`nested_guards_restore_in_order` (:31), `thread_manager_starts_workers_at_utility` (:50).

## Plan

Replace `run_nonzero` with `run_tests <expected|any> <cargo args>`:
1. Collect each `test result: ok. N passed` count (one per binary).
2. Fail with `::error::` if there is no such line or any line reports 0.
3. Sum the counts; when `expected` is a number, fail unless the sum equals it.
4. Echo `cargo test <args>: <sum> passed` (per-call count in the log).

Calls: the existing four with `any`, plus
`run_tests 3 --test semantic_qos_test -- --exact <the 3 gated names>`
(libtest accepts several filters; `--exact` stops a name matching a longer one).

## Verification (no test seam for YAML)

- `actionlint .github/workflows/ci.yml` (runs shellcheck on the block).
- Extract the step's script; run with a fake `cargo` on PATH:
  `0 passed` + `4 passed` lines -> exit 1; gated call printing `2 passed` -> exit 1;
  all real-looking counts -> exit 0; no result line -> exit 1.
- Run the real gated call once on darwin to confirm it reports 3 passed.

## Risks

- A gated-test rename now breaks CI until the step's names are updated (intended:
  the step must name what it guards). Comment in the step says so.

## Defaults taken

- Filter on names with an exact count (both options the Issue offers, combined:
  the expected 3 is independent of the 2 ungated tests in the same file).
- Keep the whole-binary `semantic_qos_test` call (Issue says "add a call").

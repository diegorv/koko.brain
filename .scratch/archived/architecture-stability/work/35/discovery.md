# Issue 35 discovery: macOS fonts CI job runs zero tests

## Files that change

- `.github/workflows/ci.yml:119-120`: the `Run fonts tests` step of `rust-fonts-macos`.
  Its filter `--test commands_test commands::fonts_test::macos` matches nothing since
  23beb215 moved the tests inline into `src-tauri/src/commands/fonts.rs:78-110`.

No Rust source changes. Targets that must run on macOS:
- lib, filter `commands::fonts` (4 tests in `#[cfg(target_os = "macos")] mod tests`)
- `--test semantic_qos_test` (macOS-gated tests at :13, :29, :48)
- `--test utils_fs_test` (macOS-gated assert at :410)

## Plan

Replace the step with a bash block that defines one helper and calls it three times:
`cargo test --manifest-path src-tauri/Cargo.toml -p kokobrain <target args>`, output
`tee`d to a temp log under `set -euo pipefail`, then sum the `test result: ok. N passed`
lines and fail with `::error::` when the sum is 0. Three separate invocations because
one cargo call applies the single filter to every target, which would filter out the
two integration test files.

The step name changes to `Run macOS-gated tests` since it now covers more than fonts.

## Verification

No test seam for YAML. Run the step's script verbatim locally on macOS (darwin host):
each of the three targets must report a non-zero passed count, and a deliberately
bad filter (e.g. `--lib commands::nope`) must make the helper exit non-zero.
Then `cargo test --manifest-path src-tauri/Cargo.toml` per the Issue gate.

## Risks

- `passed` sum counts only `ok` results; a failing run already fails through pipefail.
- `-p kokobrain` is redundant today (single package) but kept per the Issue.

## Defaults taken

- Check on the passed count (the Issue's first criterion) rather than `running N tests`;
  for a single target they are equivalent when everything passes.

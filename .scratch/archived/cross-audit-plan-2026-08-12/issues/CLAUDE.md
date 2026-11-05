# Issue Execution Playbook

How to implement any issue in this folder. Proven on issue 01 (resolved by 5a299ff, closed by 350e78c).

## Flow

1. **Read fully before touching anything.** The issue file, every file the change touches, and the full execution chain (root CLAUDE.md Pre-Change Checklist). The issue's `## How` is the scope contract: surgical, no adjacent refactors, other call sites untouched unless it says so.

2. **Regression test FIRST — and prove it is red.** Write the test, run it against the CURRENT (broken) code, confirm it fails for the right reason. Two traps learned on issue 01:
   - If the buggy surface is not unit-testable (e.g. inline component handlers — this repo has no component-rendering tooling), extract to a `.service.ts`/`.logic.ts` per the repo pattern so it becomes testable. That extraction is in scope; it is what makes test-first possible.
   - A green test proves nothing until it has failed against the bug. Side channels can fake the fix (issue 01: hiding one sidebar leaked to disk via surviving panes' `onResize` -> `debouncedSave`, so a single-click e2e probe passed against broken code). If the red run passes, the test is wrong — find the side channel, redesign the probe.

3. **Implement the minimal fix.** Match the sibling path the issue points at (e.g. "persist exactly like the keybinding"). Reuse the existing shared function/pattern instead of duplicating.

4. **Gate** (root CLAUDE.md rule 6): frontend -> `pnpm check` + `pnpm vitest run` + `pnpm build`; Rust -> `cargo test --manifest-path src-tauri/Cargo.toml`; both -> all four. E2E collateral changed -> `bash scripts/e2e.sh` (never manual).

5. **Adversarial review — mandatory before commit.** Spawn a **Fable 5 sub-agent** (`model: "fable"`) whose stance is: the implementation is PRESUMED FLAWED until it fails to refute it. It must attack everything — correctness, missed call sites, behavior parity, test vacuity (would the tests fail if the fix were reverted?), repo conventions — and return findings with severity + file:line, or an explicit "could not refute" with the attack list. Hard constraint in the prompt: the reviewer must NOT mutate the working tree (a crashed reviewer once left a mutation-test revert behind — audit `git status` after any reviewer crash). Fix findings; send the delta back for re-review if material.

6. **Only if validated: commit the fix.** Append the closing `## Comments` entry to the issue file (red-green evidence, discoveries, review verdict), stage only issue-related files, verify `git diff --cached --stat`, commit in the full format (Context, Problem, Solution, Behavior, Files with line ranges). Test collateral and the issue-file comment land in this same commit.

7. **Mark done and delete.** Separate `chore(issues)` commit that `git rm`s the issue file, recording "done, resolved by <fix sha>" in the message. The tracker has no done label or archive folder — a lingering file reads as still open. History keeps the full file at the fix commit.

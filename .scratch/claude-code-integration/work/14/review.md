VERDICT: APPROVED

## Acceptance criteria

- [met] Failing test first in `claude_turn_test.rs`: `build_args` has `--system-prompt-snapshot` followed by `off` right after the `--append-system-prompt <text>` pair and before `--`, both for a first turn and for a turn with `resume_session_id`. — `system_prompt_snapshot_is_off_after_the_append_pair_on_every_turn` (`src-tauri/tests/commands/claude_turn_test.rs:189-204`) loops over `resume_session_id` `None` and `Some("sess-1")`, finds `--append-system-prompt` and asserts `args[append + 2..append + 5] == ["--system-prompt-snapshot", "off", "--"]` and that the prompt is last. Without the fix only `--` and the prompt follow the append text, so the slice is out of range and the test panics (red by construction; the build report's red run, 25 passed and 1 failed, agrees). The test and the fix share commit 0d9141acc, so test-first order is not visible in history, only in the build report.
- [met] `build_args` (`src-tauri/src/commands/claude/turn.rs:88-112`) adds the pair there; the prompt stays the last arg after `--`. The tests that compare arg lists gain the two entries: `args_for_a_first_turn` (`claude_turn_test.rs:107-133`, full vec) and `args_with_resume_model_and_a_slash_prompt` (`:151-184`, `args[7..]`, unchanged index because the pair goes after the append pair). — `turn.rs:109-116` extends with `--append-system-prompt`, text, `--system-prompt-snapshot`, `off`, `--`, prompt. `args_for_a_first_turn` gains the two entries at `claude_turn_test.rs:129-130`; `args_with_resume_model_and_a_slash_prompt` keeps `args[7..]` and gains them at `:178-179`. `a_prompt_starting_with_a_dash_follows_the_end_of_options_marker` still passes, so the prompt stays last after a single `--`. No other test or source file builds or asserts this arg list (grep for `append-system-prompt` and `system-prompt-snapshot` over `src`, `src-tauri`, `e2e`).
- [met] The doc comment on `build_args` says why the flag is there, in one line citing the CLI reference section below. — `turn.rs:88-90`: one sentence (wrapped over three comment lines) saying the flag makes a resumed turn rebuild the system prompt with the notes attached now, citing "System prompt flags in resumed conversations", https://code.claude.com/docs/en/cli-reference.
- [met] ADR-0038 (`docs/adr/0038-claude-code-cli-subprocess.md:15`) lists the flag with the turn's flags; `spec.md` adds it to the verified flags (line 25) and says in the "Shape" paragraph (line 40) that the attached notes are re-read on every turn because of it. — ADR-0038 line 15 (the Decision paragraph) adds "Every turn also passes `--system-prompt-snapshot off` ...". `spec.md:25` adds the flag, the 2.1.257 floor and the CLI reference link to the verified-flags bullet; `spec.md:40` says every turn passes it so the attached notes in `--append-system-prompt` are re-read on every turn.

## Checks run in this review

- `CARGO_TARGET_DIR=<worktree>/src-tauri/target ORT_CACHE_DIR=<worktree>/src-tauri/target/ort-cache cargo test --manifest-path src-tauri/Cargo.toml --test commands_test claude_`: exit 0, 103 passed, 0 failed, including the new test. The test verdict rests on `src-tauri/tests/commands/claude_turn_test.rs` (the file the diff changes and the test file of `turn.rs`) plus the rest of the `claude_` tests in `commands_test`. A private, gitignored target dir (`src-tauri/.gitignore:3`) was used because another session's cargo held the shared target.
- `pnpm check`: exit 0, 0 errors, 0 warnings. No frontend file changed.
- No `#[ts(export)]` type changed; `git diff mvp-claude...HEAD -- src/lib/contracts/generated` is empty. Worktree clean.
- Installed CLI is 2.1.325 and `claude --help` lists `--system-prompt-snapshot <on|off>`, with `--append-system-prompt` named in its text, matching the Issue's notes.
- Full suite and clippy not run: deliver's to run.

## Findings

None.

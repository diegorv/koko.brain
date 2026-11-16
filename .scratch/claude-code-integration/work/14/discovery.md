# Issue 14 discovery: resumed turns see current notes

## Files that change

- `src-tauri/src/commands/claude/turn.rs:83-113` `build_args`: insert `--system-prompt-snapshot`, `off` after the `--append-system-prompt <text>` pair, before `--`. Doc comment gains one line citing the CLI reference section "System prompt flags in resumed conversations".
- `src-tauri/tests/commands/claude_turn_test.rs:106-133` `args_for_a_first_turn` (full vec) and `:150-183` `args_with_resume_model_and_a_slash_prompt` (`args[7..]` tail, same index) gain the two entries. A new test asserts the pair sits right after the append pair and right before `--`, for a first turn and a resumed turn.
- `docs/adr/0038-claude-code-cli-subprocess.md:15` Decision paragraph: list the flag with the turn's flags.
- `.scratch/claude-code-integration/spec.md:25` verified flags bullet adds `--system-prompt-snapshot off`; `:40` "Shape" paragraph says the attached notes are re-read on every turn because of it.

## Plan

1. Failing test `system_prompt_snapshot_is_off_after_the_append_pair` (loop over first turn and resumed turn): find the `--append-system-prompt` index `i`, assert `args[i+2..i+5] == ["--system-prompt-snapshot", "off", "--"]`. Run, see it fail. Commit together with the fix (one logical step) after updating the two vec tests.
2. Change `build_args`, update the two arg-list tests, run `cargo test --test ... claude_turn` targeted, then commit.
3. Docs: ADR-0038 and spec.md, one commit.

## Prior art

- `a_prompt_starting_with_a_dash_follows_the_end_of_options_marker` (`claude_turn_test.rs:135-148`) for positional assertions on `args`; `request()` helper in the same file builds a default request.

## Risks

- `ClaudeTurnRequest` is a ts-rs DTO but is not changed, so no bindings regenerate; only doc comments on `build_args` (not exported) change.
- CLIs below 2.1.257 reject the flag; Issue Notes accept that, no version gating.

## Defaults taken

- The doc-comment line cites the URL `https://code.claude.com/docs/en/cli-reference` and the section name.

# 14: A resumed turn sees the notes attached now, not those of the first turn

**What to build:** Every turn passes `--system-prompt-snapshot off`, so the attached notes in `--append-system-prompt` reach Claude on every turn of a chat, not only on its first.

**Blocked by:** 13

**Files:** src-tauri/src/commands/claude/turn.rs,src-tauri/tests/commands/claude_turn_test.rs,docs/adr/0038-claude-code-cli-subprocess.md,.scratch/claude-code-integration/spec.md

**Status:** resolved

**Gate:** `cargo test --manifest-path src-tauri/Cargo.toml`

- [x] Failing test first in `claude_turn_test.rs`: `build_args` has `--system-prompt-snapshot` followed by `off` right after the `--append-system-prompt <text>` pair and before `--`, both for a first turn and for a turn with `resume_session_id`.
- [x] `build_args` (`src-tauri/src/commands/claude/turn.rs:88-112`) adds the pair there; the prompt stays the last arg after `--`. The tests that compare arg lists gain the two entries: `args_for_a_first_turn` (`claude_turn_test.rs:107-133`, full vec) and `args_with_resume_model_and_a_slash_prompt` (`:151-184`, `args[7..]`, unchanged index because the pair goes after the append pair).
- [x] The doc comment on `build_args` says why the flag is there, in one line citing the CLI reference section below.
- [x] ADR-0038 (`docs/adr/0038-claude-code-cli-subprocess.md:15`) lists the flag with the turn's flags; `spec.md` adds it to the verified flags (line 25) and says in the "Shape" paragraph (line 40) that the attached notes are re-read on every turn because of it.

## Problem

Found by the session-history deep dive (`.scratch/claude-session-history/research/synthesis.md`, section 2) and confirmed by a second, independent probe:

- The CLI reference, "System prompt flags in resumed conversations" (https://code.claude.com/docs/en/cli-reference): "By default, Claude Code builds the system prompt once, on a conversation's first request, with the text from any system prompt flags applied, and records it in the session. Until the conversation is compacted, every later request uses that recorded prompt, including after you return to the conversation with `--resume` or `--continue`." `--system-prompt-snapshot off` (v2.1.257 and later) rebuilds it on every request. The 2.1.325 bundle's help text names `--append-system-prompt` explicitly.
- Probes (temp dir, haiku, synthetic codewords, run twice): turn 1 with append text naming A answered A; turn 2 with `--resume` and append text naming B still answered A; turn 3 with `--resume`, B and `--system-prompt-snapshot off` answered B.
- The panel passes the chips only through `--append-system-prompt` (`turn.rs:66-81,106-108`, `claude.service.ts:38`). So a note attached after the first message of a chat (chip, dashed suggestion chip, "Add to Claude context") never reaches Claude, and a removed chip is still in the prompt.

## Notes

- **Delivery:** onto `mvp-claude` (relay-lite base `mvp-claude`), then merged into `preview`.
- **CLI versions:** below 2.1.257 the flag is an unknown option and every turn fails with the CLI's error in the panel; 2.1.257 to 2.1.264 never had the bug (system prompt flags turned recording off). So the flag only breaks CLIs that do not need it. The owner runs 2.1.325; no version gating.
- **Prompt cache:** the cache follows tools, then system, then messages, and a change invalidates its level and every later one. With recording off, a turn whose chips changed (or whose CLAUDE.md, memory or skill list changed) misses the cache for the system block and the whole history on that turn. Accepted.

## Comments

- 2026-11-16, branch `issue/14-resumed-turns-see-current-notes`: `build_args` passes `--system-prompt-snapshot off` after the append pair, so a resumed turn reads the chips attached now; ADR-0038 and spec list the flag. Full vitest suite at deliver: 17106 passed, 54 skipped, 0 failed. Review round 1: APPROVED (no findings).

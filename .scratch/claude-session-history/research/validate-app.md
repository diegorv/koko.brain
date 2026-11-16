# Validation: chat model, persistence options and prior art (feature B)

Adversarial check of `05-chat-model-today.md`, `06-own-persistence.md`, `07-prior-art.md` and
`08-ux-and-edges.md`, with `04-resume-probe.md` used for cross-checks. Branch `mvp-claude`, HEAD
`c8b646da6`, claude 2.1.325. Privacy: only key names, counts, sizes and timings were taken from
`~/.claude` and `<vault>`. Structure scripts were kept in a temp dir outside the repo and removed.
No model-calling probe was run.

Method, in short:
- Code: read `claude.logic.ts`, `claude.store.svelte.ts`, `claude.service.ts`, `stream.rs`,
  `turn.rs`, `shell_env.rs`, `settings.service.ts`, `settings-persistence.svelte.ts`, `utils/fs.rs`.
- Transcripts: Python `json.loads` over the 31 top-level `*.jsonl` in the vault's session dir,
  counting types, keys, flags and `parentUuid` links (scripts `s1` to `s4`, results below).
- Bundle: Python `mmap` search of `~/.local/share/claude/versions/2.1.325`.
- Docs fetched 2026-11-15: https://code.claude.com/docs/en/sessions,
  https://code.claude.com/docs/en/data-usage, https://code.claude.com/docs/en/claude-directory.
- Prior art: `curl` of raw files at the commit SHAs listed in 07.

## Verdicts on load-bearing claims

| # | Claim | Verdict | Evidence |
|---|---|---|---|
| 1 | Chat, sessionId and chips are memory only; a restart gives `EMPTY_CHAT` plus the re-attached active note | confirmed | `claude.store.svelte.ts:4-7,55-58`; `AppShell.svelte:66,89-90` (`attachActiveNote` in `untrack`). `localStorage` users in `src/lib` and `src/routes` do not include the feature (grep listing: theme, vault, command palette, quick switcher, mods, composer). |
| 2 | sessionId reaches the CLI only via `claude.service.ts:37`, which becomes `--resume` at `turn.rs:100-102` | confirmed | Those lines. `Init` and `Result` both keep `event.sessionId \|\| state.sessionId` (`claude.logic.ts:124,153`). |
| 3 | `toolTarget` is the only place a target is computed, and Rust sends the full input | confirmed | `claude.logic.ts:182-193`, `stream.rs:228-232` (`input: block["input"].clone()`). |
| 4 | `dispatch_line` on transcript lines gives the live shapes, and string prompts give nothing | confirmed by reading | `stream.rs:122-138,220-260`. The transcript has no `parent_tool_use_id`, so the missing key reads as null and `send_text` holds (`:221`). There are no `system/init` or `result` lines in transcripts (system subtypes counted: `stop_hook_summary` 189, `turn_duration` 183, `away_summary` 18, `local_command` 5, `informational` 3, `bridge_status` 2, `compact_boundary` 1). Not executed in Rust. |
| 5 | One content block per assistant line | confirmed | 1615 of 1615 assistant lines have a 1-element `content` (thinking 533, text 331, tool_use 751). No `<synthetic>` model and no `isApiErrorMessage` lines. |
| 6 | `isMeta` true for all `local-command-caveat` (13) and `system-reminder` (2), false for task-notification, local-command-stdout and bash-* | confirmed | Same counts. Detail 05 missed: 1 `command-message` line is `isMeta` true. |
| 7 | Real prompts are string content, or arrays with text (30) or image (2) blocks | refuted in part | The 30 text-array user lines are 18 `isMeta` true, 10 interrupt markers and only 2 plain prompts. Interrupt markers sit in text blocks, not string content. A converter that keeps every non-meta text array shows 10 marker bubbles. |
| 8 | Subagents are not inline (`isSidechain` false on all top-level lines) | confirmed | user 1050 and assistant 1615 lines, all `isSidechain` false. 06's "tree with `isSidechain` subagent turns" does not hold for top-level files. |
| 9 | Branching: 29 of 31 files have a parent with several children, so a converter may need a `parentUuid` walk from the leaf | refuted as a design hint | Counting user/assistant children only, 10 files have such a parent. A single-parent walk from the last line leaves out 144 of 2,665 conversation lines: 129 `tool_result` lines and 6 `tool_use` lines (parallel tool calls) plus 9 prompt lines. Only 5 of 174 prompts, in 2 files, sit on abandoned branches. A chain walk would turn about 1 in 6 tool cards into `stopped`, so file order is the safer default. |
| 10 | Compaction: 525 of 526 conversation lines come before the boundary, a walk reaches 2, and the boundary has `parentUuid` null plus `logicalParentUuid` | confirmed, with nuance | 526/525. A plain walk reaches 1 conversation line. Following `logicalParentUuid` across the boundary reaches 515 of 526, so the old turns are linked, not lost. The linear restore with a divider (08) stands. |
| 11 | No tab restore exists; only layout sizes and visibility persist | confirmed | Grep over all of `src` for tab-restore terms found only `restoreTabScroll` (`MarkdownEditor.svelte:536`). |
| 12 | `writeSettingsFile` is plugin-fs `writeTextFile` and not atomic; `write_atomic` does tmp + rename and backs `write_mod_data` | confirmed | `settings.service.ts:264-277`; `utils/fs.rs:16-39`; `commands/vault.rs:1206-1212`. 06's summary says `read_mod_data` uses `write_atomic`: wrong, reads do not write (the body of 06 is right). |
| 13 | Debounce 500 ms with skip-if-unchanged | confirmed | `settings-persistence.svelte.ts:11,70,93`. 06 cites `:12` for the constant, which is line 11. |
| 14 | No app data dir API and no `tauri-plugin-store` | confirmed | The grep 06 gives, re-run over `src` and `src-tauri/src`, found nothing. No match in `package.json` or `Cargo.toml`. |
| 15 | No `.claude` scope in `capabilities/default.json` | confirmed | `grep -c '\.claude'` = 0. |
| 16 | 30-day local retention via `cleanupPeriodDays`, which the owner has not set | confirmed | data-usage page ("Local caching") and claude-directory page ("Cleaned up automatically": the jsonl, `subagents/` and `tool-results/` go once older than the period). The key is absent from `~/.claude/settings.json`, `~/.claude/settings.local.json`, `<vault>/.claude/settings.json` and `<vault>/.claude/settings.local.json`, and there is no managed settings dir. 06 and 07 checked only the user files, but project settings apply too because cwd = vault. |
| 17 | 31 files, 151 MB, median 495,655 B, max 4,380,713 B | refuted in part | Files: 31, 28,278,685 B in total, median and max as stated. 151 MB is the whole dir (`du -sk` 154,832 KB): subagent sidecar dirs hold about 125 MB of it. 06 uses "151 MB in the dir" as a parse-cost figure. The transcripts are 28 MB. |
| 18 | Entrypoints per file: cli 14, sdk-py 14, sdk-cli 2, t3-code 1 | confirmed | Script `s1`. Both `sdk-cli` files are 2.1.325, have `promptSource` `sdk` and exactly one prompt each, and have no `ai-title`. |
| 19 | `build_args` has no `--no-session-persistence`, so turns write CLI transcripts | confirmed | `turn.rs:88-113`. 04 run 1 shows a `-p` run writing `projects/<encoded realpath>/<id>.jsonl`. |
| 20 | `.kokobrain` is git-ignored in the owner's vault, and ADR-0019 only advises excluding it | not re-run | Taken from 06's `git check-ignore`. Not re-run because it does not change the recommendation. |
| 21 | Prior art: t3code `ClaudeAdapterV2.ts:2194`, import limits and title fold, ACP title order | confirmed | Fetched at the pinned SHAs: `threadIdentity = input.resume ? {resume} : {sessionId}` (`:2194-2196`); `MAX_IMPORTED_MESSAGES = 200`, `MAX_IMPORT_TRANSCRIPTS = 100` (`:87-91`); `foldClaudeFields` (`:354-364`); `deriveTitle` takes the first line, 100 chars (`:404-410`). ACP `sdkTitles`/`generatedTitle` (`transcript-scan.ts:653-678`): custom, ai, lastPrompt, summary, first prompt. opcode and claudecodeui not re-fetched. |
| 22 | Title records: last-prompt in 31 files, ai-title in 26, custom-title in 1; the 2 sdk-cli files lack ai-title | confirmed | Script `s1`. The only `custom-title` file is the t3-code one, which has no `ai-title`. |
| 23 | `-p` runs get no generated title | confirmed for the panel; contradicts 04 | Sessions page: "A `claude -p` run you start directly from a shell or script doesn't get one". 04's probe transcript had an `ai-title` line. The likely cause: probes run from this agent shell inherit `CLAUDE_CODE_ENTRYPOINT=t3-code` (`env` shows it), so they are not `sdk-cli` runs. Panel turns start from a clean base env (`shell_env.rs:1-10`, `clean_base` `:88-99`, `env_clear` `turn.rs:123`), so they are `sdk-cli` and untitled. The cause is an inference. |
| 24 | The CLI keeps a preset `CLAUDE_CODE_ENTRYPOINT`, maps only `cli` to `sdk-cli` when non-interactive, and sets `sdk-cli` for `-p` otherwise | confirmed | Bundle function `N(e)` at about offset 278593600: `if(i.CLAUDE_CODE_ENTRYPOINT){...if(...==="cli"&&e)i.set(...,"sdk-cli");return}` ... `i.set("CLAUDE_CODE_ENTRYPOINT",e?"sdk-cli":"cli")`. |
| 25 | Kokobrain could tag its sessions with a custom entrypoint | uncertain, risky | `t3-code` does not appear in the 2.1.325 bundle (`grep -a -c` = 0), yet a transcript carries it, so a raw value probably reaches the file. But `e8()` and `t$a()` test for `sdk-ts`/`sdk-py`/`sdk-cli`, and the telemetry `Op()` drops values that are not in the `Eqo` set. A custom value turns off the SDK-mode branches of a `-p` run. Do not do it. |
| 26 | Project dir = cwd with non-`[a-zA-Z0-9]` replaced by `-`, cut at 200 chars plus a hash | confirmed | Bundle `M(t)` at 278297743 and `WH(e)` at 281268101; sessions page "Where transcripts are stored". 04 adds that the CLI encodes the realpath, while Kokobrain passes the raw path with only trailing slashes trimmed (`claude.service.ts:35`, `normalizeVaultPath` `claude.logic.ts:214-217`). |
| 27 | Resuming a missing id prints one `result` line (`error_during_execution`, `is_error`, `num_turns` 0, `errors[1]`, no init), exits 1, and the panel keeps the dead id | confirmed (not re-run) | 04 run 4 and 08 agree. The sessions page gives the same sentence. Code: `result_message` joins `errors` (`stream.rs:155-162`), and `Result` keeps the echoed id (`claude.logic.ts:153`). |
| 28 | Rust refuses a second turn per vault | confirmed | `turn.rs:229-231`, under the run-map lock. |
| 29 | Parsing is cheap (127 ms for 28.3 MB in Python) | confirmed | Re-run: 9,487 lines in 76-77 ms (two warm runs). |
| 30 | Docs: two concurrent resumers write one transcript, and `--fork-session` avoids it; the cross-project id search needs exactly one match | confirmed | Sessions page, "Branch a session" and "Resume by session ID or name". |
| 31 | Persisted transcripts mark skill bodies `isMeta` while the live stream does not | uncertain | There are 21 string and 18 text-array user lines with `isMeta` true (skill or command bodies by shape). The live capture's one `user` line has no `isMeta` key. A `/skill` panel turn was not run. |
| 32 | `--append-system-prompt` paths (chips) are not in the transcript | refuted in part | The claude-directory page says transcripts hold "the system prompt". The `sdk-cli` file has an `api-request-shape` line with a `shape.system` key. The data is there, but under an internal key. Do not mine it for chips. |

## Contradictions between the files

1. **Transcript size**: 151 MB (06) against 28 MB (05, 08). Both numbers are right, but they measure different things (claim 17). Only 28 MB is transcript.
2. **Walk or file order**: 05 and 06 say a faithful view may need a `parentUuid` walk from the leaf. 08 says to restore linearly. The data favours 08 (claims 9, 10).
3. **Titles for `-p`**: 04's probe got an `ai-title`, while 07, 08 and the docs say `-p` gets none. This is explained by the probe's inherited entrypoint (claim 23).
4. **Open questions that 04 already answers**: 05 Q3, 06 Q1 and Q3, and 08 Q3 and Q5. Plain `--resume` keeps the id and appends to the same file. A resume from another cwd succeeds and appends under the original dir. The dir name is built from the realpath (04 sections 3-5).
5. **Sidechains**: 06 says the tree contains `isSidechain` turns. 05 measured none in top-level files, and so did this check.
6. **Pre-resume existence check**: 06 proposes checking `projects/<slug>/<id>.jsonl` before offering continue. After a vault move that check gives false negatives, because the CLI still finds the id in the old dir (04 run 3). The error shape (claim 27) is the reliable signal.
7. Small line drifts: 08 cites `resetChat` at `claude.logic.ts:109-111` (it is at `:105-107`), and 06 cites the debounce constant at `:12` (it is at `:11`).

## Recommendation

Build option A: Kokobrain keeps its own display copy of each panel chat. Do not read the CLI's
transcripts in v1. The CLI keeps sole ownership of the model context, reached only through `--resume <id>`.

Why:
- The docs say the transcript entry format "is internal to Claude Code and changes between
  versions, so scripts that parse these files directly can break on any release" (sessions page).
  The repo does not pin the CLI version.
- Panel sessions have no CLI title (claim 23). The app would derive the title from the first
  prompt either way, and it already holds that prompt.
- The CLI deletes transcripts after 30 days (claim 16). An own copy keeps old chats readable.
- `ChatMessage` is already reduced (500-char summaries, 80-char targets, no thinking), so a
  chat file is small. Transcripts carry about 125 MB of subagent sidecars, tool outputs, attachments
  and request blobs.
- A read-through converter needs turn grouping, prompt classification (`isMeta`, command tags,
  10 interrupt markers in text blocks, `<persisted-output>` spill tags), compaction handling and
  a new DTO. That is a second parser to maintain.

Shape for the Issues:
1. Rust commands `claude_chat_write` / `claude_chat_read` / `claude_chat_list` modelled on
   `write_mod_data`/`read_mod_data` (`commands/vault.rs:1202-1230`): a fixed dir
   `<vault>/.kokobrain/claude/chats/`, a UUID-validated file name, `write_atomic`, and a read that
   returns `Option` with `None` only for NotFound. The file holds a schema version, an app-generated
   `chatId`, `sessionId`, timestamps, the derived title and `messages`. Key the file by an app
   `chatId`, not the session id: a chat whose session died gets a new session id on its next turn.
2. Save on send and on `Done`, never per delta. Capture the vault path when the turn starts, as
   `settings-persistence.svelte.ts:41-44` does, so a late `Done` cannot write into another vault's dir
   (the same shape as Issue 09). Fix Issue 09 first or in the same change.
3. Add a pure `chatFromStored` / `storedFromChat` pair in `claude.logic.ts` and one store method
   `restore(chat)`, allowed only while idle. Restored tool parts can never be `running` (map them to
   `stopped`). Keep `slashCommands` as `resetChat` does.
4. Dead session: when a `Result` has `isError`, `numTurns === 0` and the run saw no `Init`,
   clear `sessionId`, keep the messages, and show one line: the next message starts a new Claude
   session. This is a structural test. Do not match the English sentence.
5. UI as 08 section 2 describes: a history icon, a list that replaces the message area, rows disabled while a turn
   runs. Leave out transcript existence checks, terminal sessions and per-row delete in v1.
6. Owner decisions: restore the last chat on vault open or start empty; a count cap; whether to
   persist chips.

Reading CLI transcripts can come later as an "import terminal session" action. If it is built,
use `dispatch_line` in file order (not a chain walk), canonicalize the vault path before
encoding, and filter by the `cwd` of the first conversation line.

## Open questions

1. Restore the last chat automatically on vault open, or start empty and offer the history list?
   Showing the chat costs nothing; the cost comes with the first resumed send.
2. Retention for Kokobrain's copies: keep everything, or cap by count or age?
3. Should chips (`contextNotes`) be saved with the chat and re-sent on the next turn?
4. Does `--session-id <uuid>` (04 section 1, never exercised) let the app fix the id before the first line,
   so a turn cancelled before `Init` is still resumable?
5. A turn killed at quit (Issue 11) never reaches `Done`, so its partial reply is not saved. Is
   saving on send enough, given the CLI transcript still holds that turn?
6. Does auto-compaction in a `-p` turn emit a stream event the panel should show as a divider?

## Claims to verify

1. In a real panel session file, `entrypoint` is `sdk-cli`, there is no `ai-title`, and `promptSource` is
   `sdk` (inferred from 2 files and the env code, not from a session started by the panel).
2. Folding transcript lines through `dispatch_line` in Rust gives the same `ToolStart`,
   `TextDelta` and `ToolResult` as live (read from code only, not executed).
3. A custom `CLAUDE_CODE_ENTRYPOINT` changes `-p` behaviour through `e8()` and `t$a()` (read from
   the bundle, not tested).
4. The 129 off-chain `tool_result` lines are all parallel tool calls (inferred from their type,
   not traced one by one).
5. The `shape.system` key in `api-request-shape` holds the appended system prompt (key name
   only; content not read).
6. The dead-session result shape (claim 27) still applies when the transcript was removed by
   the sweep rather than never created (04 tested only an id that never existed).

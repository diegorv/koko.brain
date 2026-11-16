# 04 - Resume probe (claude 2.1.325)

Real probe of `--resume` semantics. Method: two fresh empty temp dirs from `mktemp -d` (called A and B below, never the vault), model `haiku`, `env -u CLAUDECODE`, stdin from `/dev/null`, prompts of one or two words. No prompt or answer text is recorded here; only structure. Home is `~`.

Probe commands (all with `--model haiku --output-format stream-json --verbose`):

| # | Command (cwd) | Exit |
|---|---|---|
| 1 | `-p "reply with the word ok"` (A) | 0 |
| 2 | `-p ... --resume <S1>` (A) | 0 |
| 3 | `-p ... --resume <S1>` (B) | 0 |
| 4 | `-p ... --resume 11111111-2222-4333-8444-555555555555` (B, well-formed, unknown) | 1 |
| 5 | `-p ... --resume not-a-uuid` (B) | 1 |
| 6 | `-p ... --resume <S1> --fork-session` (A) | 0 |
| 7 | `-p ... --no-session-persistence` (B) | 0 |
| 8 | `-p ... --resume <S7>` (B), S7 from run 7, plain text output | 1 |

## 1. Flags exist (`claude --help`, 2.1.325)

- `--fork-session`: "When resuming, create a new session ID instead of reusing the original (use with --resume or --continue)". Works (run 6).
- `--no-session-persistence`: "Disable session persistence - sessions will not be saved to disk and cannot be resumed (only works with --print)". Works (runs 7, 8).
- `--session-id <uuid>`: "Use a specific session ID for the conversation (must be a valid UUID)". Exists; NOT exercised in a run (UNVERIFIED behavior).
- `-r, --resume [value]`: "Resume a conversation by session ID or name, or open interactive picker with optional search term". `-c, --continue`: "Continue the most recent conversation in the current directory".
- The panel already uses `--resume` only (`src-tauri/src/commands/claude/turn.rs:100-101`) and spawns with `current_dir(vault)`, stdin null (`turn.rs:119-131`).

## 2. First turn: stream shape and session id

Run 1 stdout = 16 NDJSON lines, stderr = 2 lines (see section 8). Line order by `type`/`subtype`:

1. 6x `system/hook_started`, 6x `system/hook_response` and 1x `system/hook_progress` (lines 0-12), all `hook_name` = `SessionStart:startup`, all `exit_code` 0, `outcome` success. These come from the owner's global hooks and appear BEFORE `system/init`. The frontend must not assume `init` is the first line.
2. `system/init` (line 13). Keys: `additional_directories, agents, analytics_disabled, apiKeySource, capabilities, claude_code_version, cwd, fast_mode_disabled_reason, fast_mode_state, mcp_servers, memory_paths, messaging_socket_path, model, original_cwd, output_style, per_turn_effort_active, permissionMode, plugins, product_feedback_disabled, session_id, skills, slash_commands, subtype, terminal_slash_commands, tools, type, ultrathink_available, ultrathink_typed_raises, uuid, view_mode`.
3. `assistant` (one line, no `--include-partial-messages`). Keys of `message`: `container, content, context_management, diagnostics, id, model, role, stop_details, stop_reason, stop_sequence, type, usage`.
4. `result/success`. Keys: `api_error_status, duration_api_ms, duration_ms, fast_mode_disabled_reason, fast_mode_state, first_content_frame_ms, is_error, modelUsage, model_usage_since_last_result, num_turns, permission_denials, queued_turn_count, result, result_index, safety_stops, session_id, stop_reason, subagent_stats, subtype, terminal_reason, time_to_request_ms, total_cost_usd, ttft_ms, ttft_stream_ms, type, usage, uuid`. Values seen: `is_error` false, `terminal_reason` "completed", `stop_reason` "end_turn", `num_turns` 1, `api_error_status` null, `total_cost_usd` about 0.009.

Every line carries the same `session_id` (checked: one distinct value); `init.session_id == result.session_id`. `init.cwd == init.original_cwd`, and both are the REALPATH of the temp dir (`/private/var/folders/...`), not the `/var/folders/...` spelling returned by `mktemp`.

## 3. Where the transcript lands, and the path encoding

- File: `~/.claude/projects/<encoded cwd>/<session_id>.jsonl`, mode `-rw-------`. The project dir also gets an empty `memory/` dir.
- Encoding observed: `/private/var/folders/<xx>/<id>/T/tmp.<rand>` became `-private-var-folders-<xx>-<id>-T-tmp-<rand>`. So `/`, `.` and `_` all map to `-`; every other non-alphanumeric character is probably also `-` (only `/ . _` observed; the general rule is UNVERIFIED, my bundle grep for the regex timed out).
- macOS symlink: the encoded name starts with `-private-var-`, i.e. the symlink-resolved cwd (`pwd -P`), not `-var-`. A consumer that encodes `/var/...` itself would look in the wrong dir. For the real vault under `/Users/...` there is no symlink, but a vault path with a symlinked component would be affected. UNVERIFIED for the vault itself (not touched).
- After run 1 the file had 39 lines and 372,599 bytes for a 1-word prompt. By line type (count/bytes): `attachment` 19/241,418; `api-request-shape` 1/72,378; `api-request-blob` 2/51,294; `user` 1/610; `assistant` 1/1,545; others tiny. So the file is dominated by attachments and request blobs, not chat messages. File size is a poor proxy for conversation length.
- Line types seen: `queue-operation, attachment, user, atis-latch, last-prompt, api-request-shape, api-request-blob, api-request, ai-title, assistant, system (subtype stop_hook_summary), cost-state, mode`. `user` line keys: `cwd, entrypoint, gitBranch, isSidechain, message, parentUuid, permissionMode, promptId, promptSource, sessionId, timestamp, turnOrigin, turnPosition, type, userType, uuid, version`. `assistant` line adds `requestedModel, requestRef, effort, madeBy, apiBlockIndex`.
- `ai-title` lines (key `aiTitle`) and `last-prompt` lines (keys `lastPrompt, leafUuid`) exist in the transcript. They hold user-derived text, so never copy them into committed files; a history list could use them for a title.
- The `-p` run also wrote side files keyed by the session id: `~/.claude/security/security_warnings_state_<id>.{json,lock}` and an empty `~/.claude/session-env/<id>/` dir. This happened even with `--no-session-persistence` (run 7). `~/.claude/history.jsonl` and `~/.claude/security/log.txt` had no mention of the ids.

## 4. Resume from the same dir (run 2)

- Exit 0. `init.session_id` and `result.session_id` equal S1: plain `--resume` KEEPS the same id (does not mint a new one).
- Hook name changed to `SessionStart:resume` (was `startup`).
- Line types in stdout: same 15 lines (hooks, `init`, `assistant`, `result`). Only the new turn is streamed; the old turns are not replayed on stdout.
- Transcript: same file grew (372,599 to about 391 KB, then 402,213 after run 3); distinct `sessionId` values = 1; `user`/`assistant` count 2/2 after run 2. The new `user` line has a `parentUuid`, so the turns form a uuid chain inside one file. The `result.num_turns` is 1 per invocation (per call, not cumulative).
- No new project dir and no new session file.

## 5. Resume from ANOTHER dir (run 3)

Surprising result: it SUCCEEDED.

- Exit 0, `init.session_id == S1`, `init.cwd` = B's realpath, `is_error` false, assistant answered normally.
- The session file stayed in A's project dir and was appended there (transcript 6 `user`/`assistant` lines, one distinct `sessionId`, `cwd` values in the file now include both A and B suffixes). A project dir for B was created but holds only an empty `memory/` dir; no `.jsonl` was written under B.
- So the CLI finds a session by id across `~/.claude/projects/*`, not only in the cwd's project dir (the bundle has a `store` resume source: `resumeSource:"store"`, `failure_reason:"not_found_explicit_id"` near the not-found message; found with `grep -a -o` on the binary, mechanism beyond that UNVERIFIED).
- Consequence for Kokobrain: a saved session id resumes even if the vault path later changes (rename, move, different mount), and the transcript stays under the ORIGINAL cwd's dir. A history feature that lists sessions by scanning only the current vault's encoded dir would miss sessions started from the old path.
- Caveat: this probe did not test two different dirs that both hold a session with the same id (cannot happen with fresh uuids).

## 6. Unknown session id: error shapes

Run 4 (well-formed uuid, nothing stored):

- Exit code 1.
- stdout: exactly 1 NDJSON line, no `system/init`, no hooks. A `result` with: `type` "result", `subtype` "error_during_execution", `is_error` true, `duration_ms` 0, `duration_api_ms` 0, `num_turns` 0, `stop_reason` null, `total_cost_usd` 0, `modelUsage` {}, `permission_denials` [], `usage` (object), `uuid`, `result_index` 0, `session_id` = the id you passed, and `errors` = array of one string, `No conversation found with session ID: <id>`. There is NO `result` string key on this line (differs from a success `result`).
- stderr (after the connector warning line): `No conversation found with session ID: <id>`.
- Plain-text mode (run 8, no `--output-format`): stdout empty, same message on stderr, exit 1.
- Bundle: error string is built as `No conversation found with session ID: ${M}` and sent with `level:"error"` then `dr(1)` (exit 1), after telemetry `tengu_session_resumed` with `success:false, failure_reason:"not_found_explicit_id"` (strings in `~/.local/share/claude/versions/2.1.325`, found with `grep -a -o`).

Run 5 (not a uuid):

- Exit code 1. stderr: `Error: --resume requires a valid session ID or session title when used with --print. Usage: claude -p --resume <session-id|title>. Provided value "not-a-uuid" is not a UUID and does not match any session title.`
- stdout: 1 `result/error_during_execution` line, `is_error` true, `num_turns` 0, `errors` = list (about 214 chars joined, one string with the same text), `session_id` = a FRESH random uuid (not the input).
- Note: with `-p`, `--resume` also accepts a session TITLE. A free-text value is matched against titles, so a client must only pass ids it got from `init`/`result`.

Detection rule for the panel: a resume failure is `type=result`, `subtype=error_during_execution`, `num_turns=0`, `duration_ms=0`, no `system/init` seen before it, exit code 1. The text for the user is in `errors[0]`, not in `result`. The frontend must read `errors`, since a code path that reads only `result` gets undefined.

## 7. `--fork-session` and `--no-session-persistence`

Run 6 (`--resume S1 --fork-session`, cwd A):

- Exit 0. `init.session_id` = a NEW id (S6), all lines carry S6; `init.cwd` = A.
- A new file `S6.jsonl` appeared beside `S1.jsonl` in A's project dir (419,296 bytes vs S1 402,213, i.e. the fork carries over the parent history; it is a copy plus the new turn). S1 was not modified by the fork run (size unchanged at 402,213).
- Use: "branch from this point" or "retry without touching the original". Not needed for plain history.

Run 7 (`--no-session-persistence`, cwd B):

- Exit 0, normal `init`/`assistant`/`result` with a session id S7.
- Nothing written under `~/.claude/projects/` (the B project dir contained only `memory/`), but the side files in `security/` and `session-env/` were still created (section 3).
- Run 8 (`--resume S7`): exit 1, `No conversation found with session ID: S7`. Confirms it cannot be resumed. Relevant if Kokobrain ever wants a "private chat" mode: it would give no on-disk CLI history and cannot continue the session in a later turn, so the panel would have to resend the whole chat each turn.

## 8. stderr and stdin noise (every run)

- stderr line 1 (every run, even successful): a warning that claude.ai connectors are disabled because an auth env var takes precedence. Reflects this machine's env, not a failure. A panel that treats any stderr output as an error would misfire; the panel's env is built differently (`turn.rs:119-125`, `env_clear` plus shell env), so whether it appears there is UNVERIFIED.
- stderr line 2 (run 1 only, when stdin was not redirected): `Warning: no stdin data received in 3s, proceeding without it...`. It was a 3 second wait. With `< /dev/null` it did not appear. The panel already uses `Stdio::null()` (`turn.rs:126`), so it is not affected.

## 9. What this means for history features

1. The session id is stable across turns for plain `--resume` (section 4). Saving the id from `init` or `result` is enough to continue a chat after an app restart, as long as the file under `~/.claude/projects/` still exists.
2. Resume does not stream the old messages. Showing past chat after restart needs either (a) Kokobrain's own copy of the messages, or (b) reading the CLI's transcript `.jsonl` (types in section 3; the format is not a documented contract, so UNVERIFIED stability across versions).
3. Reading (b) means scanning the encoded cwd dir; mind the realpath rule (section 3) and that a resume from another cwd appends to the ORIGINAL file (section 5).
4. A dead session (deleted file, cleanup) gives the section 6 error. The UI should offer "start a new session" on that exact failure and drop the stored id.
5. CLI cleanup of old transcripts: `cleanupPeriodDays` or similar retention is UNVERIFIED here (not searched); a stored id may outlive its file.

## Cleanup

Removed: both temp dirs, both `~/.claude/projects/-private-var-...-tmp-*` project dirs (2 session files, S1 and S6, and the `memory/` dirs), and the probe-keyed files `~/.claude/security/security_warnings_state_<id>.{json,lock}` and `~/.claude/session-env/<id>/` for the three sessions that were actually created (S1, S6, S7). The made-up ids and the random id from run 5 created no files. `ls ~/.claude/projects` was diffed against a listing taken before the probe and is identical. Other sessions' files in `security/` and `session-env/` were left untouched.

## Open questions

- Exact general encoding rule for the project dir name (only `/ . _` observed), and how it treats non-ASCII or very long paths (the CLI may truncate or hash).
- How the cross-dir session lookup works (full scan of `projects/*`, an index, or `sessions/`) and its cost with hundreds of project dirs (this machine had 672).
- Retention: does the CLI delete old transcripts, and after how long?
- Does `--session-id <uuid>` let the panel pick the id up front, so the id is known before the first line arrives (cancel before `init` would not lose it)?
- Does a symlinked vault path encode by realpath, as the temp dir did?
- Is the transcript format stable enough to parse for history display, or should Kokobrain keep its own copy?
- Does the connector warning on stderr occur under the panel's cleaned environment?

## Claims to verify

- Plain `--resume <id>` returns the same `session_id` and appends to the same `.jsonl` (runs 2 and 3; check `sessionId` and line counts).
- `--resume <id>` from a different cwd succeeds and writes no new transcript under the new cwd's project dir (run 3).
- Unknown well-formed id: exit 1, stdout one `result/error_during_execution` line with `errors[0]` and no `init`, stderr has the same message (run 4).
- Non-uuid value with `-p`: exit 1 with the "valid session ID or session title" message and a fresh `session_id` in the result line (run 5).
- `--fork-session` creates a new id and a new file and leaves the original file unchanged (run 6).
- `--no-session-persistence` writes no file under `~/.claude/projects/` but still writes `security/` and `session-env/` entries, and the session cannot be resumed (runs 7, 8).
- Project dir encoding uses the symlink-resolved cwd (`-private-var-...`), with `/ . _` mapped to `-`.
- The stdout of a resumed turn contains only the new turn (no replay).

# 03 Real sessions: structure of the vault session dir

Scope: structure only (key names, types, counts, sizes). No message text, titles or tool output was copied. Probed 2026-11-15 with `python3 -I` scripts that parse each `.jsonl` line and print only counts, key names and `type(value)` / `len(value)`. Claude Code CLI 2.1.325. `<vault>` is the owner's main vault, `~` the home dir.

Session dir: `~/.claude/projects/<vault-path-encoded>/`. The encoding replaces every non-alphanumeric character with `-` (observed on the sibling dir names below; the docs state the same rule for the scratchpad `<project>` segment, https://code.claude.com/docs/en/claude-directory.md, section "Session scratchpad directory").

## 1. Inventory

| Item | Value | Evidence |
|---|---|---|
| Top-level `*.jsonl` session files | 31 | `find ./<dir> -maxdepth 1 -name '*.jsonl'` count |
| Entries in dir other than those files | 4 subdirs: 3 UUID-named session dirs and `memory/` (3 md files) | `find -type d`, per-dir `find -type f` shapes |
| Size min / median / max | 74,776 B / 495,655 B / 4,380,713 B | `os.path.getsize`, sorted |
| Whole dir | about 55 MB listed by `ls -la`; the jsonl part is 28.2 MB across 9,487 lines | `ls` total, sum of line lengths |
| mtime range | 2026-10-26 to 2026-11-15 | `os.path.getmtime` |
| First to last event timestamp | 2026-10-25 to 2026-11-15 | min/max of `timestamp` fields |
| Lines per file min / median / max | 26 / 57 / 2,114 (total 9,487) | line count per file |
| Longest single line | about 140,601 chars (re-serialized length) | max `len(json.dumps(row))` |
| Every line parses as JSON | yes, 0 `BAD` rows in 31 files | parse loop |

Most files are tiny: 16 of the 31 have under 110 lines. The four largest hold 4 MB, 3.5 MB, 2.4 MB and 1.6 MB.

Byte share by line `type` over the 28.2 MB: `attachment` 33.6%, `user` 17.6%, `assistant` 17.5%, `api-request-blob` 12.4%, `api-request-shape` 9.9%, `api-request` 5.4%, `system` 1.1%, `queue-operation` 0.8%. So the part a chat history needs (`user` + `assistant`) is about 35% of the bytes. A reader that streams lines and skips the other types touches far less than the file size.

## 2. Line types and their keys

Types seen (counts over all 31 files, from per-file `Counter`): `user`, `assistant`, `attachment`, `system`, `queue-operation`, `last-prompt`, `ai-title`, `custom-title`, `mode`, `permission-mode`, `session-owner`, `bridge-session`, `atis-latch`, `file-history-snapshot`, `file-history-delta`, `tools-used`, `cost-state`, `api-request`, `api-request-shape`, `api-request-blob`, `frame-link`, `artifact-comment-monitor`, `artifact-autoreact-ledger`.

Conversation lines (`user`, `assistant`, `attachment`, `system`) share these top-level keys: `parentUuid` (string or null), `isSidechain` (bool), `uuid`, `timestamp` (24-char ISO string), `userType`, `entrypoint`, `cwd`, `sessionId`, `version`, `gitBranch`, `type`. Message lines add `message` (`{role, content}`).

- `user` adds `promptId`, `permissionMode`, `promptSource`, `turnOrigin`, `turnPosition` (dict of 2 keys). `message.content` is a string for a typed prompt, or a list of blocks: seen `tool_result` (142 lines in one cli file), `text`, `image`+`text`.
- `assistant` adds `requestId`, `requestRef`, `requestedModel`, `thinkingDurationMs`, `thinkingDisplay`, `apiBlockIndex`, `effort`, `perTurnEffort`, `madeBy`, `advisorModel`, `promptCacheRequested`.
- `system` has `subtype`. Seen subtypes in cli files: `stop_hook_summary`, `turn_duration`, `away_summary`, `informational`, `bridge_status`, `local_command`, `compact_boundary`. sdk-cli files only had `stop_hook_summary`.
- `attachment` carries an inner `attachment.type`. Seen in the first lines of a panel-style file: `hook_success`, `hook_system_message`, `hook_additional_context`, `environment`, `model`, `deferred_tools_delta`, `agent_listing_delta`.
- Bookkeeping lines carry `sessionId` but none of the conversation keys: `last-prompt` {`lastPrompt`, `leafUuid`}, `mode` {`mode`}, `permission-mode` {`permissionMode`}, `ai-title` {`aiTitle`}, `custom-title` {`customTitle`}, `session-owner` {`accountUuid`, `organizationUuid`}, `bridge-session` {`bridgeSessionId`, `lastSequenceNum`, owner ids}, `cost-state` {`totalCostUSD`, durations, `modelUsage`, ...}.
- `api-request*` lines hold request shapes, hashes and blobs (about 28% of bytes combined, no chat value).

A message tree, not a flat log: `parentUuid` links each line to its predecessor, and `last-prompt.leafUuid` names the current leaf. `isSidechain` was `false` on every `user`/`assistant`/`attachment`/`system` line of the 31 top-level files (0 true).

## 3. Which fields identify who wrote a session

`entrypoint`, `userType`, `version`, `promptSource` and `turnOrigin` were read per file and tabulated by `entrypoint`. First `entrypoint` value in the file is stable for the whole file (one value per file observed).

| `entrypoint` | Files | `promptSource` on `user` | `turnOrigin` | `permissionMode` values | Has `mode` / `permission-mode` lines | Versions |
|---|---|---|---|---|---|---|
| `cli` (interactive terminal) | 14 | `typed` 136, `queued` 16, `system` 38 | `human` 167, `peer` 20, `task_notification` 11 | `auto` | yes | 2.1.301 to 2.1.322 |
| `sdk-py` (Python script) | 14 | `sdk` | `sdk` | `default` | no | 2.1.312, 2.1.318 |
| `sdk-cli` (`claude -p`) | 2 | `sdk` | `sdk` | `bypassPermissions` | no | 2.1.325 |
| `t3-code` (T3 Code host) | 1 | `sdk` | `sdk` | `bypassPermissions` | `mode` only | 2.1.321 |

`userType` is `external` on every line of every file, so it discriminates nothing. `isSidechain` is `false` everywhere at top level.

A terminal session versus a Kokobrain panel session: the panel runs `claude -p --output-format stream-json ... --permission-mode bypassPermissions` (spec lines 13-14, 20), so the matching signature is `entrypoint = "sdk-cli"` + `promptSource = "sdk"` + `turnOrigin = "sdk"` + `permissionMode = "bypassPermissions"` + no `mode`/`permission-mode` lines. The two `sdk-cli` files at 2.1.325 match this exactly (both lines carry `cwd` equal to the vault root, 46 chars). Caveats:
- Entry point is not set by Kokobrain. `grep -rn ENTRYPOINT src-tauri/src/commands/claude/*.rs` returns nothing, so the value comes from the CLI. In the 2.1.325 binary, `sdk-cli`, `sdk-ts` and `sdk-py` are all mapped to the telemetry class `claude_code_sdk`, and a helper tests `CLAUDE_CODE_ENTRYPOINT` for those three (`grep -a -o '.\{200\}"sdk-cli".\{200\}'` on `~/.local/share/claude/versions/2.1.325`). Which rule gives `-p` the value `sdk-cli` when the env var is unset: UNVERIFIED.
- `sdk-cli` is shared with any other `claude -p` caller in the same cwd (see section 7: 333 such files live in a sibling dir). The entrypoint alone cannot prove "written by the Kokobrain panel".
- Whether the 2 `sdk-cli` files are panel turns or owner probes: UNVERIFIED (each has 1 user prompt, short text, 26 and 50 lines).
- The session id in `.scratch/claude-code-integration/research/stream-json-capture/turn.ndjson` is not a file in this dir (0 name matches), so that capture ran elsewhere or was removed.

Implication for a history feature: the app should store the session ids it creates (it learns them from `system/init`, `src-tauri/src/commands/claude/stream.rs:130,144`) rather than infer "mine" from transcript fields.

## 4. Title or summary lines

Two title line types exist, both append-only and repeated:
- `ai-title` {`aiTitle`, `sessionId`}: generated by the CLI. In one 1,788-line cli file it appears 73 times (first at line index 36, first user prompt at index 8) and all 73 hold one identical value of 33 chars. So it is re-appended periodically, and the last one wins (or any, when stable). Counts in the biggest files: 56, 83, 73 occurrences.
- `custom-title` {`customTitle`, `sessionId`}: set by a host that names the session. Only the 1 `t3-code` file has it (14 occurrences).
- `last-prompt` {`lastPrompt`, `leafUuid`}: 374 lines have `lastPrompt`, 80 do not. Longest `lastPrompt` seen is 201 chars, so it looks truncated to about 200 plus one char (UNVERIFIED whether the cap is exactly 200 and whether the extra char is an ellipsis).

Coverage by file (a file counts when it has at least one such line):

| Group | Files with `ai-title` | With `custom-title` | With neither |
|---|---|---|---|
| `cli` (14) | 12 | 0 | 2 |
| `sdk-py` (14) | 14 | 0 | 0 |
| `sdk-cli` 2.1.325 (2) | 0 | 0 | 2 |
| `t3-code` (1) | 0 | 1 | 0 |
| Sibling dir, `sdk-cli` 2.1.270 (333) | 332 | 0 | 1 |

So the two newest `sdk-cli` files, the shape the panel produces, have no title line, while older 2.1.270 `sdk-cli` files nearly always do. Why: UNVERIFIED (candidates: version change, or title generation being skipped for bypass-permission / short sessions). A panel history list cannot rely on `ai-title`; fall back to `lastPrompt` (field absent on 80 of 454 such lines) or to the first user message. The binary contains the strings `ai-title` (11 hits) and `custom-title` (27 hits) by `grep -a -o -c`; the rules that write them were not traced.

## 5. Lines before the first user message

Count of lines (0-based index of the first non-meta `user` line whose content is a string or has a `text` block):

| Group | Min | Median | Max |
|---|---|---|---|
| `cli` | 5 | 8 | 13 |
| `sdk-py` | 2 | 2 | 2 |
| `sdk-cli` 2.1.325 | 7 | 7 | 7 |
| `t3-code` | 7 | 7 | 7 |

The 7 lines in an `sdk-cli` 2.1.325 file, in order, by type: `session-owner`, `queue-operation` (enqueue), `queue-operation` (dequeue), then 4 `attachment` lines with subtypes `hook_success`, `hook_system_message`, `hook_success`, `hook_additional_context`, then the `user` line. The attachment lines come from the owner's SessionStart-style hooks, so the count depends on the user's hook setup and is not stable across machines. A reader must scan by `type`, not by line index. After the user line come `attachment` lines for `environment`, `model`, `deferred_tools_delta`, `agent_listing_delta`.

## 6. Subagent and sidechain files

Three of the 31 sessions have a same-named subdir (a fourth dir, `memory/`, is not a session):

| Session dir | Files | `subagents/*.jsonl` | Other |
|---|---|---|---|
| A (cli) | 51 | 20 | 11 `tool-results/*.txt` |
| B (cli) | 250 | 123 (3 workflow dirs: 120 agent files + 3 `journal.jsonl`) | `workflows/wf_*.json` (3), `workflows/scripts/*.js` (2) |
| C (cli) | 1 | 0 | 1 `tool-results/*.txt` |

- 163 subagent `.jsonl` files hold 24,558 lines (more than the 9,487 lines of the main files). Their `user`/`assistant` lines have `isSidechain = true` (10,732 lines) and `entrypoint = cli`.
- Each `agent-<id>.jsonl` has a sibling `agent-<id>.meta.json` with keys `agentType`, `description`, `finished` (bool), `isBuiltIn`, `model`, `pickedEffortModel`, `requestNonInteractive`, `requestShape`, `spawnDepth` (int), `toolUseId`. 20 meta files read, all with that same key set.
- No sidechain, subagent or workflow file exists for the 2 `sdk-cli` panel-shaped sessions (the subdirs belong to cli sessions only), but the panel runs with every tool, so a panel turn that uses the Task tool would produce `<session>/subagents/` the same way (inferred from the docs table, UNVERIFIED on this machine).
- Docs: subagent transcripts are "removed with the parent session transcript when it ages out" (https://code.claude.com/docs/en/claude-directory.md, "Cleaned up automatically").

A history reader that only lists top-level `*.jsonl` files never sees sidechains, and the main file already holds the Task tool call and its result.

## 7. Sibling dirs (subfolder cwds)

`ls ~/.claude/projects | grep '^<encoded vault>'` returns 4 names: the vault dir itself plus 3 siblings. Each sibling is a project dir for a cwd below the vault root (name = vault name plus an encoded subpath).

| Sibling | Subpath segments | Session files | Entry point | Versions | mtime range |
|---|---|---|---|---|---|
| S1 | 4 (under a hidden `.claude` folder of the vault) | 333 | `sdk-cli` (all) | 2.1.270 | 2026-10-27 to 2026-11-05 |
| S2 | 1 | 1 | `sdk-py` | n/a | 2026-11-05 |
| S3 | 6 | 1 | `sdk-py` | n/a | 2026-11-05 |

S1 sizes: min 82,671 B, median 148,483 B, max 443,267 B. Each S1 file has exactly 1 user prompt line, and 332 of 333 have an `ai-title`. This is a batch of one-shot `claude -p` runs launched by a script from a vault subfolder, not chat sessions.

Two consequences:
- The vault dir does not contain sessions started from a vault subfolder. Resume looks up the session file by the cwd-encoded dir, so the panel must keep `cwd = <vault>` (already true, spec line 13) and a history list for the vault must read only the vault dir.
- The panel's own sessions share the vault dir with terminal sessions run at the vault root (14 `cli` + 14 `sdk-py` + 1 `t3-code` + 2 `sdk-cli`). A history list needs an ownership filter (section 3).

Also, within a session file, `cwd` on lines is not constant: 2,266 of 5,293 lines carry a cwd other than the vault root (tool calls changed directory, one system line had a 110-char cwd). The project dir comes from the starting cwd, so `cwd` on a line is not a reliable key for grouping.

## 8. Retention

- `~/.claude/settings.json`: top-level keys are `agentPushNotifEnabled`, `autoMode`, `deniedMcpServers`, `effortLevel`, `enabledPlugins`, `extraKnownMarketplaces`, `hooks`, `model`, `modelSettings`, `permissions`, `promptCacheTtl`, `skipDangerousModePermissionPrompt`, `skipWorkflowUsageWarning`, `statusLine`, `theme`, `tui`, `verbose`. `cleanupPeriodDays` is not set.
- Also not set in `~/.claude/settings.local.json` (keys: `permissions`), `<vault>/.claude/settings.json` (keys: `enableAllProjectMcpServers`, `enabledMcpjsonServers`, `permissions`) and `<vault>/.claude/settings.local.json`.
- Default: "The default is 30 days and the minimum is 1; setting `0` fails with a validation error" (https://code.claude.com/docs/en/claude-directory.md, "Cleaned up automatically"). Deletes `projects/<project>/<session>.jsonl`, `<session>/subagents/`, `<session>/tool-results/` and more once older than the period, "as long as it can safely determine the retention period".
- The oldest file here is dated 2026-10-26, 20 days before today (2026-11-15), so nothing in the data contradicts or confirms the 30 days default. First purge would hit the oldest sessions around 2026-11-25 (arithmetic, not observed).
- The binary has the validation text "cleanupPeriodDays must be at least 1. To keep transcripts for a long time, set a large number (e.g. 3650 for ~10 years). To disable transcript writes entirely, remove this setting" (grep -a on the 2.1.325 binary, 37 occurrences of the key name).
- `claude -p --no-session-persistence` skips writing a transcript (docs, "Plaintext storage"), which would defeat `--resume`.
- Implication: CLI-side history is capped at 30 days for the owner unless a large `cleanupPeriodDays` is set. An app-side chat store would not expire. Resuming an id whose file was swept would fail; the failure mode of `--resume` with a missing id was not tested here.

## Open questions

1. Are the 2 `sdk-cli` files in the vault dir real panel turns? A way to settle it: run one panel turn and diff the dir listing.
2. Why do the 2.1.325 `sdk-cli` files have no `ai-title` while 332 of 333 2.1.270 `sdk-cli` files do? Needs a controlled `claude -p` run at 2.1.325 with a longer or multi-turn session.
3. What does `claude -p --resume <id>` do when the transcript file was purged, and does it append to the same file or create a new one (`.orphaned-*`, `.superseded-*` names appear in the docs table)?
4. Which rule sets `entrypoint` to `sdk-cli` for `-p` (env var versus a code path), and would a Kokobrain-set `CLAUDE_CODE_ENTRYPOINT` value (a custom string) be accepted and written to the transcript? That would give a clean ownership tag. The bundle shows a closed set check (`Eqo` map), so a custom value may be ignored.
5. Is `lastPrompt` truncated at exactly 200 chars?
6. Do panel turns that call the Task tool write `<session>/subagents/` in the vault dir (inferred, not observed)?

## Claims to verify

1. The vault dir holds 31 top-level session files with min/median/max size 74,776 / 495,655 / 4,380,713 bytes and 9,487 total lines.
2. `userType` is `external` on every line, so only `entrypoint` (`cli`, `sdk-py`, `sdk-cli`, `t3-code`) plus `promptSource`/`turnOrigin` separate terminal from `-p` sessions.
3. The two 2.1.325 `sdk-cli` files have 7 lines before the first user line (`session-owner`, 2 `queue-operation`, 4 hook `attachment`), and the count varies with the user's hooks.
4. `ai-title` lines are repeated (73 identical values in a 1,788-line file) and absent from both 2.1.325 `sdk-cli` files; `custom-title` appears only in the `t3-code` file.
5. `isSidechain` is `false` on all top-level conversation lines; the 163 subagent files carry `isSidechain = true` and live under `<session>/subagents/` with a `.meta.json` of 10 keys.
6. There are exactly 3 sibling dirs with the vault name as prefix (333, 1 and 1 files), one holding 333 `sdk-cli` 2.1.270 one-shot sessions.
7. `cleanupPeriodDays` is unset in the 4 settings files checked, so the documented 30-day default applies.
8. `user` + `assistant` lines are about 35% of the jsonl bytes; `api-request*` lines are about 28%.

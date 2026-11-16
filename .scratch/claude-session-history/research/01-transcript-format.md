# Research 01: the Claude Code session transcript format (claude 2.1.325)

Scope: where `claude` writes a session, how the directory is named, which line types exist, what a `-p` session looks like, where subagents go. Structure only: no message text, titles, prompts or tool output is quoted here.

## How the evidence was gathered

- **Bundle dump.** The CLI is one Bun binary (`~/.local/share/claude/versions/2.1.325`, 347 MB, version string `2.1.325` inside). `grep -a` on it is too slow, so I ran `strings -n 6 <binary> > <tmp>/b.txt` (79 MB, 498k lines) and searched that with Python. Citations below read "bundle: `<identifier or literal>`" and are reproducible with `grep -o` on the dump. Identifiers are minified and can change between releases.
- **Real transcripts.** `~/.claude/projects/<encoded vault>/` (the owner's main vault): 31 top-level `*.jsonl` (9,487 lines, 28.3 MB, 0 unparsable lines), 140 subagent files, 13 tool-result files. I printed only key names, JSON types, enum values and counts.
- **Repo.** `src-tauri/src/commands/claude/turn.rs` and the spec.
- Entry points seen in the vault dir (field `entrypoint`): `cli` 14 files (interactive), `sdk-py` 14, `sdk-cli` 2 (print mode), `t3-code` 1. Only the 2 `sdk-cli` files are `claude -p` sessions, so the print-mode section rests on a small sample.

## 1. Where the file lives

| Item | Rule | Evidence |
|---|---|---|
| Root | `<config dir>/projects`, config dir = `$CLAUDE_CONFIG_DIR` if set, else `~/.claude` | bundle: `function ah(){return S(Ge(),"projects")}`; `process.env.CLAUDE_CONFIG_DIR` read in 21 places. Defaulting to `~/.claude` is UNVERIFIED in code (`Ge`), but matches the real tree. |
| Session file | `<root>/<encoded cwd>/<sessionId>.jsonl` | bundle: `S(Hv(o),`${e}.jsonl`)`; `fm(){return i(b5(),`${G()}.jsonl`)}`. Real dir: 31 files named `<uuid>.jsonl`. |
| Session id | A UUID. A resume keeps the same id and appends to the same file, unless `--fork-session` is passed | `claude --help`: "--fork-session: When resuming, create a new session ID instead of reusing the original". Sampled files never had a `sessionId` different from the file name (0 mismatches in 31 files). I did not run a resume here, so "append to the same file" is inferred from the help text and the no-mismatch check. |
| Subagents | `<root>/<encoded cwd>/<sessionId>/subagents/agent-<agentId>.jsonl` (see section 5) | bundle: `Rvt(){return i(b5(),G(),"subagents")}`, `yh(t)`. |
| Large tool output | `<root>/<encoded cwd>/<sessionId>/tool-results/<id>.txt` (13 files, all `.txt`) | Real dir listing. Purpose is inferred from the name; `toolUseResult` carries `persistedOutputPath` and `persistedOutputSize` keys on 1 Bash result. |
| Disable | `--no-session-persistence` ("sessions will not be saved to disk and cannot be resumed (only works with --print)") | `claude --help`. The repo does not pass it (`turn.rs` args at lines 100-101 only add `--resume`), so panel turns are persisted. |

The loader finds a session for `--resume <id>` by trying, in order (bundle: `die`): the project dir of the canonicalized cwd, a link-scan dir, other dirs of the same project (`xWe`), sibling worktree project dirs (`crossWorktree`). A separate fallback (`kEn`) scans every dir under `projects/` for `<id>.jsonl` and accepts it only when exactly one matches. So a resume from another cwd works only through those fallbacks; the panel always spawns with `current_dir(vault_path)` (`turn.rs:122`).

## 2. cwd to directory name

Rule, from the bundle:

```
sanitize(p)   = p.replace(/[^a-zA-Z0-9]/g, "-")
dirName(p)    = sanitize(p).length <= 200 ? sanitize(p)
              : sanitize(p).slice(0,200) + "-" + Math.abs(hash(p)).toString(36)
hash(s)       = h = 0; for each UTF-16 unit c: h = ((h << 5) - h + c) | 0     // Java-style 31 hash
```

- Evidence: bundle `function k(e){return e.replace(/[^a-zA-Z0-9]/g,"-")}`, `var vDe=200` (exported as `MAX_SANITIZED_LENGTH`), `function WH(e){let n=k(e);if(n.length<=vDe)return n;return`${n.slice(0,vDe)}-${Oe(e)}`}`, `function Oe(e){return Math.abs(AX(e)).toString(36)}`. `AX` is imported from another chunk; the bundle's first chunk defines `function AX(t){let e=0;for(let n=0;n<t.length;n++)e=(e<<5)-e+t.charCodeAt(n)|0;return e}`. That the `Oe` call resolves to this `AX` is likely, not proven (minified names are per chunk). The Bun build may use a different hash than a Node build.
- **Every character outside `[a-zA-Z0-9]` becomes `-`**: `/`, `.`, `_`, space, `-` itself, `@`, and each non-ASCII letter (per UTF-16 unit). The mapping is lossy; a directory name cannot be decoded back to a path.
- **Verified on real names** (`ls ~/.claude/projects`, 672 dirs):
  - `/` gives `-`: `-Users-<user>-kokobrain-vaults-<vault name>` for `~/kokobrain-vaults/<vault name>`.
  - A dot gives `-`, so `/.x` gives `--x`: `-Users-<user>-Dev-pet-projects-koko-brain--claude-worktrees-<name>` for `.../brain/.claude/worktrees/<name>`; `-Users-<user>--t3-worktrees-...` for `~/.t3/worktrees/...`.
  - Hyphen stays a hyphen, so `a-b` and `a/b` collide.
- **Underscore and space: UNVERIFIED on a real directory.** I found no existing project dir whose real path contains `_` or a space (the vault's `_system` folder has no sessions). The regex above covers them by construction.
- **The >200 char branch is UNVERIFIED on disk**: the longest name among the 672 dirs is 149 characters.
- **The cwd is canonicalized before encoding.** bundle: `GE` (`canonicalizePath`) is applied before `Hv`/`Q0` in `die`. On disk: `/tmp` is a symlink to `private/tmp` here (`ls -ld /tmp`), and the project dirs for processes started in `/tmp/...` are named `-private-tmp-...` (0 dirs start with `-tmp-`). A vault reached through a symlink therefore maps to its real path's name. The repo passes `request.vault_path` as is (`turn.rs:122`), so the app must `realpath` the vault before building the name.
- An env override exists: `Q0(e){return eor()??WH(e)}` (bundle). What `eor` reads is UNVERIFIED; treat the computed name as the default only.
- The `cwd` field inside each line records the process cwd. In the 2 `sdk-cli` files, one had every `cwd` equal to the vault, the other had some lines with a different `cwd` (cause not examined); so `cwd` per line may not be constant. Use the directory name, not line `cwd`, to find sessions.

## 3. Line types (top level `type`)

The loader classifies types into four policies (bundle: the map `q6o` and `V6o(type)`):

| Policy | Types in the bundle map |
|---|---|
| `transcript` (conversation rows) | `user`, `assistant`, `system`, `attachment` |
| `boundary-cleared` | `progress`, `file-history-snapshot`, `file-history-delta`, `last-prompt`, `continued-in`, `resume-head-vouch`, `api-request`, `api-request-blob`, `api-request-shape` |
| `accumulate` | `content-replacement`, `data-flow-records`, `data-flow-incomplete`, `fork-context-ref`, `frame-link`, `artifact-comment-monitor`, `memory-mode`, and any unknown type (default) |
| `last-wins` | `summary`, `custom-title`, `ai-title`, `ended-by-model`, `tag`, `relocated`, `agent-name`, `agent-color`, `agent-setting`, `pr-link`, `artifact-autoreact-ledger`, `bridge-session`, `history-suppression`, `attribution-snapshot`, `mode`, `permission-mode`, `isolation-latch`, `session-owner`, `dev-mods`, `atis-latch`, `tools-used`, `worktree-state`, `cost-state`, `queue-operation`, `observer-ref`, `derived-from`, `repl-mode` |

Counts below are from the 31 vault files (9,487 lines). Key lists are what appeared, not a schema.

### Conversation rows

Common keys on `user`, `assistant`, `attachment`, `system`: `uuid`, `parentUuid` (string or `null`), `isSidechain` (bool), `timestamp` (ISO string), `sessionId`, `cwd`, `version` (`2.1.325`), `gitBranch`, `userType` (always `external`), `entrypoint`.

- **`assistant`** (1,615): `message` is an Anthropic message object (`id`, `model`, `role`, `content`, `stop_reason`, `usage`, plus `container`, `stop_details`, `diagnostics`, `context_management`, ...). Extra keys seen: `requestId`, `requestedModel`, `effort`, `apiBlockIndex`, `thinkingDurationMs`, `attributionSkill`, `attributionPlugin`, `attributionMcpServer`, `attributionMcpTool`, `isAbortedMidStream` (1 row), `wireToolInputs`.
  - **One line per content block.** Lines for one API response share `message.id`; each line holds a single block in `message.content`. Lines per `message.id`: 1 (237 ids), 2 (330), 3 (188), up to 6. Block types seen: `thinking` 533, `text` 331, `tool_use` 751. A reader must group by `message.id` to rebuild one reply.
  - `stop_reason`: `tool_use` 1,327, `end_turn` 284, `null` 4 (a row written before the stop reason arrived).
  - Thinking blocks exist in the file (533), so do not render a file replay without filtering them.
- **`user`** (1,050): `message.role` is `user`; `message.content` is a string (269) or an array (781). Array blocks seen: `tool_result` 751, `text` 30, `image` 2. Extra keys: `promptId`, `permissionMode`, `promptSource` (`typed`, `queued`, `system`, `sdk`), `turnOrigin` (`human`, `task_notification`, `sdk`, `peer`), `turnPosition`, `origin` (object with `kind`: `human`, `task-notification`, `peer`), `isMeta`, `isCompactSummary`, `isVisibleInTranscriptOnly`, `toolUseResult`, `sourceToolAssistantUUID`, `permissionDecision`, `toolDenialKind`, `interruptedMessageId`, `toolEndsTurn`, `imagePasteIds`.
  - A tool result is a `user` row with a `tool_result` block (`tool_use_id`). Its sibling key `toolUseResult` is the structured result: a dict (639), a string (73) or a list (39). Keys per tool, from the data: Bash `stdout`, `stderr`, `interrupted`, `isImage`, `noOutputExpected`; Edit `filePath`, `oldString`, `newString`, `originalFile`, `structuredPatch`, `userModified`, `replaceAll`; Write `type`, `filePath`, `content`, `structuredPatch`, `originalFile`; Read `type`, `file`; Grep `mode`, `numFiles`, `filenames`, `content`, `numLines`; Agent `isAsync`, `status`, `agentId`, `description`, `resolvedModel`, `prompt`, `outputFile`, `canReadOutputFile`, `canContinueAgent`. **Edit and Write results embed whole file contents** (`originalFile`, `content`), so a history reader must not load `toolUseResult` into the UI.
  - Slash commands (interactive `cli` files only, 26 rows; none in the 2 `-p` files, so the `-p` shape is UNVERIFIED): a non-meta user row whose string content is wrapped in the tag sets `command-message` + `command-name` (+ `command-args`, + `skill-format` once), followed by a `isMeta: true` user row (list of `text` blocks, `parentUuid` = the command row) that carries the expanded body. Other wrapper tags on user rows: `local-command-caveat` (meta), `local-command-stdout`, `bash-input`, `bash-stdout`, `task-notification`, `system-reminder` (meta). A reader that shows user text must drop or reshape these.
- **`attachment`** (2,227, 33.6% of all bytes): key `attachment` is an object with its own `type`. Seen: `hook_success` 1,380, `deferred_tools_record` 201, `environment` 154, `prompt_snapshot` 63, `date`, `model`, `skill_listing`, `instructions`, `session_context`, `queued_command`, `command_permissions`, `edited_text_file`, `invoked_skills`, `skill_mention`, `file`, `compact_file_reference`, `structured_output`, and about 15 more. Some carry `rendered`/`renderedRole`. These are context injections, not chat; skip them.
- **`system`** (401): `subtype` plus `content`/`level`. Seen: `stop_hook_summary` 189, `turn_duration` 183 (`durationMs`, `messageCount`), `away_summary` 18, `local_command` 5, `informational` 3, `bridge_status` 2, `compact_boundary` 1. `turn_duration` marks the end of a turn.
- **Compact boundary** (`system` / `compact_boundary`): `parentUuid` is `null`, `logicalParentUuid` points at the pre-compact tail, and `compactMetadata` has `trigger`, `preTokens`, `postTokens`, `durationMs`, `cumulativeDroppedTokens`, `preCompactDiscoveredTools`, `preservedSegment`, `preservedMessages`. The next `user` row has `isCompactSummary: true` and `isVisibleInTranscriptOnly: true` (the summary text). Messages before the boundary stay in the file. bundle: `h5t=Buffer.from('"compact_boundary"')`, `uie=5242880`, `J8r=1048576`. Only 1 boundary in the sample, so the field list is thin.
- **Parent links.** 29 of 31 files have at least one `uuid` with more than one child (parallel tool calls give each tool-result row its own parent, and attachments hang off rows). A file-order replay is therefore not a tree walk. The CLI's own loader keeps, among non-sidechain rows, the one with the greatest `timestamp` as the leaf (bundle: `Lo=Ko.uuid,to=Ko.timestamp` guarded by `!Ko.isSidechain`) and also reads `last-prompt.leafUuid`. It also bridges `progress` rows by rewriting `parentUuid` through a skip map (bundle: `zr.set(Ko.uuid, ...)`). No `progress` rows occurred in the sample.

### Metadata rows (no `uuid`; carry `sessionId`)

| `type` | Keys | Notes |
|---|---|---|
| `last-prompt` (454) | `lastPrompt`, `leafUuid`, `explicit` | `lastPrompt` is the last typed prompt, whitespace-collapsed, cut at 200 chars plus an ellipsis (bundle: `normalizeLastPrompt`). Rewritten many times (not only at the end). |
| `ai-title` (339) | `aiTitle` | Model-generated title. 12 files had 1 to 83 copies, always 1 distinct value per file. |
| `custom-title` (14) | `customTitle` | User rename (bundle: `saveCustomTitle`, event `tengu_session_renamed`). Seen in the 1 `t3-code` file. |
| `tag`, `agent-name`, `agent-color`, `agent-setting`, `relocated`, `pr-link` | one value key each | Written by the bundle's re-append function; none in the sample except as listed above. `pr-link` also has `prNumber`, `prUrl`, `prRepository`, `timestamp`. |
| `summary` | `leafUuid`, `summary` | Legacy compaction summary; the loader still reads it (bundle: `Ko.type==="summary"&&Ko.leafUuid`). 0 occurrences in the 2.1.325 sample. |
| `mode`, `permission-mode` | `mode` / `permissionMode` | `permissionMode` values seen in rows: `auto`, `default`, `bypassPermissions`. |
| `queue-operation` (223) | `operation` (`enqueue`, `dequeue`, `remove`), `content`, `timestamp`, ... | Input queue. `enqueue` rows carry the queued text. |
| `session-owner` (170) | `accountUuid`, `organizationUuid` | Account ids. Do not copy. |
| `cost-state` (40) | `totalCostUSD`, `totalAPIDuration`, `totalToolDuration`, `totalLinesAdded`, `totalLinesRemoved`, `totalDuration`, `startTime`, `modelUsage`, `hasUnknownModelCost` | Cumulative per session. Last one wins, so the session total cost is readable from the tail. |
| `tools-used` (88), `atis-latch` (439), `bridge-session` (88) | `tools` (names) / `atis` / `bridgeSessionId`, ... | Internal state. |
| `file-history-snapshot` (187) | `messageId`, `snapshot` {`messageId`, `trackedFileBackups` (dict), `timestamp`}, `isSnapshotUpdate` | Checkpoint data for the CLI's rewind. Interactive sessions only in the sample. `file-history-delta` (23): `messageId`, `snapshotMessageId`, `trackingPath`, `backup`, `timestamp`. |
| `api-request` (811), `api-request-blob` (508), `api-request-shape` (45) | request digests, `params`, `hash`, `message`, `shape` | 27.7% of bytes combined; median `api-request-shape` line is 73 KB. Not chat. |
| `frame-link`, `artifact-autoreact-ledger`, `artifact-comment-monitor` | artifact bookkeeping | Not chat. |

**Metadata is re-appended near the end of the file.** bundle: `planReAppendSessionMetadata` rebuilds `last-prompt`, `custom-title`, `ai-title`, `tag`, `relocated`, `agent-name`, `agent-color`, `agent-setting`, `mode`, `permission-mode`, `session-owner`, `atis-latch`, `tools-used`, ... and appends them again. On disk, the last title row was within 2 to 31 lines of EOF in all 27 files that have one. The reason is that the CLI's lite reader looks only at a head and a tail window (bundle: `LITE_READ_BUF_SIZE` `Tk`, `extractFieldFromLastEntryOfTypeStrict`). So a session list can read a title from the tail without parsing the file; I did not measure the window size.

## 4. Print mode (`-p`) versus interactive

Entry point rule (bundle, `N(e)`): when `CLAUDE_CODE_ENTRYPOINT` is `cli` and the process is in print mode, it is set to `sdk-cli`; with no value set, print mode gives `sdk-cli` and interactive gives `cli`. The field is written on every conversation row. A panel turn that inherits another `CLAUDE_CODE_ENTRYPOINT` (for example `sdk-py`) would be labelled with it.

| Aspect | Interactive (`cli`, 14 files) | Print (`sdk-cli`, 2 files, 50 and 69 lines) |
|---|---|---|
| Persisted to disk | yes | yes (unless `--no-session-persistence`) |
| First lines | `last-prompt`, `mode`, `permission-mode`, ... (13 of 14) | `session-owner`, `queue-operation` x2, then attachments |
| `ai-title` | in 12 of 14 files | absent in both |
| `custom-title`, `mode`, `permission-mode` | `mode`/`permission-mode` in nearly all | absent |
| `file-history-snapshot` | 187 rows in 14 files | absent |
| `last-prompt` | in all | present (8 rows) |
| `user` row for the typed prompt | `promptSource: typed` | `promptSource`, `turnOrigin` and `turnPosition` present; `sdk` is the documented value for SDK input, and 23 `sdk` rows exist in the sample (mostly `sdk-py`). Exact value in the 2 `sdk-cli` files not read. |
| Bytes | `attachment` and `api-request*` dominate | same: attachments about 309 KB of about 500 KB per file; `user` + `assistant` about 7% |

Consequences: a `-p` session has no title row, so a list must use the first user prompt or `last-prompt`. A turn written by `--resume` extends the same file, so one file = one panel conversation (inferred, see section 1). `--name <name>` ("display name for this session") exists in `--help`; whether `-p` writes a `custom-title` for it is UNVERIFIED.

The `stream-json` output is not the transcript: the transcript has one `assistant` line per content block and no `stream_event` rows; the stdout stream has `message_start` ... `message_stop` events. The `session_id` in the `result` and `system/init` events is the file's base name.

## 5. Subagent sidechains

- Main transcript rows have `isSidechain: false` (5,293 of 5,293). Subagent rows have `isSidechain: true` (11,974 of 11,974, all in the subagent files).
- Path: `<project dir>/<sessionId>/subagents/agent-<agentId>.jsonl`, plus `agent-<agentId>.meta.json` next to it (bundle: `Rvt()`, `yh(t)`; real dir: 140 `.jsonl`, the same count of `.meta.json` files). Workflow subagents go one level deeper: `subagents/workflows/<workflow id>/agent-<agentId>.jsonl` (bundle: `agentTranscriptSubdirs`, `uBe`; real dir has `subagents/workflows/wf_*`).
- Inside a subagent file: first line is a `user` row (140 of 140); types `user`, `assistant`, `attachment`, `api-request*`; each conversation row has `agentId` (matches the file name), `sessionId` (equals the parent session id, 140 of 140), `parentUuid`; no metadata rows.
- `agent-*.meta.json` keys: `agentType`, `description`, `isBuiltIn`, `model`, `requestNonInteractive`, `requestShape`, `spawnDepth`, and either `workflowPhase` (120) or `toolUseId`, `finished`, `pickedEffortModel` (20).
- The link from the main file is the Agent tool call: its `toolUseResult` has `agentId`, `outputFile`, `description`; the sidechain `meta.json` has `toolUseId`. The main file never contains the subagent's messages.
- Other session siblings: `<sessionId>/tool-results/*.txt`, `<sessionId>/workflows/scripts`.
- A panel that replays history can ignore `<sessionId>/` entirely; only the top-level `<sessionId>.jsonl` holds the conversation.

## 6. Reader checklist for the chat-restore feature

Facts the implementation must respect, each traced above:

1. Find the dir with the same `[^a-zA-Z0-9]` to `-` rule on the realpath of the vault, plus the 200-char hash branch for long paths (or list `projects/` and read each file's `cwd` if the name logic is too fragile).
2. Parse line by line; keep only `type` in `user`, `assistant`; drop `isSidechain: true`, `isMeta: true`, `isCompactSummary` rows, `attachment`, `system`, and all metadata types. Treat unknown types as ignorable (the CLI's own default for an unknown type is "accumulate", not "error").
3. Group `assistant` lines by `message.id`; block types are `text`, `thinking`, `tool_use`. Join `tool_result` blocks to `tool_use` by `tool_use_id`. Never read `toolUseResult` (whole files inside).
4. User text may be wrapped in `command-*`, `local-command-*`, `bash-*`, `task-notification` tags.
5. Lines can be large (p99: 99 KB for `attachment`, 40 KB for `user`; max 139 KB). A file is up to 4.4 MB for 2,114 lines in the sample. Stream, do not slurp.
6. The bundle's loader tolerates leading NUL bytes before a line (`while(e.charCodeAt(n)===0)n++` in `X6o`), a sign of torn writes. 0 NUL lines and 0 files without a final newline in the sample, but a file being written by a live turn can end in a partial line.
7. Titles: `ai-title` (interactive only), `custom-title`, `last-prompt.lastPrompt`; take the last of each.
8. A session resumed with `--resume` must be looked up under the same canonical cwd, or the fallbacks in section 1 apply.

## Open questions

- Does a `-p --resume <id>` turn append to the same file and keep the id? Inferred from `--help` and the 0-mismatch check; no resume run was made (it would write into the owner's session dir and spend tokens).
- What does a `-p` session write for a slash command (`/name args`) and for a turn killed by `killpg` (cancel)? No sample in the vault dir. `isAbortedMidStream` and `interruptedMessageId` exist but I did not map them.
- Are underscore, space and non-ASCII path characters mapped to `-` on disk? True by the regex; no real directory to confirm. Same for the 200-char hash branch and its hash function.
- What does `eor()` (an env or setting override of the project dir name) read?
- Size of the lite-reader head and tail window (`Tk`), which bounds how far from EOF a title can sit.
- Does `--name` write a `custom-title` in print mode?
- Does the owner's `CLAUDE_CONFIG_DIR` (or the login-shell env the panel passes) ever relocate `projects/`? Not set in the files seen.

## Claims to verify

1. The directory name is `cwd.replace(/[^a-zA-Z0-9]/g, "-")`, cut to 200 chars plus `-` plus a base-36 hash when longer, computed on the canonicalized (realpath) cwd.
2. One `assistant` line holds exactly one content block; lines of one response share `message.id`.
3. In 2.1.325 a `-p` session is written to `<projects>/<encoded cwd>/<sessionId>.jsonl` with `entrypoint: "sdk-cli"`, has no `ai-title`, `custom-title`, `mode`, `permission-mode` or `file-history-snapshot` rows, and has `last-prompt` rows.
4. Subagent messages live only in `<sessionId>/subagents/agent-<agentId>.jsonl` with `isSidechain: true`; the main file has `isSidechain: false` on every row.
5. `--resume <id>` without `--fork-session` reuses the id and appends to the same file.
6. `toolUseResult` of Edit and Write rows carries full file contents (`originalFile`, `content`).
7. Title rows (`ai-title`, `custom-title`) and `last-prompt` are re-appended within a few dozen lines of EOF.
8. `summary` rows (`leafUuid`, `summary`) are legacy and absent from 2.1.325 files, while `compact_boundary` plus an `isCompactSummary` user row is the current compaction form.

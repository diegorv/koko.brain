# Synthesis: panel chat history that survives a restart (feature B)

Completeness pass and synthesis over scout files 01 to 08 and `validate-format.md` / `validate-app.md`. Branch `mvp-claude` (HEAD `c8b646da6`), claude 2.1.325. Structure only: no message text, titles, prompts or tool output from `~` or `<vault>`. Probe prompts below were synthetic one-word requests in fresh `mktemp -d` dirs, never the vault.

## 1. Gaps found, and what this pass closed

Every agent-launched probe so far (04, 08) inherited the agent's `CLAUDE_CODE_ENTRYPOINT=t3-code`, SDK and proxy variables (validate-format, main finding). So no claim about a panel-shaped `-p` run had been observed. This pass re-ran the key probes in an emulated panel env: `env -i` with `HOME USER LOGNAME SHELL TMPDIR`, `PATH=/usr/bin:/bin:/usr/sbin:/sbin` and the 4 `INJECTED` vars, then `zsh -l -i -c` (`shell_env.rs:46,51-56,304-317`), `CLAUDECODE` and the injected vars unset, stdin `/dev/null`, the panel's flags (`turn.rs:89-97`) plus `--model haiku`. That login shell has 0 `CLAUDE*`/`ANTHROPIC*` variable names (`env | cut -d= -f1 | grep -cE` printed `count=0`). All probe files under `~/.claude/projects`, `session-env` and `security` were deleted after, and the listings diffed equal to the ones taken before.

| # | Gap | Result | Evidence |
|---|---|---|---|
| G1 | Panel-env transcript shape never observed | Closed. Entrypoint `sdk-cli` on all 23 rows, `promptSource` `sdk`, 0 `ai-title` rows, 38 lines after turn 1. stderr was empty (no connector warning). | Probe P1: `python3 -I` type/key counts of the new `<id>.jsonl` |
| G2 | Resume and append with `sdk-cli` | Closed. Same id on every stream line, hook `SessionStart:resume`, same file grew to 56 lines with 1 distinct `sessionId` and 2 user / 2 assistant rows. A `mode` row appeared after the resumed turn, so 01/03's "no `mode` row in `sdk-cli`" holds only for single-turn files. | Probe P2 |
| G3 | Unknown-id error shape in the panel env | Closed. Exit 1, exactly 1 stdout line: `result`, `error_during_execution`, `is_error` true, `num_turns` 0, `duration_ms` 0, `session_id` = the id asked, 1 `errors` string with prefix `No conversation found with session ID: `, no `result` key, no `system/init`. stderr: the same sentence. | Probe P3 |
| G4 | `--session-id` on a first `-p` turn | Closed. `system/init` (line 13 of 23, after 6 `hook_started` + 6 `hook_response`) and `result` carry exactly the passed UUID. Passing it again for an existing session: exit 1, 0 stdout lines, stderr `Error: Session ID <id> is already in use.` | Probes P1, P4 |
| G5 | How `--append-system-prompt` behaves on `--resume` (02, 08: UNVERIFIED) | Closed, and it is a live bug in today's panel. See section 2. | Docs + probe S1-S3 |
| G6 | Zero-turn error results other than "not found" | Partly closed. The bundle builds zeroed `error_during_execution` results for startup failures only when the host sets `CLAUDE_CODE_STARTUP_FAILURE_RESULTS` (the panel does not), and also for unrun turns (`reportUnrunTurnFailed`: `num_turns:0`) and for `turn_setup_failed`. 04 run 5 (a non-UUID `--resume`) gave `num_turns` 0 with a fresh id. So `is_error && num_turns == 0` alone does not mean "session gone". | `strings -n 6` bundle dump, grep for `startup_failure_reason`, `reportUnrunTurnFailed`, `turn_setup_failed` |
| G7 | A save hook at quit | Found. `prepareForExit` (`src/lib/core/vault/exit.service.ts:15-23`) runs before `confirm_exit` (`src/lib/app/tauri-listeners.service.ts:79-89`). It is in `core/`, so calling the claude feature from it would add a layer violation (CLAUDE.md layer rules, `layer-baseline.json` only shrinks). The listener in `src/lib/app/` is the place, if one is wanted. | Read both files |
| G8 | Privacy of committed scout files | Open. `03-real-sessions.md:112` contains the owner's encoded vault path with username, and `04-resume-probe.md:40` a full temp path. Both break this research's privacy rule and should be scrubbed before commit. | `grep -n` on the research dir |

Still not verified: what a killpg-cancelled `-p` turn leaves in the transcript and whether the next `--resume` works; whether a turn cancelled before `system/init` leaves a resumable file; how a CLI older than 2.1.257 reacts to `--system-prompt-snapshot`; the prompt-cache cost of that flag; whether auto-compaction emits a stream event; a turn launched by the real app (the probe emulates its env in a temp dir, so the vault's own `.claude/settings.json` and hooks were not in play).

## 2. New finding: later chips never reach a resumed turn

- Docs, CLI reference, "System prompt flags in resumed conversations": "Claude Code builds the system prompt once, on a conversation's first request, with the text from any system prompt flags applied, and records it in the session. Until the conversation is compacted, every later request uses that recorded prompt, including after you return to the conversation with `--resume` or `--continue`." `--system-prompt-snapshot off` rebuilds it on every request (v2.1.257+). The flag is in the 2.1.325 bundle (`--system-prompt-snapshot <on|off>`, 7 hits).
- Probe S1-S3 (temp dir, panel env): turn 1 with append text naming codeword A answered A; turn 2 `--resume` with append text naming codeword B still answered A; turn 3 `--resume` with B plus `--system-prompt-snapshot off` answered B.
- The panel passes the chips and the vault root only through `--append-system-prompt` on every turn (`turn.rs:66-81,106-108`, `claude.service.ts:38`). So today a note attached after the first message of a chat is never seen by Claude, and with restore the vault root in the prompt stays the one from turn 1. This affects the MVP now, not only history.

## 3. Confirmed facts

| Fact | Evidence |
|---|---|
| Chat, `sessionId` and chips live in memory only; restart gives `EMPTY_CHAT` plus the re-attached active note | `claude.store.svelte.ts:4-7,55-58`; validate-app 1 |
| `sessionId` comes from `Init` and `Result` and reaches the CLI only as `--resume` | `claude.logic.ts:124,153`; `claude.service.ts:37`; `turn.rs:100-102` |
| `ChatMessage` is already reduced: no thinking, 500-char tool summaries, 80-char targets | `claude.logic.ts:4-29,139-140,182-193`; `stream.rs:14` |
| Panel turns run as `sdk-cli`, get no `ai-title`, and persist a transcript at `~/.claude/projects/<encoded realpath>/<id>.jsonl` | G1; bundle `N(e)`, `zNi` (validate-format); `turn.rs:88-112` has no `--no-session-persistence` |
| Plain `--resume <id>` keeps the id and appends to the same file, also from another cwd | G2; 04 runs 2-3; sessions docs |
| Unknown id: one zeroed `result` with `errors[0]` "No conversation found...", exit 1, no init; the panel keeps the dead id | G3; `stream.rs:155-162`; `claude.logic.ts:153` |
| The transcript format is declared internal and unstable | sessions docs, quoted in 02 and validate-format 24 |
| Retention: 30 days by file mtime (a resume refreshes it), min 1; owner has not set `cleanupPeriodDays` in the 4 settings files | claude-directory docs; bundle `Y$e=30`, `mt(e)`; validate-app 16 |
| `--session-id` works on a first turn only | G4; bundle literal (02) |
| Rust refuses a second turn per vault | `turn.rs:229-231` |
| Atomic per-vault write precedent: `write_mod_data` / `read_mod_data` (`write_atomic`, `Option` read, fixed path) | `commands/vault.rs:1185-1230`; `utils/fs.rs:16-39` |
| No tab restore, no app data dir, no `tauri-plugin-store`; webview cannot read `~/.claude` | validate-app 11, 14, 15 |
| If transcripts were read: file order beats a `parentUuid` walk (a walk drops 129 parallel `tool_result` rows); compaction relinks via `logicalParentUuid` | validate-app 9, 10 |

## 4. Refuted or corrected claims (do not quote these)

- 03: `sdk-cli` files have 26/50 lines and a constant `cwd` (wrong: 50/69, mixed `cwd`); 163 subagent files / 24,558 lines (wrong: 140 / 15,117); `sdk-py` sibling versions "n/a" (2.1.318). validate-format 9, 10, 12, 14.
- 01: up to 6 lines per `message.id` (max is 11). validate-format 5.
- 04 and its probe: `ai-title` and `mode` in a `-p` transcript, and the stderr connector warning, came from the inherited t3-code/SDK/proxy env. G1, validate-format.
- 05/06: a faithful view needs a `parentUuid` walk; transcripts contain sidechain turns (both wrong for top-level files). validate-app 8, 9.
- 06: "151 MB" is the whole dir; transcripts are 28 MB. 06 and 08: an existence check of `<slug>/<id>.jsonl` before continuing gives false negatives after a vault move. validate-app 17, contradiction 6.
- 05: real prompts include 30 text-array lines (only 2 are prompts). validate-app 7.
- 08 line 23-24 drift: `resetChat` is at `claude.logic.ts:105-107`.

## 5. Recommended approach

Kokobrain keeps its own display copy of each panel chat; the CLI keeps the model context, reached only by `--resume <id>`. Both validators reached this independently.

1. One file per chat at `<vault>/.kokobrain/claude/chats/<chatId>.json`, keyed by an app UUID `chatId` (a chat whose session died gets a new session id). Content: `version`, `chatId`, `sessionId`, `createdAt`, `updatedAt`, `title` (first prompt, one line), `messages`. Rust stores it as an opaque string through `write_atomic`, like mod data; the schema and its parsing live in `claude.logic.ts`.
2. Save on send and on `Done`, never per delta, with the vault path captured at send. A turn still running at quit loses its partial reply in the copy (the CLI transcript keeps it); accept in v1.
3. Restored chats are `idle`, `runId` null, no `running` tool cards (map to `stopped`).
4. Dead session: `Result` with `isError`, `numTurns === 0` and text starting `No conversation found with session ID` clears `sessionId`, keeps messages, shows one line. The text check is needed because G6 shows other zero-turn errors where clearing the id would throw away a live context.
5. Pass `--system-prompt-snapshot off` on every turn so chips and the vault root follow the current state (section 2).
6. Do not read `~/.claude/projects` in v1; do not set `CLAUDE_CODE_ENTRYPOINT`, `CLAUDE_CONFIG_DIR` or `CLAUDE_CODE_PROJECT_DIR_NAME` (validate-app 25, validate-format recommendation 5).

### Alternatives

| Option | Gains | Costs |
|---|---|---|
| B. Read CLI transcripts in Rust through `dispatch_line` (05 section 6) | No second copy; terminal sessions could show | Internal format; prompt classification (`isMeta`, command tags, interrupt markers in text blocks); a new DTO; gone after 30 days; dir keyed by realpath and lossy encoding (collisions, 08 6.3) |
| C. Thin app index + transcript read on open | Smallest privacy footprint | All of B's parser cost, still lost at the sweep (06 section 3) |
| D. Agent SDK `listSessions` / `getSessionMessages` via a Node sidecar | Documented API | New runtime; `message` is `unknown`; panel sessions untitled anyway (02 section 6) |
| A2. Own copy in `kokobrain.db` instead of files | Transactions, one file | Schema migration, shared WAL connection (`db/mod.rs:12-28`); overkill for small per-chat blobs |
| `--session-id <uuid>` on the first turn | Id known before `Init`, so a cancel in the first ~12 hook lines keeps it | Second code path; reuse on a later turn fails with 0 stdout lines (G4); a cancel before the file exists then hits the dead-session path anyway. Not worth it in v1 |

## 6. Owner decisions

1. **Location of the chat copy.** Options: `<vault>/.kokobrain/claude/chats/` (travels with the vault, ADR-0019), the OS app data dir (per machine, none used today), `kokobrain.db`. Recommend `.kokobrain/claude/chats/`: precedent, hidden from scan and watcher, and the owner's vault already ignores `.kokobrain` in git (06). Risk: a synced vault copies note-derived chat text.
2. **Restore the last chat on vault open, or start empty?** Recommend restoring it with a one-line notice ("Restored last chat. New chat starts over."). Showing it costs nothing; tokens are spent only on the next send, and the user then sees what Claude will continue. 08 recommends the opposite (empty panel, list one click away) to avoid resuming stale long chats by habit.
3. **Persist chips with the chat?** Recommend no: the active note is re-attached on open (`AppShell.svelte:85-91`), and with `--system-prompt-snapshot off` new chips reach Claude.
4. **Ship `--system-prompt-snapshot off`?** Recommend yes. Unmeasured: prompt-cache cost when the chip list changes between turns, and behavior with a CLI older than 2.1.257 (the repo sets no minimum version).
5. **Retention of own copies and a delete action.** Recommend no cap in v1 (files are small), plus a per-row delete in the history list, which is safe because it deletes only Kokobrain's file. CLI transcripts stay untouched.
6. **Terminal sessions in the list.** Recommend no (needs option B).

## 7. Proposed Issues

Feature folder `.scratch/claude-session-history/issues/`. Test-first, tabs, runes, real stores and `.logic.ts` in tests, ts-rs bindings regenerated by `cargo test` for any new `#[ts(export)]` DTO.

**01: Resumed turns use the current chips and vault root.** Scope: add `--system-prompt-snapshot off` to `build_args`. Files: `src-tauri/src/commands/claude/turn.rs` and its tests. Blocked by: none (owner decision 4).
- `build_args` output contains `--system-prompt-snapshot off` before `--`, with and without `--resume`.
- Existing `build_args` tests updated; the prompt stays the last arg after `--`.
- Gate: `cargo test`.

**02: A resume whose session is gone starts a new session and keeps the chat.** Scope: dead-session detection in the reducer plus the notice. Files: `claude.logic.ts`, `ClaudePanel.svelte`, `src/tests/lib/features/claude-code/`. Blocked by: none.
- A `Result` with `isError`, `numTurns` 0 and text starting `No conversation found with session ID` sets `sessionId` to null and keeps `messages`.
- A zero-turn error with other text keeps `sessionId` (G6).
- The panel shows one line saying the next message starts without the earlier context.
- Gate: `pnpm check` + `pnpm vitest run`.

**03: Panel chats are saved to the vault and the last one comes back after a restart.** Scope: Rust commands `claude_chat_write`, `claude_chat_read`, `claude_chat_list` (ids with mtime) modelled on mod data; stored schema v1 and pure `storedFromChat` / `chatFromStored` / title derivation in `claude.logic.ts`; store `chatId` and `restore()` allowed only while idle; save on send and `Done` with the vault path captured at send; load the newest chat after vault open. Files: `src-tauri/src/commands/claude/` (new module), command registration, `src/lib/contracts/`, `claude.logic.ts`, `claude.store.svelte.ts`, `claude.service.ts`, lifecycle wiring, tests both sides. Blocked by: claude-code-integration 09 (a late run must not write into another vault), owner decisions 1 to 3.
- `chatId` must be a UUID; any other value is rejected before a path is built.
- Write is atomic; read returns `None` only for NotFound; a corrupt file is left on disk and the panel starts empty without throwing.
- Round trip of a `ChatState` keeps messages, `sessionId`, title; restored tool parts are never `running`.
- A turn's `Done` after a vault switch writes nothing into the new vault.
- After restart (store reset + vault open), messages and `sessionId` match the last saved chat, and the next send passes `--resume` with it.
- Gate: `cargo test`, `pnpm check`, `pnpm vitest run`.

**04: A history list reopens older chats.** Scope: history icon in the toolbar, a list view that replaces the message area (08 section 2), rows of title and relative time, newest first, disabled while a turn runs, optional delete per row. Files: `ClaudePanel.svelte`, `claude.service.ts`, `claude.store.svelte.ts`, Rust delete command if decision 5 says yes, tests. Blocked by: 03.
- Opening a row while idle replaces the chat with the stored one; while running it does nothing and the row is disabled.
- A list or chat read that resolves after the vault changed or a turn started is dropped.
- Empty state shows when the vault has no saved chats.
- Delete (if chosen) removes only that chat's file and its row.
- Gate: `pnpm check` + `pnpm vitest run` (+ `cargo test` with a delete command).

Issue 02 is useful only once 03 lands, but has no code dependency on it. The cross-feature "Blocked by" in 03 needs a form that relay-lite accepts (it reads plain numbers within one feature).

## Open questions

1. What does a killpg-cancelled `-p` turn leave in the transcript, and does the next `--resume` work? (Needs a cancel probe in the panel env.)
2. Does a turn cancelled before `system/init` leave a file that `--resume` can find?
3. What does a CLI older than 2.1.257 do with `--system-prompt-snapshot`, and should the app gate it on the detected version?
4. Prompt-cache effect of `--system-prompt-snapshot off` when chips change between turns.
5. Does auto-compaction during a `-p` turn emit a stream event the panel could show?
6. Should a partial reply of a turn running at quit be saved through the `src/lib/app/` exit listener?

## Claims to verify

1. In a turn launched by the real app (not the emulated env), the transcript entrypoint is `sdk-cli` with no `ai-title` (G1 used an emulated env in a temp dir).
2. Probe S1-S3: a resumed turn ignores new `--append-system-prompt` text unless `--system-prompt-snapshot off` is passed (one run, `haiku`).
3. `--session-id` reuse fails with exit 1, no stdout and `Session ID <id> is already in use.` on stderr (one run).
4. Zero-turn `error_during_execution` results with other errors exist in the panel env (read from the bundle, not produced live).
5. A `mode` row is written after a resumed `sdk-cli` turn (one probe file).

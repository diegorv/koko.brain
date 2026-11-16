# Research 02: official docs and SDK on sessions

Scope: what Claude Code and the Agent SDK document about session flags, retention, the `/resume` picker, titles, SDK session APIs, and the transcript format. Docs were fetched on 2026-11-15 from code.claude.com (they describe a Claude Code newer than or equal to the installed 2.1.325; the public changelog's top entry is 2.1.325). No private data was read; nothing under `~/.claude` or the vault was opened for this file.

## Summary

- The panel already lets Claude Code persist every turn: `build_args` passes `-p ... --resume <id>` and never `--no-session-persistence` (`src-tauri/src/commands/claude/turn.rs:89-112`). So transcripts exist at `~/.claude/projects/<project>/<session-id>.jsonl` today.
- Restart persistence has two halves: (1) Claude's own context, which `--resume <session_id>` already restores as long as the transcript exists; (2) what the panel shows. For (2) the choices are to read Claude's transcript or to keep an app-owned log. The docs call the transcript entry format internal and unstable.
- Default retention is 30 days, then transcripts are deleted. A saved session id can therefore go stale.

## 1. CLI flags

All rows are quoted or paraphrased from https://code.claude.com/docs/en/cli-reference (table rows, flag names exact).

| Flag | Documented behavior | Relevance |
|---|---|---|
| `--resume`, `-r` | "Resume a specific session by ID or name, or show an interactive picker". Also accepts the absolute path to a session `.jsonl` file. With an ID, searches the current project dir and its worktrees, then every other project on the machine (before v2.1.223 only the first). | Panel passes the id from `system/init`/`result`. cwd = vault, so lookup is local. |
| `--continue`, `-c` | Most recent conversation in the current directory. "Skips sessions created with `claude -p` or the Agent SDK, and sessions whose first prompt was `/loop`. `claude -p --continue` includes `-p`, SDK, and `/loop` sessions." | `-p --continue` would pick the panel's latest session, but it is also picked up by any other `-p` run in the vault. Id-based resume is safer. |
| `--fork-session` | "When resuming, create a new session ID instead of reusing the original (use with `--resume` or `--continue`)". | Not needed for the MVP. |
| `--session-id` | "Use a specific session ID for the conversation (must be a valid UUID)". | See below: lets the app know the id before the turn ends. |
| `--no-session-persistence` | "Disable session persistence so sessions are not saved to disk and cannot be resumed. Print mode only." `CLAUDE_CODE_SKIP_PROMPT_HISTORY` does the same in any mode. | Must NOT be used if history is wanted. |
| `--name`, `-n` | "Set a display name for the session, shown in `/resume` and the terminal title. You can resume a named session with `claude --resume <name>`". `/rename` changes it mid-session. | Possible way to label panel sessions. Behavior under `-p` is UNVERIFIED. |
| `--from-pr` | Opens the picker filtered to a PR. | Irrelevant. |

`--session-id` constraint, found in the installed binary: `strings -n 8 ~/.local/share/claude/versions/2.1.325 | grep -F -e "--session-id"` prints `Error: --session-id can only be used with --continue or --resume if --fork-session is also specified.` and `--session-id and --continue cannot be used together.` Consequence: the app could generate a UUID and pass `--session-id` on the FIRST turn only (so the id is persisted before any `system/init` arrives, which helps when a turn is cancelled early); follow-up turns still use `--resume`. UNVERIFIED by a live run; only the strings were read.

Headless page (https://code.claude.com/docs/en/headless, "Continue conversations"): `--resume` works with a session id and "You can run the two commands from different directories: Claude Code finds the session by its ID in any project on this machine." Also: `claude -p --resume <name>` accepts titles set via `/rename` or `--name` (changelog 2.1.101, https://github.com/anthropics/claude-code/blob/main/CHANGELOG.md).

## 2. What a resume restores and what it does not

From https://code.claude.com/docs/en/sessions ("What a resumed session restores"):
- Restored: conversation history (messages, tool calls, results); model; agent; permission mode (terminal paths only, not `-p`); active goal; non-expired scheduled tasks.
- If the session was compacted, "the conversation opens at a `Conversation compacted` row. Claude continues with the last compaction's summary ... The messages that the last compaction summarized aren't loaded again." So a UI built from the transcript after a compaction sees fewer messages than the user saw live.
- Not restored: `--mcp-config`, `--plugin-dir`, `--add-dir`, `--settings`, `--fallback-model`; pass them again. For `--system-prompt`/`--append-system-prompt` the docs point to "System prompt flags in resumed conversations" in the CLI reference (not read in detail: UNVERIFIED how the panel's per-turn `--append-system-prompt` interacts with the stored one; the panel passes it every turn, `turn.rs:107-109`).
- `-p --resume` starts in the permission mode a new `-p` run would use (the panel passes `--permission-mode bypassPermissions` every turn, `turn.rs:93-94`).
- Interrupted tool calls are not rerun. A turn killed with SIGTERM "records no result for it"; "your next prompt drives the conversation" (headless page, "Stop a run with SIGTERM"). The panel's cancel kills the process, so the same applies.
- Two processes writing the same session: "both write to one transcript. When you resume that session later, messages from one of them can be missing" (sessions page, "Branch a session"). The panel runs one process per turn, so only a concurrent double-send could trigger it.
- Failure text when the id is gone: `No conversation found with session ID: <session-id>` (sessions page, "Resume by session ID or name"). The panel needs a path for this after retention expiry.

## 3. Retention: `cleanupPeriodDays`

Primary source: https://code.claude.com/docs/en/claude-directory ("Application data", "Cleaned up automatically"):
- "Claude Code deletes the files in the paths below once they're older than `cleanupPeriodDays`, as long as it can safely determine the retention period. The default is 30 days and the minimum is 1; setting `0` fails with a validation error."
- Deleted under `~/.claude/`: `projects/<project>/<session>.jsonl` (transcript); `.orphaned-*`/`.superseded-*` set-aside transcripts; `projects/<project>/<session>/subagents/`, `tool-results/`, `mcp-tasks/`; `file-history/<session>/`; plus `plans/`, `debug/`, `paste-cache/`, `session-env/`, `tasks/`, `shell-snapshots/`, `backups/` and others.
- NOT swept: `history.jsonl` (prompt history; swept only under a HIPAA config), `stats-cache.json`, auto memory (`projects/<project>/memory/`), `sessions/` (live-session markers), Claude Desktop/Cowork transcripts (controlled by `desktopSessionCleanupPeriodDays`).
- Sweep is skipped for `claude -p --bare`, and "paused" if the retention period cannot be determined (broken settings file).
- Same default in the data-usage page: "Claude Code clients store session transcripts locally in plaintext under `~/.claude/projects/` for 30 days by default to enable session resumption" (https://code.claude.com/docs/en/data-usage, "Data retention").
- Which timestamp defines "older than" (mtime vs first entry): UNVERIFIED. The docs say "older than" only. The SDK `SDKSessionInfo.lastModified` is the file mtime-style field; likely mtime but not stated.
- The `cleanupPeriodDays` entry on https://code.claude.com/docs/en/settings-reference is listed as scope "Any file" (user, project, local, managed); its detailed entry sat past the 300k characters I could read and was not seen (UNVERIFIED there; the claude-directory page is the source for the default and minimum).
- Changelog trail (https://github.com/anthropics/claude-code/blob/main/CHANGELOG.md): setting introduced in an early release (entry under "0.2.117"); 2.1.89 "Changed `cleanupPeriodDays: 0` in settings.json to be rejected with a validation error: it previously silently disabled transcript persistence"; 2.1.101 fixed `--setting-sources` without `user` ignoring the setting and deleting history older than 30 days; 2.1.117 extended the sweep to `~/.claude/tasks/`, `shell-snapshots/`, `backups/`; 2.1.239 fixed custom titles disappearing from `/resume` after about 64 KB written after a rename; 2.1.248 added `desktopSessionCleanupPeriodDays`.
- Implication for the app: the owner can set a long value in `~/.claude/settings.json` (or the vault's `.claude/settings.json`); the panel cannot rely on it. Whether a per-turn `--settings '{"cleanupPeriodDays":N}'` makes the sweep honor N is UNVERIFIED, and the sweep also runs in the owner's other sessions with their own settings, so it would not protect the files anyway.
- Local mitigation docs: `claude purge` deletes one project's transcripts; deleting `~/.claude/projects/` loses "Resume, continue, and rewind for past sessions, and auto memory for every project".

## 4. `/resume` picker and titles

Source: https://code.claude.com/docs/en/sessions ("Use the session picker", "Name your sessions", "Where the session picker looks").
- Storage is per project directory; the picker defaults to the current worktree, widened with Ctrl+W (worktrees) and Ctrl+A (all projects).
- Hidden from the picker and from `claude --continue`: sessions "created with `claude -p` or the Agent SDK" and sessions whose first prompt was `/loop`. "You can still resume one by passing its session ID to `claude --resume <session-id>`." The panel is a `-p` consumer, so its chats will not show in the owner's terminal `/resume` list. Good for isolation, bad if the owner expects to continue panel chats in the terminal (only by id).
- Row label: "the session name if you set one, otherwise the AI-generated session title, conversation summary, or first prompt".
- Naming routes: `claude -n <name>`, `/rename <name>` (also shown on the prompt bar), Ctrl+R in the picker, plan accept (generated title from plan), Remote Control rename, desktop app.
- Generated title: "a short summary of your first prompt, written by a background request to the small/fast model, normally a Haiku-class model. A `claude -p` run you start directly from a shell or script doesn't get one." `CLAUDE_CODE_DISABLE_TERMINAL_TITLE=1` skips it (https://code.claude.com/docs/en/env-vars). Whether a `-p` run spawned by a GUI app counts as "directly from a shell or script" is UNVERIFIED; plan on no title and derive one in the app (for example first-prompt prefix) unless a real capture shows a title entry.
- Resolving names: exact match resumes directly; ambiguity opens the picker. The default display name (`<dir>-<2 chars>`) is not a resume handle.
- `/rename` under `-p`: headless page says `/rename` "accept[s] the value as an argument". Changelog 2.1.319 notes a fix where `/rename` reported success when the name could not be saved to the transcript. So rename is stored in the transcript itself (see SDK `renameSession`: "appending a custom-title entry").
- `/clear` saves the previous session and starts a new one (new id). The panel's "new chat" maps to simply not passing `--resume`.

## 5. Transcript location and format

Source: https://code.claude.com/docs/en/sessions ("Where transcripts are stored"):
- Path: `~/.claude/projects/<project>/<session-id>.jsonl`; `<project>` = working directory path with non-alphanumeric characters replaced by `-`; names over 200 characters are truncated to 200 and a hash is appended.
- `CLAUDE_CONFIG_DIR` moves storage; `CLAUDE_CODE_PROJECT_DIR_NAME` (v2.1.234+, requires `CLAUDE_CONFIG_DIR` too) names the project dir.
- Format statement (verbatim, load-bearing): "Each line is a JSON object: a message, a tool use or result, a record of a request Claude Code sent the model, or a metadata entry. The entry format is internal to Claude Code and changes between versions, so scripts that parse these files directly can break on any release. To build on session data, use `/export` or the script interfaces instead."
- Local transcripts also record each API request's system prompt, tools and parameters (changelog 2.1.300), and are "plaintext", not encrypted (claude-directory, "Plaintext storage"). Anything a tool printed is in the file.
- Sub-files per session: `<session>/subagents/`, `tool-results/`, `mcp-tasks/` (claude-directory table).
- `CLAUDE_CODE_TRANSCRIPT_LOCAL_GC` trims large `-p`/SDK transcripts (sessions page table); changelog has several fixes where it dropped messages (2.1.300 range). Off unless set.
- The sessions page's "Access conversations from scripts" lists the supported interfaces: `claude -p --output-format json|stream-json`, `claude -p --resume <id>` for a follow-up, the `transcript_path` field given to hooks and status line commands, and the Agent SDK.

## 6. Agent SDK session APIs

Sources: https://code.claude.com/docs/en/agent-sdk/sessions, https://code.claude.com/docs/en/agent-sdk/typescript (session functions), https://code.claude.com/docs/en/agent-sdk/session-storage, SDK changelog https://github.com/anthropics/claude-agent-sdk-typescript/blob/main/CHANGELOG.md.

TypeScript (`@anthropic-ai/claude-agent-sdk`), exact signatures from the reference:
- `listSessions(options?: { dir?, limit?, includeWorktrees? }): Promise<SDKSessionInfo[]>`. `SDKSessionInfo` fields: `sessionId`, `summary`, `lastModified` (ms), `fileSize?`, `customTitle?`, `firstPrompt?`, `gitBranch?`, `cwd?`, `tag?`, `createdAt?`. Sorted newest first. SDK changelog also lists an `offset` option (0.2.75) and `archived` field plus `archiveSession()`/`unarchiveSession()` (0.3.325 entry).
- `getSessionMessages(sessionId, { dir?, limit?, offset?, includeSystemMessages? }): Promise<SessionMessage[]>`. `SessionMessage`: `type` ("user" | "assistant" | "system"), `uuid`, `session_id`, `message: unknown` ("Raw message payload from the transcript"), `parent_tool_use_id`, `parent_agent_id`. The result is the linked chain the agent would see on resume (post-compaction), per the session-storage page ("a session whose store holds 503 raw entries may return 18 messages").
- `getSessionInfo(sessionId, { dir? })`, `renameSession(sessionId, title, { dir? })` ("appending a custom-title entry ... most recent title wins"), `tagSession`, `forkSession(sessionId, { dir?, upToMessageId?, title? }) => { sessionId }`, `deleteSession()` (exists: SDK changelog 0.2.113; signature not seen in the fetched part of the reference, UNVERIFIED).
- Introduction versions from the SDK changelog: `getSessionMessages` 0.2.59, `getSessionInfo`/`renameSession`/`tagSession` 0.2.75-0.2.76, `forkSession` 0.2.76, `includeSystemMessages` 0.2.89, `deleteSession` and `sessionStore` (alpha) 0.2.113.
- Python equivalents: `list_sessions()`, `get_session_messages()`, `get_session_info()`, `rename_session()`, `tag_session()` (sessions guide).
- `query()` options: `continue`, `resume`, `resumeSessionAt`, `forkSession`, `sessionId`, `persistSession` (TypeScript only; Python has no equivalent, use `CLAUDE_CODE_SKIP_PROMPT_HISTORY`), `sessionStore`, `title` (persisted title wins on resume).
- Stability: the functions are the documented, supported way to read transcripts; the raw `message` payload is `unknown`, and the JSONL beneath is internal. They are Node/Python libraries. Kokobrain's backend is Rust, so using them means shipping a Node sidecar (not evaluated here) or reimplementing the logic; there is no CLI subcommand that lists sessions (`claude --resume` picker is interactive; no `claude sessions list` found in the CLI reference rows I read, UNVERIFIED for the full page).
- `SessionStore` (alpha) mirrors entries to your own backend with `append`/`load` (opaque `SessionStoreEntry`: `{ type: string; ... }`, "Treat them as opaque JSON-safe values"). Not applicable to the CLI-spawn architecture; it is an SDK `query()` option.
- Sessions page for the SDK also says: "Session files are local to the machine that created them", and the file layout hint `~/.claude/projects/<encoded-cwd>/*.jsonl`.

## 7. Options for the app (facts only, no recommendation)

| Option | What it relies on | Documented stability | Cost to Kokobrain |
|---|---|---|---|
| A. Persist only `session_id` (+ title) in app state; rely on `--resume` | CLI behavior, 30-day retention | Documented | Chat bubbles not restored; Claude has context but the panel is empty. |
| B. App-owned chat log, keyed by `session_id`, written from the stream-json events the panel already parses | Panel's own data | Fully under app control | Storage format and migration owned by us; survives retention expiry (display only; resume fails after expiry). |
| C. Read Claude's transcript JSONL in Rust | Internal format | "internal ... changes between versions" | Fragile; the transcript also holds system prompts, tool defs and per-request params, and compacted history differs from what the user saw. |
| D. Use SDK `listSessions`/`getSessionMessages` via a Node sidecar | Documented API | Documented | New runtime dependency; `message` is `unknown`. |

Real-capture evidence in the repo: `.scratch/claude-code-integration/research/stream-json-capture/turn.ndjson` holds the event shapes the panel already receives (not re-read for this file).

## Open questions

- Does a `claude -p` process launched by the Tauri app (no tty) get an AI-generated title written into the transcript, or only `-p` shell runs excluded by the docs? Needs a structure-only check of a panel transcript's entry types (counts only).
- Does `--name` / `/rename <name>` work in a `-p --output-format stream-json` run, and does the name appear via `listSessions().customTitle` / `--resume <name>`?
- Which timestamp does the retention sweep compare (file mtime vs entry time)? A resumed session rewrites the file; does that reset the 30-day clock?
- Is `--session-id <uuid>` on a first `-p` turn written to `system/init.session_id` unchanged (so the app can persist the id before the turn ends)? Only the binary's error strings were read.
- How does a per-turn `--append-system-prompt` on `--resume` interact with the stored one ("System prompt flags in resumed conversations" in the CLI reference was not read)?
- Does `--settings '{"cleanupPeriodDays":...}'` influence the sweep at all, and would raising it be an acceptable app behavior given the transcripts are plaintext and may hold secrets?
- Full text of the `cleanupPeriodDays` entry on the settings-reference page (past the readable range).

## Claims to verify

1. `build_args` never passes `--no-session-persistence` or `--session-id`, so every panel turn persists a transcript (`src-tauri/src/commands/claude/turn.rs:89-112`).
2. Default `cleanupPeriodDays` is 30, minimum 1, and 0 is a validation error (claude-directory page; changelog 2.1.89).
3. Sessions created with `claude -p` are excluded from the `/resume` picker and `--continue` but resumable by id (sessions page; CLI reference `--continue` row).
4. The transcript entry format is declared internal and unstable (sessions page, "Where transcripts are stored").
5. `--session-id` cannot be combined with `--resume`/`--continue` unless `--fork-session` is also passed (binary string in 2.1.325, not a live run).
6. `listSessions` and `getSessionMessages` exist in the TS and Python SDKs with the signatures quoted above, and there is no documented CLI command to list sessions non-interactively.
7. After a compaction, `--resume` and `getSessionMessages` return only the post-compaction chain, so transcript-derived UI history is shorter than what the user saw live.
8. The sweep does not delete `history.jsonl` or auto memory, and skips `claude -p --bare` runs.

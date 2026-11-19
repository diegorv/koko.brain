# 08 UX and edge cases for chat history in the panel

Scope: where a history list goes in `ClaudePanel.svelte` (a ~290 px right sidebar), what a row shows, restore on startup, switching while a turn runs, vault switch, and the edge cases of reading Claude Code's transcripts. Probed 2026-11-15 against claude 2.1.325. Privacy: only structure, counts, key names and timings were taken from `~/.claude`; no text. `<vault>` is the owner's main vault, `<encoded-vault-dir>` its dir under `~/.claude/projects`. Sibling research: `02-docs-and-sdk.md` (docs, SDK) and `03-real-sessions.md` (transcript structure); their facts are reused only where cited, and a few were re-checked here.

## 1. What the panel does today (repo evidence)

- The chat is one module-level `$state` in `src/lib/features/claude-code/claude.store.svelte.ts:4-5` ("lives in memory only, so a restart starts a new chat"). It survives panel remounts (canvas, kanban or view tabs hide the sidebar, `ClaudePanel.svelte:79-83`) but not a restart.
- Toolbar is `<h2>Claude</h2>` plus one ghost `New chat` button, disabled while a turn runs (`ClaudePanel.svelte:197-200`).
- `sessionId` is set from `Init` and `Result` (`claude.logic.ts:123-124,153`), cleared by `resetChat` (`claude.logic.ts:109-111`) and by `resetClaude` on vault close (`claude.service.ts:81-88`, called from `app-lifecycle.service.ts:685`).
- Events are applied only when `payload.runId === state.runId` (`claude.logic.ts:113-118`), so a stale run cannot write into a swapped chat once the run id is known. The gap before the id is known is open Issue 09.
- Rust allows one turn per vault: `turn.rs:230-231` returns "A Claude turn is already running for this vault" when any run has the same `vault_path`. Consequence for section 5: a session switch cannot overlap a running turn.
- Quitting the app kills every running turn (Issue 11, `ClaudeRuns::cancel_all`, status resolved in `.scratch/claude-code-integration/issues/11-cancel-turns-on-app-exit.md`). So a restart in the middle of a turn leaves a transcript that ends mid-turn (section 6.9).
- Slash menu rows are `/{name}` only, `truncate` (`ClaudePanel.svelte:311-323`). Not part of this research file.

## 2. Where the list goes

Options for a ~290 px panel:

| Option | Fit at 290 px | Verdict |
|---|---|---|
| A. History icon button in the existing toolbar, opening a list that replaces the message area; a back control returns to the chat | Toolbar has room: title, one icon button, `New chat`. The list gets the full panel height. No overlay to clip. | Recommended |
| B. Popover or dropdown under the toolbar button | A popover wider than 290 px clips or overlaps the editor; narrow rows lose the second line. | Worse |
| C. Always-visible list above the chat | Steals height from a panel that already holds chat, chips and a 3-row prompt. | Worse |
| D. Tabs inside the panel | Two tab strips (editor tabs and these) for one narrow column. | Worse |

Option A details:
- `lucide` has a `history` icon in the installed package (`node_modules/@lucide/svelte/dist/icons/history.js`, found by `ls | grep`); the panel already imports `@lucide/svelte/icons/<name>` (`ClaudePanel.svelte:3-5`). The button needs an `aria-label` ("Chat history") since it is icon-only; `New chat` stays text.
- A local `view: 'chat' | 'history'` flag in the component is enough. The prompt and chips can stay mounted but hidden, so a half-typed prompt survives opening the list (the `prompt` state lives in the component, `ClaudePanel.svelte:34`).
- The list view has its own header row (back arrow, "History") so the toolbar is not double-loaded. `arrow-left` exists in the lucide set (same `ls`).
- Opening the list while a turn runs: allowed to look, rows disabled (section 5).

## 3. What a row shows

Facts that decide it:
- The docs state that a `claude -p` run gets no generated title: "A `claude -p` run you start directly from a shell or script doesn't get one" (https://code.claude.com/docs/en/sessions, "Name your sessions"). Matches `03-real-sessions.md` section 4: the two 2.1.325 `sdk-cli` files have no `ai-title` and no `custom-title`. So panel sessions have no CLI title.
- The CLI's own picker rows use: "the session name if you set one, otherwise the AI-generated session title, conversation summary, or first prompt, along with time since last activity, git branch, and file size" (same page, "Use the session picker").
- The CLI's lister reads a fixed-size head chunk and a tail chunk of each file plus `mtime` and `size` (bundle `ofe` function: opens the file, reads a buffer at offset 0 and at `size - N`, returns `{mtime, size, head, tail}`; found with a Python `mmap` search of `~/.claude/versions/2.1.325` for `head:s,tail:a`, around byte offset 281268101). The constant `N` was not located (mangled name): UNVERIFIED. This is the precedent for a cheap list: no full parse.

Proposed row (two lines, ~270 px of text width):
1. Title, one line, `truncate`: the first user prompt collapsed to one line (about 80 chars shown, CSS does the cut). If it starts with `/name args`, show it as typed; a skill name is a fine title. If a `custom-title` line exists (set by `/rename`), prefer it; if an `ai-title` line exists, use the last one.
2. `text-meta` muted line: relative time of last activity (from file `mtime`; sort key, newest first), then a middle dot and the turn count only if it is free (an app-side index has it; a transcript scan would need a full read, so omit it otherwise).

Not shown: session id (a `title` attribute with it is enough for debugging), git branch (the vault is not necessarily a repo; docs row shows it, the panel has no use), file size (meaningless to a note taker; only useful as a warning for huge sessions, section 6.5).

Row interactions: click resumes; the current chat's row is marked with `aria-current` and the accent background the slash menu uses (`bg-right-sidebar-accent`). Delete from the list is a separate decision: there is no CLI command to delete one transcript (docs: only `claude purge` for a whole project, "Delete session data"); deleting the `.jsonl` by hand in Rust would also leave `<session>/subagents/` and `tool-results/`. Recommend no per-row delete in v1; hide-from-list in an app-side file is the safe alternative (UNVERIFIED need).

Empty state text: "No saved chats for this vault yet." Same muted style as `data-claude-empty`.

## 4. Restore on startup, or not

Restore means: on vault open, load the most recent panel session's messages into the store and set `sessionId`, so the next send passes `--resume`.

Arguments for restoring the last chat:
- Today's mental model is "one running conversation"; the panel remembers attached notes only within a run, and AppShell attaches the active note on open (`AppShell.svelte:88-91`). A silent empty panel after a restart reads as lost work.
- `--resume` restores Claude's context regardless of what the panel shows (docs "What a resumed session restores").

Arguments against:
- Context cost: a resumed long session pays input tokens on the next prompt. The docs show a "Resume this conversation?" dialog in the terminal because "a long conversation after a long break" is expensive on Pro/Max plans (https://code.claude.com/docs/en/sessions, "The 'Resume this conversation?' dialog"). Whether that dialog fires under `-p` was not tested: UNVERIFIED. A silent auto-resume on every launch can burn usage on a stale chat the user wanted to leave.
- Attached notes (`contextNotes`) are not in the transcript as app state; they travel in `--append-system-prompt` per turn (`turn.rs:107-109`), and that flag is not restored across resume the same way (docs point to "System prompt flags in resumed conversations", not read: UNVERIFIED). A restored chat shows no chips unless the app stores them.
- Retention: the session may be gone (section 6.1).

Recommendation (a decision for the owner, no data to settle it): do not auto-resume a run. Show the restored chat read-only-looking but live: on startup the panel is empty as today, and the history list is one click away. If the owner wants auto-restore, restore only a session whose last activity is under a threshold (for example 24 hours) and leave the chips empty, and say so in one line under the toolbar ("Restored last chat. New chat to start over.").

Restoring the messages themselves needs a transcript reader or an app-side log: see 02 (options A to D). This file only constrains the UI: the reader must produce the same `ChatMessage` shape the store uses (`claude.logic.ts` `messages`: user text, assistant `parts` of text and tool cards with `status` and `summary`), and tool cards of a restored chat need a state that is not `running` (use `done`, `error` or `stopped`; `stopped` exists in the `Done` handler, `claude.logic.ts:166`).

## 5. Switching sessions while a turn runs

- A second `claude_run_turn` for the same vault is refused by Rust (`turn.rs:230-231`), and the store holds one chat with one `runId`. Letting the user open another session mid-turn would either orphan the running run's events (they are dropped by the runId check, `claude.logic.ts:115`) or require a per-session chat map plus a run registry in the store: a large change for a rare action.
- Existing precedent: `New chat` is `disabled={claudeStore.isRunning}` (`ClaudePanel.svelte:199`).
- Recommendation: while `isRunning`, rows in the history list are disabled with the muted text "Wait for Claude to finish, or press Stop." The list stays viewable. Opening a session is the same operation as New chat plus a load, so it follows the same guard, enforced in the service (`sendPrompt` already refuses while running, `claude.service.ts:23`), not only by the disabled attribute.
- Race to test: the user clicks a row, the transcript read is async, and a turn starts or the vault closes before the read returns. The load must apply only if the chat is still idle and the vault path is unchanged when it resolves; otherwise drop it. This is the same shape as Issue 09 (a late `claude_run_turn` result attached to a reset chat) and is cheapest to handle with the same rule: attach a result only while the state still equals what it was when the request began.

## 6. Edge cases

Each has evidence and a proposed behavior. "UNVERIFIED" marks what was not run.

### 6.1 Transcript deleted or pruned (retention, `claude purge`, manual delete)

- Default retention is 30 days (docs, https://code.claude.com/docs/en/claude-directory.md "Cleaned up automatically", via 02 and 03). `cleanupPeriodDays` is unset in the owner's four settings files (03 section 8). So any list built from transcripts loses rows after 30 days without an app-side copy.
- Probed: `claude -p --output-format stream-json --verbose --permission-mode bypassPermissions --resume <random uuid> -- hi`, run in a fresh empty temp dir (never in the vault), exit status 1. Result: stdout is exactly one line, a `result` event with `subtype: "error_during_execution"`, `is_error: true`, `num_turns: 0`, `session_id` equal to the id asked for, an `errors` array of one string, and no `result` text key; there is no `system/init` line. stderr carries the same sentence: `No conversation found with session ID: <id>`. The docs give the same sentence (sessions page, "Resume by session ID or name"). No project dir was created for the temp cwd (`ls ~/.claude/projects | grep -c` returned 0).
- What the panel does with that today: `result_message` joins `errors` (`stream.rs:155-162`) so the chat shows "No conversation found with session ID: <id>" as the inline error, and `Result` stores `sessionId` (the same dead id, `claude.logic.ts:153`). Every retry then fails the same way until the user presses `New chat`. This also happens today after a 30-day sweep if a future restore sets `sessionId`.
- Proposed: (1) when the list is built from the filesystem, a missing file simply has no row, so no dead row. (2) When an app-side index holds ids, check the file exists when opening a row, and on a missing file show "This chat's transcript was removed by Claude Code (it keeps transcripts 30 days by default)" and drop the row. (3) For the live error, detect the stable prefix `No conversation found with session ID` in the `Result` error text, clear `sessionId`, and keep the messages on screen with a notice that the next message starts a new Claude session without the old context. Matching an English CLI sentence is brittle; the `is_error` + `num_turns == 0` + no `Init` shape is a second, structural signal (both seen in the probe).
- App-side message log (if chosen): it survives the sweep, but resume would fail, so such a row must say "View only".

### 6.2 Vault folder moved or renamed (encoded dir changes)

- Encoding: every character outside `[a-zA-Z0-9]` becomes `-`; past 200 chars the name is cut to 200 and `-<hash>` appended (bundle function `M`/`WH`: `t.replace(/[^a-zA-Z0-9]/g,"-")`, `if(e.length<=200)return e; return e.slice(0,200)+"-"+Math.abs(hash(t)).toString(36)`, found by Python `mmap` search for that regex in `2.1.325`, offsets 278297743 and 281268101; docs same rule, sessions page "Where transcripts are stored"). Checked against the owner's vault: the rule maps the vault path to the existing `<encoded-vault-dir>` name.
- After a move or rename the vault gets a new encoded dir, so a list that reads only the current dir shows nothing, even though the old dir still holds the files.
- Resume by id still works: "`claude --resume <session-id>` from any directory ... looks for the ID in this order: 1. The current project directory and its git worktrees, 2. Every other project on this machine. The cross-project search resolves the ID only when exactly one other project holds a transcript with messages for it" (sessions page, "Resume by session ID or name"). Not run live here; UNVERIFIED on 2.1.325.
- Unknown: after resuming an id from another dir, in which dir the new turns are written (old dir or new dir). The docs only say `/cd` "relocates it to the new directory's project storage". UNVERIFIED.
- Proposed: the list reads the current vault's encoded dir only (v1). An app-side index of ids per vault (stored with the vault, for example under `.kokobrain/`, which moves with the folder) would survive a move; a list from the dir alone does not. This is a reason to keep a small app-owned index of session ids even if titles come from the transcript. Do not search sibling dirs by name prefix: see 6.3.

### 6.3 Different vaults sharing one encoded dir (collision)

- The sanitizer is lossy: `/a/my vault` and `/a/my-vault` encode the same, and so do paths differing only in non-ASCII or punctuation characters (any char outside `[a-zA-Z0-9]` maps to `-`, bundle regex above). Two vaults can therefore share one project dir and a naive list shows the other vault's chats.
- Proposed: filter rows by the `cwd` of the first conversation line equal to the vault path (every conversation line carries `cwd`, key list in 03 section 2; 03 section 7 warns later lines change cwd, so use the first). Cost: reading the head chunk, which the list already does.
- A symlinked vault path: the encoded name derives from the process cwd, and the app passes the path it holds (`normalizeVaultPath` only trims trailing slashes, `claude.logic.ts:213-217`). Whether the CLI resolves symlinks before encoding was not tested: UNVERIFIED. The owner's vault path is not a symlink (`realpath` equals the path, checked).

### 6.4 Same session used from a terminal at the same time

- Docs: "If you resume the same session in two terminals or two `claude -p` runs at the same time, both write to one transcript. When you resume that session later, messages from one of them can be missing. To keep both conversations, add `--fork-session`" (sessions page, "Branch a session").
- A running interactive session is not exclusive: `~/.claude/sessions/<pid>.json` files exist for live interactive processes, keys `pid`, `sessionId`, `cwd`, `startedAt`, `procStart`, `version`, `kind`, `entrypoint`, `status`, `updatedAt`, `statusUpdatedAt`, `name`, others (3 files read, structure only; `status` values seen: `busy`, `idle`). A `-p` run with `--input-format stream-json` that was started in a temp dir created a fourth file for its pid while alive (before 3, during 4; its `kind` was `interactive`, `status` `idle`); the plain-argument `-p "<prompt>"` form the panel uses was not run, so whether the panel's turns register is UNVERIFIED. The writer is gated by a function `sy()` (`!K() && vH()==null && !JAt()`, bundle near offset 282403836) whose terms were not decoded.
- Proposed: the panel cannot lock a session. Two cheap, honest measures: (a) before resuming a row, if a `~/.claude/sessions/*.json` has the same `sessionId` and its pid is alive, warn "This chat is open in a terminal. Messages from both can get lost."; (b) otherwise accept the risk and say so once in the list footer. Reading `~/.claude/sessions` is an extra private-file dependency; (b) alone is acceptable for v1.
- The reverse: a panel chat opened in a terminal. Hidden from `claude --resume` pickers and `--continue` (sessions page, "`/loop`, `-p`, Agent SDK"), reachable by id or by `claude -p --continue`. Docs also say `claude -p --resume <session> "prompt"` typed at a terminal on a session that is a running background session (agent view) opens or refuses it, with exit 1 when output is piped (sessions page, "Resume a running background session"). The panel pipes stdout, so resuming a still-running background session fails with exit 1 and a message; rare, the panel would show the stderr tail through the existing `Error` event.

### 6.5 Very large transcripts: parse cost and where to parse

Measured (Python 3, `json.loads` per line, the vault's 31 top-level files, warm cache, one run, this machine):

| Measure | Result |
|---|---|
| Full parse of every line of all 31 files (9,487 lines, 28.3 MB) | 127 ms |
| Full parse of the largest file (4.38 MB) | 20 ms |
| Substring prefilter for `user`/`assistant` lines over the largest file | 7 ms, 526 hits |
| Read the last 64 KB of every file | 1.3 ms total |
| Longest line (03) | about 140 K chars |

- Reading is cheap even in Python; Rust with `serde_json` will be no worse. The real cost for a big session is not parsing but rendering: 526 conversation lines is the largest file here, and each assistant line can hold long text and tool cards. `ClaudePanel.svelte` renders every message with `{@html renderReplyHtml(...)}` in a keyed `{#each}` (`ClaudePanel.svelte:228-249`) and `renderReplyHtml` runs Markdown plus sanitize per text part on every store change. A restored chat of hundreds of messages renders all of them at once. Proposed: restore only the last N messages (for example 100, a UI choice not measured) with a "Show earlier messages" row at the top, and render tool output summaries as the live path does (`summary` is already clipped to a short string by the stream parser).
- Where to parse: in Rust, not the webview. Reasons: the file is on disk outside the vault (the frontend filesystem plugin scope may not cover `~/.claude`: UNVERIFIED, not checked), the frontend would receive up to 4 MB of JSON per open otherwise, and the stream parser already lives in `src-tauri/src/commands/claude/stream.rs` with a `ClaudeEvent` DTO. A command returning `ChatMessage`-shaped DTOs (ts-rs `#[ts(export)]`) keeps one place that knows the transcript format, which the docs call internal and unstable (sessions page "Where transcripts are stored").
- List view: use head and tail only (precedent in the CLI lister, section 3). The first user prompt is within the first few KB (03 section 5: 7 lines before the first user line for 2.1.325 `sdk-cli`, 26 minimum lines per file; the first user line is small), and `last-prompt` and the last `ai-title` or `custom-title` are near the tail. Hook-injected `attachment` lines come first and vary per user (03 section 5), so scan by `type`, never by line index. A head chunk can cut a line in the middle; drop the partial last line.
- `CLAUDE_CODE_TRANSCRIPT_LOCAL_GC` (docs table, sessions page) trims large `-p` transcripts when set. The app does not set it. Not probed.

### 6.6 Compacted sessions

- A `system` line with `subtype: "compact_boundary"` marks a compaction. Probed on the one file that has one (2,114 lines): keys include `compactMetadata` (`trigger`, `preTokens`, `postTokens`, `durationMs`, `preservedMessages`, `preservedSegment`, ...), `logicalParentUuid`, and `parentUuid` is null; `trigger` was `auto`. 525 of that file's 526 user and assistant lines come before the boundary; walking `parentUuid` from the last conversation line reaches only 2 lines. The first `user` line after the boundary has `isCompactSummary` and `isVisibleInTranscriptOnly` and string content (summary marker).
- So: the file keeps every old line, but the chain Claude resumes from starts at the boundary (docs: "The messages that the last compaction summarized aren't loaded again"). A linear read shows 525 messages Claude no longer has; a chain walk shows 2.
- Proposed: restore the linear history (what the user saw live) and insert a divider row at each boundary: "Earlier messages were summarized; Claude continues from a summary." Skip lines with `isCompactSummary` as chat bubbles. Hide `isMeta` and `isVisibleInTranscriptOnly` lines. This is a product choice; the SDK function `getSessionMessages` returns only the post-compaction chain (docs, 02 section 6), the opposite of the live view.
- Whether auto-compact happens during a panel `-p` turn: that session was a `cli` run. The bundle contains `compact_boundary` strings; not traced for print mode: UNVERIFIED.

### 6.7 Sessions started in the terminal in the same vault

- They live in the same dir (03 section 1: 14 `cli`, 14 `sdk-py`, 1 `t3-code`, 2 `sdk-cli`). Entry point in the transcript comes from `CLAUDE_CODE_ENTRYPOINT`; the CLI keeps any value already set (only `cli` becomes `sdk-cli` in non-interactive mode, `local_agent` becomes `local-agent`) and otherwise sets `sdk-cli` for `-p` and `cli` for interactive (bundle function `N(e)`, offset 278593623, read in full). The 2.1.325 transcript of a host-launched session (`t3-code`) carries that host's value (03 section 3), which indicates the value is written as set. So Kokobrain could set `CLAUDE_CODE_ENTRYPOINT` in the turn env (the runner builds the env explicitly, `turn.rs:119-128`) to tag its own sessions; whether the tag appears in the transcript for an unlisted value: UNVERIFIED, and this answers 03's open question 4 only in part.
- Without a tag, ownership is a policy choice (03 section 3 recommends storing the ids the app created). UX options: "Panel chats only" (default, the list stays short and relevant) and a "Show terminal sessions" toggle; resuming a terminal session through `-p` works by id and uses the `-p` permission mode, not the stored one (docs, "Permission mode on resume": a non-interactive resume starts in the mode a new `-p` run would use, and the panel passes `bypassPermissions` each turn, `turn.rs:93-94`). Showing terminal sessions also exposes their titles, which are the user's text: fine for the owner's own app, but a reason for the toggle to be off by default.
- Interactive-session rows in the vault dir have `ai-title` (12 of 14 in 03 section 4), so those rows would have better titles than panel rows; expect uneven row quality.

### 6.8 Sessions from subfolder cwds

- The panel always runs with cwd = vault root (`turn.rs:122`). A terminal session started in `<vault>/sub/dir` is stored under a different encoded dir (03 section 7: three sibling dirs whose names extend the vault's encoded name). A list that reads only the vault's dir never shows them, which is the desired scope for v1.
- Do not match siblings by name prefix: the encoded prefix of `<vault>` also matches a different vault whose name starts the same (6.3). If subfolder sessions are wanted, list `projects/*` dirs, read each file's first-line `cwd`, and keep the ones under the vault path. That scans one directory level of `~/.claude/projects` (672 entries on this machine, `ls | grep -c .`), more cost and more private-file exposure for a case the owner did not ask for. Recommend not doing it.
- A subagent or sidechain file (`<session>/subagents/*.jsonl`, `isSidechain: true`) must not become a row: list only `*.jsonl` directly in the project dir (03 section 6).

### 6.9 A transcript that ends mid-turn

- Cancel, a crash, or Issue 11's kill on quit leave a final `user` line, maybe an `assistant` line with a `tool_use` and no `tool_result`. Docs: a process killed by SIGTERM "records no result for it" and the next prompt drives the conversation (headless page via 02 section 2); "Interrupted tool calls: a tool that was still running when the previous process ended ... doesn't get rerun when you resume" (sessions page).
- Restore shows the user message and whatever assistant parts exist; tool cards without a result get `stopped`, the same state `Done` assigns today (`claude.logic.ts:166`). No special "interrupted" banner needed.
- The panel must not treat a restored chat as running: `status: 'idle'`, `runId: null`.

### 6.10 Vault switch

- `resetClaude()` runs on vault close (`app-lifecycle.service.ts:685`): cancels a running turn, then `claudeStore.reset()` clears messages, session, notes. With history, this stays right: the session belongs to the old vault's cwd, and `--resume <id>` from another vault dir would only work through the cross-project id search (docs above) and then act on the wrong cwd.
- The list must be keyed to `vaultStore.path`: reload it on vault open, and clear it on `reset`. A list read that resolves after the vault changed must be dropped (same rule as section 5).
- If the app persists "last session id" with the vault (for example in `.kokobrain/settings.json`, which holds `claudeCode.*` per the spec's "Settings live in the vault"), a vault synced to another machine would carry an id whose transcript does not exist there, which lands in 6.1. Persist app-side ids in per-machine storage, or tolerate the missing-file path.
- Issue 09 (a `claude_run_turn` that resolves after a reset) gets worse with restore: the leaked `Result` would store an old-vault `sessionId` and, with a list, could write an index entry for the wrong vault. Fix 09 first or in the same change.

### 6.11 Other

- Fork: `--fork-session` yields a new id per resume (docs, 02). The panel does not use it; if used to avoid 6.4, the chat's session id changes on each turn and the list needs a "same chat" key (an app-side chat id).
- `--resume` reuses the session id by default (docs: `--fork-session` "create[s] a new session ID instead of reusing the original"), so one panel chat is one file that grows; the `mtime` sort key is last activity, as wanted.
- Title collisions: many chats start with the same skill call, so rows can look identical; the relative time on the second line is the tiebreaker, and a `title` tooltip with the full first prompt helps.

## 7. Suggested v1 shape (for Issue writing)

1. Rust command lists `*.jsonl` directly in the vault's encoded dir, reads head and tail, filters by first-line `cwd == vault`, returns `{ sessionId, title, lastActivityMs }[]` sorted by `mtime` desc (ts-rs DTO).
2. Rust command loads one session into `ChatMessage`-shaped DTOs, last N messages, compaction divider rows, no running tool cards.
3. `ClaudePanel`: history icon button, list view with the row from section 3, disabled while running; no auto-resume.
4. Store: `loadSession(id, messages)` allowed only when idle; `Result` with the "No conversation found" shape clears `sessionId`.
5. Tests: transcript fixtures built from the real structure (no real text), covering a compaction boundary, a mid-turn end, a subagent file in the dir, a collision `cwd`, and a missing file.

## Open questions

1. Does the owner want auto-resume of the last chat at startup, and within what age? (Section 4; no data settles it.)
2. Should terminal sessions in the same vault appear in the list (toggle, default off)?
3. Does `--resume <id>` after a vault move write new turns to the old or the new project dir?
4. Does a plain `claude -p "<prompt>"` turn register a `~/.claude/sessions/<pid>.json` file, and is its `kind` `interactive`?
5. Does the CLI resolve symlinks in the cwd before encoding the project dir name?
6. Does the "Resume this conversation?" cost dialog or an equivalent guard apply under `-p --resume`, and what does a resume of a long session cost in tokens?
7. Does auto-compaction run inside a panel `-p` turn, and does stream-json emit a `system` `compact_boundary` event the panel could show live?
8. Is the frontend filesystem scope able to read `~/.claude/projects` (relevant only if parsing were done in the webview)?
9. Does a custom `CLAUDE_CODE_ENTRYPOINT` value appear unchanged in the transcript `entrypoint` field for a `-p` run?

## Claims to verify

1. Resuming a nonexistent session id with `-p --output-format stream-json` prints one `result` line (`subtype` `error_during_execution`, `is_error` true, `num_turns` 0, `errors` with one string, no `result` key, no `system/init`) and exits 1; stderr holds `No conversation found with session ID: <id>`.
2. The panel keeps the dead `sessionId` after that error (`claude.logic.ts:153` stores `event.sessionId`; the CLI echoes the requested id), so every retry fails until New chat.
3. Rust refuses a second concurrent turn for the same vault (`turn.rs:230-231`), so session switching must be disabled while a turn runs.
4. The project dir name is the cwd with every non-`[a-zA-Z0-9]` char replaced by `-`, cut at 200 chars plus a hash (bundle regex and docs), so distinct vault paths can collide.
5. Transcript parsing is cheap: 28.3 MB over 31 files parsed in 127 ms in Python; the largest file (4.38 MB) in 20 ms.
6. One file with a `compact_boundary` has 525 of 526 conversation lines before the boundary, and a `parentUuid` walk from its last line reaches only 2 lines; the boundary has `parentUuid` null and a `logicalParentUuid`.
7. The CLI keeps a preset `CLAUDE_CODE_ENTRYPOINT` and only maps `cli` to `sdk-cli` in non-interactive mode (bundle function `N`), and sets `sdk-cli` for `-p` when unset.
8. Docs state two processes resuming one session both write to one transcript and messages can be lost; `--fork-session` avoids it.
9. `-p` sessions get no generated title (docs) and the two 2.1.325 `sdk-cli` files have none (03), so a row title must come from the first prompt or an app-side value.
10. A `-p --input-format stream-json` run created a `~/.claude/sessions/<pid>.json` while alive (3 files before, 4 during).

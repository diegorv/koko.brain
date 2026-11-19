# 05: The panel chat model today, and what restoring it needs

Scope: feature (B), chat history that survives a restart. Read on branch `mvp-claude`
(HEAD c8b646da6). All paths are repo-relative. Transcript facts come from structure-only
`jq` queries over the vault's session dir (`~/.claude/projects/<vault-slug>/`, 35 entries:
31 top-level `*.jsonl`, 3 per-session subdirs, 1 `memory/`); no message text, titles or tool
output is recorded here.

## 1. Where the chat lives today

| Piece | Evidence |
|---|---|
| `chat` and `contextNotes` are module-level `$state`, memory only | `src/lib/features/claude-code/claude.store.svelte.ts:4-7` ("lives in memory only, so a restart starts a new chat") |
| No `localStorage`, `sessionStorage` or "persist" anywhere in the feature | `grep -rn "localStorage\|sessionStorage\|persist" src/lib/features/claude-code` returned no lines |
| The only persisted Claude UI state is the panel visibility flag `layout.claudeVisible`, plus `claudeCode.*` settings | `src/lib/core/settings/settings.types.ts:105-106`, `:420`; default at `settings.store.svelte.ts:70` |

### ChatState (`claude.logic.ts:32-49`)

| Field | Type | Persist across restart? |
|---|---|---|
| `messages` | `ChatMessage[]` | the thing to restore |
| `sessionId` | `string \| null` | minimum needed to continue the conversation |
| `runId`, `pending`, `stopRequested`, `status`, `error` | transient turn state | no (a restart leaves `idle`, no error) |
| `slashCommands` | `string[]` | no, but see below |

`contextNotes` is outside `ChatState` (store line 7, `newChat(notes)` at line 43-46).

### Message model (`claude.logic.ts:4-29`)

- `ChatMessage = { role: 'user'; text: string } | { role: 'assistant'; parts: (TextPart | ToolPart)[] }`.
- `TextPart = { kind: 'text'; text }` (Markdown, rendered by `renderReplyHtml`, `claude.logic.ts:260`).
- `ToolPart = { kind: 'tool'; id; name; target; status: 'running'|'done'|'error'|'stopped'; summary }`.
- Thinking is dropped: `ThinkingDelta` returns `state` unchanged (`claude.logic.ts:139-140`).
- The panel renders only these fields (`ClaudePanel.svelte:226-255`): user bubble from `text`; assistant parts as Markdown or as a `<details>` card (name, target, status, `summary` in a `<pre>`).
  `id` is used only to match the result; `status` also drives the label.

### Reducer (`claude.logic.ts`)

- `beginTurn(state, text)` (`:64-74`) appends `{user, text}` plus an empty `{assistant, parts: []}`, sets `running`, `runId = null`.
  The user message exists only because the frontend adds it; no event carries user text.
- `startRun` (`:81-87`) sets the run id and replays buffered events of that run.
- `receiveEvent` (`:114-118`) applies an event only when `payload.runId === state.runId`, buffers it while `runId === null && status === 'running'`, else ignores it.
- `applyEvent` (`:120-172`):
  - `Init` sets `sessionId` and `slashCommands`.
  - `TextDelta` appends to the last text part or starts one.
  - `TextRetracted` trims the tail of the last text part.
  - `ToolStart` pushes a `ToolPart` with `target = toolTarget(input)`, `summary = ''`, `running`.
  - `ToolResult` finds the part by id and sets `done` or `error` and `summary`.
  - `Result` sets `sessionId`, adds `event.text` as a text part only when the reply has no text part and the result is not an error, and records the error text.
  - `Error` sets `error` only.
  - `Done` turns every still-`running` tool into `stopped`, clears `runId`, and sets status `idle` or `error`.
- Tool target is computed on the TypeScript side, not in Rust: `toolTarget(input)` (`:182-193`) takes the first non-blank string among `file_path, notebook_path, path, pattern, command, url, query, skill, description`, collapses whitespace, truncates to 80 chars with `...`.
  Rust sends the whole `input` in `ToolStart` (`stream.rs:50-56`, `:228-232`).
- Tool summary is computed in Rust: `tool_results` (`stream.rs:242-250`) takes `tool_use_id`, `is_error` (default false) and the first 500 chars (`TOOL_RESULT_SUMMARY_CHARS`, `:14`) of `result_text`.
  `result_text` (`:264-275`) accepts a string, or an array whose `text` blocks are joined with `\n` (images dropped).

## 2. Where `sessionId` is set and passed

1. Set in `applyEvent`: from `Init` (`claude.logic.ts:124`, `event.sessionId || state.sessionId`) and from `Result` (`:153`).
   Rust fills `Init.session_id` from `system/init` (`stream.rs:143-144`) and `Result.session_id` from the `result` line (`:130`).
2. Exposed by `claudeStore.sessionId` (`claude.store.svelte.ts:16`).
3. Passed by `sendPrompt`: `resumeSessionId: claudeStore.sessionId ?? undefined` in the `claude_run_turn` request (`claude.service.ts:37`).
4. Rust turns it into `--resume <id>` when non-blank (`src-tauri/src/commands/claude/turn.rs:100-102`), cwd = vault (`:122`). The ts-rs request type has `resume_session_id: Option<String>` (`turn.rs:44`).
5. Cleared by `resetChat` (`claude.logic.ts:105-107`, via `newChat()` at `claude.service.ts:95-98`) and by `reset()` on vault close.

A restart therefore keeps nothing that points at the previous session. `--resume` is the only link back to it.

## 3. Lifecycle and reset points

- `resetClaude()` (`claude.service.ts:81-87`): cancels a running turn, then `claudeStore.reset()` (`claude.store.svelte.ts:55-58`: `EMPTY_CHAT`, no notes).
  Called from vault teardown at `src/lib/app/lifecycle/app-lifecycle.service.ts:683-685` (comment: its session and notes belong to the closed vault).
  Teardown is triggered by `src/routes/(app)/+layout.svelte:78-90` when `vaultStore.isOpen` goes false.
  So a vault switch also clears the chat; any restore must be keyed per vault and run after `initializeVault`.
- `AppShell.svelte:65-66`: `claudePanelShown = claudeCode.enabled && layout.claudeVisible`.
  `AppShell.svelte:85-91`: an `$effect` keyed to that flag calls `attachActiveNote()` inside `untrack`, so showing the panel adds the active note as a chip.
  `AppShell.svelte:290-292` mounts `<ClaudePanel>` only while shown; the store lives outside the component, so hiding the panel keeps the chat.
- `registerClaudeEventListener` (`src/lib/app/tauri-listeners.service.ts:115-118`, wired at `+layout.svelte:75`) lives for the app lifetime and forwards every `claude-event` to `claudeStore.receive`.
- `newChat()` (`claude.service.ts:95-98`) resets and attaches only the active note. The panel disables the "New chat" button while running (`ClaudePanel.svelte:206`).

## 4. What a restart loses

| Lost | Consequence | Restorable from |
|---|---|---|
| `sessionId` | next turn starts a new CLI session; the model forgets the conversation | stored id, or the newest transcript file in the vault's session dir |
| `messages` (user text, reply text, tool cards) | empty panel with the "Ask Claude about the attached notes..." hint (`ClaudePanel.svelte:221-225`) | transcript `.jsonl` |
| `contextNotes` chips | the open note is re-attached by the `AppShell` effect (`:85-91`); other chips are gone | not in the transcript as chips (the paths went to `--append-system-prompt`, `turn.rs:66-81`); would need its own persistence, or accept the loss |
| `slashCommands` | empty until the first turn's `Init`; the menu says "Slash commands load after the first message." (`ClaudePanel.svelte:337`) | not restorable from a transcript; relevant to feature (A), which needs them at open time |
| In-flight turn | Issue 11 (`.scratch/claude-code-integration/issues/11-cancel-turns-on-app-exit.md`) cancels runs on exit; the transcript then ends with a `tool_use` without a result or a prompt without a reply | the converter must close open tool cards as `stopped` |
| `error` text | not worth persisting | none |

## 5. Transcript shape that a converter has to read (structure only)

Measured over the 31 top-level files (about 28 MB total; largest file 4.4 MB; longest single line 138,835 bytes).
Line `type` counts across all files: attachment 2227, assistant 1615, user 1050, api-request 811, api-request-blob 508, last-prompt 454, atis-latch 439, system 401, mode 373, permission-mode 364, ai-title 339, queue-operation 223, file-history-snapshot 187, session-owner 170, plus smaller bookkeeping types (tools-used, bridge-session, cost-state, custom-title and others).
Only `user` and `assistant` lines carry chat content.

- `entrypoint` values seen on lines: `cli` 4766, `sdk-cli` 72, `sdk-py` 247, `t3-code` 208. Two files hold `sdk-cli` lines (the shape `claude -p` writes; I inferred this, not confirmed which launcher produced them).
  The earlier stream capture's session id has no file in this dir (`ls <id>.jsonl` failed), so I could not diff the live stream against its own transcript.
- Every line has `sessionId`, `uuid`, `parentUuid`, `timestamp` (24-char string), `cwd`, `isSidechain`, `version`.
- **One content block per assistant line.** In the two `sdk-cli` files, 8 assistant lines map to 4 distinct `message.id`s; each line holds exactly one of `thinking`, `tool_use` or `text`. Assistant block counts over all files: text 331, thinking 533, tool_use 751. The live stream does the same split (capture `turn.ndjson`: one `assistant` line with `["tool_use"]`, one with `["text"]`, same id length).
- `tool_use` block keys: `caller, id, input, name, type`; `input` is an object (matches what `ToolStart` expects).
- Tool results are `user` lines whose `message.content` is an array with `tool_result` blocks (keys `content, is_error, tool_use_id, type`); 751 such blocks, content a string in 677 and an array in 74 (same two shapes `result_text` handles).
  Those lines also carry `toolUseResult` (object 639, array 39, string 73), `sourceToolAssistantUUID`; ignore it.
  One tool_result string mentions a `tool-results/` path (large outputs spill to files under `<session>/tool-results/`, which exist for 3 sessions); a converter that takes the first 500 chars needs no file read. The exact spill marker format is UNVERIFIED.
- Real prompts are `user` lines with `isMeta` false whose `message.content` is a string (or an array containing `text`/`image` blocks: 30 text, 2 image). They also carry `promptId`, `promptSource`, `turnOrigin`, `turnPosition`.
- Non-prompt `user` lines a converter must skip or transform (string content classified by leading tag, over all files):
  - plain 195 (174 real prompts, 21 `isMeta` true: injected skill or command bodies).
  - `task-notification` 18, `local-command-stdout` 9, `bash-input` 3, `bash-stdout` 3 (all `isMeta` false).
  - `local-command-caveat` 13 and `system-reminder` 2 (all `isMeta` true).
  - `command-message`/`command-name` 12-13 non-meta: this is how a slash command prompt is stored. 13 lines carry `command-message` + `command-name`, 1 also `skill-format`; no `command-args` line occurred in this dir, but the binary contains the literal `<command-args>` twice (`grep -a -o '<command-args>' <binary> | wc -l` = 2), so args exist. To show the same bubble as live (`/name args`), the converter must rebuild it from those tags. Exact tag layout and args escaping are UNVERIFIED.
  - Interrupt markers (`[Request interrupted by user...]`): 10 user lines; the bundle has the string in several forms (3 distinct suffix variants). They are text prompts shaped like prompts, so they need an explicit filter.
- Subagent transcripts are separate files under `<session>/subagents/` (2 dirs), and all 1615 top-level assistant lines have `isSidechain` false, so the main file needs no sidechain filter. The `parent_tool_use_id` guard in `stream.rs:221` has no transcript counterpart (the transcript field is `isSidechain`).
- **Branching exists.** 29 of 31 files contain a `parentUuid` with more than one child; counting only prompt-like string user lines, 11 have a parent with siblings, and 66 distinct assistant message ids sit under shared parents. Part of this is parallel tool calls and attachments, but at least some looks like rewinds or resumes. Whether file order equals the visible conversation is UNVERIFIED; a faithful conversion may need to walk `parentUuid` from the leaf named by the last `last-prompt` line (keys `leafUuid`, `lastPrompt`, `explicit`).

## 6. Can `stream.rs` be reused on transcript lines?

`dispatch_line` is `pub` (`stream.rs:110`), `stream` is `pub mod` (`commands/claude.rs:14`), and it is already called from `turn.rs:268` with a per-run `StreamState`. It is pure (JSON in, events out), with a `debug_log` call only for non-JSON lines (`:118`).

What carries over unchanged on a transcript line:
- `user` -> `tool_results` (`:126`, `:242-250`): same `message.content[].tool_result` shape, so `ToolResult` (id, is_error, 500-char summary) works as is. A string-content prompt yields no event (`content_blocks` returns nothing for a string, `:252-260`).
- `assistant` -> `assistant_events` (`:125`, `:220-240`): `tool_use` -> `ToolStart` with full `input`; `text` -> `TextDelta`. In a transcript there are no `stream_event` lines, so `state.streamed` stays empty and `send_text` is true, which is the "never streamed" branch the code already supports (`:221-222`).
  `thinking` blocks produce nothing, matching the reducer.
- Unknown line types (`attachment`, `last-prompt`, `ai-title`, `queue-operation`, etc.) fall to `_ => Vec::new()` (`:137`), so the 20+ bookkeeping types are skipped for free.

What does not carry over:
- No user-text event exists. `ClaudeEvent` has no variant for a prompt (`stream.rs:20-91`), because the live path adds the user message in the frontend (`beginTurn`). A converter needs either a new variant (a ts-rs DTO change, which means regenerating `src/lib/contracts/generated/` per CLAUDE.md rule 6) or a separate output type such as `{ role, text } | events`.
- `isMeta`, command-tag lines, interrupt markers and the other tag-wrapped strings need classification that `dispatch_line` never had to do.
- There is no `system/init`, `result` or `Done`: no `Init` (so `sessionId` and `slashCommands` are not produced, but the transcript carries `sessionId` on every line), and no `Done` to close running tools. The restore must synthesize that final step, or fold with the reducer and finish with a `Done`.
- `parent_tool_use_id` (live) versus `isSidechain` (transcript): moot for top-level files per section 5.
- Adjacent text blocks from consecutive assistant messages with no tool card between them concatenate in the reducer (`TextDelta` appends to the last text part, `claude.logic.ts:127-129`). The live path has the same behavior, so a restored chat would look like the live one.

Two ways to do it, from the least to the most new code:
1. Rust command `claude_session_history(vault, session_id)` reads `<config dir>/projects/<slug>/<id>.jsonl`, runs each line through `dispatch_line` with one `StreamState`, and also extracts prompts; returns an ordered list of `{ userText, events[] }` turns. The TypeScript side folds each turn with the existing reducer: `beginTurn(text)`, `startRun('history')`, `receiveEvent` for each event, then a `Done` (`status` ends `idle`).
   Reuses summary truncation and tool grouping; keeps `toolTarget` in one place (TypeScript).
2. A new TypeScript-only parser. Duplicates `result_text` and the 500-char rule and puts `.jsonl` reading in a service anyway (Tauri fs). No benefit over 1 except avoiding an IPC DTO change.

The slug rule (how `<vault>` becomes `-Users-...` in the dir name) and the config-dir resolution (`CLAUDE_CONFIG_DIR`) belong to the path-mapping research; I did not verify them here.

## 7. Open design constraints from the code

- `receiveEvent` drops events whose `runId` differs from `state.runId` (`:115-117`), so a restore that reuses `receiveEvent` needs a synthetic run id set with `startRun`, or a new pure `chatFromHistory(turns)` in `claude.logic.ts` that builds `messages` directly. The second keeps the reducer untouched and is testable without stores (CLAUDE.md: `.logic.ts` holds pure logic, never mocked).
- Store getters are the public surface (`claude.store.svelte.ts`); a restore needs one new store method (for example `restore(messages, sessionId)`), since `newChat`/`reset` are the only writers besides the event path.
- The restore must not start while a vault switch is in flight: `resetClaude()` runs inside `teardownVault`, and Issue 09 (`.scratch/claude-code-integration/issues/09-stale-run-after-vault-switch.md`, needs-triage) documents a stale-run leak into a new vault's chat. A restore keyed by vault path inherits the same race.
- A sessionId pointer is needed even if messages come from the transcript: either persist it per vault (where? `<vault>/.kokobrain/settings.json` is shared with the vault, and the spec accepted per-vault settings for `claudeCode.*`, see spec line 47) or pick the newest `sdk-cli` transcript. Choice between these is a product decision, not decided here.
- `--resume` might not keep the same session id on the next turn. The reducer already tolerates a changed id (it takes the id from every `Init` and `Result`, `claude.logic.ts:124`, `:153`), but a stored id must be rewritten on each turn. UNVERIFIED whether the CLI forks to a new file on resume in print mode.

## Open questions

1. Is file order of `user`/`assistant` lines the conversation, or must a converter follow `parentUuid` from a leaf? Evidence of siblings exists (section 5); no check of what the siblings are.
2. Which transcript does a panel-spawned turn write, and what are its `entrypoint` and `promptSource`? The only `sdk-cli` files might come from another launcher; the capture session's file is absent.
3. Does `--resume` in print mode append to the same file or create a new session id and file?
4. Exact storage of slash-command prompts with arguments (`<command-args>` tag layout) and of skill-invoked prompts (`skill-format`).
5. How a spilled large tool result looks in the `tool_result` block (marker text, preview length).
6. Should `contextNotes` chips be restored, and where would a session pointer live (vault settings, per-machine store, or transcript scan)?
7. Should restore show all turns or the last N, given a 4.4 MB transcript and a 139 KB line? Parsing cost on the main thread versus Rust was not measured.
8. Do interrupted-turn prompts (interrupt marker lines) show as user bubbles or get hidden?

## Claims to verify

1. `toolTarget` is the only place a tool target is computed; Rust sends full `input` (`claude.logic.ts:186-193`, `stream.rs:228-232`).
2. Nothing in `src/lib/features/claude-code` persists chat state (grep for `localStorage|sessionStorage|persist` empty); restart leaves `EMPTY_CHAT` plus a re-attached active note (`AppShell.svelte:85-91`).
3. `dispatch_line` on a transcript `user` string-prompt line returns no events and on `assistant`/`user tool_result` lines returns the same `ToolStart`/`TextDelta`/`ToolResult` shapes as live (read from `stream.rs:220-260`; not executed against a real transcript line).
4. Each assistant transcript line holds one content block (8 lines to 4 message ids in a `sdk-cli` file; thinking 533, tool_use 751, text 331 overall).
5. Non-prompt user lines: `isMeta` true for all 13 `local-command-caveat` and 2 `system-reminder`, false for `task-notification`, `local-command-stdout`, `bash-*` (jq tabulation, section 5).
6. Subagent output is not inline in top-level transcripts (all 1615 assistant lines `isSidechain` false; `subagents/` dirs exist).
7. `sessionId` is passed only through `claude.service.ts:37` into `turn.rs:100-102` as `--resume`.

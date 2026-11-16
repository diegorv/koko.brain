# 06 - Kokobrain's own persistence, and store-vs-read for chat history

Research only. Branch `mvp-claude`, claude CLI 2.1.325. Paths: `<vault>` is the open vault, `~` the home dir. No transcript text, titles or note content appears here; only structure and counts.

## 1. How Kokobrain persists UI state today

There are four stores. Nothing uses the Tauri app data dir.

| Store | What | Evidence |
|---|---|---|
| `<vault>/.kokobrain/settings.json` | All settings, layout sizes, panel visibility, `claudeCode.*` | `src/lib/core/settings/settings.service.ts:12-14` (dir and file constants), `settings.types.ts:401` (`AppSettings` is "persisted as `.kokobrain/settings.json`") |
| Other `<vault>/.kokobrain/*` files | `kokobrain.db` (+ `-wal`, `-shm`), `vault-index.msgpack`, `models/`, `folder-order.json`, `auto-organize-rules.json`, `bookmarks.json`, `trash/`, `snapshots-backup/`, `logs/` setting, `mods/<id>/data.json` | `src-tauri/src/db/mod.rs:38`, `src-tauri/src/vault/index_cache.rs:46-51`, `src/lib/core/filesystem/fs.service.ts:24-45`, `src/lib/core/trash/trash.logic.ts:4`, `src/lib/plugins/mods/mods.logic.ts:11` |
| Webview `localStorage` (per machine, not per vault) | Recent vaults (`kokobrain:recent-vaults`), quick-switcher recent files (`kokobrain:recent-files`), command palette recents, mods-enabled vault list and disabled mods, composer draft, last theme CSS vars | `src/lib/core/vault/vault.store.svelte.ts:3,44-57`, `src/lib/features/quick-switcher/quick-switcher.store.svelte.ts:1-22`, `src/lib/plugins/mods/mods-enabled.store.svelte.ts:12-18`, `src/routes/composer/+page.svelte:15`, `src/lib/core/settings/theme.service.ts:9` |
| OS log dir `~/Library/Logs/<bundle-id>/` | Per-session debug logs only | `src/lib/utils/log.service.ts:42-68` (`appLogDir()`), CLAUDE.md "Log file location" |

Command run: `grep -rIn -e app_data_dir -e appDataDir -e app_config_dir -e local_data -e BaseDirectory -e dirs:: src src-tauri/src` returned no hit in app code (the `.kokobrain/mods` hit is a vault path). There is no `tauri-plugin-store` (grep of `package.json` and `src-tauri/Cargo.toml` is empty).

### Tab and workspace restore: not present

I found no code that saves or restores open tabs. `editor.store.svelte.ts` has no persistence call (grep for `persist|localStorage|settings` in it returned nothing), `app-lifecycle.service.ts` only saves dirty tabs on vault switch (`:183-193`) and reloads externally changed tabs (`:512`), and the only "restore" hit in `src/lib/core/editor` is a scroll position consumed once per tab switch (`editor.store.svelte.ts:11`). What is saved of the layout is panel visibility and pane sizes inside `settings.json` (`settings.types.ts:50,96-112`, including `claudeVisible` at `:106`). UNVERIFIED that no other module restores tabs: my search covered `src/lib/app`, `core/editor`, `core/layout`, `core/vault` and the settings types, not every feature folder.

Consequence: the Claude chat is the first per-vault, restart-surviving UI content that would not be a setting or a derived cache. It has no precedent to copy for "a list of records that grows".

### Settings write path (the main pattern)

- Frontend plugin-fs, not Rust: `writeSettingsFile` does `exists(dir)`, `mkdir(dir)`, then `writeTextFile(file, content)` (`settings.service.ts:263-279`). This is NOT atomic (plugin write truncates in place). It is the "single write site for settings".
- Debounce: a `$effect.root` re-serializes the whole settings object on every change and arms a 500 ms timer (`settings-persistence.svelte.ts:12,64-78`). It skips writes when the serialized text equals `lastWritten` (`:75`, `:93-94`).
- Flush on quit and vault switch: `flushSettingsPersistence` / `stopSettingsPersistence` (`:87-130`). The path is captured at start, never re-read from `vaultStore`, because teardown of the old vault runs after the store points at the new one (`:41-44`).
- Corruption safety: a file that does not parse is copied byte for byte to `settings.broken-<stamp>.json` before defaults overwrite it; an unreadable file puts the session in `file-protected` and nothing is written (`settings.service.ts:21-72`).
- Capability scope: plugin-fs write is allowed for `$HOME/kokobrain-vaults/**` and `.../.kokobrain/**` (`src-tauri/capabilities/default.json:100-112`). `.claude` appears nowhere in the capabilities file (`grep -c '\.claude'` returned 0), so the webview cannot read `~/.claude` via plugin-fs; Claude transcripts need a Rust command.

### Atomic write path (Rust)

- `write_atomic(path, content)` in `src-tauri/src/utils/fs.rs:16-39`: writes `<path>.tmp-<pid>-<seq>` in the same directory, then renames over the target; refuses a read-only target; no fsync. A stray `.tmp-*` is possible after a crash and the watcher ignores such files (`indexing-watcher-rules.md` rule 5).
- `write_snapshot_atomic` in `src-tauri/src/vault/index_cache.rs:55-77`: tmp file, `sync_all`, rename (the only fsync in the repo's write helpers I read).
- Closest existing precedent for per-vault app data written by a feature: `write_mod_data` / `read_mod_data` (`src-tauri/src/commands/vault.rs:1185-1230`, `commands.ts:148-150`). Rust builds `<vault>/.kokobrain/mods/<mod_id>/data.json` from a validated one-segment id, creates parent dirs, calls `write_atomic`, touches no index and emits nothing. Reads return `Option<Vec<u8>>`, `None` only for NotFound, so a read error is not mistaken for "empty" (`:1219-1230`). A `claude` equivalent would copy this shape (fixed file name, no caller-chosen path).
- Everything under `.kokobrain/` is invisible to the vault scan and watcher (dot-prefixed hidden dirs: ADR-0019 anchors, `docs/agents/indexing-watcher-rules.md` rule 5), so writing chat files there does not trigger indexing.

### What the Claude panel stores today

- Chat is memory only: `claude.store.svelte.ts:4-5` ("lives in memory only, so a restart starts a new chat"). `ChatState` holds `messages`, `runId`, `sessionId`, `status`, `error`, `stopRequested`, `slashCommands` (`claude.logic.ts`, `ChatState`); `ChatMessage` is `{role:'user', text}` or `{role:'assistant', parts: (TextPart | ToolPart)[]}` with a tool part carrying `id`, `name`, `target`, `status`, `summary`.
- `sessionId` comes from the last `Init`/`Result` and is passed as `resumeSessionId` (`claude.service.ts:37`) -> `--resume <id>` (`src-tauri/src/commands/claude/turn.rs:100-101`).
- `resetClaude` clears chat and session on vault close (`claude.service.ts:77-87`) because the session is keyed to the vault directory.
- No `--no-session-persistence` is passed (`build_args`, `turn.rs:78-110`), so the CLI writes its own transcript each turn (see section 2).

## 2. Claude Code's own transcripts: what is on disk (structure only)

Measured on the vault's project dir `~/.claude/projects/<vault-slug>` (path is derived from the cwd, with `/` and `.` mapped to `-`):

- 31 `*.jsonl` files (one per session id), 3 same-named directories (per-session sidecar data), 1 `memory/` dir. 151 MB total.
- File sizes: min 74,776 B, median 495,655 B, max 4,380,713 B. Modification dates span 2026-10-26 to 2026-11-15.
- Entry `type` values seen (counts over all files): `attachment` 2227, `assistant` 1615, `user` 1050, `api-request` 811, `api-request-blob` 508, `last-prompt` 454, `atis-latch` 439, `system` 401, `permission-mode` 364, `mode` 373, `ai-title` 339, `queue-operation` 223, `file-history-snapshot` 187, `session-owner` 170, plus about ten smaller bookkeeping types (`cost-state`, `tools-used`, `bridge-session`, `custom-title`, ...). Only `user` and `assistant` entries are conversation; the rest is metadata, so a reader must filter.
- `user`/`assistant` entries carry (key names only): `uuid`, `parentUuid`, `sessionId`, `timestamp`, `cwd`, `gitBranch`, `version`, `entrypoint`, `isSidechain`, `isMeta`, `isCompactSummary`, `message`, `toolUseResult`, `slug`, `requestId`, `permissionMode`. `parentUuid` makes a tree, not a list (branches and `isSidechain` subagent turns exist), so "the conversation" needs a walk from the last leaf.
- `entrypoint` values per file: `cli` 14, `sdk-py` 14, `sdk-cli` 2, `t3-code` 1. So files from the terminal, other tools and `-p` runs mix in one directory. The 2 `sdk-cli` files are plausibly `claude -p` runs; UNVERIFIED which entrypoint Kokobrain's own turns write.
- The session id in the committed fixture `.scratch/claude-code-integration/research/stream-json-capture/turn.ndjson` has no file in this dir (checked by existence only). Either it was captured elsewhere or cleaned up; UNVERIFIED which.
- Transcript lines are not a stable public format: the types above include internal ones (`atis-latch`, `api-request-blob`, `wireIngestContext`). No doc I found specifies the JSONL schema. UNVERIFIED that any doc page promises it.

### Retention (`cleanupPeriodDays`)

- Docs: "Claude Code clients store session transcripts locally in plaintext under `~/.claude/projects/` for 30 days by default to enable session resumption. Adjust the period with `cleanupPeriodDays`." https://code.claude.com/docs/en/data-usage.md (section Data retention). Settings index row: "Choose how many days Claude Code keeps transcripts before deleting them", scope any file: https://code.claude.com/docs/en/settings-reference.md. Transcripts of sessions started or last continued in Claude Desktop or Cowork are exempt by default (same data-usage page).
- Binary strings (`grep -a -o` on `~/.local/share/claude/versions/2.1.325` with `LC_ALL=C`): the validation message "cleanupPeriodDays must be at least 1. To keep transcripts for a long time, set a large number (e.g. 3650 for ~10 years). To disable transcript writes entirely, remove this setting and use the --no-session-persistence CLI flag or the SDK persistSession:false option instead. (0 is rejected because ...)". Also a log string "Skipping retention cleanup: this session reads no stored server-managed settings ..." so cleanup runs in a later CLI process, not in a timer.
- The owner's `~/.claude/settings.json` does not set `cleanupPeriodDays` (python key check: absent), so the 30-day default applies. The oldest transcript in the vault dir is 2026-10-26, consistent with a rolling window but not proof of it (20 days old).
- Consequence for `--resume`: a Kokobrain chat older than the window has a session id whose transcript is gone. `--resume <id>` then fails; what the CLI prints for a missing session is not probed here (UNVERIFIED, belongs to another research file).
- Cleanup is by the CLI, on age, for every session in the dir, including those Kokobrain shows. The user can also change it from the terminal at any time.

## 3. Store in Kokobrain vs read Claude's transcripts

### Option A: Kokobrain stores its own chat (`<vault>/.kokobrain/claude/...`)

For:
- Exact fidelity to what the panel shows. The persisted shape is the existing `ChatMessage` plus `sessionId`; restore needs no parsing of an internal format. Tool cards (`target`, `summary`) are already reduced, so files stay small (a few KB per turn; no thinking, no `api-request-blob`, no tool results).
- Independent of `cleanupPeriodDays`: the chat stays readable after the CLI deletes the transcript. Honest limit: it then cannot be resumed, so the panel must show it read-only or start a new session with the old text only as display.
- Only Kokobrain-started chats appear, which matches the panel's mental model (the vault's agent chat), not 31 mixed sessions from the terminal, SDK scripts and t3-code.
- Fits ADR-0019 ("app data lives inside the vault") and the settings/mod-data precedent; `.kokobrain/` is hidden from scan and watcher.

Against:
- Duplicates data the CLI already holds; two copies of note-derived text. Plaintext, like the CLI's.
- Privacy if the vault is synced or in git. The owner's vault is a git repo (`.git` present) and `.kokobrain` is ignored there (`git check-ignore .kokobrain` printed "ignored"; `git ls-files .kokobrain` count 0). That is the owner's setup, not a guarantee: ADR-0019 only tells users to exclude `.kokobrain/` from sync (Consequences), and its 2026-11-06 amendment accepts a plaintext token there on the premise "the owner does not sync vaults". A chat holds far more note content than a token and is copied by any sync client that does not exclude `.kokobrain/`. Needs the same warning in the settings row, and a decision on the per-machine alternative (below).
- Sessions started in the terminal in the same vault never show up (they are not Kokobrain's). That is a feature if the panel is "my Kokobrain chats", a gap if the owner expects "all Claude sessions of this vault".
- Consistency with `--resume`: Kokobrain's saved `sessionId` and the CLI's transcript can diverge (CLI cleanup, `claude` run in a terminal that continues the same id, the user deleting `~/.claude/projects/...`). A terminal `--resume` of the same id would add turns Kokobrain never saw, so its copy is stale from then on. Detect by checking the transcript exists before enabling "continue", not by trusting the saved id. UNVERIFIED whether a terminal continuation appends to the same file or forks to a new id.
- New write path to build: atomic Rust write (copy `write_mod_data`), a size/age policy of its own, schema versioning, and a debounce. Streaming deltas arrive per token; persist on `Result`/`Done` and on user send, not per delta (see 4).

### Option B: read Claude's own transcripts (`~/.claude/projects/<cwd-slug>/*.jsonl`)

For:
- Zero duplicate storage, no privacy surface added by Kokobrain; the data stays where Claude Code already put it and under the owner's `cleanupPeriodDays` choice.
- Always matches what `--resume` will continue: same source of truth, same retention. Terminal sessions in the vault appear for free and can be continued from the panel.
- Docs state the location and the 30-day default (data-usage page above).

Against:
- Undocumented, internal, versioned format with tree structure, sidechains, compaction summaries and about 20 bookkeeping entry types (section 2). A parser can break on any CLI update; the repo pins no CLI version (it runs whatever `claude` is on the PATH).
- Cost: files up to 4.4 MB (median 0.5 MB, 151 MB in the dir). Listing sessions means reading at least the first/last lines of each; a full parse of one session means MBs of JSON, mostly `attachment` and `api-request` noise. Needs a Rust command and a cache; the webview cannot read `~/.claude` (no capability, section 1).
- Reconstructing the panel's view (text parts, tool cards with `target` and `summary`) from `message` blocks and `toolUseResult` is a second implementation of what `claude.logic.ts` does for the live stream, with different input shapes. Streaming partials are absent (only final messages), so a restored chat looks slightly different from the live one.
- Cross-source mix: entries from `sdk-py`, `t3-code` and other tools need filtering, or the list is noise. By `entrypoint` it is possible, but Kokobrain's own `-p` entrypoint value is unverified.
- Retention is not under Kokobrain's control: history older than 30 days disappears silently with no event.
- Reading `~/.claude` widens what Kokobrain touches outside the vault. The privacy workflow (`privacy.yml`) is about network calls, not file reads, so no gate trips, but a new Rust command that reads outside the vault is a new trust surface (ADR-0036 notes app commands have no IPC ACL, so any mod could call it). Needs a fixed-directory, read-only command, not a generic path reader.

### Option C: hybrid (store a thin index, read on demand)

Kokobrain stores only `{sessionId, startedAt, lastActiveAt, firstUserTextLength, turnCount}` per vault (no text), and restores the chat by parsing the transcript when opened. Smallest privacy footprint and consistent with `--resume`, but it inherits all of B's parser cost and still loses the chat after cleanup. A thin index does not remove the need for B's parser; only worth it if B is chosen and listing is slow.

### Comparison

| Concern | A: own store | B: read CC transcripts |
|---|---|---|
| Retention | Kokobrain's policy; survives CLI cleanup, but not resumable after it | CLI's `cleanupPeriodDays` (30 d default); gone when CC deletes |
| Size | Small (reduced `ChatMessage`), grows with use; needs own cap | None added; reads up to 4.4 MB per session |
| Privacy (synced/git vault) | New plaintext copy in `.kokobrain/`; relies on exclude | No new copy |
| Terminal sessions in the same vault | Not shown | Shown (and need filtering) |
| `--resume` consistency | Can diverge; verify transcript exists | Same source, cannot diverge |
| Format risk | Own schema, stable | Internal CC format, can change per release |
| Work | Rust atomic write + schema + cap | Rust reader + JSONL parser + cache + filtering |

## 4. If A is chosen: patterns to reuse

- Write: a Rust command in the `write_mod_data` mold (fixed filename under `.kokobrain/claude/`, `write_atomic`, `Option<Vec<u8>>` read). Avoid plugin-fs `writeTextFile` for a file that grows (non-atomic, as the settings write is; a crash mid-write truncates it). One file per session (`<session_id>.json`) keeps writes small and lets old ones be deleted independently; the session id must be validated as one path segment like `mod_id`.
- When to write: on turn end (`Done`/`Result`) and on send, not per delta. A debounce like settings' 500 ms (`settings-persistence.svelte.ts:12`) is unnecessary if writes are per turn. Flush on quit: the settings code needs an explicit flush because the window is destroyed before timers fire (`:79-82`); a turn that is running at quit is cancelled by Issue 11, so an interrupted turn would be saved as `stopped` or dropped, a choice to make.
- Where: `.kokobrain/` (ADR-0019) vs per machine (localStorage or app data dir). The repo's own precedent for "must not travel with a vault" is localStorage (`mods-enabled.store.svelte.ts:12-14`), whose point is that a vault copied from elsewhere must not arrive with the feature on. A chat is the reverse: it belongs to this vault but is sensitive. Either is defensible; the vault location keeps "copy the folder" but needs the sync warning.
- Restore: on `initializeVault` after settings load, read the newest session for the vault, rebuild `ChatState` with `status: 'idle'`, set `sessionId`. `resetClaude` at vault close must keep the saved file (it only clears memory).
- Tests (project rule: real stores, mock only Tauri): round-trip a `ChatState` through the serializer; corrupt file keeps the old chat and does not throw; empty dir restores `EMPTY_CHAT`.

## 5. Pointers for the PRD

- The decisive facts: (1) tabs are not restored today, so no existing pattern covers a growing per-vault record; the mod-data command is the closest and is atomic; (2) the CLI deletes transcripts after 30 days by default and the owner has not changed it; (3) the webview cannot read `~/.claude`; (4) transcripts are an internal, tree-shaped, 0.07-4.4 MB format mixing entrypoints.
- A clean split if both are wanted: Kokobrain stores the display copy (A) for chats it started; "continue" is offered only when the CLI transcript for that id still exists (existence check on `~/.claude/projects/<slug>/<id>.jsonl` by a fixed-path Rust command, no parsing).

## Open questions

- Does `claude -p` write its transcript under the same `<cwd-slug>` dir and with which `entrypoint` value? (Probe a `-p` turn in a temp dir and check, structure only.)
- What does `--resume <id>` print or exit with when the transcript was cleaned up? Needed to choose between "disable continue" and "try and show the error".
- If the owner continues a Kokobrain session id in the terminal, does the CLI append to the same file or fork a new session id? This decides how stale Option A's copy can get.
- Where should the chat live: `<vault>/.kokobrain/claude/` (portable, needs the exclude warning) or per machine? Owner call; the ADR-0019 amendment sets precedent only for a token in a vault the owner does not sync.
- Is a retention cap for Kokobrain's own chats wanted (count or age), or keep until deleted?
- Is "all Claude sessions of this vault, including terminal ones" in scope, or only chats started in the panel?
- Does any other module restore tabs (my search did not cover every feature folder)?

## Claims to verify

1. No code in `src` saves or restores open tabs; only layout sizes and visibility live in `settings.json` (`editor.store.svelte.ts` has no persistence; `settings.types.ts:50,96-112`).
2. `writeSettingsFile` uses plugin-fs `writeTextFile` and is not atomic, while `write_atomic` (`utils/fs.rs:16`) is atomic via tmp+rename and is used by `write_mod_data` (`commands/vault.rs:1202-1212`).
3. The settings debounce is 500 ms and skips unchanged content (`settings-persistence.svelte.ts:12,75,93`).
4. No Tauri app data dir or `tauri-plugin-store` is used anywhere in app code.
5. `src-tauri/capabilities/default.json` contains no `.claude` scope, so the webview cannot read `~/.claude` through plugin-fs.
6. Claude Code keeps local transcripts under `~/.claude/projects/` for 30 days by default, adjustable with `cleanupPeriodDays` (docs URL above); the owner's `~/.claude/settings.json` does not set it.
7. The vault's project dir holds 31 session files, 151 MB, median 495,655 B, max 4,380,713 B, and entrypoints `cli`, `sdk-py`, `sdk-cli`, `t3-code` are mixed.
8. `build_args` does not pass `--no-session-persistence`, so every Kokobrain turn writes a CLI transcript (`turn.rs:78-110`; whether the file lands in the vault slug dir is open question 1).
9. In the owner's vault `.kokobrain` is git-ignored (`git check-ignore` result); ADR-0019 only advises excluding it from sync.

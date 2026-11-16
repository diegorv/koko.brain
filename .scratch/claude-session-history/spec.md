# Claude panel chat history across restarts

**Status:** ready-for-agent (Issues 01-03)

## Goal

A chat in the Claude panel survives an app restart: the last chat comes back when the vault opens, and older chats can be reopened from a list and continued. Builds on the Claude Code panel (`.scratch/claude-code-integration/`, branch `mvp-claude`).

## Decisions (owner, 2026-11-15)

| Topic | Decision |
|---|---|
| What is stored | Kokobrain keeps its own display copy of each panel chat (messages, session id, title). The CLI keeps the model context, reached only through `--resume <session_id>`. Kokobrain does not read `~/.claude/projects` transcripts. |
| Where | One JSON file per chat at `<vault>/.kokobrain/claude/chats/<chatId>.json`, written atomically like mod data. Travels with the vault (ADR-0019); the owner's vault ignores `.kokobrain` in git. |
| On vault open | The newest chat comes back, with a one-line notice ("Restored last chat. New chat starts over."). No tokens are spent until the next send. |
| Attached notes | Not stored. The active note is attached on panel open as today, and claude-code-integration Issue 14 makes later chips reach a resumed turn. |
| Retention | No cap. A row in the history list can be deleted, which removes only Kokobrain's file; CLI transcripts stay untouched. |
| Terminal sessions | Not listed. |

## Research

`research/` holds the deep dive (2026-11-15, claude 2.1.325): scouts `01`-`08`, validators `validate-format.md` and `validate-app.md`, and `synthesis.md`. Section 4 of the synthesis lists scout claims that were refuted; do not quote them.

## Why not read the CLI transcripts

The transcript format is internal and unstable per the docs; a panel turn's transcript has no title; transcripts are deleted after `cleanupPeriodDays` (default 30, by mtime); the project dir is keyed by the vault's realpath with a lossy encoding; and rebuilding the panel's message model from it means reclassifying meta, command and interrupt lines (synthesis section 5, alternatives).

## How it works today

- Chat, `sessionId` and chips live in memory only (`claude.store.svelte.ts:4-7`); a restart or vault switch gives an empty chat plus the re-attached active note.
- `sessionId` comes from `Init` and `Result` (`claude.logic.ts:124,153`) and reaches the CLI only as `--resume` (`turn.rs:100-102`).
- `ChatMessage` is already reduced for display: no thinking, tool summaries cut at 500 chars, targets at 80.
- Per-vault atomic file precedent: `write_mod_data` / `read_mod_data` (`src-tauri/src/commands/vault.rs:1206-1230`, `utils/fs.rs` `write_atomic`).

## CLI facts this relies on (synthesis section 3, G2-G3)

- `--resume <id>` keeps the id and appends to the same transcript, from any cwd.
- An unknown or pruned id gives exit 1 and one `result` line: `subtype` `error_during_execution`, `is_error` true, `num_turns` 0, `errors[0]` starting `No conversation found with session ID: `, no `system/init`. Other zero-turn errors exist (G6), so the text decides.

## Constraints

- A turn's reply is saved only into the chat and vault it ran in; after a vault switch it is not saved at all. Issue 02 also takes the run-id half of claude-code-integration Issue 09 (a run that resolves after a reset attaches to the new chat), because relay-lite cannot express a blocker in another feature.
- Chat files hold note-derived text; a synced vault copies them. Accepted with the location decision.
- A turn still running at quit loses its partial reply in Kokobrain's copy (the CLI transcript keeps it). Accepted in v1.

## Delivery

The panel code exists only on `mvp-claude` until PR #247 merges. Relay-lite's base is `main` (f157205b3), so run these Issues after the merge, or with the base set back to `mvp-claude`.

## Later (not v1)

Listing terminal sessions of the vault (would need reading CLI transcripts); saving a partial reply at quit through the `src/lib/app/` exit listener; a retention cap; search across chats.

## Issues

| # | Issue | Blocked by | Status |
|---|---|---|---|
| [01](issues/01-gone-session-starts-over.md) | A resume whose session is gone keeps the chat and starts a new session | none | ready-for-agent |
| [02](issues/02-save-and-restore-last-chat.md) | Panel chats are saved in the vault, and the last one comes back | 01 | ready-for-agent |
| [03](issues/03-chat-history-list.md) | A history list reopens and deletes older chats | 02 | ready-for-agent |

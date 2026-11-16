# Discovery: Issue 03, a history list reopens and deletes older chats

Builds on `work/02` (chat files, `claude_chat_list` / `claude_chat_read`, `restore`). Only what differs is listed.

## Files that change

- `src-tauri/src/commands/claude/chats.rs`: `claude_chat_delete(vault_path, chat_id)` through `chat_path` (canonical UUID check), `NotFound` is `Ok(())`. Registered in `src-tauri/src/lib.rs:396-398`.
- `src-tauri/tests/commands/claude_chats_test.rs`: delete tests next to the existing ones (removes only that file, missing file ok, bad ids refused, another chat and a sibling file untouched).
- `src/lib/contracts/commands.ts:232-236,345-347`: `claude_chat_delete` in `CommandMap` and `COMMAND_ARGS`.
- `claude.service.ts`: `ChatHistoryRow { chatId, title, modifiedMs }`; `loadChatHistory(vaultPath)` (list, then read and parse each file; `null` when the vault changed or a turn runs at resolve); `openChat(vaultPath, chatId)` (refused while running; read; dropped when the vault changed or a turn started; restores through `claudeStore.restore`; an unreadable file throws); `deleteChat(vaultPath, chatId)` (refused while running; deleting the open chat calls `newChat()`).
- `ClaudePanel.svelte:204-207,220-267`: `history` icon button (aria-label "Chat history", `aria-pressed`, disabled while running) before New chat; local `view: 'chat' | 'history'`; the history list replaces `data-claude-messages`; Escape on the panel (not already handled) goes back; rows with title, relative time (`formatRelativeTime` from `features/type-definitions/type-sidebar.logic.ts:269`, seconds), open row `aria-current`, delete button per row; empty text "No saved chats for this vault yet."
- `help/documentation/07-sidebar-panels.md:155-160`.
- Tests: `claude.service.test.ts`, `ClaudePanel.test.ts` (copy the `restoreLastChat` and restored-notice tests).

## Plan (test-first, one commit per step)

1. Rust delete + test, contracts.
2. Service functions + tests (stale vault, turn started, unreadable rows skipped, delete of open chat).
3. Panel view + tests; help page.

## Defaults taken

- The list loads when the view opens and again when the vault path changes while it is open; a delete drops the row locally. No load counter: the service's vault check drops the only stale load that matters (a vault switch), and two loads of one vault give the same rows.
- Clicking the open chat's row goes back without a read, so a live error line is not replaced by the disk copy.
- A row whose file is gone or cannot be parsed is left out of the list (logged, left on disk), like `restoreLastChat`. A row whose read fails is left out too, so one bad file does not hide the list.
- Sending a prompt from the history view goes back to the chat: the history button is disabled while the turn runs, and the disabled prompt drops focus, so neither the button nor Escape could leave the list until the turn ended. Rows stay disabled while running anyway (store-driven).
- Deleting the open chat runs the service `newChat()`, the same as the New chat button (active note attached).
- A chat opened from the list shows Issue 02's notice unchanged ("Restored last chat. New chat starts over.").
- Open or delete failures show one inline line in the list (`role="alert"`).

## Risks

- `formatRelativeTime(0)` returns ''; mtimes are never 0 in practice.
- Escape inside the note picker also closes the history view (its handler does not `preventDefault`); harmless.

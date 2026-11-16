# Discovery: Issue 02, panel chats saved in the vault, last one restored

## Files that change

- Rust: new `src-tauri/src/commands/claude/chats.rs` (`claude_chat_write`, `claude_chat_read`, `claude_chat_list`, DTO `ClaudeChatEntry { chatId, modifiedMs }`), `pub mod chats;` in `commands/claude.rs:13-15`, registration in `src-tauri/src/lib.rs:393-395`. Precedent: `mod_data_path` / `write_mod_data` / `read_mod_data` (`commands/vault.rs:1185-1230`), `vault_fs::validate_vault_path`, `write_atomic` (`utils/fs.rs:16`).
- Tests: new `src-tauri/tests/commands/claude_chats_test.rs` (+ `tests/commands/mod.rs`), copying `read_mod_data_*` tests (`tests/vault_file_ops_test.rs:237-289`).
- Contracts: `src/lib/contracts/commands.ts` (CommandMap ~229, COMMAND_ARGS ~337), `index.ts:7-10` export, generated `ClaudeChatEntry.ts`.
- `claude.logic.ts`: `ChatState` gains `chatId`, `createdAt`, `restored`; `beginTurn(state, text, fresh)` keeps an existing identity; `StoredChatV1`, `chatTitle`, `storedFromChat`, `chatFromStored`, `restoreChat`.
- `claude.store.svelte.ts`: getters `chatId`, `createdAt`, `restored`; `beginTurn(text)` passes a fresh `crypto.randomUUID()` / ISO time; `restore(restored | null)`, no-op while `running`.
- `claude.service.ts`: save target `{ vaultPath, chatId, runId }` captured at send; save before `claude_run_turn` (after the dirty-tab check); late run id cancelled; `saveChatOnDone(payload)`; `restoreLastChat(vaultPath)`.
- `src/lib/app/tauri-listeners.service.ts:117-119`: call `saveChatOnDone` after `claudeStore.receive`.
- `src/lib/app/lifecycle/app-lifecycle.service.ts:541-557`: Step 9 timer calls `restoreLastChat(vaultPath)` with `.catch(error)`.
- `ClaudePanel.svelte:220-225`: notice line when `claudeStore.restored`.
- `help/documentation/07-sidebar-panels.md:151-160`.

## Plan (test-first per step, one commit each)

1. Rust commands + tests. Canonical id: `Uuid::parse_str(id)` ok and `.hyphenated().to_string() == id`. List: missing folder -> `[]`; only regular files named `<canonical uuid>.json`; mtime in ms; newest first, ties by id.
2. Logic: schema v1, title (first user text, whitespace collapsed, at most 80 chars with `...` like `toolTarget`), round trip, `running` tool -> `stopped`, null for bad version / malformed JSON / bad shapes. Identity rules in `beginTurn` / `resetChat` / `restoreChat`; Issue 01's gone-session path does not touch them.
3. Store `restore` + getters; service save/late-run/restore; listener hook; lifecycle Step 9; panel notice; help.

## Defaults taken

- `createdAt` / `updatedAt` are ISO 8601 strings; the file is `JSON.stringify(stored, null, '\t')`.
- The send save runs after the dirty-tab check (a turn that never starts writes nothing) and is awaited before `claude_run_turn`, so it cannot land after the `Done` save. A failed save logs with `error()` and the turn goes on.
- A spawn failure whose `Done` is replayed by `startRun` also saves (that `Done` ended the current run).
- Late run: attach only while `status === 'running' && runId === null && chatId === target.chatId`; otherwise `claude_cancel_turn` with the returned id (failure logged), no throw.
- `restore(null)` is the explicit reset (empty chat, slash commands and notes kept). Both are no-ops while a turn runs, so a prompt sent before Step 9 finishes is not wiped.
- Vault check in `restoreLastChat` is `vaultStore.path === vaultPath` after each await; Step 9's `initVersion` guard covers a superseded init.
- A corrupt file logs through `error()` and is left on disk.
- The notice goes at the top of the message list, muted.

## Risks

- `crypto.randomUUID` must exist in WKWebView (secure context: tauri:// is) and vitest (Node global).
- Existing service tests that count `invoke` calls: `claude_chat_write` now also goes through `invoke`.

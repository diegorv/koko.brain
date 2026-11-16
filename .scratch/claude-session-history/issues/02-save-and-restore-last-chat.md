# 02: Panel chats are saved in the vault, and the last one comes back

**What to build:** Each panel chat is written to `<vault>/.kokobrain/claude/chats/<chatId>.json` when a prompt is sent and when its turn ends, and the newest one is loaded back into the panel when the vault opens, so the next message continues it with `--resume`.

**Blocked by:** 01

**Files:** src-tauri/src/commands/claude.rs,src-tauri/src/commands/claude/,src-tauri/src/lib.rs,src-tauri/tests/commands/,src/lib/contracts/,src/lib/features/claude-code/,src/lib/app/,src/tests/lib/features/claude-code/,src/tests/lib/app/,help/documentation/07-sidebar-panels.md

**Status:** ready-for-agent

**Gate:** Both: `cargo test --manifest-path src-tauri/Cargo.toml` (commit the regenerated `src/lib/contracts/generated/` if a DTO is added), `pnpm check`, `pnpm vitest run`.

- [ ] Failing tests first: Rust command tests, logic round-trip tests, store, service, listener and lifecycle tests, panel test for the notice.
- [ ] **Rust.** Async commands modelled on `write_mod_data` / `read_mod_data` (`src-tauri/src/commands/vault.rs:1206-1230`):
  - `claude_chat_write(vault_path, chat_id, content)`: atomic (`write_atomic`), creates the folder.
  - `claude_chat_read(vault_path, chat_id) -> Option<String>`: `None` only for NotFound; invalid UTF-8 and other read errors are errors.
  - `claude_chat_list(vault_path)`: chat ids with modification time, newest first; a missing folder gives an empty list; any file not named `<chatId>.json` is skipped (this also skips `write_atomic` temp files).
  - A `chat_id` is accepted only in canonical lowercase hyphenated form (`Uuid::parse_str` succeeds and its hyphenated string equals the input; braced, `urn:` and simple forms are rejected) before any path is built. Content is an opaque string to Rust.
- [ ] **Schema.** `claude.logic.ts`: stored schema v1 (`version`, `chatId`, `sessionId`, `createdAt`, `updatedAt`, `title`, `messages`) with pure `storedFromChat` / `chatFromStored` and the title (the first prompt, one line, cut at 80 chars). `chatFromStored` returns null for an unknown version or a malformed file. Round trip keeps messages, `sessionId`, `createdAt` and title; a restored tool part that was `running` becomes `stopped`.
- [ ] **Chat identity.** `chatId` and `createdAt` are null in the empty chat and after New chat; the first send of a chat assigns both; `restore` takes both from the file; Issue 01's gone-session path keeps them. Test: New chat, then two sends, gives one chat id whose `createdAt` does not change.
- [ ] **Restore.** The store's `restore(stored)` works only while no turn runs (`status !== 'running'`, so also after a failed turn); the restored chat has no `runId`, keeps `slashCommands`, and leaves `contextNotes` unchanged.
- [ ] **Save.** At send the service captures `{ vaultPath, chatId, runId }`. It saves on send, and on `Done` only when that `Done` ended the current run of the same `chatId` in the same vault; otherwise it writes nothing anywhere. Never per delta. The `claude-event` listener (`src/lib/app/tauri-listeners.service.ts`) calls a service function after `claudeStore.receive` for this (listener test). A failed save logs through `error()` and does not interrupt the chat. Test: a turn sent in vault A, a switch to B, then A's `Done`: no `claude_chat_write` call at all.
- [ ] **Late run id.** A `claude_run_turn` that resolves after the chat was reset attaches no run id and is cancelled (`claude_cancel_turn` with the returned id). This is the first half of claude-code-integration Issue 09; if 09 has landed, this is already met.
- [ ] **Vault open.** `initializeVault` Step 9 (`src/lib/app/lifecycle/app-lifecycle.service.ts:533`, behind the `initVersion` guard) lists and reads the newest chat and restores it, re-checking the vault path after each await; a read that resolves after a switch is dropped. With no chat file, or a corrupt one (left on disk, not thrown), it resets the chat explicitly, so a quick double switch that skips `teardownVault` cannot carry the previous vault's chat over. Tests in `src/tests/lib/app/lifecycle/app-lifecycle.service.test.ts`: the open restores, a superseded init does not.
- [ ] **Notice.** A restored chat shows "Restored last chat. New chat starts over." until the next send or New chat.
- [ ] **Restart.** A test simulating a restart (store reset, vault open): messages and `sessionId` match the last saved chat, and the next send passes `resumeSessionId` with it.
- [ ] **Help.** The Claude section of the help page says chats are kept in the vault's `.kokobrain` folder and the last one comes back.

## Notes

- Decisions and evidence: `spec.md`, `research/synthesis.md` section 5, `research/validate-app.md`.
- `src/lib/app/lifecycle/` is the composition root, exempt from the outbound layer rules (`layer-rules.test.ts:155-160`); it already calls `resetClaude` (`app-lifecycle.service.ts:73,685`).
- `.kokobrain` is skipped by the scan (`src-tauri/src/utils/fs.rs:177-178`) and by the watcher, so chat files need no indexing work.
- **Delivery:** the panel code exists only on `mvp-claude`; see `spec.md`.

## Comments

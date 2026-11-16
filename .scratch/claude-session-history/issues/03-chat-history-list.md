# 03: A history list reopens and deletes older chats

**What to build:** A history button in the panel toolbar shows the vault's saved chats, newest first; a row reopens that chat, and a row's delete button removes its file.

**Blocked by:** 02

**Files:** src-tauri/src/commands/claude/,src-tauri/src/lib.rs,src-tauri/tests/commands/,src/lib/contracts/,src/lib/features/claude-code/,src/tests/lib/features/claude-code/,help/documentation/07-sidebar-panels.md

**Status:** ready-for-agent

**Gate:** Both: `cargo test --manifest-path src-tauri/Cargo.toml`, `pnpm check`, `pnpm vitest run`.

- [ ] Failing tests first: Rust delete test, service and panel tests.
- [ ] A history icon button next to New chat (disabled while a turn runs) replaces the message area with the list; the same button or Escape goes back to the chat.
- [ ] Rows show the chat title and the relative time of the file's modification time (the order `claude_chat_list` returns), newest first; the open chat is marked. With no saved chats the list says so.
- [ ] Clicking a row while no turn runs restores that chat (Issue 02's `restore`) and goes back to the chat view. While a turn runs, rows and their delete buttons are disabled.
- [ ] `claude_chat_delete(vault_path, chat_id)` removes only `<vault>/.kokobrain/claude/chats/<chatId>.json`, with Issue 02's canonical UUID check; a missing file is not an error. Deleting the open chat leaves the panel on a new empty chat. CLI transcripts are never touched.
- [ ] A list or chat read that resolves after the vault changed or a turn started is dropped.
- [ ] The help page describes the history list.

## Notes

- UX evidence: `research/08-ux-and-edges.md` section 2. The list reads each chat file for its title; files are small (`research/validate-app.md`).
- **Delivery:** the panel code exists only on `mvp-claude`; see `spec.md`.

## Comments

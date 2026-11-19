# Issue 03 discovery: agent panel

Builds on `work/02` (contracts `ClaudeEvent`, `ClaudeTurnRequest`, `onClaudeEvent` in `features/claude-code/claude-code.service.ts:28`).

## Leading `-` prompt (retry, decision recorded)

The first build stopped here: Notes held no owner decision. Notes now record it (2026-11-14) and `Files` include `turn.rs` and `claude_turn_test.rs`; Issue 05 is delivered and the branch is rebased on it. Change: `build_args` (`src-tauri/src/commands/claude/turn.rs:85-109`) keeps the boolean `-p` first and ends with `--`, then the prompt. Tests in `src-tauri/tests/commands/claude_turn_test.rs:106-165`: update the two exact-args tests, add one for a prompt starting with `-` and assert a `/name` prompt also follows `--`. The panel side already passes the text unchanged. No `#[ts(export)]` doc changes, so the bindings stay as they are.

## Files that change

- `src/lib/features/claude-code/claude.logic.ts` (new): chat state reducer (`beginTurn`, `startRun`, `receiveEvent` with buffering/stale rules, `failTurn`, `resetChat`), `slashQuery`/`filterSlashCommands`, `toolTarget`, `normalizeVaultPath`, `activeNoteContextPath`, `renderReplyHtml` (wikilinks -> `#wikilink=` links, then `renderCanvasMarkdown` from `features/canvas/canvas-markdown.logic.ts:14`), `replyLinkAction`.
- `claude.store.svelte.ts` (new): one `$state` chat + `contextNotes`, getters, thin methods over the logic.
- `claude-code.service.ts`: `sendPrompt`, `stop`, `newChat`, `attachActiveNote`, `addContextNote`.
- `ClaudePanel.svelte` (new): messages, tool cards (`<details>`), chips, note picker (`flattenFileTree` + `filterAndRank` + `quickSwitcherStore.recentPaths`, as `QuickSwitcher.svelte:21-23`), slash menu, prompt box, Stop / New chat, running notice, status block when `claude` is missing (`checkClaudeStatus`, Settings link via `settingsPanelStore.open('claude-code')`).
- `core/settings/settings.types.ts:95-110` + `settings.store.svelte.ts:66-70`: `layout.claudeVisible` (default false).
- `core/layout/layout.service.ts`: `toggleClaudePanel()` (turning on also shows the right sidebar).
- `app/AppShell.svelte:275-293`: Claude panel alone in the right sidebar when `claudeVisible && claudeCode.enabled`, else the old sections.
- `app/commands.ts`: "Toggle Claude Panel" (`Cmd+Shift+A`, free in the app and CodeMirror keymaps) and "Add to Claude context", both left out when disabled; `app/global-keybindings.ts`: binding, no-op when disabled.
- `app/tauri-listeners.service.ts` + `routes/(app)/+layout.svelte:47-67`: `registerClaudeEventListener`.

## Rules (defaults taken)

- Buffer: an event whose `runId` is not the store's is buffered only while a turn awaits its id (`status running`, `runId null`); `startRun(id)` replays that id's buffer and drops the rest. Otherwise it is stale and ignored.
- `Done` clears `runId`, `running -> idle`; `Error` and `Result.isError` set `status error` + inline message. `ThinkingDelta` is not shown. `Result.text` is used only when no text streamed.
- `sessionId` comes from `Result` only (criterion); `slashCommands` from `Init`, kept across New chat.
- A failed `saveAllDirtyTabs` (returns failed paths) aborts the send with an inline error: sending would let the dirty tab overwrite Claude's edit.
- `vaultPath` sent without trailing slashes. Note picker lists `.md` files only.

## Prior art

- `src/tests/lib/features/claude-code/ClaudeCodeSection.test.ts` (jsdom mount, `invoke` mock), `claude-code.service.test.ts`, `src/tests/lib/app/AppShell.test.ts:210-293`, `commands.test.ts`, `global-keybindings.test.ts`, `layout.service.test.ts`, `tauri-listeners.service.test.ts`.

## Risks

- Stop before `claude_run_turn` resolves does nothing (no run id yet).
- The fixture swap (real `stream.ndjson`) needs a paid manual run: not done here.

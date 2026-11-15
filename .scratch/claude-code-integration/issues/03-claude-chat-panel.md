# 03: Agent panel: chat, note context, slash commands

**What to build:** A "Claude" panel in the right sidebar (new `layout.claudeVisible` flag, toggled by a command palette entry and a keybinding) under `src/lib/features/claude-code/`: message list, streaming assistant text, collapsed tool cards, a prompt box with send and stop, attached notes as removable chips, slash-command autocomplete and a "New chat" action.

**Blocked by:** 02

**Status:** ready-for-agent

**Gate:** `pnpm check` + `pnpm vitest run`

- [ ] `claude.store.svelte.ts`: messages (user, assistant with text and tool cards), `runId`, `sessionId`, `status` (`idle`, `running`, `error`), `contextNotes` (vault-relative paths), `slashCommands`. Getters tested. The reducer that applies each `ClaudeEvent` lives in `claude.logic.ts`, pure, tested for every event type and for events of a stale `runId` (ignored).
- [ ] Note context: opening the panel attaches the active note when there is one; the user can remove any chip, attach more notes (a note picker reusing the quick switcher's search, and the "Add to Claude context" command on the active note) or send with no notes to work on the vault as a whole. Chips persist for the chat until removed or "New chat".
- [ ] `claude.service.ts`: `sendPrompt(text)` awaits `saveAllDirtyTabs()` before `invoke('claude_run_turn')`, passes the text unchanged, `context_note_paths` and `resume_session_id` from the last `Result`; `stop()` calls `claude_cancel_turn`; `newChat()` clears the session and the chips back to the active note. Errors propagate and show inline in the panel. Tests mock only `invoke` and `listen` and use the real store.
- [ ] Events for a `runId` the store has not seen yet are buffered, not dropped, until `claude_run_turn` resolves with that id: on a spawn failure Issue 02's runner emits `Error` and `Done` before the call returns (Issue 02 review, finding 3). Tested.
- [ ] A prompt that starts with `-` (a `- [ ] ...` list item, `--help`) reaches claude as the prompt, not as a CLI option: Issue 02 passes the prompt right after the boolean `-p`, so the CLI parses a leading `-` as a flag. Owner decision recorded in Notes: move the prompt to the end after `--` in `build_args` (Rust, with a unit test), or escape or refuse it in the panel (Issue 02 review, finding 2). Tested.
- [ ] Slash commands: typing `/` at the start of the prompt opens an autocomplete of `slashCommands`, filtered by what follows; picking one inserts `/name `. The list comes from the `Init` event and is kept in the store for the app session; before the first turn the menu is empty and says so. Filtering is a pure function, tested.
- [ ] One `claude-event` listener registered for the app lifetime next to the others in `src/lib/app/tauri-listeners.service.ts`.
- [ ] When the panel is visible it is the only right-sidebar section rendered (the chat needs the height); hiding it restores the other panels. Rendered in `src/lib/app/AppShell.svelte` beside the existing panels.
- [ ] Panel hidden and command disabled when `claudeCode.enabled` is false; shows the Issue 01 status with a link to Settings when the binary is missing.
- [ ] While running: Stop button, prompt box disabled, and a line saying that editing a note Claude is changing can overwrite its edit.
- [ ] Assistant text renders as Markdown (reuse the app's existing Markdown-to-HTML path used by read-only renders; find it with `node scripts/codemap.mjs q sym --match render` before adding anything). Wikilinks in the reply open notes.
- [ ] Component tests assert rendered content: a streamed reply, a tool card with its name and target, chips add and remove, the slash menu filtered, the error state, the disabled state.

## Notes

- The session lives only in memory; a restart starts a new chat.
- Right sidebar `maxSize` is 30 in `AppShell.svelte`; do not change it in this Issue.
- The CLI expands only a leading `/name`. A `/name` typed mid-text is sent as plain text; the autocomplete opens only at the start.
- Issue 02's stream fixture (`src-tauri/tests/fixtures/claude/stream.ndjson`) is hand-written. Capture a real `claude -p ... --output-format stream-json --verbose --include-partial-messages` run during this Issue's manual check and replace it, so CLI field-name drift is caught (Issue 02 review, finding 6).
- The runner's one-run-per-vault check compares `vault_path` as a raw string; always send it in one form (no trailing slash variants) (Issue 02 review, finding 5).

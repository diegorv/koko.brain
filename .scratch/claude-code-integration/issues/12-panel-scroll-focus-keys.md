# 12: Panel follows the reply, keeps focus, and handles IME and slash-menu keys

**What to build:** The Claude panel scrolls to new messages when the user is at the bottom, gives focus back to the prompt when a turn ends, keeps the highlighted slash command visible, and ignores keys that belong to an IME composition.

**Blocked by:** 10

**Files:** src/lib/features/claude-code/ClaudePanel.svelte,src/tests/lib/features/claude-code/

**Status:** ready-for-agent

**Gate:** `pnpm check` + `pnpm vitest run`

- [ ] Failing tests first, one per criterion below, in the panel's component tests.
- [ ] Autoscroll: when a message is added or the streamed reply grows, the message list scrolls to the bottom if it was within a small distance of the bottom before the update; if the user had scrolled up, it stays where it is. Use an `$effect` that reads the messages, `untrack` for the side effect and `tick()` before measuring (docs/PATTERNS.md).
- [ ] Focus: when a turn ends (status leaves `running`), the prompt gets focus again if it had focus when the prompt was sent.
- [ ] Slash menu: after ArrowUp or ArrowDown, including the wrap from the first to the last command, the highlighted option is scrolled into view (`scrollIntoView({ block: 'nearest' })`).
- [ ] IME: `onPromptKeydown` returns before any branch, the slash menu's included, when `e.isComposing` or `e.keyCode === 229` (WebKit sends the confirming Enter after `compositionend` with `isComposing` false and keyCode 229). Tested: such an Enter does not call `claude_run_turn`, and such an ArrowDown does not move the highlight.
- [ ] The slash menu's keyboard paths have tests: ArrowDown and ArrowUp with wrap, Enter and Tab insert `/name `, Escape closes the menu.

## Problem

From the PR #247 review (2026-11-15), confirmed by verifiers, all in `src/lib/features/claude-code/ClaudePanel.svelte`:

1. The message list (`:157`) never scrolls: after a few turns new messages, tool cards and the streamed reply land below the visible area.
2. The prompt is disabled while a turn runs (`:270`) and loses focus; nothing gives it back (`promptEl.focus()` only runs after picking a slash command, `:85`).
3. The slash list is `max-h-48` (about 7 rows) and the owner has about 125 commands; arrow keys move the highlight off screen (`:247`), and Enter inserts a command the user did not see.
4. Only the send branch checks `!e.isComposing` (`:107`); the slash-menu branches (`:89-106`) check nothing, and WKWebView's confirming Enter passes the check.
5. The slash menu's keyboard handling has no test (`src/tests/lib/features/claude-code/ClaudePanel.test.ts`).

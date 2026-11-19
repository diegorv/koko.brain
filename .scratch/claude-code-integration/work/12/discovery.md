# Issue 12 discovery: panel follows the reply, keeps focus, handles IME and slash-menu keys

Frontend only. Builds on `work/03` (panel) and the panel tests in `src/tests/lib/features/claude-code/ClaudePanel.test.ts`.

## Files that change

- `src/lib/features/claude-code/ClaudePanel.svelte`
  - Messages list (`:148`): `bind:this={messagesEl}`, `onscroll` records whether the list is within `FOLLOW_THRESHOLD` px of its bottom (plain `let`, not `$state`). An `$effect` reads `claudeStore.messages` (the chat object is replaced on every event, so a new message and a growing streamed reply both re-run it), and in `untrack` waits `tick()` then sets `scrollTop = scrollHeight` when the list was following.
  - Focus: `send()` (`:102`) records `document.activeElement === promptEl`. An `$effect` reads `claudeStore.isRunning`; when it is false and the flag is set, it clears the flag and, after `tick()` (the textarea is enabled again), focuses the prompt.
  - `onPromptKeydown` (`:77`): first line returns when `e.isComposing || e.keyCode === 229`. The send branch's own `!e.isComposing` check goes (covered by the guard).
  - Arrow keys (`:79-84`): after moving `slashIndex`, `tick()` then `scrollIntoView({ block: 'nearest' })` on the `aria-selected="true"` option of the menu (`bind:this={slashMenuEl}` on `:238`).
- `src/tests/lib/features/claude-code/ClaudePanel.test.ts`: new tests, one per criterion, and the slash-menu keyboard paths.

## Plan (test-first)

1. Tests for the slash keyboard paths (ArrowDown/ArrowUp with wrap, Enter and Tab insert `/name `, Escape closes); these pass on the current code and pin it before the change.
2. Failing tests: scrollIntoView after arrows (incl. wrap first -> last); IME Enter (isComposing, keyCode 229) sends nothing and IME ArrowDown keeps the highlight; autoscroll follows when at or near the bottom and stays when scrolled up; focus returns after Done when the prompt had it.
3. Implement in the panel; run the panel test file and `pnpm check`.

## Prior art

- `Element.prototype.scrollIntoView ??= () => {}` at file top (`src/tests/lib/plugins/mods/ModActionPicker.test.ts:34`); the slash tests replace it with a recorder for the call's `this` and options.
- jsdom has no layout: the autoscroll tests define `scrollHeight`, `clientHeight` and a backed `scrollTop` on the messages element and dispatch `scroll` to model the user's scroll.
- Seeding slash commands without a turn: the `opens only at the start of the prompt` test (`beginTurn`/`startRun`/`Init`/`Done`).

## Defaults taken

- "Near the bottom" is 32 px. "Before the update" is the position from the last `scroll` event: content growth fires no scroll, our own scroll to the bottom re-arms following, and a remount starts following, so a reopened panel lands on the latest message.
- Focus comes back only when nothing else holds focus at the turn's end (`document.activeElement` is the body or null). Otherwise a user typing in a note while Claude works would have keystrokes moved into the prompt. Tested.
- A turn that ends by `failTurn` (status `error`) counts as leaving `running`.

## Risks

- Content that grows without an event (an image in a reply loading) can leave the list short of the bottom until the next event.
- jsdom does not blur a disabled textarea; the focus test blurs it to model WKWebView.

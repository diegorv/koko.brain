VERDICT: APPROVED

## Previous findings

| # | Severity | Status | Evidence |
|---|----------|--------|----------|
| 1 | major | resolved | `ClaudePanel.svelte:49` adds `lastScrollTop`; the follow effect (`:84-88`) records it after setting `scrollTop`, and `onMessagesScroll` (`:107-112`) sets `following` only when `top >= lastScrollTop` and the list is within `FOLLOW_THRESHOLD`. A scroll event from the effect's own `scrollTop` write reads the same position, so it keeps `following` true. New test `stops following on a small scroll up during a streamed reply` scrolls 10 px up after an auto-follow, emits a TextDelta and checks the list stays put and the bottom has moved past the threshold. Probe: with `ClaudePanel.svelte` from 9d5923590, this test fails. The race where a delta lands before the user's scroll event is still there (see finding 1 below), at minor severity. |
| 2 | nit | resolved | `fakeMessageListLayout` (`ClaudePanel.test.ts:113-131`) derives `scrollHeight` from the text length of the rendered `[data-claude-message]` and `[data-claude-tool]` nodes, and the follow tests assert `scrollTop === layout.bottom` and that it grew. The Resolution says a synchronous `$effect` read without `tick()` cannot be told apart in jsdom; that holds, since Svelte 5 runs `$effect` after the flush's DOM update. The old test assertions were rewritten against the rendered bottom and not weakened: each one still checks the exact bottom and adds a "grew" check. |
| 3 | nit | resolved | `:102` adds `active === promptEl`. New test `focuses the prompt again when the engine kept focus on it while disabled` spies on `focus()`; it fails against the 9d5923590 panel (probe). Calling `focus()` on the element that already has focus does nothing visible. |

## Acceptance criteria re-checked

- [met] Autoscroll: when a message is added or the streamed reply grows, the message list scrolls to the bottom if it was within a small distance of the bottom before the update; if the user had scrolled up, it stays where it is. Use an `$effect` that reads the messages, `untrack` for the side effect and `tick()` before measuring (docs/PATTERNS.md). — The effect at `ClaudePanel.svelte:81-90` still reads `claudeStore.messages`, runs the side effect in `untrack` after `tick()`. "Scrolled up" now also covers a small scroll up inside the threshold. Tests `follows a new message and the growing reply...`, `stays where the user scrolled up to...` and `stops following on a small scroll up...` pass.
- [met] Focus: when a turn ends (status leaves `running`), the prompt gets focus again if it had focus when the prompt was sent. — `:94-105`, with the added `active === promptEl` case; the focus tests, the new one included, pass.

## Findings

1. minor, `src/lib/features/claude-code/ClaudePanel.svelte:107-112`: `onMessagesScroll` reads `scrollTop` when the scroll event fires, not when the user moved. If a delta's follow (`:86-87`) runs between the user's scroll and the coalesced scroll event, the event reads the position the follow wrote, `top === lastScrollTop`, and the user's scroll is lost for that frame. During a fast stream this can repeat. A collapse of an open tool card `<details>` at the bottom also clamps `scrollTop` down and stops the follow without a scroll up by the user (the fix report names this). Neither was checked in WKWebView. Fix, if it shows up in the app: also set `following = false` on a `wheel` event with `deltaY < 0` (and on touch or keyboard scroll keys), which records the user's intent before any follow can overwrite it.

## Checks run by the reviewer

- `pnpm vitest run src/tests/lib/features/claude-code/ClaudePanel.test.ts`: exit 0, 36 passed.
- Probe: the same file against `ClaudePanel.svelte` from 9d5923590 (the reviewed panel): exit 1, the two new tests failed and 34 passed. Source restored with `git checkout HEAD --`; worktree clean.
- `pnpm check`: exit 0, 0 errors, 0 warnings.
- Full suite not run; deliver runs it.
- Scope: the fix commit touches only `ClaudePanel.svelte`, its test file and `work/12/review.md`. No layer baseline, `BASELINE_SIZE` or composition-root change. No test deleted or skipped.

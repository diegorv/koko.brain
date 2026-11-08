# Issue 21 discovery: tab switch focus restores the old tab's scroll

No `spec.md` for this feature. Builds on Issue 15's logging (`work/15/`).

## Cause (confirmed in code)

- `@codemirror/view` `observers.focus` (`dist/index.js:5297-5304`): on focus with `scrollDOM.scrollTop == 0` it writes `inputState.lastScrollTop` back. `lastScrollTop` is set by the scroll observer (`:4989-4991`) and survives `setState`, so it is the previous tab's offset.
- `view.focus()` -> `focusPreventScroll` -> `contentDOM.focus()` fires the focus event synchronously, so the write lands before `MarkdownEditor.svelte` logs "after focus".

## Files that change

- `src/lib/core/markdown-editor/MarkdownEditor.svelte` tab-switch effect: `view.focus()` `:417`, rAF restore `:436-445`.
- `src/tests/lib/core/markdown-editor/MarkdownEditor.test.ts` `describe('tab-switch scroll log')`.

## Plan

1. Right after `view.focus()`, write the new tab's scroll synchronously (`saved` scrollLeft/Top, or 0/0 for a fresh tab), before the "after focus" log line. CodeMirror measures in a rAF, so its first measure sees the right offset.
2. Keep the frame-1 restore: a saved tab's offset can exceed the estimated height before the first measure and get clamped by the sync write; the frame-1 write is a no-op (no scroll event) when the sync write already landed. Log step names unchanged, so the Issue 15 tests stay green.

## Tests

- Failing first: switch from a tab scrolled to 192 (CodeMirror records it via a scroll event, editor blurred) to a fresh tab; "after focus" and "frame 1" log 0. And back to a saved tab at 300 from a tab at 192: "after focus" / "frame 1" log 300.
- jsdom has no scroll: per-test backed `scrollTop`/`scrollLeft`/`scrollTo` on `scrollDOM`, `view.setState` wrapped to reset scroll to 0 (the browser does that on the doc swap, log "after replace 0").
- jsdom ignores `focus({ preventScroll })`, so CodeMirror falls back to restoring every ancestor's scroll after a focus and hides the bug. The test file wraps `HTMLElement.prototype.focus` to read the option (WebKit supports it).

## Risks / defaults

- Default: keep the rAF restore (the Issue allows dropping it only with log evidence, and none exists yet for clamped saved offsets).
- The sync write forces a layout on every switch (it was already forced by saving the old tab's scrollTop).

# 44: Leaving a meta-bind number or date input clears a value it cannot show

**What to build:** `<input type="number">` and `<input type="date">` sanitize any value they cannot hold to `""` (the HTML value-sanitization rule; checked in jsdom: `"not a number"`, `"1,000"`, `"2026-01-05T10:00"` and `"2026-1-5"` all read back as `""`). The meta-bind number/date writer in `src/lib/core/markdown-editor/extensions/live-preview/widgets.ts` (around :936-954, after Issue 42, squash bf114d0b) compares the input's value with the raw `initial` string, so the "value unchanged" guard does not fire:
- The note has `due: 2026-01-05T10:00` (or `count: not a number`). The user clicks into the input and clicks away. `input.value` is `""`, `initial` is the raw string, `validate("")` passes because empty means "clear", and `""` is written: the property is wiped.
- Escape does the same: it sets `input.value = initial`, which sanitizes to `""`, and the blur commits it.

This predates Issue 42 (the old code wrote on every blur), but Issue 42's comment now says Escape and focus-without-typing are safe, and for these values they are not.

Fix: compare against what the input actually shows. Read `const shown = input.value` right after setting `input.value = initial`, and use `shown` in the unchanged guard and in the Escape and refusal resets. Better: when `initial` fails the input's own validation, render `type="text"` (or a read-only display) so the raw value is visible and is never replaced by `""` on blur. Correct the Issue 42 comment either way.

Also in this Issue, two low findings from the same review:
- **Select reset to a value that is not an option** (`widgets.ts` ~:741): with `status: x` and `x` not in the options, a refused write sets `select.value = 'x'`, which leaves `selectedIndex` at -1 and shows a blank select, while the first render showed the first option. Make the reset show what the first render showed.
- **Same-number edits** (~:954): typing `5.0` over `5` may parse back to `5`; `eq()` then keeps the DOM and `initial` stays stale. Check how the serializer writes `5.0`, and pin the behaviour with a test (or record why it is fine).

**Blocked by:** none

**Status:** needs-triage

**Gate:** `pnpm check` + `pnpm vitest run` + `pnpm build`.

**Source:** post-delivery adversarial review of Issue 42 (fix range 063cefaa..2f480ae8, merged in bf114d0b), 2026-11-01: one medium finding (data loss, predates 42) and two low ones. The review found no regression from the Issue 42 fix itself: a 5 -> 6 -> 5 sequence is written, a successful write never resets, the button chain stops only on a refused `updateMetadata`, and all four `dispatchMetaBindUpdate` callers use its boolean. Checked in jsdom, not in WKWebView.

- [ ] A failing test first: a note with `due: 2026-01-05T10:00` and one with `count: not a number`. Focus then blur, and Escape then blur, write nothing and leave the raw value in the note
- [ ] The select reset after a refused write shows what the first render showed
- [ ] The `5.0` over `5` behaviour is pinned by a test
- [ ] The Issue 42 comment about Escape and focus-without-typing is correct

## Notes

- **Not checked:** the real WKWebView's sanitization. Browsers follow the same HTML rule, but check one case in the running app if the fix depends on it.
- **Size:** S.

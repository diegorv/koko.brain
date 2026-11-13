# Issue 44 discovery

No `spec.md` for architecture-stability. Follows `work/42` (same writers, same test files).

## Files that change

- `src/lib/core/markdown-editor/extensions/live-preview/widgets.ts`
  - :741 select `change` handler: refused-write reset `select.value = currentValue ?? ''`.
  - :803-822 `MetaBindTextInputWidget` JSDoc (mentions the text fallback).
  - :906-958 `buildMetaBindTextInput`: type, `initial`, unchanged guard, Escape/refusal resets, Issue 42 comment.
- `src/tests/lib/core/markdown-editor/extensions/live-preview/meta-bind-writers.test.ts` (data-loss, select, 5.0 tests).
- `src/tests/lib/core/markdown-editor/extensions/live-preview/meta-bind-input-widgets.test.ts` (type fallback tests).

## Plan

1. Test first: notes with `due: 2026-01-05T10:00` / `count: not a number`; focus+blur and
   Escape+blur leave the doc byte-identical. Fails today (the property is wiped to `""`).
2. `buildMetaBindTextInput`: set `type = inputType`, assign `initial`; when it reads back `""`
   while `initial` is not empty, switch to `type = 'text'` and assign again. Then
   `const shown = input.value`, used by the unchanged guard and both resets. Validation unchanged
   (so the fallback still flags the value invalid on first render).
3. Select: capture `const initialIndex = select.selectedIndex` after building; reset with
   `select.selectedIndex = initialIndex`, which restores the first-render display for both an
   option value and a value that is not an option (index 0, the browser default).
4. `5.0` over `5`: the writer writes `count: "5.0"` (meta-bind writes strings, quoted), which
   parses back as `"5.0"`, so `currentValue` changes and `eq()` is false. Pin with a test.

## Prior-art tests

- `meta-bind-writers.test.ts` `mount` helper + `text input on a note whose frontmatter does not parse`.
- `meta-bind-input-widgets.test.ts` type assertions.

## Risks / defaults

- Relies on jsdom matching the HTML value-sanitization rule; WKWebView not checked (the Issue says so).
- The text fallback stays text while the user edits; after a successful write the widget rebuilds
  from the new value (`eq()` false) and gets the native type back.
- No layer edges added; no baseline change.

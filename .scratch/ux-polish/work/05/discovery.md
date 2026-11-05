# Issue 05 discovery: Cut, Copy, Paste and Select all in the editor context menu

No `spec.md` in `.scratch/ux-polish/`; the Issue file is the spec. Builds on `work/04` (right-click keeps the selection).

## Files that change

- `src/lib/core/markdown-editor/MarkdownEditor.svelte`
  - imports (1-39): `selectAll` from `@codemirror/commands`, `readText` from `@tauri-apps/plugin-clipboard-manager`,
    `toast` from `svelte-sonner`, lucide `scissors`, `copy`, `clipboard-paste`, `square-dashed-text` (`text-select` is an alias of it).
  - `handleContextMenu` (276-284): also records `hasSelection` (`$state`, read by the menu's `disabled`) on every path.
  - new handlers next to `handleCopyBlockLink` (296-306): `handleCopy`, `handleCut`, `handlePaste`, `handleSelectAll`.
  - menu markup (640-650): Cut, Copy, Paste, Select all, `ContextMenu.Separator`, then the two block-link items.
- `src/tests/lib/core/markdown-editor/MarkdownEditor.test.ts` (`context menu` describe, 136-212).
- `e2e/specs/copy-block-link.spec.ts`: one test for menu Copy after a double-click.

## Plan

1. Copy: non-empty ranges' text joined with `state.lineBreak`, `navigator.clipboard.writeText`. Cut: same write, then
   `dispatch({ ...replaceSelection(''), userEvent: 'delete.cut' })` only on success. Both return early on an empty selection
   (bits-ui merges a user `onclick` with its own, so `disabled` alone may not stop the handler; checked by the test).
2. Paste: `readText()`, skip when empty, else `replaceSelection(text)` with `userEvent: 'input.paste'`, `scrollIntoView: true`.
3. Select all: `selectAll(view)`.
4. Each handler ends with `view.focus()` (in `finally`). Failures: `error('EDITOR-MENU', ...)` + the Issue's toast strings.
5. Icons `mr-2 size-4` like the existing items (anatomy is out of scope). No shortcut hints.

## Tests (copy `clickMenuItem`, `settle`, `selectAndAim` from Issue 04)

- `selectAndAim` moves up to the `context menu` describe so the new tests share it; `posAtCoords` stub keeps the selection.
- `clickMenuItem` matches the item label exactly (shortcut text stripped): "Copy" would otherwise also match "Copy link to block".
- `vi.mock('@tauri-apps/plugin-clipboard-manager')` with `readText: vi.fn()`, as in `deep-link.service.test.ts:11`.
- Copy / Cut on 0..5 of "First paragraph"; Cut with rejected write; Paste over a selection, at a cursor, rejected; Select all;
  empty selection: Cut and Copy carry `data-disabled` and clicking does nothing.

## Risks and defaults

- `hasSelection` is computed in the contextmenu handler, which runs before bits-ui opens the menu (event bubbles from the
  child div to the Trigger).
- E2E runs in the browser build; Tauri WebKit clipboard behavior is not verified (Issue notes).
- Error tag `EDITOR-MENU` is a default; no existing tag fits.

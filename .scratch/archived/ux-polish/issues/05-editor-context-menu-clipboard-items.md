# 05: The editor context menu offers Cut, Copy, Paste and Select all

**What to build:** The editor's right-click menu (`src/lib/core/markdown-editor/MarkdownEditor.svelte`, about lines 616-626) replaces the native menu but offers only "Copy link to block" and "Copy block embed". Add, in this order: Cut, Copy, Paste, Select all, then a `ContextMenu.Separator`, then the two block-link items.
- **Copy:** the text of the non-empty selection ranges joined with `state.lineBreak`, written with `navigator.clipboard.writeText` (the API copy-block-link uses). Disabled when the selection is empty.
- **Cut:** the same write, then on success `view.dispatch(view.state.replaceSelection(''))` with `userEvent: 'delete.cut'`. If the write fails the document is unchanged. Disabled when the selection is empty.
- **Paste:** `readText` from `@tauri-apps/plugin-clipboard-manager` (already used in `features/deep-link/deep-link.service.ts` about line 2; the `clipboard-manager:allow-read-text` permission is in `src-tauri/capabilities/default.json` about line 19), inserted with `replaceSelection`, `userEvent: 'input.paste'`, `scrollIntoView: true`. Plain text only (owner decision, recommendation assumed): the keyboard paste handlers that turn TSV into a table and HTML links into Markdown (`extensions/live-preview/handlers/paste-*-handler.ts`) read a `ClipboardEvent` and do not run here. An empty clipboard inserts nothing.
- **Select all:** `selectAll` from `@codemirror/commands`.
- Every item ends with `view.focus()`. Clipboard failures log with `error()` from `#lib/utils/debug.js` and show `toast.error('Could not copy to the clipboard.')` or `toast.error('Could not paste from the clipboard.')`.
- Icons from lucide at the existing `size-4`. No shortcut hints: `formatShortcut` lives in `features/command-palette`, which `core/` must not import, and the overlay anatomy pass owns menu shortcuts.

**Blocked by:** 04

**Status:** resolved

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`, plus `bash scripts/e2e.sh e2e/specs/copy-block-link.spec.ts`.

- [x] Failing first, in `MarkdownEditor.test.ts` with the `clickMenuItem` helper (and the `posAtCoords` stub from Issue 04): with "First paragraph" selected 0..5, Copy calls `writeText` with "First" and leaves the doc unchanged; Cut calls it and removes "First"
- [x] Cut with `writeText` rejecting leaves the doc unchanged and shows the copy toast
- [x] Paste with `readText` mocked (`vi.mock('@tauri-apps/plugin-clipboard-manager')`, a Tauri boundary) to "abc" replaces the selection with "abc"; with a cursor and no selection it inserts at the cursor; a rejected `readText` shows the paste toast and leaves the doc unchanged
- [x] Select all selects 0..doc length
- [x] With an empty selection, Cut and Copy render disabled (`data-disabled`) and clicking them changes nothing
- [x] The block-link items still work and sit after the separator (existing tests green)
- [x] E2E in `e2e/specs/copy-block-link.spec.ts`: double-click a word on the Inbox line, right-click it, pick `Copy` (use `getByRole('menuitem', { name: 'Copy', exact: true })`, since "Copy link to block" also matches), and the clipboard holds that word. This proves end to end that the right-click kept the selection

## Notes

- **Source:** `work/overlays.md` P3 and its plan row "Editor context menu: keep the selection on right-click inside it, add Cut, Copy, Paste and Select All, and group the block-link items"; review section 4 Issue 12.
- **Owner decision (recommendation assumed):** menu Paste is plain text; leaving Paste out or synthesizing a paste event are the alternatives.
- **Not verified:** that `navigator.clipboard.writeText` from a menu click works in the Tauri WebKit window the same way it does for copy-block-link today; the E2E runs in the browser build.
- **Out of scope:** menu item anatomy (`mr-2` icons, sentence case, shortcut hints), the TSV and HTML conversions on menu Paste.
- **Size:** M.

## Comments

- 2026-11-04, branch `issue/05-editor-context-menu-clipboard-items`: the editor context menu gains Cut, Copy, Paste (plain text via the clipboard-manager plugin) and Select all above the block-link items; Cut and Copy are disabled with an empty selection; failures show copy/paste toasts. Fix round: Cut deletes only the text it copied (skips the delete if the editor state changed during the clipboard write), with a regression test. Review round 1: APPROVED; round 2: APPROVED (one optional nit on the state-identity check, not applied). Tests: full suite 493/493 files passed (11733 passed) and `pnpm build` passed (`05-deliver-2.log`); an earlier run had one load timeout in `queryjs-contract.test.ts`, which passed alone; `pnpm check` 0 errors.

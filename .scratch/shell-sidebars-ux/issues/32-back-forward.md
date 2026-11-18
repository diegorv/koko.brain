# 32: Back and Forward: keys, palette, action bar, mouse buttons

**Origin:** design review 2026-11-17, proposal P35 (Back/Forward half, counted in new 31), prototype `.scratch/design-review/prototypes/shell-tabs-navigation.html`, research `.scratch/shell-sidebars-ux/research/verdict-sh-history-breadcrumb.md` (ticket D) and `breakdown.md` (old ticket 42).

**What to build:**

1. **Keys and palette.** Cmd+Opt+Left and Cmd+Opt+Right (free in CodeMirror, whose Cmd+[ and Cmd+] are indent, and in `GLOBAL_KEYBINDINGS`) as `editor:go-back` / `editor:go-forward` in `src/lib/app/global-keybindings.ts`; palette "Go Back" / "Go Forward" in the Editor group with `shortcutFor` (`src/lib/app/commands.ts`). `CODE_DISPLAY_MAP` (`src/lib/utils/keybindings.ts:29-34`) has no arrow entries today, so add `ArrowLeft: '←'` and `ArrowRight: '→'` there and `formatShortcut` prints `⌘⌥←`.
2. **Action bar.** Back and Forward icon buttons at the start of `NoteActionBar.svelte`, disabled when that side of the active tab's history (new 31) is empty; `title` and `aria-label` carry the shortcut.
3. **Behaviour.** `goBack()` / `goForward()` in `tab-history.service.ts` use new 31's leave, save and load steps. An entry whose file is gone is dropped with one toast and the next is tried. A new navigation after Back clears forward. Returning restores the note's scroll and cursor: `MarkdownEditor.svelte:476-478` (the save of a leaving path's view state) keeps it for a path still in a tab's history, not only for a path in a tab; no `EditorState` is kept for history-only paths. `closeTab` and history truncation delete the view state of the entries they drop (`tab-view-state.ts` `deleteTabViewState`).
4. **Mouse buttons 4 and 5** through a document `mouseup` listener (buttons 3 and 4) registered beside `registerGlobalKeybindings`, kept only if a manual check in `pnpm tauri dev` shows WKWebView delivers them; otherwise ship without (owner default 32.1).
5. Help `03-editor.md` Tabs, `20-keyboard-shortcuts.md:28` (shortcut table).

Not in this ticket: Cmd+[ / Cmd+] as Back/Forward (indent in CodeMirror); Back/Forward on canvas, kanban and `.view` tabs (moot under the markdown-only Replace rule); Cmd+Enter in lists.

**Blocked by:** 31

**Status:** ready-for-agent

**Gate:** `pnpm check` + `pnpm vitest run`, plus `bash scripts/e2e.sh` for the new case (add it to the spec new 31 creates, or `tabs.spec.ts`).

- [ ] Failing test first, `keybindings.test.ts`: `formatShortcut({ meta: true, alt: true, code: 'ArrowLeft' })` is `⌘⌥←` (with `code: 'ArrowLeft'` it prints `⌘⌥ArrowLeft` today).
- [ ] Failing test first, `tab-history.service.test.ts`: after A to B, `goBack()` shows A with `forward: [B]`, `goForward()` returns to B; empty history changes nothing; a navigation after Back clears forward; Back onto a deleted A drops it and toasts once.
- [ ] Failing test first (`src/tests/lib/core/markdown-editor/`, real `tab-view-state`): after A to B and Back, `getTabViewState(A)` holds A's cursor; after closing the tab no view state remains for its history entries.
- [ ] `global-keybindings.test.ts` (extend its closed mocks at `:13`): `shortcutFor('editor:go-back')` and `'editor:go-forward'` resolve; Cmd+[ is not bound globally; the fixed count pin (`:142`, "registers all 25") changes on purpose. `commands.test.ts`: the two commands show the shortcut label (the count pin at `:151` changes on purpose).
- [ ] `NoteActionBar.test.ts` (real stores): Back is disabled with no history, enabled after a navigation, and clicking it shows the previous note.
- [ ] Mouse buttons: a unit test of the button mapping; the manual check in `pnpm tauri dev` is recorded in the ticket (WKWebView delivery is unverified).
- [ ] E2E: navigate by row, then Cmd+Opt+Left returns and the tab count stays 1.
- [ ] Frontend gate: `pnpm check` and `pnpm vitest run` pass.

## Original proposal

- **P35 (Back/Forward half).** Bind each tab's back/forward history to Cmd+Opt+Left/Right and mouse buttons 4 and 5. The review moved the keys off Cmd+[ / ], which CodeMirror binds to indent, and Cmd+Shift+[ / ], which switch tabs (`global-keybindings.ts:86-99`).

## Problem

Even with new 31's history, nothing can go back: there is no key, command, button or mouse binding, and a leaving note's scroll and cursor are saved only while it still has a tab.

## Evidence

Checked at `ab143a411`.

- No mouse-button handler exists in `src/lib`. Cmd+Opt+Left/Right is unbound in CodeMirror (`@codemirror/commands@6.11.1` `dist/index.js:1744-1749,1797-1798` bind Alt, Cmd and Ctrl arrows only) and in `GLOBAL_KEYBINDINGS`.
- `src/lib/utils/keybindings.ts:24-34` `CODE_DISPLAY_MAP` has no arrow entries; upper-casing applies only to `key` (`:44-46`).
- `src/lib/core/markdown-editor/MarkdownEditor.svelte:472-482` saves the leaving path's view state only for a path still in a tab (`findTabIndex(...) < 0` deletes it); `tab-view-state.ts:38-90` the helpers.
- `NoteActionBar.svelte:173-181` the Raw button is the house pattern for a titled, `aria-pressed` bar button; the bar's `BAR_RESERVED_WIDTH = 960` fits two more buttons without changing `foldActions`.

## Why blocked

- 31: Note-list rows open in the active tab and record a per-tab history

## Sequence with

- `NoteActionBar.svelte` and its test: new 15 (More menu), new 24 (breadcrumb `:128-132`, Reveal item above Copy deeplink).
- `commands.ts` and the count pin `commands.test.ts:151`: new 01, 15, 20, 24, 28 and others; each ticket that adds a fixed command changes the number on purpose and says so.
- `global-keybindings.ts` and its count pin: new 26 (adds a `command` id, count unchanged), new 28 (26 bindings), new 30.
- `MarkdownEditor.svelte`: new 33 edits `:273-289` (mousedown sites); this ticket edits `:476-478`. No edge, rebase only.
- `help/documentation/03-editor.md`: new 21, 22, 23, 24, 25, 27, 31, 33; open-itens 146 (wraps binding handlers; merge order only).

## Comments

- 2026-11-17, triage: ready-for-agent. Decided by the owner: Replace (old 41.1), which this ticket's history depends on. Defaults (not individually answered): 32.1 (old 42.1) if WKWebView does not deliver mouse buttons 4/5, ship without them (keys, palette and bar cover Back and Forward).

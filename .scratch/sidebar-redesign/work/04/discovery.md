# Issue 04 discovery: action bar, view and file actions

Repeats the bar pattern of `work/03` (`NoteActionBar.svelte`, `note-action-bar.logic.ts` /
`.service.ts`, component test with only Tauri + toast mocked). Only the differences are listed.

## Files that change

- `src/lib/core/keybindings/global-keybindings.ts:162-166` - Cmd+K binding becomes Cmd+\ (`code: 'Backslash'`,
  like Cmd+, uses `code`); `keybindings.logic.ts:118` reserved entry moves to `\`.
- `src/lib/core/settings/settings.types.ts:114` - `EditorSettings.wideNotes: boolean` (default false in
  `settings.store.svelte.ts:74`; old files get it from the `DEFAULT_SETTINGS.editor` spread in
  `settings.service.ts:93`). `settings.logic.ts`: `effectiveContentWidth(editor)` = `wideNotes ? 0 : contentWidth`.
  `MarkdownEditor.svelte:193,456` and its theme effect read it. Persisted by the existing settings effect.
- `src/lib/plugins/table-of-contents/toc.store.svelte.ts` - `expandedPath` (the note the section was opened on)
  replaces the panel's local `expanded`; `TableOfContentsPanel.svelte` derives `expanded` from it and still
  collapses on tab switch. `toc.service.ts`: `showTableOfContents(path)` sets `rightSidebarVisible`,
  `tableOfContentsVisible` and `expandedPath`.
- `src/lib/features/deep-link/deep-link.logic.ts` - `buildOpenNoteDeepLink(vaultName, vaultPath, notePath)`.
- `note-action-bar.logic.ts` - `FOLDABLE_ACTIONS` (bar order), `FOLD_ORDER`, `foldActions(barWidth)`.
- `note-action-bar.service.ts` - `toggleWideNotes`, `copyNotePath`, `copyNoteDeepLink` (toast on success/failure),
  reveal reuses `fs.service.ts:292 revealInSystemExplorer`.
- `NoteActionBar.svelte` - Raw, width, TOC, Reveal, Copy path buttons; More gains Copy deeplink plus the folded
  actions; `bind:clientWidth` on the bar feeds `foldActions`.
- `e2e/specs/live-preview/source-mode.spec.ts` (Meta+Backslash, Cmd+K no-op), `help/documentation/03-editor.md:49`,
  `20-keyboard-shortcuts.md:27,122`.

## Prior-art tests

`NoteActionBar.test.ts`, `note-action-bar.logic.test.ts`, `global-keybindings.test.ts`, `keybindings.logic.test.ts`,
`settings.logic.test.ts` / `settings.service.test.ts`, `toc.store.test.ts`, `deep-link.logic.test.ts`.

## Defaults taken

- Fold order: Copy path, Reveal, TOC, width fold first-to-last (rightmost first); a later Neighbourhood is one more
  entry, folding last. An unmeasured bar (width 0, jsdom) folds nothing.
- Width cost: 32 px per action slot, 360 px reserved for the label and the fixed buttons.
- The bottom-right source/preview toggle stays. With `contentWidth` 0 (no limit) normal and wide look the same.
- TOC also turns `tableOfContentsVisible` on, since the criterion wants the section open.
- Deeplink: `kokobrain://open?vault=<vault name>&file=<vault-relative path>`.

## Risks

- `TableOfContentsPanel` collapse-on-tab-switch must survive the move of `expanded` to the store.
- Cmd+\ on non-US layouts: matched by `code`, as Cmd+, is.

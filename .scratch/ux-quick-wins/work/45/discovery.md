# 45 discovery: Quick Capture draft restore, Discard and the Saved hold

No `spec.md` in `.scratch/ux-quick-wins/`. Ticket 07 is merged (the hint copy and "Saving..." are on main). No save, index, watcher or live-preview path is touched: the composer only posts text over IPC, so the agent rules files do not apply. Same files as `work/07`.

## Files that change (`P = src/routes/composer/+page.svelte`)

- `P:12` `SAVE_FLASH_MS` 180 -> 600.
- New `let restored = $state(false)`: a non-empty draft was put back in the editor by a restore and not edited since.
  - Mount: `restored = text.trim() !== ''` next to `:18`.
  - `resetForShow` (`:174`): read the draft once, `setText(draft)`, `restored = draft.trim() !== ''` (set even when the draft equals the editor text).
  - `onDocChange` (`:208`): `if (next !== text) restored = false` before `text = next` (the `setText` echo is equal, so it keeps the flag).
  - `handleSave`: cleared when a non-empty save starts (`saving = true`, `:111`), so the note does not sit beside "Saving..." / "Saved". Default taken, not named in the Issue.
- New `discard()`: `setText('')` (the `$effect` at `:42` removes the key through `writeDraft`), `restored = false`, `view?.focus()`. No confirm (Issue comment 45.1).
- `handleSave` at `ok === true` (after `:141`): `writeDraft(withoutWritten(text, body))` before `saved = true` and the hold; `setText(withoutWritten(...))` after the hold (`:149`) stays. Failed / unconfirmed paths unchanged.
- Markup `:251-259`: wrap the hint chain in `<div class="hint-row">`; `{#if restored}<div class="restored">Draft restored · <button type="button" class="discard" data-tauri-drag-region="false">Discard</button></div>{/if}` on the left, outside `.hint`. New `{:else if saved}<div class="hint saved-hint"><CheckIcon /> Saved</div>` before the Saving branch, which then reads `{:else if saving}`.
- Styles: `.hint-row` flex row takes `padding-top` and the font; `.hint` gets `margin-left: auto`; `.discard` a link-styled button.
- Icon: `@lucide/svelte/icons/check`, as other routes import lucide icons.

## Tests (`T = src/tests/routes/composer-page.test.ts`)

- `T:317-337` (07's "no restored note") becomes the restore-note test: mount and summon with a stored draft show "Draft restored" + Discard; no draft shows neither; one typed key removes it; a summon restoring the text the editor already holds still shows it.
- New: Discard empties editor and `localStorage`, removes the note, focus in editor; next summon empty.
- `T:257-281` ("Saving... then not during the flash") moves to the hold: "Saved" in `.hint` with the `saved` class through 599 ms, `dismiss_composer` at 600, default hint after.
- New: stored draft is `withoutWritten` at `ok === true`, checked before the hold ends, editor still shows the text.
- New: Esc + summon during the hold: empty editor, no note, Cmd+Enter sends no second submit. `T:427-457` advance 500 -> 600.
- New: failed and unconfirmed saves keep `localStorage` and a summon restores it.

## Risks

- A keystroke during the hold rewrites the full text to storage through the `$effect` (Issue Risk, accepted there; not handled).
- Discard is a button inside the root drag region: `data-tauri-drag-region="false"`; manual check only, not testable in jsdom.

# 07 discovery: Quick Capture honest hints and a Saving state

No `spec.md` in `.scratch/ux-quick-wins/`. No index, save, watcher or live-preview path is touched (the composer only posts text over IPC), so the agent rules files do not apply.

## Files that change (`P = src/routes/composer/+page.svelte`)

- `P:26` `let saving = false` becomes `let saving = $state(false)`. Writers stay as they are: set `:110`, cleared `:135`, `:150`, `:182`. Read only in `handleSave` (`:102`, not reactive) and in the new template branch.
- `P:136-137` comment reworded: "so Cmd+Enter retries and Esc hides it, the draft kept".
- `P:250-256` hint block:
  - `failed` (`role="alert"`): `Could not save. ⌘↩ retries, Esc hides (draft kept).`
  - `unknown` (`role="alert"`): `Save not confirmed. ⌘↩ saves again, Esc hides (draft kept).`
  - new `{:else if saving && !saved}` `<div class="hint">Saving...</div>`
  - default: `Esc hides (draft kept) · ⌘↩ saves`
  Error branches come first, so they win over "Saving..." and the default; a retry clears `saveProblem` at `:103` before `saving = true` at `:110`, so "Saving..." replaces the error while the retry waits. During the 180 ms flash `saved` is true, so the default hint shows.
- Not touched: `SAVE_FLASH_MS`, `RESULT_TIMEOUT_MS`, `DRAFT_STORAGE_KEY`, `readDraft`/`writeDraft`, `withoutWritten`, `resetForShow`, keys, styles.

## Tests (`T = src/tests/routes/composer-page.test.ts`)

- `T:107-108` `ERROR_TEXT`, `UNKNOWN_TEXT` and `T:271`, `T:429` move to the new strings (a `DEFAULT_HINT` constant for the two).
- New, in `describe('composer save')`: default hint on mount; neither error hint contains "cancels" (fail and timeout paths).
- New, fake timers (as `T:321`, `T:400`): `mockSubmit('silent')` + Cmd+Enter reads `Saving...`; `resultHandler()` `ok: true` shows the saved ring with the default hint, no "Saving..."; the flash still ends at 180 ms (no dismiss at 179, dismiss at 180), which pins `SAVE_FLASH_MS`.
- New: `ok: false` result reads `ERROR_TEXT`, retry reads `Saving...` with no alert; timeout reads `UNKNOWN_TEXT`, retry reads `Saving...`.
- New: a stored draft restored on mount and on summon shows no "Draft restored" text and no Discard button.
- `T:321-351` (saved-flash tests) unchanged.

## Risks

- `saving` becoming reactive: no `$effect` reads it, so no new effect runs. `saved = false` and `saving = false` at `:145-150` run in the same task with no await between them, so no "Saving..." frame shows after the flash.
- Show changed mid-save: `resetForShow` clears `saving` (`:182`), so the new show reads the default hint; unchanged logic.

## Defaults taken

- "Saving..." is a plain `.hint` (no `role`, no new class): the Issue names no role and no style, and a live region on every save would announce noise.
- No E2E spec: the composer has none (Issue Gate).

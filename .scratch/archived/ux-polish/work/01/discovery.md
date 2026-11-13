# Issue 01 discovery: Quick Capture keeps text on failed save

## Files that change

- `src/routes/composer/+page.svelte`
  - :8-11 state: add `let saveError = $state(false)`.
  - :28-51 `handleSave`: clear `saveError` first; on `submit_composer_capture`
    rejection keep `text`, skip the flash, set `saveError`, return without
    `dismiss()`. `dismiss()` moves inside the success branch (after the flash).
    The empty-body branch (:31-35) is unchanged.
  - :57-67 `resetForShow`: also clear `saveError`.
  - :109 hint row: `{#if saveError}` render
    `<div class="hint error" role="alert">Could not save. ⌘↩ retries, ESC cancels.</div>`,
    else the current hint.
  - style: `.hint.error` uses `var(--destructive)` so the message reads as an error.
- `src/tests/routes/composer-page.test.ts`: new `describe('composer save', ...)`.

## Plan

1. Write the failing describe (reject path), see it fail (dismiss called).
2. Change `handleSave` / `resetForShow` / hint markup.
3. Add success, retry and empty-body tests; run the file.

## Prior art

- Same test file: `mount` + `settle()` + captured `on` callback
  (`vi.mocked(on).mock.calls[0][1]`). The `call` mock is the existing
  `vi.fn(async () => undefined)`; per test `mockImplementation` rejects only
  for `submit_composer_capture`. `vi.waitFor` for the 180 ms flash (no fake
  timers, keeps the theme tests untouched).

## Risks

- `saving` is reset in `finally`; the retry path relies on it being false
  after the rejection, which the current `finally` already gives.
- `call` mock state must be reset per test (`mockReset` to the default
  resolving impl) so the theme describe stays independent.

## Defaults taken

- Error copy exactly as the Issue example: "Could not save. ⌘↩ retries, ESC cancels."
- `saveError` is a boolean, not the error message: the user cannot act on the
  emit error text, and the `console.error` keeps the detail.
- Error color `var(--destructive)` (shadcn token already in the theme vars).

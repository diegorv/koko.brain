# Issue 76 discovery

## Files that change

- `src/lib/features/file-icons/IconPicker.svelte`
  - `:11` drop the `X` import (only used at `:159`).
  - `:153` drop `showCloseButton={false}` so `dialog-content.svelte` renders its built-in close (`XIcon` + sr-only `Close`, absolute `end-4 top-4`).
  - `:156` header row: `flex items-center justify-between border-b px-4 py-3` becomes `flex items-center border-b py-3 ps-4 pe-10`.
  - `:158-160` drop the custom `Dialog.Close`.
- `src/tests/lib/features/file-icons/IconPicker.test.ts`: two new tests.

## Plan

1. Failing tests first: exactly one button whose text is `Close`; clicking it closes the dialog (`[data-slot="dialog-content"]` gone) and calls `onClose` once; the header row (parent of `[data-slot="dialog-title"]`) carries `pe-10`. Run, see them fail (the custom X has no text, so zero `Close` buttons; header has `px-4`).
2. Markup change above; rerun the test file.
3. Targeted checks: `pnpm check`, `IconPicker.test.ts`, `IconPicker.colors.svelte.test.ts`.

## Prior art

Issue 58 (`.scratch/ux-polish/work/58/`), File History: `FileHistoryDialog.svelte:61` header class, `FileHistoryDialog.test.ts:83-85` Close lookup by `textContent`. Differences: IconPicker takes `open` as a bindable prop and reports close through `onOpenChange` -> `onClose`, so the test asserts the `onClose` spy and the dialog content leaving the DOM instead of a mocked service call.

## Risks

- bits-ui closes on the Close click via `onOpenChange(false)`; `handleOpenChange` calls `onClose` then. Covered by the test.
- No other tests assert the header classes or the custom close (searched `src/tests` for `IconPicker`).

## Defaults taken

- Accessible name check: `textContent.trim() === 'Close'`, matching File History, since the built-in button's name comes from its sr-only span.

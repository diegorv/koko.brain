# 30 discovery: the type name dialog stays open while it saves

## Files that change

- `src/lib/features/type-definitions/TypeNameDialog.svelte`
  - :6-23 Props: new optional `busyLabel?: string`.
  - :27-38 new `busy` state and a `frozen` snapshot of the helper line (`error`, `showError`, `savedName`, trimmed value) taken at confirm; the open `$effect` clears `frozen` on open (not on close, so the closing dialog does not flash "already exists" once the store holds the new name).
  - :40-45 `confirm()`: return when `busy` or invalid; snapshot, `busy = true`, `try { await onConfirm(name) } finally { busy = false; open = false }`. The guard in `confirm()` covers Enter and the button, so a second Enter calls `onConfirm` once.
  - new `setOpen(next)`: ignores `false` while `busy`; `<Dialog.Root bind:open={() => open, setOpen}>` routes Escape, outside click and the X through it. Cancel calls `setOpen(false)` and is disabled while busy.
  - :65-69 helper line renders the snapshot while it is set; :73 confirm button `disabled={busy || error !== null}`, label `busy && busyLabel ? busyLabel : confirmLabel`.
- `src/lib/features/rail-shell/TypesNavigator.svelte:487-496` rename dialog gets `busyLabel="Updating notes..."`; the new-type dialog (:465-472) is unchanged.

## Prior art

- `ViewDialog.svelte:101-116,167` (`setOpen` guard with `bind:open={() => open, setOpen}`) and its test `src/tests/lib/features/type-definitions/ViewDialog.svelte.test.ts:31-41` (`deferred`), `:79-117` (button, close button, Escape, outside-click helpers), `:227-255` (in-flight guard test). Copy those helpers.
- `src/tests/lib/features/rail-shell/TypesNavigator.test.ts:139-147` `submitDialog`, `:353-370` rename and new-type tests.

## Tests

- New `src/tests/lib/features/type-definitions/TypeNameDialog.svelte.test.ts` (the `.svelte.test.ts` suffix, not the Issue's `.test.ts`: the test needs `$state` props for the bindable `open` and a reactive `validate`, like ViewDialog's test). Real `validateTypeName` and `normalizeTypeCasing`; `onConfirm` a plain function returning a held promise that also adds the name to a `$state` list read by `validate` (the store gaining the name).
- `TypesNavigator.test.ts`: new-type flow asserts the dialog closes after create; rename flow holds `renameType` (service mocked, as the file already does) and asserts "Updating notes...", disabled button, then close.

## Risks and defaults

- The input stays editable while busy (not in the Issue); only Enter is ignored. Default taken: no change.
- A rejected `onConfirm` still closes the dialog (finally) and rejects out of the handler as before; no caller rejects (Issue, Not in this ticket).
- Busy label text uses three dots exactly as the Issue writes it.

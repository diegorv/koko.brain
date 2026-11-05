VERDICT: APPROVED

## Acceptance criteria

- [met] Failing first, `src/tests/lib/features/file-icons/IconPicker.test.ts`: the open picker has exactly one button whose accessible name is `Close`, and clicking it closes the dialog and calls `onClose` (same lookup as `FileHistoryDialog.test.ts:83-85`). — The test "has one close button, the built-in one, which closes the picker" (`IconPicker.test.ts:47-65`) uses the File History `textContent.trim() === 'Close'` lookup, asserts length 1, clicks it, and asserts `onClose` called once and `[data-slot="dialog-content"]` at `data-state="closed"`. Probe: with main's `IconPicker.svelte` swapped in, it fails with `expected [] to have a length of 1 but got +0`. On the branch it passes.
- [met] The header title is not covered by the X: the header row carries `pe-10` (class assertion in the same test). — `IconPicker.svelte:155` is `flex items-center border-b py-3 ps-4 pe-10`, which matches `FileHistoryDialog.svelte:61` without its border colour. The test "reserves end space in the header row..." (`IconPicker.test.ts:67-78`) checks that the parent of `dialog-title` has `pe-10`. The same probe shows it fails on main (`expected false to be true`) and passes on the branch.

## Verification

- What changed: `IconPicker.svelte` drops `showCloseButton={false}`, the custom `Dialog.Close` and the `X` import, which had no other use in the file. The built-in close in `dialog-content.svelte` (`XIcon` plus an sr-only `Close`, absolute `end-4 top-4`) now renders. `justify-between` is gone from the header row, and `px-4` became `ps-4 pe-10`. This is what the Issue asks for, with no scope creep. The added lines use tabs.
- Close path: the built-in `DialogPrimitive.Close` sets `open` to false, and `onOpenChange` then calls `handleOpenChange(false)` and `onClose()`. That is the same path the removed custom `Dialog.Close` used, so callers (`FilesNavigator`, `TypesNavigator`, `NoteRowMenu`, `AutoMoveRuleRow`) see no change in behaviour. Their test files pass.
- Typecheck: `pnpm check` in the worktree exited 0 (217 files, 0 errors, 0 warnings).
- Tests: my test verdict rests on these files, which I ran myself: `src/tests/lib/features/file-icons/IconPicker.test.ts`, `src/tests/lib/features/file-icons/IconPicker.colors.svelte.test.ts`, `src/tests/lib/features/auto-move/AutoMoveRuleRow.test.ts`, `src/tests/lib/features/note-list/NoteRowMenu.test.ts`, `src/tests/lib/features/rail-shell/RailNoteList.test.ts`, `src/tests/lib/features/rail-shell/FilesNavigator.menu.test.ts`, `src/tests/lib/features/rail-shell/TypesNavigator.test.ts`. Result: exit 0, 7 files and 219 tests passed. The full suite and `pnpm build` (the Issue's **Gate:** line) belong to deliver.

## Findings

None.

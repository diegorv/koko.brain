# Issue 58 discovery

No `spec.md` exists for ux-polish; the Issue and review section 2 "Overlay anatomy" are the source.

## Files that change

- `src/lib/components/ui/dialog/dialog-content.svelte:30` base classes gain `max-h-[calc(100dvh-4rem)] overflow-y-auto`. Callers with `overflow-hidden` (File History, command dialog) keep it: tailwind-merge drops the base `overflow-y-auto` for a later `overflow-hidden`.
- `src/lib/components/ui/popover/popover-content.svelte:22` `p-4` becomes `p-3`.
- Drop the now-redundant `p-3` from the popover call sites: `TodoistPopover.svelte:119`, `CollectionView.svelte:504,531,554,573`, `RailNoteList.svelte:434,455`. The `p-0` sites (EditorSection, TagColorPicker, RelationshipSearch, EventPopover) stay.
- `src/lib/features/file-history/FileHistoryDialog.svelte:55-67` drop `showCloseButton={false}`, drop the sr-only title and the custom `<h2>`, put `Dialog.Title` (with `text-sm font-semibold`, `pe-8` for the X) in the header row. Description stays sr-only.
- `src/lib/features/file-icons/IconPicker.svelte:140` `max-w-[550px]` becomes `sm:max-w-[550px]` (merges over the base `sm:max-w-lg`).
- `e2e/specs/focus-ring.spec.ts:11-31` the restored X is a tabbable child, so bits-ui no longer focuses the content itself. Focus the content from script after the keyboard open; the existing `:focus-visible` precondition keeps the test from passing vacuously.

## Tests

- `src/tests/lib/components/ui/dialog/dialog-content.test.ts`: assert `max-h-[calc(100dvh-4rem)]` and `overflow-y-auto` on the harness dialog (fail first).
- New `src/tests/lib/components/ui/popover/popover-content.test.ts` with a `PopoverHarness.svelte` fixture (copy of `DialogHarness.svelte`): content has `p-3`, not `p-4`.
- `src/tests/lib/features/file-history/FileHistoryDialog.test.ts`: one element whose text is `File History: note.md`, it is the `[data-slot="dialog-title"]`, not `sr-only`; a button whose text is `Close` (the built-in X's sr-only label) exists and clicking it calls `closeFileHistory`.
- IconPicker: no test exists and jsdom evaluates no media query; covered by `pnpm check`/`build` only.

## Risks / defaults

- The X sits `absolute top-4 end-4` over the File History header (`py-3`, 44px tall): centered within ~2px. Default: keep the stock X placement.
- `max-h` on File History (`h-[80vh]`) and IconPicker (480px body) never binds on a normal window; on a short window the content scrolls instead of overflowing the viewport.
- E2E is not part of this step's targeted checks; run `bash scripts/e2e.sh e2e/specs/focus-ring.spec.ts` only if no other E2E run is active.

# 76: The icon picker uses the dialog's built-in close button

**What to build:** `src/lib/features/file-icons/IconPicker.svelte:153` passes `showCloseButton={false}` and renders its own `Dialog.Close` in the header (`:158-160`), which holds only an `<X>` icon: no sr-only text and no `aria-label`, so a screen reader announces an unnamed button. The dialog anatomy from Issue 58 (built-in close X on every dialog) applies here too. Do what File History does since Issue 58:
- Drop `showCloseButton={false}` and the custom `Dialog.Close` (and the `X` import if nothing else uses it). The built-in close in `src/lib/components/ui/dialog/dialog-content.svelte` renders `<XIcon />` plus `<span class="sr-only">Close</span>`, absolutely positioned at `end-4 top-4`.
- The header row (`:156`, `flex items-center justify-between border-b px-4 py-3`) loses its second child, so drop `justify-between` and reserve end space for the absolute X: `ps-4 pe-10` instead of `px-4`, as `FileHistoryDialog.svelte:61` does.

**Blocked by:** none

**Status:** resolved

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`.

- [x] Failing first, `src/tests/lib/features/file-icons/IconPicker.test.ts`: the open picker has exactly one button whose accessible name is `Close`, and clicking it closes the dialog and calls `onClose` (same lookup as `FileHistoryDialog.test.ts:83-85`).
- [x] The header title is not covered by the X: the header row carries `pe-10` (class assertion in the same test).

## Notes

- **Source:** Issue 58 review finding 1 (`.scratch/ux-polish/work/58/review.md`, minor, deferred to the main session; it also repeats the first run's finding 1). Lines checked against main at 1e021b796.
- **Out of scope:** the built-in X uses `focus:ring-2`, not `focus-visible:` (Issue 58 review finding 2); that belongs to the interaction-state pass and affects every dialog.
- **Size:** S.

## Comments

- 2026-11-05, branch `issue/76-icon-picker-built-in-close`: IconPicker drops its custom close button and uses the dialog's built-in X; header row gets `pe-10`. Tests: full suite 506 files / 11906 passed, 1 skipped, 1 todo, build green. Review round 1: APPROVED (no findings).

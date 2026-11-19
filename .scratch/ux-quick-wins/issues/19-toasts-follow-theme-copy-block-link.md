# 19: Toasts follow the theme; Copy block link confirms

**Origin:** design review 2026-11-17, proposals P17 (theme part), P89 (toasts only), prototype `.scratch/design-review/prototypes/feedback-components.html`, research `.scratch/ux-quick-wins/research/verdict-feedback-a.md` (tickets Q1 theme half and Q5) and `breakdown.md` (old ticket 06).

**What to build:**

1. **Toaster uses theme tokens.** `<Toaster>` drops `richColors` (`src/lib/app/AppOverlays.svelte:17`) and gets `style="--normal-bg: var(--popover); --normal-text: var(--popover-foreground); --normal-border: var(--border)"`. svelte-sonner 1.2.3 defines `--normal-*` per theme on the toaster element and merges `restProps.style` after it, so the inline style wins. `toastOptions.classes` gives error, success, warning and info a thin left accent from `--destructive`, `--success`, `--warning` and `--primary` (the classes are applied per type, `Toast.svelte:529-530` in svelte-sonner). All five tokens exist in both themes (`app.css:160-278`). Toasts stay non-selectable and keep their 4 s default.
2. **Copy block link confirms.** In `src/lib/features/copy-block-link/copy-block-link.service.ts`, after a successful clipboard write: `toast.success('Block link copied')`, or `toast.success('Block embed copied')` when `embed` is true, for headings (`:32-43`) and blocks (`:58-62`). An empty line (`:25`, a silent return today) calls `toast.info('Place the cursor on a block')` and writes nothing. Failure cases keep `toast.error('Failed to copy link to clipboard.')` and fire no success toast.
3. **Insert order unchanged.** The `^id` dispatch (`:51-53`) stays before the clipboard write. Moving the write first would put a note-content `view.dispatch` after an `await` with a stale `line.to` (`:22`): a doc change or editor teardown during the await would insert the id at a wrong offset in the note.

Not in this ticket: errors that stay until closed, a close button, "Copy details", an 8 s default (a toast helper and a sweep of about 104 call sites, M), selectable toast text (drag-select fights sonner's swipe, `Toast.svelte:349-360,418-427`), one shared `copyToClipboard` helper (other call sites sit in shell-sidebars-ux and tasks-view-ux files), the clipboard-before-id reorder. Later tickets that add a toast inherit the new look with no work.

**Size:** S

**Blocked by:** none

**Status:** resolved

**Gate:** pnpm check + pnpm vitest run. `e2e/specs/copy-block-link.spec.ts` (asserts clipboard and marker) and the specs that find `[data-sonner-toast]` by text are unaffected; run the first once if the service's early returns changed.

- [x] Failing test first (`src/tests/lib/app/AppOverlays.test.ts`, same `toast` mount as the theme test at `:44-78`): after `toast.error('x')` the toast has `data-rich-colors="false"`. It fails today.
- [x] The toaster element's inline style declares the three `--normal-*` variables with `var(--popover)`, `var(--popover-foreground)` and `var(--border)`; an error toast carries the error accent class and a success toast the success class (assert the class configured for its type, not a snapshot of all classes).
- [x] Failing test first (`src/tests/lib/features/copy-block-link/copy-block-link.service.test.ts`; extend the `svelte-sonner` mock at `:3-5` with `success` and `info`): a heading line with a working clipboard fires `toast.success`; a block line with `embed` true fires it with the embed text; an empty line fires `toast.info('Place the cursor on a block')` and writes nothing.
- [x] A rejected clipboard write keeps `toast.error` and no success toast, for the heading and the block path.
- [x] The `^id` `view.dispatch` still happens before `writeText` (assert call order with the existing mock view).
- [ ] Manual, recorded in the commit body: in `pnpm tauri dev`, a toast in light and dark uses the popover colours with the accent.
- [x] Frontend gate: `pnpm check` and `pnpm vitest run` pass.

## Original proposal

- **P17.** "Drop `richColors`. Style the Toaster through its CSS variables, using the popover tokens plus a severity accent (left bar or icon)." Taken: this theme part. Not taken: the helper, sticky errors, close button and "Copy details".
- **P89.** "One `copyToClipboard` helper with a label swap or short toast, and a failure toast. Write to the clipboard before inserting the id. On an empty line, say 'Place the cursor on a block'." Taken: the toasts. Not taken: the helper and the reorder (see item 3).

## Problem

`richColors` bypasses the theme tokens, so toasts look like a different app in both themes. The Copy block link shortcut is silent: success shows nothing, an empty line does nothing, and a person cannot tell whether the clipboard holds a link.

## Evidence

Checked at 085b23c5d.

- `AppOverlays.svelte:17` `<Toaster richColors theme={...} />`; `:18-29` the other overlays mounted after it.
- `copy-block-link.service.ts:25` the silent empty-line return, `:32-43` the heading path with no success feedback, `:51-53` the `^id` dispatch, `:58` the clipboard write.
- `copy-block-link.service.test.ts:3-5` mocks `svelte-sonner` with `error` only. A test that asserts only `data-rich-colors="false"` could pass while the look is unchanged, hence the style and class assertions.
- No other ticket touches the Toaster. E2E only locates toasts by text.

## Sequence with

- shell-sidebars-ux 08 (TOC current heading; ready-for-agent) mounts a picker in `AppOverlays.svelte` at `:20-22`; this ticket edits `:17`. Different lines: rebase, do not run in parallel.
- 12 (kanban restore toast), 23 (File History errors), 22 and 31 (settings save failures) add toasts; they pick up the new look once this lands, and none of them edits `AppOverlays.svelte`.
- open-itens: none.

## Comments

- 2026-11-18, triage: ready-for-agent. Decided by the owner: the order and grouping. No owner questions on this ticket.
- 2026-11-18, deliver (branch `issue/19-toasts-follow-theme-copy-block-link`): the Toaster drops `richColors`, takes the popover tokens through `--normal-*` and gets a per-type left accent; Copy block link confirms a copy with a success toast and explains an empty line with an info toast. Tests: full vitest suite 663 files, 17852 passed, 56 skipped, exit 0; `e2e/specs/copy-block-link.spec.ts` 3 passed. Review round 1: APPROVED (no code fixes needed). The manual light/dark check in `pnpm tauri dev` is unverified and stays open for the owner.

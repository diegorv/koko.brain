# 17: The canvas context menu and pickers work from the keyboard and show Mac shortcut glyphs

**Origin:** design review 2026-11-17, proposals P31 (canvas part), P95 (canvas part), prototype `.scratch/design-review/prototypes/canvas.html`, research `.scratch/ux-quick-wins/research/verdict-canvas.md` (ticket Q5) and `breakdown.md` (old ticket 20).

**What to build:** accessibility roles, keys and hint text only; every item still runs its existing action and then `onclose`.

1. **Menu roles.** `src/lib/features/canvas/CanvasContextMenu.svelte:88-95` is a plain `div` with plain buttons. It becomes `role="menu"` with `role="menuitem"` buttons. The colour section (`ColorPicker.svelte`, embedded at `:137-141,:155-159`) is a `role="group"` labelled "Color" whose swatches are `role="menuitemradio"` with `aria-checked`; swatch names stay "1" to "6" and `ColorPicker.svelte` changes roles only (its swatch names and colours belong to other tickets).
2. **Menu keys and focus.** On open the first item takes focus. ArrowUp, ArrowDown, Home and End move across every item, swatches included. Escape (with `stopPropagation`, so the container handler at `CanvasInner.svelte:271-274` does not deselect nodes) and Tab close the menu and restore the previously focused element. The restore must not win over a focus that an action moves on a later frame: menu "Edit" focuses the textarea in a `requestAnimationFrame` (`TextNode.svelte:24`) and the pickers focus their input the same way (`CanvasFilePicker.svelte:43`).
3. **Pickers.** `CanvasFilePicker.svelte` and `CanvasLinkInput.svelte` get `role="dialog"`, `aria-modal`, an accessible name ("Add note from vault", "Add link"), labelled inputs, and focus restore on close. The file picker shows "Showing 20 of N" when more than 20 files match (it silently slices to 20 at `:60`).
4. **Mac glyphs.** The pane menu hints (`:115` "Ctrl+A", `:119` "Shift+1") read `formatShortcut({ meta: true, key: 'a' })` and `formatShortcut({ shift: true, key: '1' })` (`⌘A`, `⇧1`). The node and edge Delete items (`:147,:173`) gain a hint `formatShortcut({ code: 'Backspace' })`, with `Backspace: '⌫'` added to `CODE_DISPLAY_MAP` (`src/lib/utils/keybindings.ts:29-34`). The canvas deletes on Backspace or Delete (`CanvasInner.svelte:627`).

Not in this ticket: rebuilding the menus on bits-ui ContextMenu or Command (M, they open from xyflow events), the Settings focus half (`SettingsPanel.svelte` is an mvp-claude file), Undo, Redo and zoom-to-selection menu items and a shared `Kbd` component (a design call), the node-colour and shadow tokens (ticket 06).

**Size:** S

**Blocked by:** 06

**Status:** ready-for-agent

**Gate:** pnpm check + pnpm vitest run; `menu-item-anatomy.test.ts` and `radius-scale.test.ts` must pass (no E2E surface changes).

- [ ] Failing test first (new `src/tests/lib/features/canvas/canvas-context-menu.test.ts`): open the pane menu; it has `role="menu"` and the first item is focused; ArrowDown moves focus to the second item, End to the last; Escape removes the menu, does not deselect nodes, and puts focus back where it was. It fails today.
- [ ] Menu "Edit" on a text card leaves focus in the textarea, not on the restored element.
- [ ] The pane menu text holds `⌘A` and `⇧1` and no "Ctrl+"; the node and edge Delete items show `⌫`; `src/tests/lib/utils/keybindings.test.ts`: `formatShortcut({ code: 'Backspace' })` is `⌫`.
- [ ] The colour group is named "Color"; swatches expose `aria-checked` for the current colour and keep their names "1" to "6".
- [ ] A picker with 25 matches shows "Showing 20 of 25", with 5 matches no count; the picker and the link input expose a named `role="dialog"` and restore focus on Escape.
- [ ] Every item still runs its action, then `onclose` (the pane, node and edge menus).
- [ ] Frontend gate: `pnpm check` and `pnpm vitest run` pass.

## Original proposal

- **P31.** "Canvas first: move the pane, node and edge menu onto bits-ui ContextMenu, or at least close it on Escape and outside focus and add menu roles and arrows. The file picker and link input use Command/Dialog and say 'Showing 20 of N'." Part taken: roles, arrows, Escape and Tab, dialog roles and the count, without the rebuild.
- **P95 (canvas part).** "Send hard-coded hints through `formatShortcut`." The Delete hint needs `Backspace: '⌫'`. The note action bar half is ticket 18.

## Problem

The context menu has no roles and no arrow keys, and Escape does not close it, so a keyboard user cannot operate it. The pickers have no dialog role or name and never return focus. The picker cuts the list at 20 with no sign that more files match. The hints say "Ctrl+A" and "Shift+1" on a Mac, and Delete has no hint.

## Evidence

Checked at 085b23c5d.

- `CanvasContextMenu.svelte:88-95` the menu root, `:115,:119` the literal hints, `:147,:173` Delete items without a hint, `:137-141,:155-159` embedded `ColorPicker`.
- `CanvasFilePicker.svelte:43` rAF focus, `:60` `filtered.slice(0, 20)`; `CanvasLinkInput.svelte` rAF focus at its `$effect`.
- `utils/keybindings.ts:29-34` has no `Backspace`; `formatShortcut` upper-cases `key` (`:47-48`), so `{ key: 'Backspace' }` would print "BACKSPACE" and the glyph needs `code`.
- `menu-item-anatomy.test.ts` scans menu items; `ColorPicker.svelte:61,69` colour sites are ticket 06.

## Why blocked

- 06: it edits the colours in `CanvasContextMenu.svelte`, `ColorPicker.svelte`, `CanvasFilePicker.svelte` and `CanvasLinkInput.svelte`, the four files this ticket adds roles to.

## Sequence with

- 18 (note action bar glyphs) is blocked by this ticket: both extend `CODE_DISPLAY_MAP` in `utils/keybindings.ts` and its test.
- shell-sidebars-ux 32 (back and forward, ready-for-agent) also extends `CODE_DISPLAY_MAP`; do not run in parallel.
- 04 (file and link cards) wires the menu items "Open in editor" and "Open URL" from `CanvasInner.svelte`; they become `menuitem`s here.
- 43 (new text cards) changes the focus handoff of "Add text card" and "Edit"; the focus-restore assertion here must keep passing after it.
- shell-sidebars-ux 25 (view title row) edits `CanvasInner.svelte` and `CanvasToolbar.svelte`; never in parallel.
- open-itens 039 and 051 (canvas file paths and Duplicate): not touched.

## Comments

- 2026-11-18, triage: ready-for-agent. Decided by the owner: the order and grouping. No owner questions on this ticket.

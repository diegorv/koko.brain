# 01 discovery: command dialog anatomy

No `spec.md` in `.scratch/finders-ux/`; the README and `research/verdict-command-dialogs.md` (T1) are the context.

## Files that change

- `src/lib/components/ui/command/command-dialog.svelte:31-33`: `Dialog.Content` gets `top-[18vh] translate-y-0 gap-0` and `showCloseButton={false}`; drop the row, icon and input selectors from `:33`, keep the two `[data-command-group]` selectors; set the context; new `hints` prop renders a one-line footer after `<Command>` only when non-empty.
- New `src/lib/components/ui/command/command-dialog-context.ts`: `setCommandDialogContext()` / `inCommandDialog()` over `setContext`/`getContext` with a Symbol key. bits-ui `Portal` forwards `getAllContexts()` (`node_modules/bits-ui/dist/bits/utilities/portal/portal.svelte:13,59`), so the portalled children see it.
- `command-item.svelte:16`: adds `min-h-9` in a dialog.
- `command-list.svelte:15`: `max-h-[min(60vh,400px)]` in a dialog, else `max-h-[300px]`.
- `command-input.svelte:14`: wrapper `pe-3` in a dialog, else `pe-8`.
- `src/lib/features/command-palette/CommandPalette.svelte:56-64`: one-line row (label `flex-1 truncate`, category `text-xs text-muted-foreground`, shortcut); passes hints Enter/arrows/Esc.
- `src/lib/plugins/mods/ModActionPicker.svelte:105-106`: drop `pr-6` and its comment.

## Plan (test-first)

1. Fixtures `src/tests/fixtures/CommandDialogHarness.svelte` (Command.Dialog with input, list, one item, optional hints) and `CommandRootHarness.svelte` (Command.Root outside a dialog). New `src/tests/lib/components/ui/command/command-dialog.test.ts`: anchor classes, no Close button, no `pe-8`, `min-h-9` rows, 400px list, footer only with hints; outside a dialog: `max-h-[300px]`, `pe-8`, no `min-h-9`. Fail, then implement primitives.
2. `dialog-content.test.ts`: plain dialog keeps `top-[50%]`, `translate-y-[-50%]` and the Close button (passes already; guards the base).
3. `CommandPalette.test.ts`: row order label, category (muted), shortcut, no `flex-col`; footer shows Enter, arrows, Esc. Fail, then edit the palette.
4. `ModActionPicker.test.ts`: description row carries `min-h-9`, not `h-9`, and shows both lines. Drop `pr-6`.
5. E2E `e2e/specs/command-palette.spec.ts`: input `boundingBox().y` equal before and after a narrowing filter.

Prior art: `src/tests/lib/components/ui/dialog/dialog-content.test.ts` with `src/tests/fixtures/DialogHarness.svelte` (mount, settle, query the portalled `[data-slot]`).

## Defaults taken

- Footer hints are a prop `hints?: { keys: string; label: string }[]` (the Issue allows snippet or prop; a list lets 02 append Shift+Enter). Palette hints: `↵` Run, `↑↓` Navigate, `Esc` Close.
- Input wrapper inside a dialog uses `pe-3` (mirrors `ps-3`).
- `gap-0` on the dialog content so the footer sits flush under the list (the base grid has `gap-4`).

## Risks

- Dense rows reach QuickSwitcher, TemplatePicker, OneOnOnePicker (owner decision in 218). QuickSwitcher's two-line rows keep both lines through `min-h-9`; 07 reshapes them.
- `translate-y-0` with tw-animate zoom is unchecked in jsdom; `overlay-motion.spec.ts` covers it.
